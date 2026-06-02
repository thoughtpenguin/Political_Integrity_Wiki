import 'server-only'
import { adminDb } from './firebase-admin'
import { EDITABLE_FIELDS, type Candidate, type AccountabilityPeriod, type Proposal, type User, type AuditLog, type Election, type Report, type BadgeStatus } from './types'
import type { Query } from 'firebase-admin/firestore'

export type CandidateWithPeriodData = Candidate & {
  latestPeriodId?: string
  topFields?: Record<string, string>
  latestPeriod?: {
    position: string
    party?: string
    state?: string
    yearStart: number
    yearEnd: number
  }
}

/**
 * Server-side data fetching functions.
 * Used by Server Components to fetch data directly from Firestore.
 */

// Local cache for user credibility points and profiles to avoid duplicate reads during a request/server session.
const userCredibilityCache = new Map<string, number>()
const userProfileCache = new Map<string, { createdAt: string; credibilityPoints: number }>()

export async function getCandidate(id: string): Promise<Candidate | null> {
  try {
    const doc = await adminDb.collection('candidates').doc(id).get()
    if (!doc.exists) return null
    const candidate = { id: doc.id, ...doc.data() } as Candidate
    
    // Merge top field values for period-agnostic fields
    const fields = EDITABLE_FIELDS.filter(f => !f.periodSpecific)
    candidate.proposedValues = {}
    for (const field of fields) {
      try {
        const topValue = await getTopProposalValue(id, field.id)
        const proposedVal = await getTopProposedValue(id, field.id)
        if (proposedVal && proposedVal !== 'Unknown') {
          candidate.proposedValues[field.id] = proposedVal
        }
        if (topValue && topValue !== 'Unknown') {
          if (field.id === 'photo') candidate.photoUrl = topValue
          else if (field.id === 'status') candidate.status = topValue as Candidate['status']
          else if (field.id === 'next_election_date') candidate.nextElectionDate = topValue
          else if (field.id === 'industries') {
            try {
              candidate.industries = JSON.parse(topValue)
            } catch (e) {
              console.error(`Error parsing industries for candidate ${id}:`, e)
              candidate.industries = []
            }
          }
          else if (field.id === 'contact_info') {
            try {
              candidate.contactInfo = JSON.parse(topValue)
            } catch (e) {
              console.error(`Error parsing contact_info for candidate ${id}:`, e)
            }
          }
          else if (field.id.startsWith('badge_')) {
            const badgeId = field.id.replace('badge_', '')
            if (!candidate.badges) candidate.badges = {}
            candidate.badges[badgeId] = topValue as BadgeStatus
          }
        }
      } catch (fieldErr) {
        console.error(`Error merging candidate field ${field.id} for ${id}:`, fieldErr)
      }
    }
    
    return candidate
  } catch (error) {
    console.error(`Error in getCandidate for id ${id}:`, error)
    return null
  }
}

export async function getAccountabilityPeriods(candidateId: string): Promise<AccountabilityPeriod[]> {
  try {
    const doc = await adminDb.collection('candidates').doc(candidateId).get()
    if (!doc.exists) return []
    const data = doc.data()
    let periods = (data?.accountabilityPeriods || []) as AccountabilityPeriod[]
    
    // Merge top field values for each period
    const periodSpecificFields = EDITABLE_FIELDS.filter(f => f.periodSpecific)
    
    periods = await Promise.all(periods.map(async (p) => {
      p.proposedValues = {}
      for (const field of periodSpecificFields) {
        try {
          const topValue = await getTopProposalValue(candidateId, field.id, p.id)
          const proposedVal = await getTopProposedValue(candidateId, field.id, p.id)
          if (proposedVal && proposedVal !== 'Unknown') {
            p.proposedValues[field.id] = proposedVal
          }
          if (topValue && topValue !== 'Unknown') {
            const val = (field.type === 'number') ? parseFloat(topValue) : 
                        (field.type === 'json') ? JSON.parse(topValue) : topValue
            
            if (field.id === 'total_raised') p.totalRaised = val
            else if (field.id === 'peak_net_assets') p.peakNetAssets = val
            else if (field.id === 'peak_stock_value') p.peakStockValue = val
            else if (field.id === 'total_pac_money') p.totalPacMoney = val
            else if (field.id === 'corporate_pac_money') p.corporatePacMoney = val
            else if (field.id === 'earmarked_money') p.earmarkedMoney = val
            else if (field.id === 'aipac_money') p.aipacMoney = val
            else if (field.id === 'stock_trading_volume') p.stockTradingVolume = val
            else if (field.id === 'party') p.party = val
            else if (field.id === 'region') p.region = val
            else if (field.id === 'donation_size_breakdown') p.donationSizeBreakdown = val
            else if (field.id === 'donation_location_breakdown') p.donationLocationBreakdown = val
            else if (field.id === 'pac_type_breakdown') p.pacTypeBreakdown = val
            else if (field.id === 'top_pac_donors') p.topPacDonors = val
          }
        } catch (fieldError) {
          console.error(`Error loading or parsing field ${field.id} for period ${p.id} of candidate ${candidateId}:`, fieldError)
        }
      }
      return p
    }))

    // Ensure they are sorted by yearEnd desc
    return periods.sort((a, b) => (b.yearEnd || 0) - (a.yearEnd || 0))
  } catch (error) {
    console.error(`Error in getAccountabilityPeriods for candidate ${candidateId}:`, error)
    return []
  }
}

