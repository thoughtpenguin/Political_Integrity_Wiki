import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCandidate, getAccountabilityPeriods, getBadgeProposals, getTopBadgeStatus, getFieldStatusSummaries, type FieldProposalStatus } from '@/lib/data'
import { BADGE_DEFINITIONS, EDITABLE_FIELDS, POSITION_LABELS, type BadgeStatus, type Candidate } from '@/lib/types'
import type { Metadata } from 'next'
import AccountabilitySelector from '../AccountabilitySelector'
import BadgeSection from '../BadgeSection'

export async function generateMetadata(
  props: { params: Promise<{ id: string; periodId: string }> }
): Promise<Metadata> {
  const { id } = await props.params
  const candidate = await getCandidate(id)
  if (!candidate) return { title: 'Candidate Not Found' }
  return {
    title: `${candidate.name} - Accountability Profile`,
    description: `Campaign finance integrity profile for ${candidate.name}. Track PAC money, stock trades, and corruption pledges.`,
  }
}

export default async function CandidatePeriodPage(props: { params: Promise<{ id: string; periodId: string }> }) {
  const { id, periodId } = await props.params
  const candidate = await getCandidate(id)
  if (!candidate) notFound()

  const periods = await getAccountabilityPeriods(id)
  const visiblePeriods = periods.filter(p => !p.isHidden)
  const selectedPeriod = visiblePeriods.find(p => p.id === periodId)
  
  // If periodId is invalid, we could redirect or show 404. 
  // Let's show 404 for clarity if they hit a specific URL that doesn't exist.
  if (!selectedPeriod && visiblePeriods.length > 0) notFound()

  // Fetch badge proposals and determine effective badge statuses
  // Filter badges by position eligibility
  const badgeData = await Promise.all(
    BADGE_DEFINITIONS
      .filter(badge => selectedPeriod && badge.applicablePositions.includes(selectedPeriod.position))
      .map(async (badge) => {
        const proposals = await getBadgeProposals(id, badge.id)
        const topStatus = await getTopBadgeStatus(id, badge.id)
        return { badge, proposals, topStatus: topStatus as BadgeStatus }
      })
  )

  // Check if any badge is "unkept" — if so, all other badges become greyed
  const hasUnkeptBadge = badgeData.some((bd) => bd.topStatus === 'unkept')
  
  // Check if candidate has ever held a non-national, non-judicial position for contact info display
  const hasEligibleContactPosition = visiblePeriods.some(p => 
    !['president', 'vice_president', 'cabinet'].includes(p.position) &&
    !['state_supreme_court_justice', 'appellate_court_judge', 'trial_court_judge'].includes(p.position)
  )

  // Fetch proposal status for each editable field to power the colored indicators
  const editableFieldsForPeriod = EDITABLE_FIELDS
    .filter((f) => !f.id.startsWith('badge_'))
    .filter((f) => selectedPeriod && f.applicablePositions.includes(selectedPeriod.position))
  const periodSpecificFieldIds = editableFieldsForPeriod.filter(f => f.periodSpecific).map(f => f.id)
  const agnosticFieldIds = editableFieldsForPeriod.filter(f => !f.periodSpecific).map(f => f.id)
  const [periodFieldStatuses, agnosticFieldStatuses] = await Promise.all([
    getFieldStatusSummaries(id, periodSpecificFieldIds, periodId),
    getFieldStatusSummaries(id, agnosticFieldIds),
  ])
  const fieldStatuses: Record<string, FieldProposalStatus> = { ...agnosticFieldStatuses, ...periodFieldStatuses }

  return (
    <div className="container animate-fade-in">
      {/* Candidate Header */}
      <article>
        <div className="candidate-header">
          <div
            className="candidate-photo"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: 900,
              background: candidate.photoUrl ? `url(${candidate.photoUrl}) center/cover no-repeat` :
                (candidate.proposedValues?.['photo'] ? `url(${candidate.proposedValues['photo']}) center/cover no-repeat` : 'linear-gradient(135deg, var(--accent-primary), #7c3aed)'),
              color: 'white',
              overflow: 'hidden',
              border: (!candidate.photoUrl && candidate.proposedValues?.['photo']) ? '3px dashed var(--warning)' : undefined
            }}
          >
            {!candidate.photoUrl && !candidate.proposedValues?.['photo'] && candidate.name.charAt(0)}
          </div>
          <div className="candidate-info">
            <h1 className="candidate-name">{candidate.name}</h1>
            <div className="candidate-meta">
              {candidate.status && (
                <span className="meta-tag" style={{
                  color: candidate.status === 'running' ? 'var(--success)' :
                    candidate.status === 'in_office' ? 'var(--accent-secondary)' : 'var(--text-muted)',
                }}>
                  {candidate.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
              {!candidate.status && candidate.proposedValues?.['status'] && (
                <span className="meta-tag" style={{
                  border: '1px dashed var(--warning)',
                  color: 'var(--warning)',
                }}>
                  PROPOSED: {candidate.proposedValues['status'].replace('_', ' ').toUpperCase()} (unverified)
                </span>
              )}
              {candidate.fecIds && candidate.fecIds.length > 0 && (
                <span className="meta-tag">FEC: {candidate.fecIds.join(', ')}</span>
              )}
              {candidate.nextElectionDate && (
                <span className="meta-tag">Next Election: {candidate.nextElectionDate}</span>
              )}
              {!candidate.nextElectionDate && candidate.proposedValues?.['next_election_date'] && (
                <span className="meta-tag" style={{
                  border: '1px dashed var(--warning)',
                  color: 'var(--warning)',
                }}>
                  Proposed Election: {candidate.proposedValues['next_election_date']} (unverified)
                </span>
              )}
            </div>

            {/* Contact Info — only if candidate has ever held a non-national, non-judicial position */}
            {hasEligibleContactPosition && (candidate.contactInfo || candidate.proposedValues?.['contact_info']) && (
              <details style={{ marginTop: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--accent-secondary)', fontSize: '0.875rem' }}>
                  Contact Information {(!candidate.contactInfo && candidate.proposedValues?.['contact_info']) ? ' (Proposed)' : ''}
                </summary>
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {candidate.contactInfo ? (
                    <>
                      {candidate.contactInfo.phone && <div>📞 {candidate.contactInfo.phone}</div>}
                      {candidate.contactInfo.email && <div>✉️ {candidate.contactInfo.email}</div>}
                      {candidate.contactInfo.website && (
                        <div>🌐 <a href={candidate.contactInfo.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>{candidate.contactInfo.website}</a></div>
                      )}
                      {candidate.contactInfo.office && <div>🏛️ {candidate.contactInfo.office}</div>}
                    </>
                  ) : (
                    (() => {
                      try {
                        const proposedContact = JSON.parse(candidate.proposedValues!['contact_info']) as NonNullable<Candidate['contactInfo']>
                        return (
                          <div style={{ borderLeft: '2px dashed var(--warning)', paddingLeft: '0.5rem' }}>
                            <div style={{ fontSize: '0.625rem', color: 'var(--warning)', fontWeight: 600, marginBottom: '0.25rem' }}>UNVERIFIED PROPOSAL:</div>
                            {proposedContact.phone && <div>📞 {proposedContact.phone}</div>}
                            {proposedContact.email && <div>✉️ {proposedContact.email}</div>}
                            {proposedContact.website && (
                              <div>🌐 <a href={proposedContact.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>{proposedContact.website}</a></div>
                            )}
                            {proposedContact.office && <div>🏛️ {proposedContact.office}</div>}
                          </div>
                        )
                      } catch {
                        return null
                      }
                    })()
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Badges — Interactive Voting */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 className="section-title">Integrity Badges</h2>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            Click a badge to view proposals and vote on its status. Cited sources (e.g., video clips) are required.
          </p>
          {hasUnkeptBadge && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>
              ⚠ This candidate has broken a pledge. All other badges are now unreliable.
            </p>
          )}
          <BadgeSection 
            candidateId={id} 
            badgeData={badgeData} 
            hasUnkeptBadge={hasUnkeptBadge} 
          />
        </section>

        {/* Industries */}
        {((candidate.industries && candidate.industries.length > 0) || candidate.proposedValues?.['industries']) && (
          <section style={{ marginBottom: '2rem' }}>
            <h2 className="section-title">Private Sector Employment &amp; Potential Conflicts</h2>
            {candidate.industries && candidate.industries.length > 0 ? (
              candidate.industries.map((ind, i) => (
                <div key={i} className="card" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{ind.industry} {ind.years && `(${ind.years})`}</div>
                  {ind.actions && ind.actions.length > 0 && (
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {ind.actions.map((action, j) => <li key={j}>{action}</li>)}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              (() => {
                try {
                  const proposedInds = JSON.parse(candidate.proposedValues!['industries']) as typeof candidate.industries
                  if (!proposedInds || proposedInds.length === 0) return null
                  return (
                    <div className="card" style={{ border: '1px dashed var(--warning)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '0.5rem', fontWeight: 600 }}>PROPOSED BY COMMUNITY (UNVERIFIED):</div>
                      {proposedInds.map((ind, i) => (
                        <div key={i} style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{ind.industry} {ind.years && `(${ind.years})`}</div>
                          {ind.actions && ind.actions.length > 0 && (
                            <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              {ind.actions.map((action, j) => <li key={j}>{action}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                } catch {
                  return null
                }
              })()
            )}
          </section>
        )}

        {/* Accountability Period Section */}
        <section>
          <h2 className="section-title">Campaign Finance & Accountability</h2>
          <AccountabilitySelector
            candidateId={id}
            selectedPeriodId={periodId}
            periods={visiblePeriods.map((p) => ({
              id: p.id,
              label: `${p.yearStart}–${p.yearEnd} • ${POSITION_LABELS[p.position] || p.position} ${p.result ? `(${p.result})` : ''}`,
              yearEnd: p.yearEnd,
              position: p.position,
              result: p.result,
              party: p.party,
              region: p.region,
              totalRaised: p.totalRaised,
              totalPacMoney: p.totalPacMoney,
              corporatePacMoney: p.corporatePacMoney,
              peakNetAssets: p.peakNetAssets,
              peakStockValue: p.peakStockValue,
              stockTradingVolume: p.stockTradingVolume,
              earmarkedMoney: p.earmarkedMoney,
              aipacMoney: p.aipacMoney,
              donationSizeBreakdown: p.donationSizeBreakdown,
              donationLocationBreakdown: p.donationLocationBreakdown,
              pacTypeBreakdown: p.pacTypeBreakdown,
              topPacDonors: p.topPacDonors,
              reportDismissed: p.reportDismissed,
              proposedValues: p.proposedValues,
            }))}
          />

          {visiblePeriods.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p className="text-secondary">No accountability periods yet.</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Contributors can add election cycles for this candidate.
              </p>
            </div>
          )}
        </section>

        {/* Link to field proposals */}
        <section style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Contribute Data</h2>
          <p className="text-secondary" style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
            Help verify information about this candidate by proposing values and voting on proposals.
          </p>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, display: 'inline-block' }} />
              Needs a proposal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0, display: 'inline-block' }} />
              Proposal made — needs more votes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-secondary)', flexShrink: 0, display: 'inline-block' }} />
              Well-supported proposal
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, display: 'inline-block' }} />
              FEC verified
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
            {EDITABLE_FIELDS
              .filter((f) => !f.id.startsWith('badge_'))
              .filter((f) => selectedPeriod && f.applicablePositions.includes(selectedPeriod.position))
              .map((field) => {
                const isFecLocked = field.fecAutoFill && selectedPeriod?.fecDataFetched
                
                if (isFecLocked) {
                  return (
                    <div 
                      key={field.id} 
                      className="card" 
                      style={{ 
                        opacity: 0.7, 
                        padding: '1rem', 
                        cursor: 'not-allowed',
                        borderStyle: 'dashed',
                        borderColor: 'var(--success-muted)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            title="FEC verified"
                            style={{
                              width: 10, height: 10, borderRadius: '50%',
                              background: 'var(--success)',
                              flexShrink: 0, display: 'inline-block',
                            }}
                          />
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{field.name}</span>
                        </div>
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', borderRadius: '4px', background: 'var(--success-muted)', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                          FEC VERIFIED
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        This data is automatically verified via the FEC API.
                      </div>
                    </div>
                  )
                }

                const status: FieldProposalStatus = fieldStatuses[field.id] ?? 'none'
                const dotColor =
                  status === 'none'          ? 'var(--danger)' :
                  status === 'low_upvotes'   ? 'var(--warning)' :
                                              'var(--accent-secondary)'
                const dotTitle =
                  status === 'none'          ? 'No proposals yet — be the first!' :
                  status === 'low_upvotes'   ? 'Proposal made — needs more votes (fewer than 3 upvotes)' :
                                              'Well-supported proposal (3+ upvotes)'

                return (
                  <Link
                    key={field.id}
                    href={`/candidate/${id}/proposals/${field.id}?period=${periodId}`}
                    className="card"
                    style={{ textDecoration: 'none', color: 'inherit', padding: '1rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span
                        title={dotTitle}
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: dotColor,
                          flexShrink: 0, display: 'inline-block',
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{field.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.375rem' }}>
                      {field.description.length > 80 ? `${field.description.substring(0, 80)}...` : field.description}
                    </div>
                  </Link>
                )
              })}
          </div>
        </section>
      </article>
    </div>
  )
}
