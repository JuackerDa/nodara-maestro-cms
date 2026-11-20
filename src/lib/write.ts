import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from './db'
import { HttpError } from './http'

export type Transaction = Prisma.TransactionClient
type Actor = { id: string, name: string, role: string, authVersion: number }
export function write<T>(actor: Actor, work: (tx: Transaction) => Promise<T>) {
  return db.$transaction(async tx => {
    // Acquire the site row lock before reading quotas and relations for a mutation.
    await tx.siteConfig.update({ where: { id: 'site' }, data: { writeVersion: { increment: 1 } } })
    const user = await tx.user.findUnique({ where: { id: actor.id } })
    if (!user?.active || user.authVersion !== actor.authVersion || user.role !== actor.role) {
      throw new HttpError(401, 'La sesión dejó de ser válida.')
    }
    return work(tx)
  }, { maxWait: 10000, timeout: 30000 })
}
export async function activity(tx: Transaction, actor: Actor, summary: string, snapshot?: object) {
  return tx.revision.create({ data: { authorName: actor.name, summary, snapshotJson: snapshot ? JSON.stringify(snapshot) : '' } })
}
export async function requireMedia(tx: Transaction, refs: (string | null)[]) {
  const ids = [...new Set(refs.filter((id): id is string => !!id))]
  if (ids.length && await tx.media.count({ where: { id: { in: ids } } }) !== ids.length) {
    throw new HttpError(400, 'Una imagen seleccionada ya no está en la biblioteca.')
  }
}
export async function usageByMedia(tx: Transaction) {
  const [blocks, products, pages, site] = await Promise.all([
    tx.pageBlock.findMany(),
    tx.product.findMany({ where: { imageMediaId: { not: null } }, select: { imageMediaId: true } }),
    tx.page.findMany({ where: { ogImageMediaId: { not: null } }, select: { ogImageMediaId: true } }),
    tx.siteConfig.findUniqueOrThrow({ where: { id: 'site' }, select: { logoMediaId: true, faviconMediaId: true } }),
  ])
  const counts: Record<string, number> = {}
  const count = (id: string | null) => { if (id) counts[id] = (counts[id] ?? 0) + 1 }
  const { blockMediaIds } = await import('./schemas')
  const { readJson } = await import('./content')
  for (const block of blocks) {
    const refs = new Set([
      ...(!block.draftRemoved ? blockMediaIds(readJson(block.draftDataJson, {})) : []),
      ...blockMediaIds(readJson(block.publishedDataJson, {})),
    ])
    for (const ref of refs) count(ref)
  }
  for (const product of products) count(product.imageMediaId)
  for (const page of pages) count(page.ogImageMediaId)
  count(site.logoMediaId)
  count(site.faviconMediaId)
  return counts
}
