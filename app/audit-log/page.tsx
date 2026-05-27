import type { Metadata } from 'next'
import { getRecentAuditLogs } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Audit Log',
  description: 'Public audit log of all admin actions on The Integrity Wiki for full transparency.',
}

export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  pin_proposal: { label: 'Pinned Proposal', color: 'var(--success)' },
  unpin_proposal: { label: 'Unpinned Proposal', color: 'var(--warning)' },
  ban_user_temp: { label: 'Temporary Ban', color: 'var(--danger)' },
  ban_user_perm: { label: 'Permanent Ban', color: 'var(--danger)' },
  unban_user: { label: 'Unbanned User', color: 'var(--success)' },
  award_points: { label: 'Awarded Points', color: 'var(--accent-secondary)' },
  remove_points: { label: 'Removed Points', color: 'var(--warning)' },
  delete_proposal: { label: 'Deleted Proposal', color: 'var(--danger)' },
}

export default async function AuditLogPage() {
  let logs: Awaited<ReturnType<typeof getRecentAuditLogs>> = []
  try {
    logs = await getRecentAuditLogs(100)
  } catch { /* DB may not be ready */ }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Public Audit Log</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        All admin actions are recorded here for full transparency. This includes pinning proposals,
        banning users, and adjusting credibility points.
      </p>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted">No admin actions recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map((log) => {
            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' }
            return (
              <div key={log.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: actionInfo.color, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {actionInfo.label}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <strong>Admin:</strong> {log.adminDisplayName}
                  {log.targetDisplayName && <span> → <strong>Target:</strong> {log.targetDisplayName}</span>}
                  {log.points && <span> ({log.points > 0 ? '+' : ''}{log.points} pts)</span>}
                </div>
                {log.reason && (
                  <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    &quot;{log.reason}&quot;
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