export async function getAccountabilityPeriod(
  candidateId: string,
  periodId: string
): Promise<AccountabilityPeriod | null> {
  const periods = await getAccountabilityPeriods(candidateId)
  return periods.find(p => p.id === periodId) || null
}

export async function getProposals(
  candidateId: string,
  fieldId: string,
  periodId?: string
): Promise<Proposal[]> {
  let query = adminDb
    .collection('proposals')
    .where('candidateId', '==', candidateId)
    .where('fieldId', '==', fieldId)

  if (periodId) {
    query = query.where('periodId', '==', periodId)
  }

  // Fetch proposals ordered by upvoteCount descending
  const snapshot = await query.orderBy('upvoteCount', 'desc').get()
  const proposals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Proposal[]

  if (proposals.length <= 1) {
    return proposals
  }

  // To implement the tiebreaker rule: "Account age will be the tiebreaker, then credibility points."
  // we fetch the author's registration date (createdAt) and credibilityPoints.
  const authorIds = Array.from(new Set(proposals.map((p) => p.authorUid)))
  const uncachedAuthorIds = authorIds.filter((id) => !userProfileCache.has(id))

  if (uncachedAuthorIds.length > 0) {
    try {
      const userRefs = uncachedAuthorIds.map((id) => adminDb.collection('users').doc(id))
      const userDocs = await adminDb.getAll(...userRefs)
      for (const doc of userDocs) {
        if (doc.exists) {
          const data = doc.data()
          userProfileCache.set(doc.id, {
            createdAt: data?.createdAt || '2099-01-01',
            credibilityPoints: data?.credibilityPoints || 0,
          })
        } else {
          userProfileCache.set(doc.id, {
            createdAt: '2099-01-01',
            credibilityPoints: 0,
          })
        }
      }
      // Set default for any missing documents in database to avoid re-fetching
      for (const id of uncachedAuthorIds) {
        if (!userProfileCache.has(id)) {
          userProfileCache.set(id, {
            createdAt: '2099-01-01',
            credibilityPoints: 0,
          })
        }
      }
    } catch (err) {
      console.error('Failed to pre-fetch proposal authors for sorting:', err)
    }
  }

  // Sort proposals according to the tiebreaker rules:
  // 0. Pinned proposals first
  // 1. Upvote count descending
  // 2. Author account age ascending (older first)
  // 3. Author credibility points descending
  proposals.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1

    const votesDiff = (b.upvoteCount || 0) - (a.upvoteCount || 0)
    if (votesDiff !== 0) return votesDiff

    const authorA = userProfileCache.get(a.authorUid) || { createdAt: '2099-01-01', credibilityPoints: 0 }
    const authorB = userProfileCache.get(b.authorUid) || { createdAt: '2099-01-01', credibilityPoints: 0 }

    const dateA = new Date(authorA.createdAt).getTime()
    const dateB = new Date(authorB.createdAt).getTime()
    const ageDiff = dateA - dateB
    if (ageDiff !== 0) return ageDiff

    return authorB.credibilityPoints - authorA.credibilityPoints
  })

  return proposals
}

