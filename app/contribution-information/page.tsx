import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contribution Information',
  description: 'Rules, instructions, and guidelines for contributing campaign finance and integrity data. Learn how to find FEC IDs and import politician records.',
}

export default function ContributionInformationPage() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: 800, paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div 
          className="hero-badge" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.375rem', 
            padding: '0.25rem 0.75rem', 
            background: 'var(--accent-glow)', 
            border: '1px solid var(--accent-primary)', 
            borderRadius: '9999px', 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            color: 'var(--accent-primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            marginBottom: '1rem'
          }}
        >
          ✍️ Contributor Guide
        </div>
        <h1 id="page-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Contribution Information
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.0625rem', maxWidth: '600px', margin: '0 auto' }}>
          Thank you for helping us build a transparent, fact-checked directory of campaign finance integrity. Here is everything you need to know to get started.
        </p>
      </header>

      {/* Section 1: Core Rules */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span> Core Contribution Rules
        </h2>
        <p className="text-secondary" style={{ marginBottom: '1rem' }}>
          To maintain the highest standards of integrity and neutrality, all contributions must follow these strict rules:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Factual & Verifiable:</strong> Every proposal must be supported by credible, publicly accessible sources. Avoid rumor, speculation, or biased interpretations.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Objective Formatting:</strong> Keep all descriptions, candidate summaries, and explanations strictly neutral. Use direct quotes or simple factual reporting.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Primary Source Focus:</strong> For financial data, the Federal Election Commission (FEC) is always the gold standard. For local elections, official state or municipal campaign finance portals are required.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Accurate Citations:</strong> You must provide direct links (URLs) to the original source materials when proposing or updating values.
          </li>
        </ul>
      </section>

      {/* Section 2: FEC Candidate IDs */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔑</span> How to Find & Enter FEC IDs
        </h2>
        <p className="text-secondary" style={{ marginBottom: '1rem' }}>
          For federal candidates (President, U.S. Senate, and U.S. House), entering their official FEC ID allows our platform to automatically import and verify financial records directly from the FEC database.
        </p>
        
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Step-by-Step Instructions:
          </h3>
          <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <li>Go to the official Federal Election Commission data portal at <a id="fec-data-link" href="https://www.fec.gov/data/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'underline' }}>fec.gov/data</a>.</li>
            <li>Use the search bar at the top of the FEC site to type the candidate&apos;s name.</li>
            <li>Select the candidate from the search results to view their profile page.</li>
            <li>Locate the unique <strong>Candidate ID</strong>. It usually begins with:
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', listStyleType: 'circle' }}>
                <li><code>P</code> for Presidential candidates (e.g., <code>P80001571</code>)</li>
                <li><code>S</code> for Senate candidates (e.g., <code>S4VT00033</code>)</li>
                <li><code>H</code> for House of Representatives candidates (e.g., <code>H2NY19077</code>)</li>
              </ul>
            </li>
            <li>Copy this ID and paste it into the <strong>FEC Candidate ID</strong> input field when creating a candidate profile or adding an election period.</li>
          </ol>
        </div>

        {/* Highlight callout on duplicate entries */}
        <div 
          style={{ 
            padding: '1rem', 
            background: 'var(--accent-glow)', 
            border: '1px solid var(--accent-primary)', 
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)'
          }}
        >
          💡 <strong>Note on Duplicate Entries:</strong> When searching for a candidate on the FEC&apos;s website, the politician may come up multiple times if they have run for multiple different positions or offices over the years (for example, running first for the U.S. House and later for the U.S. Senate). 
          <br /><br />
          To ensure complete records, <strong>our website automatically combines these entries into a single candidate profile</strong>. Simply retrieve all of the candidate&apos;s different FEC IDs and enter them separated by commas (e.g. <code>S4VT00033, P80001571</code>) when creating a candidate or updating their IDs.
        </div>
      </section>

      {/* Section 3: Data Fields */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> What Data Can You Contribute?
        </h2>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
          You can suggest edits or additions to the following details on any candidate&apos;s profile page:
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              📆 Accountability Periods
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Add election years, the office/position run for, political party affiliation, state, district region, and final election results.
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              🏅 Integrity Badges
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Provide documentation showing whether a candidate has taken specific pledges (e.g., rejecting corporate PAC contributions, supporting stock-trading bans) or has violated them.
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              💵 Financial Statistics
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Contribute manually sourced state/local campaign funding metrics such as total funds raised, total spent, percentage from PACs, and cash-on-hand.
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              🔗 Citation Source URLs
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Add explanatory notes and confirm validity of existing citations, strengthening the integrity index.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Privacy Policy */}
      <section className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔒</span> Privacy & Data Collection Guarantee
        </h2>
        <p className="text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
          We value your trust and security. When you register an account or contribute to The Integrity Wiki, we strictly adhere to a zero-surveillance and minimal data retention standard:
        </p>
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          ✔️ <strong>No Tracking:</strong> We do not sell, share, or analyze user data for advertising, marketing, or behavioral tracking.
          <br />
          ✔️ <strong>Contributed Data Only:</strong> The only information we store in our database is the specific profile details you choose to enter (such as display name and chosen profile photo) and the factual campaign data contributions/proposals you actively submit to candidate profiles.
        </div>
      </section>
    </div>
  )
}
