import { SeoAdmin } from '@/components/admin/seo'
import { db } from '@/lib/db'
import { adminUser } from '@/lib/http'
import { publicContext } from '@/lib/public-data'

export const metadata = { title: 'SEO' }
export default async function SeoPage() {
  await adminUser()
  const [{ site }, pages, media] = await Promise.all([
    publicContext(), db.page.findMany({ orderBy: { order: 'asc' } }),
    db.media.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, filename: true, url: true, altText: true, width: true, height: true } }),
  ])
  return <SeoAdmin pages={pages} media={media} domain={site.domain || process.env.APP_ORIGIN || ''} name={site.siteName} tagline={site.tagline}/>
}
