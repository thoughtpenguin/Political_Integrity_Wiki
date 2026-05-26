'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import { usePointsConfig } from '@/app/components/PointsConfigProvider'

export default function ReportProposalAction({ proposalId, candidateId }: { proposalId: string; candidateId: string }) {
  const router = useRouter()
  const config = usePointsConfig()
  const [loading, setLoading] = useState(false)

  const handleReport = async () => {
    if (!confirm(`Are you sure you want to report this proposal? It costs ${config.reportProposalCost} points. Use this to report inappropriate or malicious material.`)) return

    setLoading(true)
    try {
      const reportFn = httpsCallable<{
        proposalId: string
        candidateId: string
      }, { success: boolean }>(functions, 'report_proposal')
      await reportFn({ proposalId, candidateId })
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

  return (
    <button 
      onClick={handleReport} 
      disabled={loading}
      className="btn btn-sm" 
      style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '0.75rem', padding: '0 0.5rem', cursor: 'pointer', textDecoration: 'underline' }}
    >
      {loading ? 'Reporting...' : `Report (${config.reportProposalCost} pts)`}
    </button>
  )
}
