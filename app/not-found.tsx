import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>404</h1>
      <p className="text-secondary" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
        This page doesn&apos;t exist. The candidate you&apos;re looking for may not have been added yet.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <Link href="/" className="btn btn-primary">Go Home</Link>
        <Link href="/create" className="btn btn-secondary">Create Candidate</Link>
      </div>
    </div>
  )
}
