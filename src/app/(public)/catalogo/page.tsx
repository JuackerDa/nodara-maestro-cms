import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProductCard } from '@/components/public'
import { db } from '@/lib/db'
import { catalogSeo, pageMetadata, publicContext, publicProducts } from '@/lib/public-data'
import { z } from 'zod'

export async function generateMetadata() {
  return (await publicContext()).plan.enableCatalog ? pageMetadata(await catalogSeo(), true) : {}
}
export default async function Catalog({ searchParams }: { searchParams: Promise<{ categoria?: string | string[] }> }) {
  const { site, plan } = await publicContext()
  if (!plan.enableCatalog) notFound()
  const category = z.string().regex(/^[a-z0-9-]{1,100}$/).safeParse((await searchParams).categoria)
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { order: 'asc' } }), publicProducts(category.success ? category.data : undefined),
  ])
  return <section className="public-section catalog-section">
    <p className="public-kicker">{site.siteName}</p><h1>Catálogo</h1>
    <nav className="catalog-filters" aria-label="Filtrar por categoría">
      <Link href="/catalogo" aria-current={!category.success ? 'page' : undefined}>Todos</Link>
      {categories.map(item => <Link href={'/catalogo?categoria=' + item.slug} key={item.id} aria-current={item.slug === category.data ? 'page' : undefined}>{item.name}</Link>)}
    </nav>
    {products.length ? <div className="public-grid">{products.map(product => <ProductCard product={product} site={site} key={product.id}/>)}</div> : <p>No hay productos en esta categoría.</p>}
  </section>
}
