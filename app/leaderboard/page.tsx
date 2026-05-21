import type { Metadata } from 'next'
import Image from 'next/image'
import { getTopEditors } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top editors on The Integrity Wiki ranked by credibility points.',
}

export default async function LeaderboardPage() {
  let editors: Awaited<ReturnType<typeof getTopEditors>> = []
  try {
    editors = await getTopEditors(100)
  } catch { /* DB may not be ready */ }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 700 }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Leaderboard</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        Top contributors ranked by credibility points. Earn points by submitting accurate proposals and upvoting early.
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {editors.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No editors yet. Be the first to sign up and contribute!
          </div>
        ) : (
          editors.map((editor, i) => (
            <div key={editor.uid} className="leaderboard-item">
              <span className={`leaderboard-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                #{i + 1}
              </span>
              {editor.photoURL ? (
                <Image
                  src={editor.photoURL}
                  alt={editor.displayName || 'Editor avatar'}
                  width={36}
                  height={36}
                  className="leaderboard-avatar"
                />
              ) : (
                <div className="leaderboard-avatar" style={{
                  background: 'var(--bg-secondary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                }}>
                  {editor.displayName?.charAt(0) || '?'}
                </div>
              )}
              <span className="leaderboard-name">{editor.displayName}</span>
              <span className="leaderboard-points">{editor.credibilityPoints.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