export async function getTopProposalValue(
  candidateId: string,
  fieldId: string,
  periodId?: string
): Promise<string> {
  try {
    const proposals = await getProposals(candidateId, fieldId, periodId)
    if (proposals.length === 0) return ''

    const top = proposals[0]

    // Check if combined credibility of upvoters >= 500
    if (top.pinned) return top.value

    const votesSnapshot = await adminDb
      .collection('proposals')
      .doc(top.id)
      .collection('votes')
      .get()

    if (votesSnapshot.empty) return ''

    const voterIds = votesSnapshot.docs.map(doc => doc.id)
    
    // Find voter IDs not in local cache
    const uncachedVoterIds = voterIds.filter(id => !userCredibilityCache.has(id))
    
    if (uncachedVoterIds.length > 0) {
      const userRefs = uncachedVoterIds.map(id => adminDb.collection('users').doc(id))
      // Fetch uncached users in a single batch read
      const userDocs = await adminDb.getAll(...userRefs)
      for (const doc of userDocs) {
        const points = doc.exists ? (doc.data()?.credibilityPoints || 0) : 0
        userCredibilityCache.set(doc.id, points)
      }
      // Any uncached IDs that don't exist in Firestore should also be cached as 0
      for (const id of uncachedVoterIds) {
        if (!userCredibilityCache.has(id)) {
          userCredibilityCache.set(id, 0)
        }
      }
    }

    let combinedPoints = 0
    for (const id of voterIds) {
      combinedPoints += userCredibilityCache.get(id) || 0
    }

    let minPoints = 500
    try {
      const configDoc = await adminDb.collection('system').doc('points_config').get()
      if (configDoc.exists) {
        minPoints = configDoc.data()?.minUpvoterCombinedPoints ?? 500
      }
    } catch (configErr) {
      console.error('Failed to load points config in getTopProposalValue, using default 500:', configErr)
    }

    return combinedPoints >= minPoints ? top.value : ''
  } catch (error) {
    console.error(`Error in getTopProposalValue for candidate ${candidateId}, field ${fieldId}:`, error)
    return ''
  }
}

export async function getTopProposedValue(
  candidateId: string,
  fieldId: string,
  periodId?: string
): Promise<string> {
  try {
    const proposals = await getProposals(candidateId, fieldId, periodId)
    if (proposals.length === 0) return ''
    return proposals[0].value
  } catch (error) {
    console.error(`Error in getTopProposedValue for candidate ${candidateId}, field ${fieldId}:`, error)
    return ''
  }
}

export async function getTopEditors(limit: number = 10): Promise<User[]> {
  const snapshot = await adminDb
    .collection('users')
    .orderBy('credibilityPoints', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  })) as User[]
}

export async function searchCandidates(query: string): Promise<CandidateWithPeriodData[]> {
  if (!query || query.length < 2) return []

  const lowerQuery = query.toLowerCase()

  const snapshot = await adminDb
    .collection('candidates')
    .orderBy('name')
    .limit(500)
    .get()

  return Promise.all(snapshot.docs
    .filter((doc) => {
      const name = (doc.data().name || '').toLowerCase()
      return name.includes(lowerQuery)
    })
    .slice(0, 20)
    .map(async (doc) => {
      const periods = await getAccountabilityPeriods(doc.id)
      const topFields: Record<string, string> = {}
      
      // Get top values for some key fields for the card
      const keyFields = EDITABLE_FIELDS.filter(f => !f.id.startsWith('badge_'))
      for (const f of keyFields) {
        const val = await getTopProposalValue(doc.id, f.id, periods[0]?.id)
        if (val) topFields[f.name] = val
      }

      const photoUrl = await getTopProposalValue(doc.id, 'photo')
      const proposedPhotoUrl = await getTopProposedValue(doc.id, 'photo')
      const status = await getTopProposalValue(doc.id, 'status')
      const proposedStatus = await getTopProposedValue(doc.id, 'status')

      const latestPeriod = periods[0] ? {
        position: periods[0].position,
        party: periods[0].party,
        state: periods[0].state,
        yearStart: periods[0].yearStart,
        yearEnd: periods[0].yearEnd,
      } : undefined

      const proposedValues: Record<string, string> = {}
      if (proposedPhotoUrl && proposedPhotoUrl !== 'Unknown') proposedValues['photo'] = proposedPhotoUrl
      if (proposedStatus && proposedStatus !== 'Unknown') proposedValues['status'] = proposedStatus

      return {
        id: doc.id,
        ...doc.data(),
        photoUrl: photoUrl && photoUrl !== 'Unknown' ? photoUrl : undefined,
        status: status && status !== 'Unknown' ? status as Candidate['status'] : undefined,
        proposedValues,
        latestPeriodId: periods[0]?.id,
        topFields,
        latestPeriod,
      } as CandidateWithPeriodData
    }))
}

export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  const snapshot = await adminDb
    .collection('auditLogs')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AuditLog[]
}

