import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = 'https://political-integrity-wiki.web.app'

  // Static pages
  const staticPages = [
    '',
    '/how-it-works',
    '/leaderboard',
    '/audit-log',
    '/create',
  ]

  // Dynamic candidate pages
  let candidateUrls: string[] = []
  try {
    const snapshot = await adminDb.collection('candidates').select().limit(1000).get()
    candidateUrls = snapshot.docs.map((doc) => `/candidate/${doc.id}`)
  } catch {
    // DB might not be initialized
  }

  const allUrls = [...staticPages, ...candidateUrls]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${baseUrl}${url}</loc>
    <changefreq>${url === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '' ? '1.0' : url.startsWith('/candidate') ? '0.8' : '0.6'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
