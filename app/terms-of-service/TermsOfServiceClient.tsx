'use client'

export default function TermsOfServiceClient() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
        <strong>Last Updated: May 26, 2026</strong>
      </p>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          Welcome to the Political Integrity Wiki (the &quot;Platform&quot;), accessible via wiki.politicalintegrity.us.
          The Platform is an independent, community-driven, crowdsourced data project developed and maintained by
          independent developers in partnership with the Integrity Index.
        </p>
        <p className="text-secondary" style={{ marginTop: '1rem', lineHeight: 1.7 }}>
          Please read these Terms of Service (&quot;Terms&quot;) carefully before accessing or using the Platform.
          By accessing, browsing, submitting data, upvoting, or otherwise interacting with the Platform, you
          (&quot;User,&quot; &quot;Editor,&quot; or &quot;you&quot;) agree to be bound by these Terms. If you do not
          agree to all of these Terms, you are explicitly prohibited from using the Platform.
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>1. Description of Service and Non-Commercial Nature</h2>
        <p className="text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>
          The Platform provides an interactive crowd-sourced venue for tracking, compiling, and displaying campaign
          finance data, stock trading volumes, industry participation, and political pledges of political candidates at the
          local, state, and federal levels.
        </p>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          The Platform is an educational and informational public resource. It is entirely non-commercial. The Platform
          does not solicit donations, sell advertising, or charge for access. While hosted on a subdomain provided by
          the Integrity Index, the Platform operates independently of any Political Action Committee (PAC) fundraising
          operations.
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>2. Eligibility and User Accounts</h2>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Age Requirements:</strong> You must be at least 18 years of age (or the age of majority in your
            jurisdiction) to create an account, submit data, or participate in the voting system.
          </li>
          <li>
            <strong>Account Accuracy:</strong> If you create an account, you must provide accurate and complete information.
            You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur
            under your account.
          </li>
          <li>
            <strong>Leaderboards and Display Names:</strong> Active participation rewards users with a gamified point system.
            Top editors may be featured on a public leaderboard. You agree not to use display names that are defamatory,
            profane, impersonate real individuals, or violate third-party intellectual property rights.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>3. User-Generated Content and Crowdsourcing Rules</h2>
        <p className="text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>
          The core functionality of the Platform relies on data fields (e.g., PAC funding, stock volume, candidate status)
          populated by users and sorted via an upvote system. By submitting data, proposals, or content (&quot;User Content&quot;),
          you represent, warrant, and covenant that:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Factual Accuracy:</strong> You will exert your best efforts to submit verifiable, factually accurate
            campaign finance data and political disclosures.
          </li>
          <li>
            <strong>Primary Source Attribution:</strong> Whenever possible, submissions must correspond to verified public
            disclosure reports, public listings, or direct records.
          </li>
          <li>
            <strong>Prohibited Content:</strong> You will not submit content that is intentionally fraudulent, misleading,
            malicious, defamatory, libelous, or constitutes &quot;false light&quot; invasion of privacy against any candidate
            or individual.
          </li>
          <li>
            <strong>Platform Curation:</strong> You acknowledge that the Platform displays the most-upvoted proposal for
            any given data field. The display of a data field does not constitute an endorsement of its accuracy by the
            Platform administrators or hosts.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>4. Strict Compliance with Campaign Finance and Election Laws</h2>
        <p className="text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>
          To maintain the legal protections afforded to the Platform, all users must adhere to strict political neutrality and
          independent boundaries:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>No Candidate/Campaign Coordination:</strong> You explicitly warrant that your edits, submissions, upvotes,
            and data curation are performed completely independently of any political candidate, campaign committee, or authorized agent.
          </li>
          <li>
            <strong>Campaign Staff Prohibition:</strong> If you are a candidate, a paid staff member of a political campaign,
            or a formal consultant to a campaign, you are <strong>strictly prohibited</strong> from editing, submitting data to,
            or manipulating the upvote counts on your own candidate profile or your direct opponents&apos; profiles.
          </li>
          <li>
            <strong>No Express Advocacy:</strong> User Content must remain informative and factual. The submission of explicit
            campaign advertisements, coordinate instructions, or explicit directives to &quot;Vote For&quot; or &quot;Vote Against&quot;
            a candidate is prohibited and will be summarily removed.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>5. Data Scraping, Sourcing, and Local Jurisdiction Rules</h2>
        <p className="text-secondary" style={{ marginBottom: '0.75rem', lineHeight: 1.7 }}>
          The Platform tracks candidates across federal, state, and local lines. Because federal laws do not protect state-level data
          collection, you agree to the following data-sourcing compliance rules:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Compliance with Local Ethics Boards:</strong> When sourcing data for state or local politicians, you are
            solely responsible for ensuring that your collection methods comply with the specific terms of service, bulk-download
            limits, and data re-use policies mandated by the respective state Fair Political Practices Commission (FPPC), state
            ethics board, or county registrar.
          </li>
          <li>
            <strong>Authorized Sourcing:</strong> You verify that any text, numbers, or records you input into the Platform
            were gathered legally from publicly accessible government databases or public domain materials.
          </li>
          <li>
            <strong>Platform Scraping Restrictions:</strong> You may not use automated bots, spiders, scripts, or scrapers
            to extract data in bulk from the Platform for commercial redistribution or malicious querying without prior
            written consent from the Platform administrators.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>6. License Grant to the Platform</h2>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          By submitting User Content to the Platform, you grant the Platform a perpetual, worldwide, non-exclusive, royalty-free,
          sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, perform,
          and archive the data in connection with the Platform&apos;s mission to crowdsource public political transparency.
          You acknowledge that data contributions become a permanent part of the public wiki database.
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>7. Limitation of Liability and Section 230 Disclaimer</h2>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <li>
            <strong>Interactive Computer Service Status:</strong> You acknowledge and agree that the Platform is an
            &quot;interactive computer service&quot; provider under <strong>Section 230 of the Communications Decency Act
            (47 U.S.C. § 230)</strong>. Consequently, the Platform, its administrators, creators, and infrastructure providers
            (including the Integrity Index) are not legally liable as the publisher or speaker of any information, data fields,
            or proposals submitted, upvoted, or curated by third-party users.
          </li>
          <li>
            <strong>&quot;As Is&quot; Basis:</strong> The Platform and all content displayed on it are provided on an &quot;AS IS&quot;
            and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied, including warranties
            of accuracy, completeness, fitness for a particular purpose, or non-infringement.
          </li>
          <li>
            <strong>Indemnification:</strong> You agree to indemnify, defend, and hold harmless the Platform creators, volunteers,
            and domain hosts (including the Integrity Index) from and against any claims, liabilities, damages, losses, or expenses
            (including reasonable legal fees) arising out of or in any way connected to your violation of these Terms, your
            submission of fraudulent/defamatory data, or your violation of state/federal campaign laws.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>8. DMCA and Intellectual Property Policy</h2>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          If you believe that any content or data on the Platform infringes upon your copyright, please submit a formal
          Digital Millennium Copyright Act (DMCA) Takedown Notice to our designated contact email at{' '}
          <strong>admin@politicalintegrity.us</strong> containing the specific location of the material, a statement of
          ownership, and your electronic signature.
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>9. Modifications to Terms and Termination</h2>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          We reserve the right to modify these Terms at any time. We will notify users of any substantial changes by updating
          the &quot;Last Updated&quot; date at the top of this page. Continued use of the Platform after such modifications
          constitutes acceptance of the new Terms. We reserve the absolute right to suspend or terminate user accounts,
          ban IPs, or delete submitted data fields at our sole discretion, without notice, to maintain platform data integrity
          or legal compliance.
        </p>
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>10. Governing Law</h2>
        <p className="text-secondary" style={{ lineHeight: 1.7 }}>
          These Terms and your use of the Platform shall be governed by and construed in accordance with the laws of the United States
          and the State where the primary hosting servers are located, without regard to conflict of law principles.
        </p>
      </section>
    </div>
  )
}
