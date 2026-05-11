'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { collection, query, orderBy, startAt, endAt, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

interface SearchResult {
  id: string
  name: string
  status?: string
}

export default function SearchBar({ className = '' }: { className?: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const titleCase = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
        const q = query(
          collection(db, 'candidates'),
          orderBy('name'),
          startAt(titleCase),
          endAt(titleCase + '\uf8ff'),
          limit(10)
        )
        const snapshot = await getDocs(q)
        const candidates = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          status: doc.data().status || 'unknown',
        }))
        setResults(candidates)
        setShowResults(true)
      } catch {
        setResults([])
      }
      setIsSearching(false)
    }, 300)
  }

  return (
    <div className={`search-wrapper ${className}`} ref={wrapperRef}>
      <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        id="search-candidates"
        type="search"
        className="search-input"
        placeholder="Search candidates by name..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => results.length > 0 && setShowResults(true)}
        aria-label="Search candidates"
        autoComplete="off"
      />
      {showResults && (
        <div className="search-results animate-fade-in">
          {isSearching && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching...
            </div>
          )}
          {!isSearching && results.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No candidates found
            </div>
          )}
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/candidate/${r.id}`}
              className="search-result-item"
              onClick={() => setShowResults(false)}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-secondary)',
              }}>
                {r.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {r.status?.replace('_', ' ') || 'Unknown status'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
