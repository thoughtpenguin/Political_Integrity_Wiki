import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 500 }}>
            © {new Date().getFullYear()} The Integrity Wiki
          </span>
          <a
            href="https://github.com/KaiSereni/political_integrity_wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            GitHub
          </a>
        </div>

        <ul className="footer-links">
          <li><Link href="/how-it-works">How It Works</Link></li>
          <li><Link href="/terms-of-service">Terms</Link></li>
          <li><Link href="/leaderboard">Leaderboard</Link></li>
          <li><Link href="/audit-log">Audit Log</Link></li>
          <li><Link href="/sitemap.xml">Sitemap</Link></li>
          <li><Link href="/robots.txt">robots.txt</Link></li>
          <li><Link href="/llms.txt">llms.txt</Link></li>
        </ul>
      </div>
    </footer>
  )
}
