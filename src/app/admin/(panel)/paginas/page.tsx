import { PageEditor } from '@/components/admin/page-editor'
import { db } from '@/lib/db'
import { adminUser } from '@/lib/http'
import { publicContext, publicProducts } from '@/lib/public-data'
import { catalogPageId, readJson } from '@/lib/content'

export const metadata = { title: 'Páginas' }
export default async function Pages() {
  const [user, { site, theme, plan, pages: navigation }, records, media] = await Promise.all([
    adminUser(), publicContext(),
    db.page.findMany({ where: { id: { not: catalogPageId } }, orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } }),
    db.media.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, filename: true, url: true, altText: true } }),
  ])
  const products = plan.enableCatalog ? await publicProducts() : []
  const pages = records.map(page => ({
    id: page.id, title: page.title, status: page.status, version: page.updatedAt.toISOString(),
    pending: page.blocks.some(block => block.draftRemoved ? block.publishedDataJson !== '{}' :
      block.order !== block.publishedOrder || block.visible !== block.publishedVisible || block.draftDataJson !== block.publishedDataJson),
    blocks: page.blocks.filter(block => !block.draftRemoved).map(block => ({
      id: block.id, type: block.type, visible: block.visible, locked: block.lockedStructure, data: readJson(block.draftDataJson, {}),
    })),
  }))
  return <PageEditor pages={pages} media={media} products={products} theme={theme} site={site} navigation={navigation}
    maxPages={plan.maxPages} catalog={plan.enableCatalog} agency={user.role === 'SUPER_ADMIN'}/>
}
