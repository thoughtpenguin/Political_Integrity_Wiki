'use client'

import { useState } from 'react'
import { useAuth } from '@/app/components/AuthProvider'
import { submitProposalAction } from '@/lib/actions'
import { usePathname } from 'next/navigation'
import { EDITABLE_FIELDS } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'running', label: 'Running for Office' },
  { value: 'in_office', label: 'Currently In Office' },
  { value: 'out_of_office', label: 'Out of Office' },
  { value: 'unknown', label: 'Unknown' },
]

function isUrlSafeClient(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname.toLowerCase()
    const blocked = ['localhost', 'metadata.google.internal', 'instance-data']
    if (blocked.some(h => hostname === h || hostname.endsWith('.' + h))) return false
    if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|0\.0\.0\.0$)/.test(hostname)) return false
    if (/^\[?::1\]?$/.test(hostname) || /^\[?fe80:/i.test(hostname)) return false
    if (parsed.username || parsed.password) return false
    return true
  } catch {
    return false
  }
}

export default function ProposalForm({ 
  candidateId, 
  fieldId, 
  periodId, 
  fieldName 
}: { 
  candidateId: string
  fieldId: string
  periodId: string
  fieldName: string
}) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [showForm, setShowForm] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [citations, setCitations] = useState([{ url: '', explanation: '' }])
  const [loading, setLoading] = useState(false)
  const [photoError, setPhotoError] = useState(false)

  const field = EDITABLE_FIELDS.find(f => f.id === fieldId)
  const isNumber = field?.type === 'number'
  const isList = field?.type === 'json'
  const isPhoto = field?.type === 'photo'
  const isStatus = fieldId === 'status'
  const citationOptional = field?.citationOptional

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          Sign in with Google to submit proposals.
        </p>
      </div>
    )
  }

  if (!showForm) {
    return (
      <button className="btn btn-primary" onClick={() => setShowForm(true)}>
        + Submit a Proposal (costs 10 pts)
      </button>
    )
  }

  const validateAndSubmit = async (formData: FormData) => {
    setLoading(true)
    
    if (isNumber && newValue !== 'Unknown') {
      if (!/^-?\d+(\.\d+)?$/.test(newValue.trim())) {
        alert('Please enter a valid number')
        setLoading(false)
        return
      }
    }

    if (isList) {
      try {
        const parsed = JSON.parse(newValue)
        if (field?.id === 'top_pac_donors') {
          if (!Array.isArray(parsed)) throw new Error('Must be an array')
          if (field.maxLength && parsed.length > field.maxLength) {
            alert(`Maximum ${field.maxLength} donors allowed`)
            setLoading(false)
            return
          }
        }
      } catch {
        alert('Please enter valid JSON data for this field')
        setLoading(false)
        return
      }
    }

    // Client-side URL safety check for photo
    if (isPhoto && newValue && newValue !== 'Unknown') {
      if (!isUrlSafeClient(newValue)) {
        alert('Photo URL must be a valid HTTPS URL pointing to a public resource.')
        setLoading(false)
        return
      }
    }

    const filteredCitations = citations.filter(c => c.url.trim())

    // Validate citation URLs
    for (const c of filteredCitations) {
      if (!isUrlSafeClient(c.url)) {
        alert(`Citation URL must be a valid HTTPS URL: ${c.url}`)
        setLoading(false)
        return
      }
    }

    if (!citationOptional && filteredCitations.length === 0) {
      alert('At least one citation is required for this field.')
      setLoading(false)
      return
    }

    // Add additional data that isn't easily handled by standard form fields
    formData.append('citations', JSON.stringify(filteredCitations))
    formData.append('path', pathname)
    formData.append('uid', user.uid)
    
    await submitProposalAction(formData)
    
    setLoading(false)
    setShowForm(false)
    setNewValue('')
    setCitations([{ url: '', explanation: '' }])
  }

  // Render the appropriate input based on field type
  const renderValueInput = () => {
    if (isStatus) {
      return (
        <select
          id="proposal-value"
          name="value"
          className="input"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          required
          style={{ width: '100%', padding: '0.625rem 0.75rem' }}
        >
          <option value="" disabled>Select a status...</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    if (isPhoto) {
      return (
        <>
          <input
            id="proposal-value"
            name="value"
            type="url"
            className="input"
            value={newValue}
            onChange={(e) => {
              setNewValue(e.target.value)
              setPhotoError(false)
            }}
            placeholder="https://example.com/photo.jpg"
            required
          />
          {newValue && isUrlSafeClient(newValue) && (
            <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 280 }}>
              {!photoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={newValue} 
                  alt="Photo preview" 
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 320, objectFit: 'cover' }}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Unable to load image preview
                </div>
              )}
            </div>
          )}
          {newValue && !isUrlSafeClient(newValue) && newValue !== 'Unknown' && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--danger)' }}>
              URL must be a valid HTTPS link to a public resource.
            </div>
          )}
        </>
      )
    }

    if (isNumber) {
      return (
        <input
          id="proposal-value"
          name="value"
          type="number"
          step="any"
          className="input"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Enter a numeric value..."
          required
        />
      )
    }

    // Default: textarea for text, JSON, etc.
    return (
      <textarea
        id="proposal-value"
        name="value"
        className="textarea"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder={isList ? '[{"name": "Example PAC", "amount": 5000, "type": "Corporate"}]' : "Enter the value..."}
        required
      />
    )
  }

  return (
    <div className="card animate-fade-in">
      <h4 style={{ marginBottom: '1rem' }}>New Proposal for {fieldName}</h4>
      <form action={validateAndSubmit}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="fieldId" value={fieldId} />
        <input type="hidden" name="periodId" value={periodId} />

        <div style={{ marginBottom: '1rem' }}>
          <label className="label" htmlFor="proposal-value">
            Proposed Value
            {isNumber && ' (Number)'}
            {isList && ' (JSON)'}
            {isPhoto && ' (HTTPS Image URL)'}
          </label>
          {renderValueInput()}
          {!isStatus && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-xs" 
                onClick={() => {
                  setNewValue('Unknown')
                  setPhotoError(false)
                }}
              >
                Set to &quot;Unknown&quot;
              </button>
              {field?.id === 'top_pac_donors' && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-xs" 
                  onClick={() => setNewValue('[]')}
                >
                  Set to Empty List
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label">Citations {!citationOptional && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
          {citations.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                className="input"
                placeholder="URL (https://...)"
                type="url"
                value={c.url}
                onChange={(e) => {
                  const updated = [...citations]
                  updated[i].url = e.target.value
                  setCitations(updated)
                }}
              />
              <input
                className="input"
                placeholder="Explanation"
                value={c.explanation}
                onChange={(e) => {
                  const updated = [...citations]
                  updated[i].explanation = e.target.value
                  setCitations(updated)
                }}
              />
            </div>
          ))}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={() => setCitations([...citations, { url: '', explanation: '' }])}
          >
            + Add Citation
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading || (!newValue.trim() && !isStatus)}>
            {loading ? 'Submitting...' : 'Submit Proposal'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
