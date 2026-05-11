import type { Metadata } from 'next'
import CreateCandidateForm from './CreateCandidateForm'

export const metadata: Metadata = {
  title: 'Create Candidate Page',
  description: 'Add a new politician to The Integrity Wiki. Federal candidates can be imported via FEC ID.',
}

export default function CreatePage() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Create Candidate Page</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        Add a new candidate to the wiki. For federal candidates, enter their FEC ID to automatically
        import their financial data. State and local candidates require 1,000 credibility points.
      </p>
      <CreateCandidateForm />
    </div>
  )
}
