import { NextResponse } from 'next/server'
import { api, apiUser, HttpError, jsonBody, readBody, sameOrigin } from '@/lib/http'
import { cmsActions, uploadFields } from '@/lib/schemas'
import { mutateCms } from '@/lib/cms'
import { discardImage, imageLimit, inspectImage, mediaUrl, storeImage } from '@/lib/storage'
import { activity, write } from '@/lib/write'

export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request)
    const user = await apiUser()
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const raw = await readBody(request, imageLimit + 16 * 1024)
      let form: FormData
      try { form = await new Response(new Uint8Array(raw), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData() }
      catch { throw new HttpError(400, 'La carga no tiene un formato válido.') }
      const fields = uploadFields.parse(Object.fromEntries(form))
      const file = form.get('file')
      if (!(file instanceof File)) throw new HttpError(400, 'Selecciona una imagen.')
      const bytes = Buffer.from(await file.arrayBuffer())
      const info = await inspectImage(bytes, file.type)
      const key = await storeImage(bytes, info.mimeType)
      try {
        const { media, oldKey } = await write(user, async tx => {
          const plan = await tx.planModules.findUniqueOrThrow({ where: { id: 'site' } })
          const old = fields.replaceId ? await tx.media.findUniqueOrThrow({ where: { id: fields.replaceId } }) : null
          const usage = (await tx.media.aggregate({ _sum: { sizeBytes: true } }))._sum.sizeBytes ?? 0
          if (usage - (old?.sizeBytes ?? 0) + info.sizeBytes > plan.maxStorageMb * 1048576) throw new HttpError(409, 'Alcanzaste la cuota de almacenamiento.')
          const data = { ...info, filename: file.name.slice(0, 180), altText: fields.altText, folder: fields.folder, storageKey: key, url: mediaUrl(key) }
          const updated = old ? await tx.media.update({ where: { id: old.id }, data }) : await tx.media.create({ data })
          await activity(tx, user, `${old ? 'Reemplazó' : 'Subió'} la imagen «${updated.filename}»`)
          return { media: updated, oldKey: old?.storageKey }
        })
        if (oldKey) await discardImage(oldKey)
        return NextResponse.json({ media })
      } catch (error) {
        await discardImage(key)
        throw error
      }
    }
    const result = await mutateCms(user, cmsActions.parse(await jsonBody(request)))
    if ('discardKey' in result && result.discardKey) await discardImage(result.discardKey)
    return NextResponse.json(result)
  })
}
