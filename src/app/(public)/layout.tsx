import { MessageCircle } from 'lucide-react'
import { PublicFooter, PublicHeader } from '@/components/public'
import { ThemeProvider } from '@/components/theme'
import { publicContext } from '@/lib/public-data'
import { whatsapp } from '@/lib/content'

export const dynamic = 'force-dynamic'
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { site, pages, theme, plan } = await publicContext()
  const link = whatsapp(site)
  return <ThemeProvider theme={theme}>
    <a className="public-skip" href="#contenido">Ir al contenido</a>
    <PublicHeader site={{ ...site, logo: site.logo }} pages={pages} catalog={plan.enableCatalog}/>
    <main id="contenido">{children}</main>
    <PublicFooter site={site} pages={pages} catalog={plan.enableCatalog}/>
    {link && <a className="floating-wa" href={link} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp"><MessageCircle size={23}/></a>}
  </ThemeProvider>
}
