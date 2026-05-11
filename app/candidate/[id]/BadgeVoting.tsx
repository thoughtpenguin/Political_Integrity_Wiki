'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/components/AuthProvider'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import type { BadgeStatus, Proposal } from '@/lib/types'

interface BadgeVotingProps {
  candidateId: string
  badgeId: string
  badgeName: string
  badgeDescription: string
  currentStatus: BadgeStatus
  initialProposals: Proposal[]
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pledged: { label: 'Pledged', color: 'var(--success)', icon: '✓' },
  denied: { label: 'Denied', color: 'var(--danger)', icon: '✗' },
  unkept: { label: 'Unkept', color: 'var(--warning)', icon: '⚠' },
}

export default function BadgeVoting({
  candidateId, badgeId, badgeName, badgeDescription, currentStatus, initialProposals,
}: BadgeVotingProps) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [proposals, setProposals] = useState(initialProposals)
  const [showForm, setShowForm] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('pledged')
  const [citations, setCitations] = useState([{ url: '', explanation: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!user) return
    const validCitations = citations.filter((c) => c.url.trim())
    if (validCitations.length === 0) {
      setError('At least one citation URL is required (e.g., a video clip of the pledge).')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const submitFn = httpsCallable(functions, 'submit_badge_proposal')
      const result = await submitFn({
        candidateId,
        badgeId,
        status: selectedStatus,
        citations: validCitations.map((c) => ({
          url: c.url.trim(),
          explanation: c.explanation.trim() || undefined,
        })),
      })

      const data = result.data as { proposalId: string }
      setProposals((prev) => [
        ...prev,
        {
          id: data.proposalId,
          candidateId,
          periodId: '',
          fieldId: `badge_${badgeId}`,
          value: selectedStatus,
          citations: validCitations,
          authorUid: user.uid,
          authorDisplayName: user.displayName || 'You',
          createdAt: new Date().toISOString(),
          upvoteCount: 0,
          pinned: false,
          deletionRequested: false,
        },
      ])
      setCitations([{ url: '', explanation: '' }])
      setShowForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit'
      setError(msg)
    }
    setSubmitting(false)
  }

  const handleVote = async (proposalId: string) => {
    if (!user) return
    setVotingId(proposalId)
    setError('')

    try {
      const voteFn = httpsCallable(functions, 'vote_proposal')
      await voteFn({ proposalId })
      setProposals((prev) =>
        prev
          .map((p) => (p.id === proposalId ? { ...p, upvoteCount: p.upvoteCount + 1 } : p))
          .sort((a, b) => b.upvoteCount - a.upvoteCount)
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to vote'
      setError(msg)
    }
    setVotingId(null)
  }

  const sorted = [...proposals].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.upvoteCount - a.upvoteCount || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const statusClasses: Record<BadgeStatus, string> = {
    unknown: 'badge-unknown',
    pledged: 'badge-pledged',
    denied: 'badge-denied',
    unkept: 'badge-unkept',
  }
  const statusIcons: Record<BadgeStatus, string> = {
    unknown: '?',
    pledged: '✓',
    denied: '✗',
    unkept: '⚠',
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {/* Badge chip — clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`badge ${statusClasses[currentStatus]}`}
        style={{ cursor: 'pointer', border: 'none' }}
        title={`${badgeDescription} — Click to view & vote on proposals`}
      >
        <span>{statusIcons[currentStatus]}</span>
        <span>{badgeName}</span>
        <span style={{ marginLeft: '0.25rem', opacity: 0.6, fontSize: '0.7rem' }}>
          {proposals.length > 0 ? `(${proposals.length})` : ''}
          {expanded ? ' ▲' : ' ▼'}
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="card" style={{ marginTop: '0.5rem', padding: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {badgeDescription}
          </p>

          {error && (
            <div style={{
              padding: '0.5rem 0.75rem', background: 'var(--danger-muted)',
              border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)',
              marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* Submit new badge proposal */}
          {user && !showForm && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>
              + Propose Badge Status (10 pts)
            </button>
          )}
          {!user && (
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              Sign in to propose a badge status.
            </p>
          )}

          {showForm && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem',
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="label">Proposed Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Object.entries(STATUS_LABELS).map(([key, { label, color, icon }]) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm ${selectedStatus === key ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedStatus(key)}
                      style={selectedStatus === key ? { background: color, borderColor: color } : {}}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label className="label">Citations (required — e.g., video clip of pledge)</label>
                {citations.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <input
                      className="input"
                      placeholder="URL (e.g., YouTube link)"
                      value={c.url}
                      onChange={(e) => {
                        const updated = [...citations]
                        updated[i].url = e.target.value
                        setCitations(updated)
                      }}
                      style={{ flex: 2 }}
                    />
                    <input
                      className="input"
                      placeholder="Description"
                      value={c.explanation}
                      onChange={(e) => {
                        const updated = [...citations]
                        updated[i].explanation = e.target.value
                        setCitations(updated)
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setCitations([...citations, { url: '', explanation: '' }])}>
                  + Add Citation
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Proposals list */}
          {sorted.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
              No proposals yet. Be the first to propose a status for this badge.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sorted.map((proposal, i) => {
                const statusInfo = STATUS_LABELS[proposal.value] || { label: proposal.value, color: 'var(--text-muted)', icon: '?' }
                return (
                  <div
                    key={proposal.id}
                    className={`proposal-card ${i === 0 && !proposal.pinned ? 'top-proposal' : ''} ${proposal.pinned ? 'pinned' : ''}`}
                    style={{ padding: '0.75rem' }}
                  >
                    <button
                      className={`upvote-btn ${votingId === proposal.id ? 'active' : ''}`}
                      onClick={() => handleVote(proposal.id)}
                      disabled={!user || proposal.pinned || votingId !== null}
                      title={proposal.pinned ? 'Pinned by admin' : 'Upvote'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4l-8 8h5v8h6v-8h5z" />
                      </svg>
                      <span className="count">{proposal.upvoteCount}</span>
                    </button>

                    <div className="proposal-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.125rem 0.5rem', borderRadius: '999px',
                          fontSize: '0.75rem', fontWeight: 600,
                          background: `${statusInfo.color}20`, color: statusInfo.color,
                        }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        {proposal.pinned && (
                          <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>📌 Pinned</span>
                        )}
                        {i === 0 && !proposal.pinned && (
                          <span style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem' }}>★ Top</span>
                        )}
                      </div>
                      <div className="proposal-meta" style={{ marginTop: '0.25rem' }}>
                        <span>by {proposal.authorDisplayName}</span>
                        <span> • </span>
                        <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                      </div>
                      {proposal.citations.length > 0 && (
                        <div className="citation-list" style={{ marginTop: '0.375rem' }}>
                          {proposal.citations.map((c, j) => (
                            <a key={j} href={c.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                              🔗 {c.url.length > 50 ? c.url.substring(0, 50) + '...' : c.url}
                              {c.explanation && <span style={{ color: 'var(--text-muted)' }}> — {c.explanation}</span>}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
