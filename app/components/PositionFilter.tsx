'use client'

import { useRouter } from 'next/navigation'
import { POSITION_LABELS } from '@/lib/types'

interface Props {
  selectedPosition?: string
  currentLevel?: string
  currentState?: string
}

export default function PositionFilter({ selectedPosition = '', currentLevel = '', currentState = '' }: Props) {
  const router = useRouter()

  const handlePositionChange = (val: string) => {
    const params = new URLSearchParams()
    if (currentLevel) params.set('level', currentLevel)
    if (currentState) params.set('state', currentState)
    if (val) params.set('position', val)
    
    router.push(`/?${params.toString()}`)
  }

  return (
    <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <label htmlFor="position-filter" className="label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
        Filter Candidates:
      </label>
      <select
        id="position-filter"
        className="select"
        value={selectedPosition}
        onChange={(e) => handlePositionChange(e.target.value)}
        style={{ maxWidth: '280px', padding: '0.375rem 2rem 0.375rem 0.75rem', fontSize: '0.875rem', height: '36px' }}
      >
        <option value="">All Positions</option>
        {Object.entries(POSITION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
