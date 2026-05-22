'use client'

import { useEffect } from 'react'

export default function ProposalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Proposal page error:', error)
  }, [error])

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 800, paddingBottom: '4rem' }}>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Something went wrong</h2>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
          There was an error loading the proposals for this field. This can happen when the database is still building indexes.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          Try Again
        </button>
      </div>
    </div>
  )
}
