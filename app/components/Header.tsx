import Link from 'next/link'
import AuthButton from './AuthButton'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Home">
          <span className="logo-icon">⚖️</span>
          <span>Integrity Wiki</span>
        </Link>

        <SearchBar />

        <nav aria-label="Main navigation">
          <ul className="nav-links">
            <li><Link href="/how-it-works">How It Works</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
            <li><Link href="/audit-log">Audit Log</Link></li>
            <li><Link href="/create">+ Create</Link></li>
          </ul>
        </nav>

        <AuthButton />
      </div>
    </header>
  )
}
