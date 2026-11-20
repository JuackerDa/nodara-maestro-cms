import 'server-only'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { blockLabels, catalogPageId, readJson, slugify } from './content'
import { HttpError } from './http'
import { blockDataSchemas, blockInput, blockMediaIds, cmsActions, id } from './schemas'
import { activity, requireMedia, usageByMedia, write } from './write'

type Actor = Parameters<typeof write>[0]
const snapshotSchema = z.object({ pageId: id, blocks: z.array(blockInput), published: z.boolean() })
export async function mutateCms(actor: Actor, input: z.infer<typeof cmsActions>) {
  return write(actor, async tx => {
    const plan = await tx.planModules.findUniqueOrThrow({ where: { id: 'site' } })
    if ((input.action.startsWith('product.') || input.action.startsWith('category.')) && !plan.enableCatalog && actor.role !== 'SUPER_ADMIN') {
      throw new HttpError(403, 'El catálogo está desactivado.')
    }
    switch (input.action) {
      case 'page.create': {
        const order = await tx.page.count({ where: { id: { not: catalogPageId } } })
        if (order >= plan.maxPages) throw new HttpError(409, 'Alcanzaste el límite de páginas del plan.')
        const page = await tx.page.create({ data: { ...input.data, order } })
        await activity(tx, actor, `Creó la página «${page.title}»`)
        return { id: page.id }
      }
      case 'page.save': {
        if (input.pageId === catalogPageId) throw new HttpError(400, 'Edita el catálogo desde su módulo.')
        const page = await tx.page.findUniqueOrThrow({ where: { id: input.pageId }, include: { blocks: true } })
        if (page.updatedAt.toISOString() !== input.version) throw new HttpError(409, 'La página cambió en otra sesión. Recarga antes de guardar.')
        const stored = new Map(page.blocks.map(block => [block.id, block]))
        const ids = new Set(input.blocks.map(block => block.id))
        if (ids.size !== input.blocks.length) throw new HttpError(400, 'Hay bloques duplicados.')
        if (actor.role === 'EDITOR' && page.blocks.some(block => block.lockedStructure && !block.draftRemoved && !ids.has(block.id))) {
          throw new HttpError(403, 'Un bloque de plantilla está protegido.')
        }
        const blocks = input.blocks.map(block => ({
          ...block, data: blockDataSchemas[block.type].parse(block.data) as Record<string, unknown>,
        }))
        await requireMedia(tx, blocks.flatMap(block => blockMediaIds(block.data)))
        const before = {
          pageId: page.id, published: page.status === 'PUBLISHED',
          blocks: page.blocks.filter(block => block.publishedDataJson !== '{}').sort((a, b) => a.publishedOrder - b.publishedOrder)
            .map(block => ({ id: block.id, type: block.type, visible: block.publishedVisible, data: readJson(block.publishedDataJson, {}) })),
        }
        const removed = page.blocks.filter(block => !ids.has(block.id)).map(block => block.id)
        if (removed.length) {
          if (input.publish) await tx.pageBlock.deleteMany({ where: { id: { in: removed } } })
          else await tx.pageBlock.updateMany({ where: { id: { in: removed } }, data: { draftRemoved: true } })
        }
        for (const [order, block] of blocks.entries()) {
          const existing = stored.get(block.id)
          if (existing && existing.type !== block.type) throw new HttpError(400, 'El tipo de un bloque existente es fijo.')
          if (!existing && actor.role === 'EDITOR' && (block.type === 'HERO' || block.type === 'CATALOG_PREVIEW' && !plan.enableCatalog)) {
            throw new HttpError(403, 'Este bloque requiere permiso de agencia.')
          }
          const draftDataJson = JSON.stringify(block.data)
          const fields = {
            order, visible: block.visible, draftDataJson, draftRemoved: false,
            ...(input.publish ? { publishedDataJson: draftDataJson, publishedVisible: block.visible, publishedOrder: order } : {}),
          }
          if (existing) await tx.pageBlock.update({ where: { id: existing.id }, data: fields })
          else await tx.pageBlock.create({ data: { ...fields, id: block.id, pageId: page.id, type: block.type, label: blockLabels[block.type], lockedStructure: false } })
        }
        const saved = await tx.page.update({
          where: { id: page.id },
          data: { ...(input.publish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}), updatedAt: new Date() },
        })
        if (input.publish) await activity(tx, actor, `Publicó «${page.title}»`, before)
        return { version: saved.updatedAt.toISOString(), published: saved.status === 'PUBLISHED' }
      }
      case 'seo.save': {
        await requireMedia(tx, [input.data.ogImageMediaId])
        const page = await tx.page.update({ where: { id: input.pageId }, data: input.data })
        await activity(tx, actor, `Actualizó el SEO de «${page.title}»`)
        break
      }
      case 'category.save': {
        const slug = slugify(input.name)
        if (!slug) throw new HttpError(400, 'El nombre debe contener letras o números.')
        if (input.categoryId) await tx.category.update({ where: { id: input.categoryId }, data: { name: input.name, slug } })
        else {
          const order = await tx.category.count()
          if (order >= plan.maxCategories) throw new HttpError(409, 'Alcanzaste el límite de categorías.')
          await tx.category.create({ data: { name: input.name, slug, order } })
        }
        await activity(tx, actor, `Guardó la categoría «${input.name}»`)
        break
      }
      case 'category.delete': {
        if (await tx.product.count({ where: { categoryId: input.categoryId } })) throw new HttpError(409, 'Mueve los productos a otra categoría antes de eliminarla.')
        const category = await tx.category.delete({ where: { id: input.categoryId } })
        await activity(tx, actor, `Eliminó la categoría «${category.name}»`)
        break
      }
      case 'product.save': {
        await requireMedia(tx, [input.data.imageMediaId])
        if (!await tx.category.findUnique({ where: { id: input.data.categoryId } })) throw new HttpError(400, 'Selecciona una categoría existente.')
        if (input.productId) await tx.product.update({ where: { id: input.productId }, data: input.data })
        else {
          const order = await tx.product.count()
          if (order >= plan.maxProducts) throw new HttpError(409, 'Alcanzaste el límite de productos.')
          await tx.product.create({ data: { ...input.data, slug: productSlug(input.data.name), order } })
        }
        await activity(tx, actor, `Guardó el producto «${input.data.name}»`)
        break
      }
      case 'product.duplicate': {
        const order = await tx.product.count()
        if (order >= plan.maxProducts) throw new HttpError(409, 'Alcanzaste el límite de productos.')
        const { name, categoryId, priceGtq, description, badge, imageMediaId } = await tx.product.findUniqueOrThrow({ where: { id: input.productId } })
        const copy = name.slice(0, 91) + ' (copia)'
        await tx.product.create({ data: { name: copy, slug: productSlug(copy), categoryId, priceGtq, description, badge, imageMediaId, visible: false, order } })
        await activity(tx, actor, `Duplicó «${name}»`)
        break
      }
      case 'product.visibility': {
        const product = await tx.product.update({ where: { id: input.productId }, data: { visible: input.visible } })
        await activity(tx, actor, `${input.visible ? 'Mostró' : 'Ocultó'} «${product.name}»`)
        break
      }
      case 'product.delete': {
        const product = await tx.product.delete({ where: { id: input.productId } })
        await activity(tx, actor, `Eliminó «${product.name}»`)
        break
      }
      case 'media.update': {
        await tx.media.update({ where: { id: input.mediaId }, data: { altText: input.altText, folder: input.folder } })
        break
      }
      case 'media.delete': {
        const counts = await usageByMedia(tx)
        if (counts[input.mediaId]) throw new HttpError(409, 'La imagen todavía está en uso.')
        const media = await tx.media.delete({ where: { id: input.mediaId } })
        await activity(tx, actor, `Eliminó la imagen «${media.filename}»`)
        return { discardKey: media.storageKey }
      }
      case 'contact.save': {
        const { social, hours, ...data } = input.data
        await tx.siteConfig.update({ where: { id: 'site' }, data: {
          ...data, socialLinksJson: JSON.stringify(social), businessHoursJson: JSON.stringify(hours),
        } })
        await activity(tx, actor, 'Actualizó los datos de contacto')
        break
      }
      case 'revision.restore': {
        const revision = await tx.revision.findUniqueOrThrow({ where: { id: input.revisionId } })
        const parsed = snapshotSchema.safeParse(readJson(revision.snapshotJson, {}))
        if (!parsed.success) throw new HttpError(400, 'Esta actividad no tiene una versión restaurable.')
        const { pageId, blocks, published } = parsed.data
        const page = await tx.page.findUniqueOrThrow({ where: { id: pageId }, include: { blocks: true } })
        await requireMedia(tx, blocks.flatMap(block => blockMediaIds(block.data)))
        const before = {
          pageId, published: page.status === 'PUBLISHED',
          blocks: page.blocks.filter(block => block.publishedDataJson !== '{}').sort((a, b) => a.publishedOrder - b.publishedOrder)
            .map(block => ({ id: block.id, type: block.type, visible: block.publishedVisible, data: readJson(block.publishedDataJson, {}) })),
        }
        const current = new Map(page.blocks.map(block => [block.id, block]))
        await tx.pageBlock.updateMany({ where: { pageId }, data: { publishedVisible: false, publishedDataJson: '{}' } })
        for (const [order, block] of blocks.entries()) {
          const publishedDataJson = JSON.stringify(block.data)
          const fields = { publishedOrder: order, publishedDataJson, publishedVisible: block.visible }
          if (current.has(block.id)) await tx.pageBlock.update({ where: { id: block.id }, data: fields })
          else await tx.pageBlock.create({ data: {
            ...fields, id: block.id, pageId, order, type: block.type, label: blockLabels[block.type], draftDataJson: publishedDataJson,
            draftRemoved: true, visible: block.visible,
          } })
        }
        await tx.page.update({ where: { id: pageId }, data: {
          status: published ? 'PUBLISHED' : 'DRAFT', publishedAt: published ? new Date() : null,
        } })
        await activity(tx, actor, `Restauró versión publicada de «${page.title}»`, before)
        break
      }
    }
    return { ok: true }
  })
}
function productSlug(name: string) {
  return (slugify(name).slice(0, 80).replace(/-$/, '') || 'producto') + '-' + randomUUID().slice(0, 8)
}