export async function getAllCandidates(limit: number = 100): Promise<CandidateWithPeriodData[]> {
  const snapshot = await adminDb
    .collection('candidates')
    .orderBy('name')
    .limit(limit)
    .get()

  return Promise.all(snapshot.docs.map(async (doc) => {
    const periods = await getAccountabilityPeriods(doc.id)
    const topFields: Record<string, string> = {}
    
    // For main page cards, we only show non-badge fields
    const fieldsToShow = EDITABLE_FIELDS.filter(f => !f.id.startsWith('badge_')).slice(0, 5) // Limit to 5 for performance/UI
    for (const f of fieldsToShow) {
      const val = await getTopProposalValue(doc.id, f.id, periods[0]?.id)
      if (val) topFields[f.name] = val
    }

    const photoUrl = await getTopProposalValue(doc.id, 'photo')
    const proposedPhotoUrl = await getTopProposedValue(doc.id, 'photo')
    const status = await getTopProposalValue(doc.id, 'status')
    const proposedStatus = await getTopProposedValue(doc.id, 'status')

    const latestPeriod = periods[0] ? {
      position: periods[0].position,
      party: periods[0].party,
      state: periods[0].state,
      yearStart: periods[0].yearStart,
      yearEnd: periods[0].yearEnd,
    } : undefined

    const proposedValues: Record<string, string> = {}
    if (proposedPhotoUrl && proposedPhotoUrl !== 'Unknown') proposedValues['photo'] = proposedPhotoUrl
    if (proposedStatus && proposedStatus !== 'Unknown') proposedValues['status'] = proposedStatus

    return {
      id: doc.id,
      ...doc.data(),
      photoUrl: photoUrl && photoUrl !== 'Unknown' ? photoUrl : undefined,
      status: status && status !== 'Unknown' ? status as Candidate['status'] : undefined,
      proposedValues,
      latestPeriodId: periods[0]?.id,
      topFields,
      latestPeriod,
    } as CandidateWithPeriodData
  }))
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const doc = await adminDb.collection('users').doc(uid).get()
  if (!doc.exists) return null
  return { uid: doc.id, ...doc.data() } as User
}

export async function getBadgeProposals(
  candidateId: string,
  badgeId: string
): Promise<Proposal[]> {
  const fieldId = `badge_${badgeId}`
  const snapshot = await adminDb
    .collection('proposals')
    .where('candidateId', '==', candidateId)
    .where('fieldId', '==', fieldId)
    .orderBy('upvoteCount', 'desc')
    .orderBy('createdAt', 'asc')
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Proposal[]
}

export async function getTopBadgeStatus(
  candidateId: string,
  badgeId: string
): Promise<string> {
  return getTopProposalValue(candidateId, `badge_${badgeId}`)
}
export async function getUpcomingElections(
  limit: number = 10,
  level?: string,
  state?: string
): Promise<Election[]> {
  let query: Query = adminDb
    .collection('elections')
    .where('date', '>=', new Date().toISOString())

  if (level) {
    query = query.where('level', '==', level)
  }
  if (state) {
    query = query.where('state', '==', state)
  }

  const snapshot = await query.orderBy('date', 'asc').limit(limit).get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Election[]
}

export type FieldProposalStatus = 'none' | 'low_upvotes' | 'has_proposals'

/**
 * Efficiently fetches the top-proposal upvote count for each field,
 * used to show a colored status indicator in the Contribute Data section.
 *
 * Returns a map of fieldId → FieldProposalStatus.
 *   'none'          — no proposals exist
 *   'low_upvotes'   — at least one proposal exists but the top has < 3 upvotes
 *   'has_proposals' — at least one proposal exists with >= 3 upvotes
 */
export async function getFieldStatusSummaries(
  candidateId: string,
  fieldIds: string[],
  periodId?: string
): Promise<Record<string, FieldProposalStatus>> {
  const result: Record<string, FieldProposalStatus> = {}

  await Promise.all(
    fieldIds.map(async (fieldId) => {
      try {
        let query = adminDb
          .collection('proposals')
          .where('candidateId', '==', candidateId)
          .where('fieldId', '==', fieldId)

        if (periodId) {
          query = query.where('periodId', '==', periodId)
        }

        const snapshot = await query.orderBy('upvoteCount', 'desc').limit(1).get()

        if (snapshot.empty) {
          result[fieldId] = 'none'
        } else {
          const topUpvoteCount: number = snapshot.docs[0].data()?.upvoteCount ?? 0
          result[fieldId] = topUpvoteCount >= 3 ? 'has_proposals' : 'low_upvotes'
        }
      } catch {
        result[fieldId] = 'none'
      }
    })
  )

  return result
}

export async function getReports(): Promise<Report[]> {
  try {
    const snapshot = await adminDb.collection('reports')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get()
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report))
  } catch (err) {
    console.error('Error fetching reports:', err)
    return []
  }
}
