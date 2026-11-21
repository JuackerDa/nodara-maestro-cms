import { Coffee } from 'lucide-react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/admin/login'
import { currentUser } from '@/lib/http'
import { db } from '@/lib/db'
import { demo } from '@/lib/content'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Iniciar sesión · Nodara Maestro', robots: { index: false, follow: false } }
export default async function LoginPage() {
  if (await currentUser()) redirect('/admin')
  const site = await db.siteConfig.findUnique({ where: { id: 'site' }, include: { logo: true } })
  return <main className="login-screen">
    <div className="login-form-area"><div className="login-box">
      <a href="/" className="login-brand actions"><span className="brand-icon">{site?.logo ? <img src={site.logo.url} alt=""/> : <Coffee size={23}/>}</span>
        <strong>{site?.siteName || 'Nodara Maestro'}</strong></a>
      <h1>Iniciar sesión</h1><p className="muted">Accede al panel de tu sitio web.</p>
      <LoginForm/>
      {process.env.NODE_ENV === 'development' && <details className="login-demo">
        <summary>Cuentas de demostración</summary>
        <p>Super Admin · {demo.admin.email}</p>
        <p>Editor · {demo.editor.email}</p>
      </details>}
    </div></div>
    <div className="login-hero"><p>{site?.tagline || 'Administración de contenido'}</p></div>
  </main>
}
