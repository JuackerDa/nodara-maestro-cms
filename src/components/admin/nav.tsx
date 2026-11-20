'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Boxes, FileText, Image, Search, Settings2, Phone, Coffee, LogOut } from 'lucide-react'

const links = [
  ['/admin', 'Resumen', BarChart3],
  ['/admin/paginas', 'Páginas', FileText],
  ['/admin/catalogo', 'Catálogo', Boxes],
  ['/admin/multimedia', 'Multimedia', Image],
  ['/admin/contacto', 'Contacto', Phone],
  ['/admin/seo', 'SEO', Search],
  ['/admin/agencia', 'Modo Agencia', Settings2],
] as const
export function AdminNav({ name, logo, agency, catalog }: { name: string, logo?: string, agency: boolean, catalog: boolean }) {
  const path = usePathname()
  return <aside className="admin-sidebar">
    <Link href="/admin" className="brand" aria-label={name}>
      <span className="brand-icon">{logo ? <img src={logo} alt="" /> : <Coffee size={22}/>}</span>
      <span className="brand-details"><span className="brand-name">{name}</span><span className="brand-caption">Panel de administración</span></span>
    </Link>
    <nav className="admin-nav" aria-label="Administración">{links.filter(([href]) => (href !== '/admin/agencia' || agency) && (href !== '/admin/catalogo' || catalog))
      .map(([href, label, Icon]) => <Link key={href} href={href} title={label} aria-label={label} aria-current={path === href ? 'page' : undefined}
        className={href === '/admin/agencia' ? 'agency-link' : undefined}><Icon size={17}/><span>{label}</span></Link>)}</nav>
    <p className="sidebar-foot">Administrado por Nodara Web</p>
  </aside>
}
export function Logout() {
  return <button type="button" className="btn icon" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) window.location.assign('/admin/login')
  }}><LogOut size={16}/></button>
}
