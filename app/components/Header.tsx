'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthButton from './AuthButton'
import SearchBar from './SearchBar'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="header-top-row">
          <Link href="/" className="logo" aria-label="Integrity Wiki — Home" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="logo-icon" aria-hidden="true">⚖️</span>
            <span>Integrity Wiki</span>
          </Link>

          <div className="header-actions">
            <ThemeToggle />
            <AuthButton />
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="header-search-wrapper">
          <SearchBar />
        </div>

        <nav className={`site-nav ${isMobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <ul className="nav-links">
            <li>
              <Link href="/how-it-works" onClick={() => setIsMobileMenuOpen(false)}>
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" onClick={() => setIsMobileMenuOpen(false)}>
                Leaderboard
              </Link>
            </li>
            <li>
              <Link href="/contribution-information" onClick={() => setIsMobileMenuOpen(false)}>
                Contribution Info
              </Link>
            </li>
            <li>
              <Link href="/create" className="btn btn-primary btn-sm" onClick={() => setIsMobileMenuOpen(false)}>
                + Create
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

