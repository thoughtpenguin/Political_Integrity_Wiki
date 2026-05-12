'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AuthProvider'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import IngestingModal from '@/app/components/IngestingModal'

export default function CreateCandidateForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'fec' | 'manual'>('fec')
  const [fecId, setFecId] = useState('')
  const [name, setName] = useState('')
  const [level, setLevel] = useState('federal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mergeMessage, setMergeMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { setError('Please sign in first.'); return }
    setLoading(true)
    setError('')
    setMergeMessage('')

    try {
      if (mode === 'fec') {
        const ingestFn = httpsCallable(functions, 'ingest_fec_candidate')
        const result = await ingestFn({ fecId: fecId.trim() })
        const data = result.data as { candidateId: string; merged?: boolean; message?: string }
        if (data.merged && data.message) {
          setMergeMessage(data.message)
          setTimeout(() => router.push(`/candidate/${data.candidateId}`), 2000)
        } else {
          router.push(`/candidate/${data.candidateId}`)
        }
      } else {
        const createFn = httpsCallable(functions, 'create_candidate')
        const result = await createFn({ name: name.trim(), level })
        const data = result.data as { candidateId: string }
        router.push(`/candidate/${data.candidateId}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    }
    setLoading(false)
  }

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p className="text-secondary">Please sign in with Google to create candidate pages.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <IngestingModal isOpen={loading} />
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-muted)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {mergeMessage && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--success)' }}>
          ✓ {mergeMessage} Redirecting...
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button type="button" className={`btn ${mode === 'fec' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('fec')}>
          Import from FEC
        </button>
        <button type="button" className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('manual')}>
          Create Manually
        </button>
      </div>

      {mode === 'fec' ? (
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <label className="label" htmlFor="fec-id">FEC Candidate ID(s)</label>
            <input
              id="fec-id"
              className="input"
              value={fecId}
              onChange={(e) => setFecId(e.target.value)}
              placeholder="e.g. P80001571, S4VT00033"
              required
            />
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.375rem' }}>
              For candidates who ran for multiple federal positions, enter comma-separated FEC IDs.<br/>
              Find candidate IDs at <a href="https://www.fec.gov/data/candidates/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>fec.gov/data/candidates</a>
            </p>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
              If a candidate with the same name already exists, the new FEC data will be automatically merged into their profile.
            </p>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !fecId.trim()}>
            Import Candidate
          </button>
        </div>
      ) : (
        <div className="card">
          <div style={{ marginBottom: '1rem' }}>
            <label className="label" htmlFor="candidate-name">Candidate Name</label>
            <input
              id="candidate-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name of the candidate"
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className="label" htmlFor="candidate-level">Level</label>
            <select id="candidate-level" className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="federal">Federal</option>
              <option value="state">State (requires 1,000 pts)</option>
              <option value="local">Local (requires 1,000 pts)</option>
            </select>
          </div>
          {level !== 'federal' && (
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
              You have {user.credibilityPoints} credibility points. You need 1,000 to create {level} candidates.
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !name.trim()}>
            Create Candidate Page
          </button>
        </div>
      )}
    </form>
  )
}
