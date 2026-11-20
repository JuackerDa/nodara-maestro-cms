import Link from 'next/link'
import { ArrowUpRight, Boxes, FileText, HardDrive, Phone } from 'lucide-react'
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
  const metrics = [
    ['Páginas activas', String(active), String(plan.maxPages), FileText],
    ['Productos publicados', String(plan.enableCatalog ? visible : 0), String(plan.maxProducts), Boxes],
    ['Almacenamiento usado', sizeMb(storage._sum.sizeBytes ?? 0) + ' MB', plan.maxStorageMb + ' MB', HardDrive],
  ] as const
  return <><Heading title="Resumen" text="Estado de publicación y actividad del sitio."/>
    <div className="panel-card dashboard-site"><div><span className={'pill' + (active ? ' live' : ' pending')}>{active ? 'Publicado' : 'Sin publicar'}</span>
      <h2>{site.siteName}</h2><p className="subtle">{site.domain || 'Dominio sin configurar'}</p>
      {latest?.publishedAt && <p className="subtle mt-1">Última publicación · {date.format(latest.publishedAt)}</p>}
    </div><a className="btn primary" href="/" target="_blank" rel="noopener noreferrer">Abrir sitio en vivo <ArrowUpRight size={16}/></a></div>
    <div className="dashboard-grid">{metrics.map(([label, value, max, Icon]) => <div className="panel-card" key={label}>
      <span className="metric-icon"><Icon size={19}/></span><h2>{label}</h2>
      <div className="metric-value">{value} <small>/ {max}</small></div>
    </div>)}</div>
    <div className="actions mb-4"><Link href="/admin/paginas" className="btn"><FileText size={16}/> Editar páginas</Link>
      {(plan.enableCatalog || user.role === 'SUPER_ADMIN') && <Link href="/admin/catalogo" className="btn"><Boxes size={16}/> Ver catálogo</Link>}
      <Link href="/admin/contacto" className="btn"><Phone size={16}/> Editar contacto</Link></div>
    <ActivityList revisions={revisions.map(({ snapshotJson, ...revision }) => ({ ...revision, restorable: !!snapshotJson }))}/>
  </>
}
