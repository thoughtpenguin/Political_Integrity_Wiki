import type { Metadata } from 'next'
import CreateCandidateForm from './CreateCandidateForm'

export const metadata: Metadata = {
  title: 'Create Candidate Page',
  description: 'Add a new politician to The Integrity Wiki. Federal candidates can be imported via FEC ID.',
}

export default function CreatePage() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Create Candidate Page</h1>
      <CreateCandidateForm />
    </div>
  )
}
