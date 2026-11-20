import { notFound } from 'next/navigation'
import { PublicPage } from '@/components/public-page'
import { pageMetadata, publishedPage } from '@/lib/public-data'
import { pageFields } from '@/lib/schemas'

type Props = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return pageMetadata(await publishedPage(slug))
}
export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  if (!pageFields.shape.slug.safeParse(slug).success) notFound()
  return <PublicPage slug={slug} />
}
