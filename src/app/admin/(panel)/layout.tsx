import type { Metadata } from 'next'
import { AdminNav, Logout } from '@/components/admin/nav'
import { adminUser } from '@/lib/http'
import { publicContext } from '@/lib/public-data'

export const metadata: Metadata = { title: { default: 'Nodara Maestro', template: '%s · Nodara Maestro' }, robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const [user, { site, plan }] = await Promise.all([adminUser(), publicContext()])
  const agency = user.role === 'SUPER_ADMIN'
  return <div className="admin-shell">
    <AdminNav name={site.siteName} logo={site.logo?.url} catalog={plan.enableCatalog || agency} agency={agency}/>
    <main className="admin-main">
      <header className="admin-top">
        <strong>Nodara Maestro</strong>
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">{user.name.trim().slice(0, 1).toLocaleUpperCase('es')}</span>
          <div className="admin-account-info"><span className="user-name">{user.name}</span><span className="account-role">{agency ? 'Super Admin' : 'Editor'}</span></div>
          <Logout/>
        </div>
      </header>
      <div className="admin-inner">{children}</div>
    </main>
  </div>
}
