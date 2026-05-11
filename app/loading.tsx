export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: 48, width: '60%' }} />
        <div className="skeleton" style={{ height: 20, width: '40%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 200, marginTop: '1rem' }} />
      </div>
    </div>
  )
}
