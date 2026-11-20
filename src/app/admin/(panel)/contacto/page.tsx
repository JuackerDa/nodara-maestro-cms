import { ContactAdmin } from '@/components/admin/contact'
import { days, readJson } from '@/lib/content'
import { adminUser } from '@/lib/http'
import { publicContext } from '@/lib/public-data'

export const metadata = { title: 'Contacto' }
export default async function ContactPage() {
  await adminUser()
  const { site } = await publicContext()
  const fallback = Object.fromEntries(days.map(day => [day, { open: false, from: '08:00', to: '17:00' }])) as Record<typeof days[number], { open: boolean, from: string, to: string }>
  return <ContactAdmin initial={{
    whatsappNumber: site.whatsappNumber, whatsappDefaultMessage: site.whatsappDefaultMessage, mapsUrl: site.mapsUrl, address: site.address,
    hours: { ...fallback, ...readJson(site.businessHoursJson, fallback) }, social: readJson(site.socialLinksJson, { instagram: '', facebook: '', tiktok: '' }),
  }}/>
}
