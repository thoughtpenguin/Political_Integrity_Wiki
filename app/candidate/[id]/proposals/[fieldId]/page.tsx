import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCandidate, getProposals } from '@/lib/data'
import { EDITABLE_FIELDS } from '@/lib/types'
import type { Metadata } from 'next'
import ProposalList from './ProposalList'

export async function generateMetadata(
  props: { params: Promise<{ id: string; fieldId: string }> }
): Promise<Metadata> {
  const { id, fieldId } = await props.params
  const candidate = await getCandidate(id)
  const field = EDITABLE_FIELDS.find((f) => f.id === fieldId)
  if (!candidate || !field) return { title: 'Not Found' }
  return {
    title: `${field.name} — ${candidate.name}`,
    description: `Proposals for ${field.name} for ${candidate.name}. Vote on values and contribute data.`,
  }
}

export default async function ProposalsPage(
  props: {
    params: Promise<{ id: string; fieldId: string }>
    searchParams: Promise<{ period?: string }>
  }
) {
  const { id, fieldId } = await props.params
  const { period: periodId } = await props.searchParams

  const candidate = await getCandidate(id)
  if (!candidate) notFound()

  const field = EDITABLE_FIELDS.find((f) => f.id === fieldId)
  if (!field) notFound()

  const proposals = await getProposals(id, fieldId, periodId)

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/candidate/${id}`} style={{ color: 'var(--accent-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Back to {candidate.name}
        </Link>
      </div>

      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{field.name}</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>{field.description}</p>

      <ProposalList
        candidateId={id}
        fieldId={fieldId}
        periodId={periodId || ''}
        initialProposals={proposals}
        fieldName={field.name}
      />
    </div>
  )
}
