'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import { useAuth } from '@/app/components/AuthProvider'
import { usePointsConfig } from '@/app/components/PointsConfigProvider'
import type { Proposal } from '@/lib/types'

interface ProposalActionsProps {
  proposal: Proposal
  candidateId: string
  fieldId: string
}

type ModalType = 'none' | 'ban' | 'points' | 'pin' | 'unpin' | 'delete' | 'request_deletion'

export default function ProposalActions({ proposal, candidateId }: ProposalActionsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const config = usePointsConfig()
  
  const [loading, setLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  
  // Form fields
  const [reason, setReason] = useState('')
  const [banDuration, setBanDuration] = useState('7')
  const [isPermanent, setIsPermanent] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('50')

  const isAuthor = user && user.uid === proposal.authorUid
  const isAdmin = user && user.isAdmin

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (activeModal === 'request_deletion') {
        const fn = httpsCallable<{ proposalId: string }, { success: boolean }>(functions, 'request_proposal_deletion')
        await fn({ proposalId: proposal.id })
        alert('Deletion request submitted successfully.')
      } 
      else if (activeModal === 'pin') {
        const fn = httpsCallable<{ proposalId: string; reason: string }, { success: boolean }>(functions, 'admin_pin_proposal')
        await fn({ proposalId: proposal.id, reason: reason || 'No reason provided' })
        alert('Proposal pinned successfully.')
      } 
      else if (activeModal === 'unpin') {
        const fn = httpsCallable<{ proposalId: string; reason: string }, { success: boolean }>(functions, 'admin_unpin_proposal')
        await fn({ proposalId: proposal.id, reason: reason || 'No reason provided' })
        alert('Proposal unpinned successfully.')
      } 
      else if (activeModal === 'delete') {
        const fn = httpsCallable<{ proposalId: string; reason: string }, { success: boolean }>(functions, 'admin_delete_proposal')
        await fn({ proposalId: proposal.id, reason: reason || 'No reason provided' })
        alert('Proposal deleted successfully.')
      } 
      else if (activeModal === 'ban') {
        const fn = httpsCallable<{
          targetUid: string
          permanent: boolean
          durationDays: number
          reason: string
        }, { success: boolean }>(functions, 'admin_ban_user')
        await fn({
          targetUid: proposal.authorUid,
          permanent: isPermanent,
          durationDays: isPermanent ? 0 : parseInt(banDuration) || 7,
          reason: reason || 'No reason provided',
        })
        alert(`User banned successfully.`)
      } 
      else if (activeModal === 'points') {
        const fn = httpsCallable<{
          targetUid: string
          points: number
          reason: string
        }, { success: boolean }>(functions, 'admin_award_points')
        await fn({
          targetUid: proposal.authorUid,
          points: parseInt(pointsAmount) || 0,
          reason: reason || 'No reason provided',
        })
        alert(`Points adjusted successfully.`)
      }
      
      setActiveModal('none')
      setReason('')
      router.refresh()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Action failed.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReport = async () => {
    if (!confirm(`Are you sure you want to report this proposal? It costs ${config.reportProposalCost} points. Use this to report inappropriate or malicious material.`)) return

    setLoading(true)
    try {
      const reportFn = httpsCallable<{
        proposalId: string
        candidateId: string
      }, { success: boolean }>(functions, 'report_proposal')
      await reportFn({ proposalId: proposal.id, candidateId })
      alert('Proposal reported successfully.')
      router.refresh()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Failed to report proposal'
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  // Determine what to show
  const showReport = user && !isAuthor && !isAdmin
  const showRequestDeletion = user && isAuthor && !proposal.deletionRequested
  const showDeletionRequestedBadge = proposal.deletionRequested

  return (
    <>
      <div className="proposal-actions-container">
        {/* Public Action / Status badges */}
        {showDeletionRequestedBadge && (
          <span className="action-badge deletion-requested">
            ⚠ Deletion Requested
          </span>
        )}

        {/* Regular User Action */}
        {showReport && (
          <button 
            onClick={handleReport} 
            disabled={loading}
            className="btn-admin"
            style={{ textDecoration: 'underline', border: 'none', background: 'transparent' }}
          >
            {loading ? 'Reporting...' : `Report (${config.reportProposalCost} pts)`}
          </button>
        )}

        {/* Author Action */}
        {showRequestDeletion && (
          <button 
            onClick={() => setActiveModal('request_deletion')}
            disabled={loading}
            className="btn-admin btn-admin-danger"
          >
            Request Deletion
          </button>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <>
            {proposal.pinned ? (
              <button 
                onClick={() => setActiveModal('unpin')}
                disabled={loading}
                className="btn-admin btn-admin-danger"
              >
                📌 Unpin Proposal
              </button>
            ) : (
              <button 
                onClick={() => setActiveModal('pin')}
                disabled={loading}
                className="btn-admin btn-admin-success"
              >
                📌 Pin Proposal
              </button>
            )}

            <button 
              onClick={() => setActiveModal('delete')}
              disabled={loading}
              className="btn-admin btn-admin-danger"
            >
              🗑 Delete
            </button>

            <button 
              onClick={() => setActiveModal('ban')}
              disabled={loading}
              className="btn-admin btn-admin-danger"
            >
              🚫 Ban Author
            </button>

            <button 
              onClick={() => setActiveModal('points')}
              disabled={loading}
              className="btn-admin"
            >
              ⚖ Adjust Points
            </button>
          </>
        )}
      </div>

      {/* Dynamic Modal Overlay */}
      {activeModal !== 'none' && (
        <div className="modal-overlay animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-card)', border: '1px solid var(--border-hover)' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>
              {activeModal === 'request_deletion' && 'Confirm Deletion Request'}
              {activeModal === 'pin' && 'Pin Proposal'}
              {activeModal === 'unpin' && 'Unpin Proposal'}
              {activeModal === 'delete' && 'Delete Proposal'}
              {activeModal === 'ban' && `Ban Author: ${proposal.authorDisplayName}`}
              {activeModal === 'points' && `Adjust Credibility: ${proposal.authorDisplayName}`}
            </h3>
            
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {activeModal === 'request_deletion' && 'Are you sure you want to request deletion of your proposal? This request will be sent to the administrators for review.'}
              {activeModal === 'pin' && 'Pinning this proposal will lock the upvote system, set this value as verified, and award credibility rewards to the author (200 pts) and upvoters (150 pts).'}
              {activeModal === 'unpin' && 'Unpinning will unlock the upvote system and allow community contributions for this field again.'}
              {activeModal === 'delete' && 'This will permanently delete this proposal and its votes from the database.'}
              {activeModal === 'ban' && 'Suspending this user will restrict their ability to post or vote, and ban their last known IP address.'}
              {activeModal === 'points' && 'Directly award or deduct credibility points for this contributor.'}
            </p>

            <form onSubmit={handleAction}>
              {/* Optional Durations/Amounts based on modal */}
              {activeModal === 'ban' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                      type="checkbox" 
                      checked={isPermanent} 
                      onChange={(e) => setIsPermanent(e.target.checked)}
                    />
                    Permanent Ban
                  </label>
                  
                  {!isPermanent && (
                    <div className="modal-input-group">
                      <label>Ban Duration (Days)</label>
                      <input 
                        type="number" 
                        className="input" 
                        value={banDuration} 
                        onChange={(e) => setBanDuration(e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'points' && (
                <div className="modal-input-group">
                  <label>Adjust Points (use negative values to deduct)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={pointsAmount} 
                    onChange={(e) => setPointsAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Reason input for all Admin Actions */}
              {activeModal !== 'request_deletion' && (
                <div className="modal-input-group">
                  <label>Reason for Action</label>
                  <textarea 
                    className="input" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a detailed reason for the audit logs..."
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className={`btn ${activeModal.includes('delete') || activeModal.includes('ban') ? 'btn-primary' : 'btn-primary'}`} 
                  style={{ 
                    flex: 1, 
                    background: activeModal.includes('delete') || activeModal.includes('ban') ? 'var(--danger)' : 'var(--accent-primary)' 
                  }}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setActiveModal('none')
                    setReason('')
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
