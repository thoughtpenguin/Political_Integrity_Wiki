import type { Metadata } from 'next'
import TermsOfServiceClient from './TermsOfServiceClient'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the Terms of Service for The Integrity Wiki.',
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />
}
