import Link from 'next/link'
import { searchCandidates } from '@/lib/data'
import SearchBar from '@/app/components/SearchBar'
import { POSITION_LABELS, type Position } from '@/lib/types'

function getPartyLabel(party?: string) {
  if (!party) return ''
  const p = party.toLowerCase()
  if (p.includes('democrat')) return 'D'
  if (p.includes('republican')) return 'R'
  if (p.includes('independent')) return 'I'
  if (p.includes('libertarian')) return 'L'
  if (p.includes('green')) return 'G'
  return party
}

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await props.searchParams
  const query = q || ''
  const results = await searchCandidates(query)

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Search Results</h1>
        <div style={{ marginBottom: '2rem' }}>
          <SearchBar defaultValue={query} />
        </div>

        {query && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Showing results for &quot;{query}&quot;
          </p>
        )}

        {!query ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Enter a name, state, or region to search for candidates.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>No candidates found matching &quot;{query}&quot;.</p>
            <Link href="/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Add a New Candidate
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {results.map((c) => (
              <Link
                key={c.id}
                href={`/candidate/${c.id}/${c.latestPeriodId || ''}`}
                className="card candidate-list-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: c.photoUrl ? `url(${c.photoUrl}) center/cover no-repeat` : 'var(--accent-glow)',
                      border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.125rem', fontWeight: 800, color: 'var(--accent-primary)', flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {!c.photoUrl && c.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {c.status?.replace('_', ' ') || 'Unknown status'}
                      </div>
                      {c.latestPeriod && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {POSITION_LABELS[c.latestPeriod.position as Position] || c.latestPeriod.position}
                          {c.latestPeriod.party || c.latestPeriod.state ? ' • ' : ''}
                          {c.latestPeriod.party ? `${getPartyLabel(c.latestPeriod.party)}` : ''}
                          {c.latestPeriod.party && c.latestPeriod.state ? '-' : ''}
                          {c.latestPeriod.state ? c.latestPeriod.state : ''}
                          {` (${c.latestPeriod.yearStart} - ${c.latestPeriod.yearEnd})`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {c.topFields && Object.keys(c.topFields).length > 0 && (
                    <div style={{ 
                      marginTop: 'auto', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      {Object.entries(c.topFields).map(([name, val], idx) => {
                        if (name === 'Photo' || name === 'Current Status') return null;
                        let displayVal = val;
                        if (val.startsWith('[') || val.startsWith('{')) displayVal = 'Data provided';
                        return (
                          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{name}:</span>
                            <span style={{ fontWeight: 600, color: 'var(--accent-primary)', wordBreak: 'break-word' }}>
                              {displayVal.length > 20 ? displayVal.substring(0, 20) + '...' : displayVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

