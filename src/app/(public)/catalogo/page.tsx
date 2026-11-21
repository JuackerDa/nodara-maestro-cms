import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProductCard } from '@/components/public'
import { PublicMotion } from '@/components/public-motion'
import { db } from '@/lib/db'
import { catalogSeo, pageMetadata, publicContext, publicProducts } from '@/lib/public-data'
import { z } from 'zod'

export async function generateMetadata() {
  return (await publicContext()).plan.enableCatalog ? pageMetadata(await catalogSeo(), true) : {}
}
export default async function Catalog({ searchParams }: { searchParams: Promise<{ categoria?: string | string[] }> }) {
  const { site, plan, theme } = await publicContext()
  if (!plan.enableCatalog) notFound()
  const category = z.string().regex(/^[a-z0-9-]{1,100}$/).safeParse((await searchParams).categoria)
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { order: 'asc' } }), publicProducts(category.success ? category.data : undefined),
  ])
  return <PublicMotion key={category.data ?? 'all'} level={theme.animationLevel}>
    <section className="public-section catalog-section">
      <header className="catalog-heading">
        <p className="public-kicker" data-hero-intro>{site.siteName}</p>
        <h1 data-hero-intro>Catálogo</h1>
        {site.tagline && <p data-hero-intro>{site.tagline}</p>}
      </header>
      <div className="catalog-toolbar">
        <nav className="catalog-filters" aria-label="Filtrar por categoría">
          <Link href="/catalogo" aria-current={!category.success ? 'page' : undefined}>Todos</Link>
          {categories.map(item => <Link href={'/catalogo?categoria=' + item.slug} key={item.id}
            aria-current={item.slug === category.data ? 'page' : undefined}>{item.name}</Link>)}
        </nav>
        <p className="catalog-count">{products.length} {products.length === 1 ? 'producto' : 'productos'}</p>
      </div>
      {products.length ? <div className="public-grid" data-scroll-scene>
        {products.map(product => <ProductCard product={product} site={site} key={product.id}/>)}
      </div> : <p className="catalog-empty">No hay productos en esta categoría.</p>}
    </section>
  </PublicMotion>
}
