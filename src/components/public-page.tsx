import { notFound } from 'next/navigation'
import { BlockRenderer } from './public'
import { publicContext, publishedPage, renderData } from '@/lib/public-data'

export async function PublicPage({ slug }: { slug?: string }) {
  const [{ site, theme, plan }, page] = await Promise.all([publicContext(), publishedPage(slug)])
  if (!page || slug && page.isHome) notFound()
  const { blocks, media, products } = await renderData(page, plan.enableCatalog)
  return <>
    {!blocks.some(block => block.type === 'HERO') && <h1 className="sr-only">{page.title}</h1>}
    <BlockRenderer blocks={blocks} theme={theme} data={{ site, media, products, catalog: plan.enableCatalog }} />
  </>
}
