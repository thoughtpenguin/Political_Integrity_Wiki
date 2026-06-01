'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase-client'
import { POSITION_LABELS } from '@/lib/types'
import IngestingModal from './IngestingModal'

interface Props {
  candidateId: string
  isOpen: boolean
  onClose: () => void
}

interface AddPeriodParams {
  candidateId: string
  fecId?: string
  position?: string
  yearStart?: number
  yearEnd?: number
  party?: string
  region?: string
  state?: string
  result?: string
}

export default function AddAccountabilityPeriodModal({ candidateId, isOpen, onClose }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'fec' | 'manual'>('fec')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const addFn = httpsCallable<AddPeriodParams, { success: boolean }>(functions, 'add_accountability_period', {timeout: 600000})
      
      const params: AddPeriodParams = { candidateId }
      if (mode === 'fec') {
        const fecIdVal = formData.get('fecId')
        if (fecIdVal) params.fecId = fecIdVal as string
      } else {
        const positionVal = formData.get('position')
        if (positionVal) params.position = positionVal as string

        const yearStartVal = formData.get('yearStart')
        if (yearStartVal) params.yearStart = parseInt(yearStartVal as string)

        const yearEndVal = formData.get('yearEnd')
        if (yearEndVal) params.yearEnd = parseInt(yearEndVal as string)

        const partyVal = formData.get('party')
        if (partyVal) params.party = partyVal as string

        const regionVal = formData.get('region')
        if (regionVal) params.region = regionVal as string

        const stateVal = formData.get('state')
        if (stateVal) params.state = stateVal as string

        const resultVal = formData.get('result')
        if (resultVal) params.result = resultVal as string
      }

      await addFn(params)
      onClose()
      router.refresh()
    } catch (err) {
      console.error('Failed to add period:', err)
      const message = err instanceof Error ? err.message : 'An error occurred.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <IngestingModal isOpen={loading} />
      <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Add Accountability Period</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className={`btn btn-sm ${mode === 'fec' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setMode('fec')}
          >
            By FEC ID
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setMode('manual')}
          >
            By Name (1,000 pts)
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '0.75rem 1rem', background: 'var(--danger-muted)', 
            border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', 
            marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger)' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'fec' ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">FEC Candidate ID</label>
                <input name="fecId" className="input" placeholder="e.g. S4VT00033" required />
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.375rem' }}>
                  This will automatically pull all historical election data for this ID.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="modal-grid-2-col">
                <div>
                  <label className="label">Year Start</label>
                  <input name="yearStart" type="number" className="input" placeholder="2022" required />
                </div>
                <div>
                  <label className="label">Year End</label>
                  <input name="yearEnd" type="number" className="input" placeholder="2024" required />
                </div>
              </div>
              <div className="modal-grid-2-col">
                <div>
                  <label className="label">Position</label>
                  <select name="position" className="select" required>
                    {Object.entries(POSITION_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Result</label>
                  <select name="result" className="select" required>
                    <option value="unknown">Unknown</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="active">Active/Ongoing</option>
                    <option value="withdrew">Withdrew</option>
                  </select>
                </div>
              </div>
              <div className="modal-grid-2-col">
                <div>
                  <label className="label">Party</label>
                  <input name="party" className="input" placeholder="Democratic" />
                </div>
                <div>
                  <label className="label">State (Abbr)</label>
                  <input name="state" className="input" placeholder="VT" maxLength={2} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Region</label>
                <input name="region" className="input" placeholder="e.g. VT-01 or Vermont" />
              </div>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {mode === 'fec' ? 'Import Data' : 'Add Period (1,000 pts)'}
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
