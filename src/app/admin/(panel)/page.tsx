import Link from 'next/link'
import { ArrowUpRight, Boxes, FileText, Globe2, HardDrive, Phone } from 'lucide-react'
import { ActivityList } from '@/components/admin/activity'
import { Heading } from '@/components/admin/ui'
import { publicContext } from '@/lib/public-data'
import { adminUser } from '@/lib/http'
import { db } from '@/lib/db'
import { catalogPageId, sizeMb } from '@/lib/content'

export const metadata = { title: 'Resumen' }
const date = new Intl.DateTimeFormat('es-GT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Guatemala' })
export default async function Dashboard() {
  const [{ site, plan }, user, active, visible, storage, latest, revisions] = await Promise.all([
    publicContext(), adminUser(),
    db.page.count({ where: { status: 'PUBLISHED', id: { not: catalogPageId } } }), db.product.count({ where: { visible: true } }),
    db.media.aggregate({ _sum: { sizeBytes: true } }),
    db.page.findFirst({ where: { status: 'PUBLISHED', id: { not: catalogPageId } }, orderBy: { publishedAt: 'desc' }, select: { publishedAt: true } }),
    db.revision.findMany({ orderBy: { createdAt: 'desc' }, take: 16 }),
  ])
  const storageBytes = storage._sum.sizeBytes ?? 0
  const storageLimit = plan.maxStorageMb * 1_048_576
  const productCount = plan.enableCatalog ? visible : 0
  const metrics = [
    { label: 'Páginas activas', value: active, max: plan.maxPages, used: active, limit: plan.maxPages, Icon: FileText },
    { label: 'Productos publicados', value: productCount, max: plan.maxProducts, used: productCount, limit: plan.maxProducts, Icon: Boxes },
    { label: 'Almacenamiento usado', value: sizeMb(storageBytes) + ' MB', max: plan.maxStorageMb + ' MB', used: storageBytes, limit: storageLimit, Icon: HardDrive },
  ]
  return <><Heading title="Resumen" text="Estado de publicación y actividad del sitio."/>
    <section className="panel-card dashboard-site">
      <div className="dashboard-site-copy">
        <span className={'pill' + (active ? ' live' : ' pending')}><Globe2 size={13} aria-hidden="true"/>{active ? 'Publicado' : 'Sin publicar'}</span>
        <h2>{site.siteName}</h2>
        {site.tagline && <p>{site.tagline}</p>}
        <div className="dashboard-meta">
          <span>{site.domain || 'Dominio sin configurar'}</span>
          {latest?.publishedAt && <span>Última publicación · {date.format(latest.publishedAt)}</span>}
        </div>
      </div>
      <a className="btn dashboard-launch" href="/" target="_blank" rel="noopener noreferrer">Abrir sitio en vivo <ArrowUpRight size={16}/></a>
    </section>
    <div className="dashboard-grid">{metrics.map(({ label, value, max, used, limit, Icon }) => <section className="panel-card dashboard-metric" key={label}>
      <span className="metric-icon"><Icon size={19} aria-hidden="true"/></span><h2>{label}</h2>
      <div className="metric-value">{value} <small>/ {max}</small></div>
      {limit > 0 && <progress aria-label={label} value={Math.min(used, limit)} max={limit}/>}
    </section>)}</div>
    <nav className="dashboard-shortcuts" aria-label="Accesos rápidos">
      <Link href="/admin/paginas" className="btn"><FileText size={16}/> Editar páginas</Link>
      {(plan.enableCatalog || user.role === 'SUPER_ADMIN') && <Link href="/admin/catalogo" className="btn"><Boxes size={16}/> Ver catálogo</Link>}
      <Link href="/admin/contacto" className="btn"><Phone size={16}/> Editar contacto</Link>
    </nav>
    <ActivityList revisions={revisions.map(({ snapshotJson, ...revision }) => ({ ...revision, restorable: !!snapshotJson }))}/>
  </>
}
