import Link from 'next/link'
import AuthButton from './AuthButton'
import SearchBar from './SearchBar'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Integrity Wiki — Home">
          <span className="logo-icon" aria-hidden="true">⚖️</span>
          <span>Integrity Wiki</span>
        </Link>

        <SearchBar />

        <nav aria-label="Main navigation">
          <ul className="nav-links">
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/audit-log">Audit Log</Link></li>
            <li>
              <Link href="/create" className="btn btn-primary btn-sm">
                + Create
              </Link>
            </li>
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <ThemeToggle />
          <AuthButton />
        </div>
      </div>
    </header>
  )
}
