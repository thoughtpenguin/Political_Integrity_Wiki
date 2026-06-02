'use client'

/**
 * ContributionNudge
 *
 * On every login event, for users who have previously contributed:
 *  - In production: shown if the user hasn't contributed in 3+ days
 *    AND the nudge hasn't already been shown in this same browser session.
 *  - On localhost (emulator): shown on every login, ignoring the 3-day cooldown.
 *
 * The nudge recommends the oldest candidate where the field the user last
 * edited has no proposals yet. Falls back to any field with no proposals.
 *
 * Persistence:
 *   `contributionNudgeShownAt` is written to the user's Firestore doc when
 *   the nudge is shown, providing the cooldown gate across devices/sessions.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { useAuth } from './AuthProvider'
import { EDITABLE_FIELDS } from '@/lib/types'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

interface NudgeTarget {
  candidateId: string
  candidateName: string
  fieldId: string
  fieldName: string
  periodId?: string
}

function isEmulator(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost'
}

export default function ContributionNudge() {
  const { user } = useAuth()
  const [nudge, setNudge] = useState<NudgeTarget | null>(null)
  // Track which uid's nudge we've already evaluated this session, to avoid
  // re-running the check on every re-render triggered by the Firestore snapshot.
  const evaluatedUidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      // User logged out — reset so the nudge can fire again on next login
      evaluatedUidRef.current = null
      setNudge(null)
      return
    }

    // Already evaluated for this uid in this session — don't re-run
    if (evaluatedUidRef.current === user.uid) return
    evaluatedUidRef.current = user.uid

    async function evaluate() {
      if (!user) return

      // Read the user's contribution tracking fields directly from Firestore
      // (the AuthProvider snapshot already has credibilityPoints but not our
      // custom tracking fields, so we read them ourselves)
      let lastContributedAt: string | null = null
      let lastContributedFieldId: string | null = null
      let contributionNudgeShownAt: string | null = null

      try {
        const { getDoc } = await import('firebase/firestore')
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (userSnap.exists()) {
          const data = userSnap.data()
          lastContributedAt = data.lastContributedAt ?? null
          lastContributedFieldId = data.lastContributedFieldId ?? null
          contributionNudgeShownAt = data.contributionNudgeShownAt ?? null
        }
      } catch (err) {
        console.error('[ContributionNudge] Failed to read user doc:', err)
        return
      }

      // No prior contributions — don't show
      if (!lastContributedAt || !lastContributedFieldId) return

      const now = Date.now()
      const lastContributedMs = new Date(lastContributedAt).getTime()
      const daysSinceContribution = now - lastContributedMs

      // Check 3-day cooldown (skipped on emulator)
      if (!isEmulator()) {
        if (daysSinceContribution < THREE_DAYS_MS) return

        // Also check if nudge was already shown recently (cooldown resets on show)
        if (contributionNudgeShownAt) {
          const shownMs = new Date(contributionNudgeShownAt).getTime()
          if (now - shownMs < THREE_DAYS_MS) return
        }
      }

      // Find a recommendation: oldest candidate where lastContributedFieldId
      // has no proposals yet. Fall back to any field if no match found.
      const target = await findRecommendation(lastContributedFieldId)
      if (!target) return

      // Mark nudge as shown in Firestore (resets the cooldown clock)
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          contributionNudgeShownAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('[ContributionNudge] Failed to write nudge timestamp:', err)
      }

      setNudge(target)
    }

    evaluate()
  }, [user])

  if (!nudge) return null

  const proposalPath = nudge.periodId
    ? `/candidate/${nudge.candidateId}/proposals/${nudge.fieldId}?period=${nudge.periodId}`
    : `/candidate/${nudge.candidateId}/proposals/${nudge.fieldId}`

  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  return (
    <div
      className="contribution-nudge"
      role="complementary"
      aria-label="Contribution suggestion"
      id="contribution-nudge"
    >
      {/* Accent bar */}
      <div className="contribution-nudge-accent" />

      <div className="contribution-nudge-body">
        <div className="contribution-nudge-header">
          <div className="contribution-nudge-title">
            👋 Hey {firstName}, data needed!
          </div>
          <button
            className="contribution-nudge-close"
            onClick={() => setNudge(null)}
            aria-label="Dismiss contribution suggestion"
            title="Dismiss"
          >
            ✕
          </button>
        </div>

        <div
          className="contribution-nudge-candidate"
          title={nudge.candidateName}
        >
          {nudge.candidateName}
        </div>
        <div className="contribution-nudge-field">
          Missing: <strong>{nudge.fieldName}</strong>
        </div>

        <div className="contribution-nudge-cta">
          <Link
            href={proposalPath}
            className="btn btn-primary btn-sm"
            onClick={() => setNudge(null)}
          >
            Contribute →
          </Link>
          {isEmulator() && (
            <span className="contribution-nudge-emulator" title="Nudge shows on every login in emulator mode">
              ⚡ Emulator
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Queries Firestore (client-side) to find the oldest candidate where the
 * given fieldId has no proposals yet. Falls back to any missing field.
 */
async function findRecommendation(preferredFieldId: string): Promise<NudgeTarget | null> {
  // Validate that the preferred field actually exists in EDITABLE_FIELDS
  const preferredField = EDITABLE_FIELDS.find(f => f.id === preferredFieldId && !f.id.startsWith('badge_'))

  // Fetch up to 30 candidates ordered by createdAt asc (oldest first)
  const candidatesSnap = await getDocs(
    query(
      collection(db, 'candidates'),
      orderBy('createdAt', 'asc'),
      limit(30)
    )
  )

  if (candidatesSnap.empty) return null

  // --- Pass 1: preferred field ---
  if (preferredField) {
    for (const candidateDoc of candidatesSnap.docs) {
      const result = await checkFieldForCandidate(
        candidateDoc.id,
        candidateDoc.data().name as string,
        preferredField.id,
        preferredField.name,
        candidateDoc.data() as Record<string, unknown>
      )
      if (result) return result
    }
  }

  // --- Pass 2: fallback — any non-badge field with no proposals ---
  const fallbackFields = EDITABLE_FIELDS.filter(
    f => !f.id.startsWith('badge_') && f.id !== preferredFieldId
  )

  for (const candidateDoc of candidatesSnap.docs) {
    const candidateData = candidateDoc.data() as Record<string, unknown>
    for (const field of fallbackFields) {
      const result = await checkFieldForCandidate(
        candidateDoc.id,
        candidateData.name as string,
        field.id,
        field.name,
        candidateData
      )
      if (result) return result
    }
  }

  return null
}

/**
 * Checks whether a specific field for a specific candidate has zero proposals.
 * For period-specific fields, picks the first available accountability period.
 * Returns a NudgeTarget if eligible, or null otherwise.
 */
async function checkFieldForCandidate(
  candidateId: string,
  candidateName: string,
  fieldId: string,
  fieldName: string,
  candidateData: Record<string, unknown>
): Promise<NudgeTarget | null> {
  const fieldDef = EDITABLE_FIELDS.find(f => f.id === fieldId)
  if (!fieldDef) return null

  let periodId: string | undefined

  if (fieldDef.periodSpecific) {
    // Pick the first non-hidden accountability period applicable to this field
    const periods = (candidateData.accountabilityPeriods ?? []) as Array<{
      id: string
      position: string
      isHidden?: boolean
    }>
    const eligiblePeriod = periods.find(
      p => !p.isHidden && fieldDef.applicablePositions.includes(p.position as never)
    )
    if (!eligiblePeriod) return null
    periodId = eligiblePeriod.id
  } else {
    // For period-agnostic fields, check that at least one period's position
    // is eligible (candidate must be relevant for the field at all)
    const periods = (candidateData.accountabilityPeriods ?? []) as Array<{
      position: string
      isHidden?: boolean
    }>
    const hasEligiblePeriod = periods.some(
      p => !p.isHidden && fieldDef.applicablePositions.includes(p.position as never)
    )
    if (!hasEligiblePeriod && periods.length > 0) return null
  }

  // Query proposals: does this field already have any proposals?
  const proposalQuery = periodId
    ? query(
        collection(db, 'proposals'),
        where('candidateId', '==', candidateId),
        where('fieldId', '==', fieldId),
        where('periodId', '==', periodId),
        limit(1)
      )
    : query(
        collection(db, 'proposals'),
        where('candidateId', '==', candidateId),
        where('fieldId', '==', fieldId),
        limit(1)
      )

  const proposalSnap = await getDocs(proposalQuery)
  if (!proposalSnap.empty) return null // already has proposals

  return { candidateId, candidateName, fieldId, fieldName, periodId }
}
