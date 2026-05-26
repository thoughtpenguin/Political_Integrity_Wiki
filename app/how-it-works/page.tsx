import type { Metadata } from 'next'
import HowItWorksClient from './HowItWorksClient'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how The Integrity Wiki works — the contribution system, credibility points, badges, and proposal voting.',
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
