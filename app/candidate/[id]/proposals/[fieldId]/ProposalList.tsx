'use client'

import { useState } from 'react'
import { useAuth } from '@/app/components/AuthProvider'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import type { Proposal } from '@/lib/types'

interface ProposalListProps {
  candidateId: string
  fieldId: string
  periodId: string
  initialProposals: Proposal[]
  fieldName: string
}

export default function ProposalList({ candidateId, fieldId, periodId, initialProposals, fieldName }: ProposalListProps) {
  const { user } = useAuth()
  const [proposals, setProposals] = useState(initialProposals)
  const [showForm, setShowForm] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [citations, setCitations] = useState([{ url: '', explanation: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubmitProposal = async () => {
    if (!newValue.trim()) return
    setSubmitting(true)
    setError('')

    try {
      const submitFn = httpsCallable(functions, 'submit_proposal')
      const result = await submitFn({
        candidateId,
        periodId,
        fieldId,
        value: newValue,
        citations: citations.filter((c) => c.url.trim()).map((c) => ({
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
          periodId,
          fieldId,
          value: newValue,
          citations: citations.filter((c) => c.url.trim()),
          authorUid: user?.uid || '',
          authorDisplayName: user?.displayName || 'You',
          createdAt: new Date().toISOString(),
          upvoteCount: 0,
          pinned: false,
          deletionRequested: false,
        },
      ])
      setNewValue('')
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
        prev.map((p) =>
          p.id === proposalId ? { ...p, upvoteCount: p.upvoteCount + 1 } : p
        ).sort((a, b) => b.upvoteCount - a.upvoteCount)
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

  return (
    <div>
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-muted)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Submit new proposal */}
      {user && !showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '1.5rem' }}>
          + Submit a Proposal (costs 10 pts)
        </button>
      )}
      {!user && (
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Sign in with Google to submit proposals and vote.
        </p>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>New Proposal for {fieldName}</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label className="label" htmlFor="proposal-value">Proposed Value</label>
            <textarea
              id="proposal-value"
              className="textarea"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter the value you're proposing..."
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="label">Citations</label>
            {citations.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  className="input"
                  placeholder="URL"
                  value={c.url}
                  onChange={(e) => {
                    const updated = [...citations]
                    updated[i].url = e.target.value
                    setCitations(updated)
                  }}
                />
                <input
                  className="input"
                  placeholder="Explanation (optional)"
                  value={c.explanation}
                  onChange={(e) => {
                    const updated = [...citations]
                    updated[i].explanation = e.target.value
                    setCitations(updated)
                  }}
                />
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => setCitations([...citations, { url: '', explanation: '' }])}>
              + Add Citation
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleSubmitProposal} disabled={submitting || !newValue.trim()}>
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Proposals list */}
      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="text-secondary">No proposals yet for this field.</p>
          <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            Be the first to submit a value!
          </p>
        </div>
      ) : (
        sorted.map((proposal, i) => (
          <div
            key={proposal.id}
            className={`proposal-card ${i === 0 && !proposal.pinned ? 'top-proposal' : ''} ${proposal.pinned ? 'pinned' : ''}`}
          >
            {/* Upvote button */}
            <button
              className={`upvote-btn ${votingId === proposal.id ? 'active' : ''}`}
              onClick={() => handleVote(proposal.id)}
              disabled={!user || proposal.pinned || votingId !== null}
              title={proposal.pinned ? 'Pinned by admin' : 'Upvote this proposal'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-8 8h5v8h6v-8h5z" />
              </svg>
              <span className="count">{proposal.upvoteCount}</span>
            </button>

            <div className="proposal-content">
              <div className="proposal-value">{proposal.value}</div>
              <div className="proposal-meta">
                <span>by {proposal.authorDisplayName}</span>
                <span> • </span>
                <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                {proposal.pinned && (
                  <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>📌 Pinned by admin</span>
                )}
                {i === 0 && !proposal.pinned && (
                  <span style={{ color: 'var(--accent-secondary)', marginLeft: '0.5rem' }}>★ Top proposal</span>
                )}
              </div>
              {proposal.citations.length > 0 && (
                <div className="citation-list">
                  {proposal.citations.map((c, j) => (
                    <a key={j} href={c.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                      🔗 {c.url.length > 60 ? c.url.substring(0, 60) + '...' : c.url}
                      {c.explanation && <span style={{ color: 'var(--text-muted)' }}> — {c.explanation}</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
