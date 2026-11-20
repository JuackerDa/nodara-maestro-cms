import { db } from '@/lib/db'
import { readImage, storageKeySchema } from '@/lib/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = storageKeySchema.safeParse((await params).key)
  if (!key.success || key.data.includes('/')) return new Response(null, { status: 404 })
  const media = await db.media.findUnique({ where: { storageKey: key.data } })
  if (!media) return new Response(null, { status: 404 })
  try {
    return new Response(new Uint8Array(await readImage(key.data)), { headers: {
      'Content-Type': media.mimeType, 'Cache-Control': 'public, max-age=3600, immutable',
    } })
  } catch (error) {
    console.error(error)
    return new Response(null, { status: 404 })
  }
}
