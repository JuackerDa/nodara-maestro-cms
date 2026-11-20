import { redirect } from 'next/navigation'
import { CatalogAdmin } from '@/components/admin/catalog'
import { db } from '@/lib/db'
import { adminUser } from '@/lib/http'

export const metadata = { title: 'Catálogo' }
export default async function CatalogPage() {
  const [user, plan] = await Promise.all([adminUser(), db.planModules.findUniqueOrThrow({ where: { id: 'site' } })])
  if (!plan.enableCatalog && user.role !== 'SUPER_ADMIN') redirect('/admin')
  const [products, categories, media] = await Promise.all([
    db.product.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { category: true, image: true } }),
    db.category.findMany({ orderBy: { order: 'asc' } }),
    db.media.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, url: true, altText: true, filename: true } }),
  ])
  return <CatalogAdmin products={products} categories={categories} media={media} maxProducts={plan.maxProducts} maxCategories={plan.maxCategories} enabled={plan.enableCatalog}/>
}
