import { MediaLibrary } from '@/components/admin/media-library'
import { db } from '@/lib/db'
import { adminUser } from '@/lib/http'
import { usageByMedia } from '@/lib/write'

export const metadata = { title: 'Multimedia' }
export default async function Multimedia() {
  await adminUser()
  const [images, used, plan] = await Promise.all([
    db.media.findMany({ orderBy: { createdAt: 'desc' } }), usageByMedia(db), db.planModules.findUniqueOrThrow({ where: { id: 'site' } }),
  ])
  return <MediaLibrary images={images} used={used} maxMb={plan.maxStorageMb}/>
}
