import 'server-only'
import { cache } from 'react'
import type { Metadata } from 'next'
import type { Page } from '@prisma/client'
import { db } from './db'
import { blockMediaIds } from './schemas'
import type { RenderBlock } from '@/components/public'
import { catalogPageId, readJson } from './content'

export const publicContext = cache(async () => {
  const [site, theme, plan, pages] = await Promise.all([
    db.siteConfig.findUniqueOrThrow({ where: { id: 'site' }, include: { logo: true, favicon: true } }),
    db.themeConfig.findUniqueOrThrow({ where: { id: 'site' } }),
    db.planModules.findUniqueOrThrow({ where: { id: 'site' } }),
    db.page.findMany({ where: { status: 'PUBLISHED', id: { not: catalogPageId } }, orderBy: { order: 'asc' }, select: { slug: true, title: true, isHome: true } }),
  ])
  return { site, theme, plan, pages }
})
export const publishedPage = cache((slug?: string) => db.page.findFirst({
  where: { status: 'PUBLISHED', ...(slug ? { slug } : { isHome: true }) },
  include: { ogImage: true, blocks: { where: { publishedVisible: true }, orderBy: { publishedOrder: 'asc' } } },
}))
export const catalogSeo = cache(() => db.page.findUnique({ where: { id: catalogPageId }, include: { ogImage: true } }))
export const publicProducts = (category?: string) => db.product.findMany({
  where: { visible: true, ...(category ? { category: { slug: category } } : {}) },
  include: { image: { select: { id: true, url: true, altText: true } }, category: { select: { name: true } } },
  orderBy: [{ order: 'asc' }, { id: 'asc' }],
})
export async function renderData(page: NonNullable<Awaited<ReturnType<typeof publishedPage>>>, catalog: boolean) {
  const blocks: RenderBlock[] = page.blocks
    .filter(block => catalog || block.type !== 'CATALOG_PREVIEW')
    .map(block => ({ id: block.id, type: block.type, data: readJson(block.publishedDataJson, {}), visible: true }))
  const ids = [...new Set(blocks.flatMap(block => blockMediaIds(block.data)))]
  const [media, products] = await Promise.all([
    ids.length ? db.media.findMany({ where: { id: { in: ids } }, select: { id: true, url: true, altText: true } }) : [],
    catalog && blocks.some(block => block.type === 'CATALOG_PREVIEW') ? publicProducts() : [],
  ])
  return { blocks, media, products }
}
export async function pageMetadata(page: (Page & { ogImage: { url: string, altText: string, width: number | null, height: number | null } | null }) | null, catalog = false): Promise<Metadata> {
  if (!page && !catalog) return {}
  const { site } = await publicContext()
  const title = page?.seoTitle || (catalog ? 'Catálogo | ' + site.siteName : page?.isHome ? site.siteName : page?.title + ' | ' + site.siteName)
  const description = page?.seoDescription || site.tagline
  const base = site.domain || process.env.APP_ORIGIN || process.env.VERCEL_URL && 'https://' + process.env.VERCEL_URL || 'http://localhost:3000'
  const canonical = catalog ? '/catalogo' : page?.isHome ? '/' : '/' + page?.slug
  return {
    metadataBase: new URL(base), title, description, alternates: { canonical },
    icons: site.favicon?.url,
    openGraph: {
      type: 'website', title, description, url: canonical, siteName: site.siteName, locale: 'es_GT',
      images: page?.ogImage ? [{ url: page.ogImage.url, alt: page.ogImage.altText, width: page.ogImage.width ?? undefined, height: page.ogImage.height ?? undefined }] : undefined,
    },
  }
}
