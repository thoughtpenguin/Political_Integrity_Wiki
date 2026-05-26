'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import { usePointsConfig } from '@/app/components/PointsConfigProvider'

export default function ReportPeriodAction({ candidateId, periodId }: { candidateId: string; periodId: string }) {
  const router = useRouter()
  const config = usePointsConfig()
  const [loading, setLoading] = useState(false)

  const handleReport = async () => {
    if (!confirm(`Are you sure you want to report this period as nonexistent? It costs ${config.reportPeriodCost} points. The period will be hidden pending admin review.`)) return

    setLoading(true)
    try {
      const reportFn = httpsCallable<{
        candidateId: string
        periodId: string
      }, { success: boolean }>(functions, 'report_accountability_period')
      await reportFn({ candidateId, periodId })
      alert('Period reported successfully.')
      router.refresh()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Failed to report period'
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
      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.75rem', marginTop: '1rem' }}
    >
      {loading ? 'Reporting...' : `Flag as Nonexistent (${config.reportPeriodCost} pts)`}
    </button>
  )
}
