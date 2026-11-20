import { AgencyAdmin } from '@/components/admin/agency'
import { db } from '@/lib/db'
import { adminUser } from '@/lib/http'
import { publicContext } from '@/lib/public-data'
import { identityFields, planFields, themeFields } from '@/lib/schemas'

export const metadata = { title: 'Modo Agencia' }
export default async function AgencyPage() {
  await adminUser(true)
  const [{ site, theme, plan }, media, editors] = await Promise.all([
    publicContext(),
    db.media.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, url: true, altText: true, filename: true } }),
    db.user.findMany({ where: { role: 'EDITOR' }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, active: true } }),
  ])
  return <AgencyAdmin plan={planFields.parse({ ...plan, footerCreditEnabled: site.footerCreditEnabled })} theme={themeFields.parse(theme)}
    identity={identityFields.parse(site)} media={media} editors={editors}/>
}
