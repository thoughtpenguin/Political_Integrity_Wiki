'use server'

import { revalidatePath } from 'next/cache'
import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { AccountabilityPeriod } from './types'

// Note: In a real production app with JS disabled, we would verify the user via session cookies.
// For this task, we will implement the logic assuming the server can identify the user.
// Since we don't have cookies set up yet, these actions will fail without a UID.
// But we are structuring them to be SSR-ready.

export async function voteProposalAction(formData: FormData) {
  const proposalId = formData.get('proposalId') as string
  const uid = formData.get('uid') as string
  const path = formData.get('path') as string

  if (!proposalId || !uid) return { error: 'Unauthorized' }

  try {
    // 1. Check if user is banned
    const banDoc = await adminDb.collection('bannedUsers').doc(uid).get()
    if (banDoc.exists) {
      return { error: 'Your account has been suspended.' }
    }

    const proposalRef = adminDb.collection('proposals').doc(proposalId)
    const proposalDoc = await proposalRef.get()
    if (!proposalDoc.exists) return { error: 'Proposal not found.' }
    const proposalData = proposalDoc.data()!

    if (proposalData.pinned) {
      return { error: 'Cannot vote on a pinned proposal.' }
    }

    const fieldId = proposalData.fieldId
    const candidateId = proposalData.candidateId
    const periodId = proposalData.periodId || ''

    const voteRef = proposalRef.collection('votes').doc(uid)
    const voteDoc = await voteRef.get()

    if (voteDoc.exists) {
      // Toggle off: remove vote
      await adminDb.runTransaction(async (transaction) => {
        transaction.delete(voteRef)
        transaction.update(proposalRef, {
          upvoteCount: FieldValue.increment(-1)
        })
      })
      revalidatePath(path)
      return { success: true, action: 'removed' }
    }

    // Toggle on: add vote, and remove any existing vote on a DIFFERENT proposal for the same field
    const existingProposals = await adminDb.collection('proposals')
      .where('candidateId', '==', candidateId)
      .where('fieldId', '==', fieldId)
      .where('periodId', '==', periodId)
      .get()

    await adminDb.runTransaction(async (transaction) => {
      // Check and remove old vote if user voted on another proposal for this field
      for (const p of existingProposals.docs) {
        if (p.id === proposalId) continue
        const oldVoteRef = adminDb.collection('proposals').doc(p.id).collection('votes').doc(uid)
        const oldVoteDoc = await transaction.get(oldVoteRef)
        if (oldVoteDoc.exists) {
          transaction.delete(oldVoteRef)
          transaction.update(adminDb.collection('proposals').doc(p.id), {
            upvoteCount: FieldValue.increment(-1)
          })
        }
      }

      // Add new vote
      transaction.set(voteRef, {
        voterId: uid,
        votedAt: new Date().toISOString(),
        voteCountAtTime: proposalData.upvoteCount || 0,
      })
      transaction.update(proposalRef, {
        upvoteCount: FieldValue.increment(1)
      })
    })

    revalidatePath(path)
    return { success: true, action: 'added' }
  } catch (err) {
    console.error('Vote action failed:', err)
    return { error: 'Internal error' }
  }
}

