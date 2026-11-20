import 'server-only'
import { z } from 'zod'
import { randomInt } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { blockTypes, catalogPageId, folders } from './content'
import { blockDataSchemas, blockInput, blockMediaIds, contactFields, id, identityFields, loginFields, pageFields, planFields, productFields, seoFields, themeFields } from './schemas'
import { HttpError } from './http'
import { discardImage, imageLimit, inspectImage, mediaUrl, mimeTypes, readImage, storeImage } from './storage'
import { activity, write } from './write'

const timestamp = z.iso.datetime().transform(value => new Date(value))
const integer = z.number().int().min(0).max(2147483647)
const siteId = z.literal('site')
export const backupLimit = 64 * 1048576
const revisionSnapshot = z.object({ pageId: id, published: z.boolean(), blocks: z.array(blockInput).max(50) })
const pageBlock = z.object({
  id, pageId: id, type: z.enum(blockTypes), label: z.string().max(100), order: integer, visible: z.boolean(),
  lockedStructure: z.boolean(), draftRemoved: z.boolean(), publishedOrder: integer, publishedVisible: z.boolean(),
  draftDataJson: z.string().max(65536), publishedDataJson: z.string().max(65536),
}).superRefine((block, context) => {
  for (const key of ['draftDataJson', 'publishedDataJson'] as const) {
    try {
      if (key === 'publishedDataJson' && block[key] === '{}' && !block.publishedVisible) continue
      if (blockDataSchemas[block.type].safeParse(JSON.parse(block[key])).success) continue
    } catch { /* invalid JSON */ }
    context.addIssue({ code: 'custom', path: [key], message: 'Contenido de bloque incorrecto.' })
  }
})
const backupSchema = z.object({
  version: z.literal(1), exportedAt: timestamp,
  site: identityFields.extend({
    id: siteId, ...contactFields.omit({ hours: true, social: true }).shape,
    whatsappCountryCode: z.literal('+502'), footerCreditEnabled: z.boolean(),
    socialLinksJson: z.string().max(9000), businessHoursJson: z.string().max(2000),
  }),
  plan: planFields.omit({ footerCreditEnabled: true }).extend({ id: siteId }),
  theme: themeFields.extend({ id: siteId }),
  users: z.array(z.object({
    id, name: z.string().min(1).max(90), email: loginFields.shape.email,
    passwordHash: z.string().regex(/^\$2[aby]\$(?:10|11|12|13|14)\$[./a-zA-Z0-9]{53}$/),
    role: z.enum(['SUPER_ADMIN', 'EDITOR']), active: z.boolean(), createdAt: timestamp,
  })).max(5000),
  pages: z.array(pageFields.merge(seoFields).extend({
    slug: z.union([pageFields.shape.slug, z.literal('catalogo')]),
    id, isHome: z.boolean(), status: z.enum(['DRAFT', 'PUBLISHED']),
    order: integer, publishedAt: timestamp.nullable(), updatedAt: timestamp,
  }).refine(page => (page.id === catalogPageId) === (page.slug === 'catalogo') && (page.id !== catalogPageId || !page.isHome))).max(501),
  blocks: z.array(pageBlock).max(50000),
  categories: z.array(z.object({ id, name: z.string().min(1).max(80), slug: z.string().regex(/^[a-z0-9-]{1,100}$/), order: integer })).max(50000),
  products: z.array(productFields.extend({
    id, slug: z.string().regex(/^[a-z0-9-]{1,100}$/), visible: z.boolean(), order: integer,
    createdAt: timestamp, updatedAt: timestamp,
  })).max(50000),
  media: z.array(z.object({
    id, filename: z.string().max(180), mimeType: z.enum(mimeTypes), folder: z.enum(folders), altText: z.string().min(1).max(180),
    createdAt: timestamp, data: z.string().max(Math.ceil(imageLimit / 3) * 4).regex(/^[a-zA-Z0-9+/]+={0,2}$/),
  })).max(50000),
  revisions: z.array(z.object({
    id, summary: z.string().max(300), authorName: z.string().max(90), snapshotJson: z.string().max(512 * 1024), createdAt: timestamp,
  })).max(100000),
})
type Actor = Parameters<typeof write>[0]
export async function exportBackup(actor: Actor) {
  return write(actor, async tx => {
    const [site, plan, theme, users, pages, blocks, categories, products, media, revisions] = await Promise.all([
      tx.siteConfig.findUniqueOrThrow({ where: { id: 'site' } }),
      tx.planModules.findUniqueOrThrow({ where: { id: 'site' } }),
      tx.themeConfig.findUniqueOrThrow({ where: { id: 'site' } }),
      tx.user.findMany(), tx.page.findMany(), tx.pageBlock.findMany(), tx.category.findMany(),
      tx.product.findMany(), tx.media.findMany(), tx.revision.findMany(),
    ])
    if (media.reduce((bytes, item) => bytes + item.sizeBytes, 0) > backupLimit * 0.7) {
      throw new HttpError(413, 'La biblioteca supera el tamaño máximo del respaldo JSON (64 MB).')
    }
    const files = []
    for (const { storageKey, url, width, height, sizeBytes, ...item } of media) {
      files.push({ ...item, data: (await readImage(storageKey)).toString('base64') })
    }
    const backup = JSON.stringify({ version: 1, exportedAt: new Date(), site, plan, theme, users, pages, blocks, categories, products, media: files, revisions })
    if (Buffer.byteLength(backup) > backupLimit) throw new HttpError(413, 'El respaldo JSON supera 64 MB.')
    return backup
  })
}
function json(value: string) {
  try { return JSON.parse(value) as unknown }
  catch { throw new HttpError(400, 'El respaldo contiene JSON interno inválido.') }
}
export async function restoreBackup(actor: Actor, input: unknown) {
  const data = backupSchema.parse(input)
  contactFields.parse({
    whatsappNumber: data.site.whatsappNumber, whatsappDefaultMessage: data.site.whatsappDefaultMessage,
    mapsUrl: data.site.mapsUrl, address: data.site.address,
    social: json(data.site.socialLinksJson), hours: json(data.site.businessHoursJson),
  })
  if (data.pages.filter(page => page.isHome).length !== 1) throw new HttpError(400, 'El respaldo debe tener una única página de inicio.')
  const mediaIds = new Set(data.media.map(item => item.id))
  const refs = [
    data.site.logoMediaId, data.site.faviconMediaId, ...data.pages.map(page => page.ogImageMediaId),
    ...data.products.map(product => product.imageMediaId),
    ...data.blocks.flatMap(block => {
      return [
        ...(block.draftRemoved ? [] : blockMediaIds(json(block.draftDataJson) as Record<string, unknown>)),
        ...blockMediaIds(json(block.publishedDataJson) as Record<string, unknown>),
      ]
    }),
  ]
  if (refs.some(ref => ref && !mediaIds.has(ref))) throw new HttpError(400, 'El respaldo tiene referencias a imágenes ausentes.')
  for (const revision of data.revisions) if (revision.snapshotJson) revisionSnapshot.parse(json(revision.snapshotJson))
  const staged: string[] = []
  try {
    const media: Prisma.MediaCreateManyInput[] = []
    for (const { data: encoded, mimeType, ...item } of data.media) {
      const bytes = Buffer.from(encoded, 'base64')
      const info = await inspectImage(bytes, mimeType)
      const key = await storeImage(bytes, mimeType)
      staged.push(key)
      media.push({ ...item, ...info, storageKey: key, url: mediaUrl(key) })
    }
    const oldKeys = await write(actor, async tx => {
      const current = await tx.user.findUniqueOrThrow({ where: { id: actor.id } })
      const oldMedia = await tx.media.findMany({ select: { storageKey: true } })
      await tx.siteConfig.update({ where: { id: 'site' }, data: { logoMediaId: null, faviconMediaId: null } })
      await tx.product.deleteMany()
      await tx.category.deleteMany()
      await tx.page.deleteMany()
      await tx.media.deleteMany()
      await tx.revision.deleteMany()
      await tx.user.deleteMany({ where: { id: { not: actor.id } } })
      await tx.loginAttempt.deleteMany()
      // Keep the requesting administrator's account and revoke sessions for the restored accounts.
      const users = data.users.filter(user => user.id !== current.id && user.email !== current.email)
      await tx.user.createMany({ data: users.map(user => ({ ...user, authVersion: randomInt(1, 2147483647) })) })
      await tx.media.createMany({ data: media })
      await tx.siteConfig.update({ where: { id: 'site' }, data: data.site })
      await tx.planModules.update({ where: { id: 'site' }, data: data.plan })
      await tx.themeConfig.update({ where: { id: 'site' }, data: data.theme })
      await tx.page.createMany({ data: data.pages })
      await tx.pageBlock.createMany({ data: data.blocks })
      await tx.category.createMany({ data: data.categories })
      await tx.product.createMany({ data: data.products })
      await tx.revision.createMany({ data: data.revisions })
      await activity(tx, actor, 'Restauró el sitio desde un respaldo')
      return oldMedia.map(item => item.storageKey)
    })
    await Promise.all(oldKeys.map(discardImage))
  } catch (error) {
    await Promise.all(staged.map(discardImage))
    throw error
  }
}