export async function submitProposalAction(formData: FormData) {
  const candidateId = formData.get('candidateId') as string
  const fieldId = formData.get('fieldId') as string
  const periodId = formData.get('periodId') as string
  const value = formData.get('value') as string
  const uid = formData.get('uid') as string
  const path = formData.get('path') as string
  
  // Citations are usually passed as arrays in forms but can be tricky
  const citationsJson = formData.get('citations') as string
  const citations = JSON.parse(citationsJson || '[]')

  if (!uid) return { error: 'Unauthorized' }

  try {
    // 1. Check if user is banned
    const banDoc = await adminDb.collection('bannedUsers').doc(uid).get()
    if (banDoc.exists) {
      return { error: 'Your account has been suspended.' }
    }

    // 2. Load user and check credibility points
    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    if (!userDoc.exists) return { error: 'User not found' }
    const userData = userDoc.data()
    const points = userData?.credibilityPoints || 0
    if (points < 10) {
      return { error: `You need 10 credibility points to submit a proposal. You have ${points}.` }
    }

    // 3. Schema and lock checks
    const fecAutofillFields = [
      'total_raised', 'total_pac_money', 'donation_size_breakdown',
      'donation_location_breakdown', 'earmarked_money', 'pac_type_breakdown',
      'top_pac_donors', 'aipac_money', 'party', 'region'
    ]
    if (fecAutofillFields.includes(fieldId) && periodId) {
      const candidateDoc = await adminDb.collection('candidates').doc(candidateId).get()
      if (candidateDoc.exists) {
        const periods: AccountabilityPeriod[] = candidateDoc.data()?.accountabilityPeriods || []
        const period = periods.find((p) => p.id === periodId)
        if (period && period.fecDataFetched) {
          return { error: 'This field is automatically verified via the FEC API and cannot be manually edited.' }
        }
      }
    }

    // Check if field is locked by a pinned proposal
    const lockedQuery = await adminDb.collection('proposals')
      .where('candidateId', '==', candidateId)
      .where('fieldId', '==', fieldId)
      .where('periodId', '==', periodId || '')
      .where('pinned', '==', true)
      .limit(1)
      .get()
    if (!lockedQuery.empty) {
      return { error: 'This field is locked because a proposal has been pinned by an admin.' }
    }

    // 4. Validate numeric, JSON, citation
    const numericFields = [
      'total_raised', 'peak_net_assets', 'peak_stock_value', 'total_pac_money',
      'corporate_pac_money', 'earmarked_money', 'aipac_money', 'stock_trading_volume'
    ]
    const jsonFields = [
      'donation_size_breakdown', 'donation_location_breakdown', 
      'pac_type_breakdown', 'top_pac_donors', 'industries', 'contact_info'
    ]
    if (numericFields.includes(fieldId)) {
      if (isNaN(parseFloat(value))) {
        return { error: `Field '${fieldId}' must be a valid number.` }
      }
    }
    if (jsonFields.includes(fieldId)) {
      try {
        const parsed = JSON.parse(value)
        if (fieldId === 'top_pac_donors') {
          if (!Array.isArray(parsed)) throw new Error('Must be a list')
          if (parsed.length > 10) {
            return { error: 'Top PAC Donors list cannot exceed 10 entries.' }
          }
        }
      } catch {
        return { error: `Field '${fieldId}' must be a valid JSON string.` }
      }
    }
    if (fieldId !== 'photo') {
      if (!citations || citations.length === 0) {
        return { error: `At least one citation is required for field '${fieldId}'.` }
      }
    }

    // 5. Execute deduction and creation atomically in a transaction
    const proposalRef = adminDb.collection('proposals').doc()
    await adminDb.runTransaction(async (transaction) => {
      // Deduct points
      transaction.update(userRef, {
        credibilityPoints: FieldValue.increment(-10)
      })
      // Add proposal
      transaction.set(proposalRef, {
        candidateId,
        fieldId,
        periodId: periodId || '',
        value: String(value),
        citations,
        authorUid: uid,
        authorDisplayName: userData?.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
        upvoteCount: 0,
        pinned: false,
        deletionRequested: false,
      })
    })

    revalidatePath(path)
    return { success: true }
  } catch (err) {
    console.error('Submit proposal failed:', err)
    return { error: 'Internal error' }
  }
}

export async function createCandidateAction(formData: FormData) {
  const name = formData.get('name') as string
  const uid = formData.get('uid') as string

  if (!uid) return { error: 'Unauthorized' }
  if (!name) return { error: 'Name is required' }

  try {
    // 1. Check if user is banned
    const banDoc = await adminDb.collection('bannedUsers').doc(uid).get()
    if (banDoc.exists) {
      return { error: 'Your account has been suspended.' }
    }

    const userRef = adminDb.collection('users').doc(uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()
    const points = userData?.credibilityPoints || 0
    
    if (points < 1000) {
      return { error: `1,000 credibility points required to create a candidate profile by name. You have ${points}.` }
    }

    const candidateRef = adminDb.collection('candidates').doc()

    // 2. Deduct points and create candidate profile atomically in a transaction
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(userRef, {
        credibilityPoints: FieldValue.increment(-1000)
      })
      transaction.set(candidateRef, {
        name,
        nameNormalized: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        status: 'unknown',
        badges: {},
        accountabilityPeriods: [],
        locations: [],
        createdBy: uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })

    return { success: true, candidateId: candidateRef.id }
  } catch (err) {
    console.error('Create candidate failed:', err)
    return { error: 'Internal error' }
  }
}
