import { z } from 'zod'
import { animationLevels, blockTypes, days, folders, fonts, plans, radii, reservedSlugs, themes } from './content'

export const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)
const optionalId = id.nullable()
const short = (max: number) => z.string().trim().max(max)
const required = (max: number) => short(max).min(1, 'Este campo es obligatorio.')
export const webUrl = z.union([z.literal(''), z.url({ protocol: /^https?$/ }).max(2048)])
const order = z.number().int().min(0).max(1000000)
const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa letras minúsculas, números y guiones.')
export const blockDataSchemas = {
  HERO: z.object({
    title: required(60), subtitle: short(140), ctaText: short(40),
    ctaAction: z.enum(['WHATSAPP', 'CATALOGO', 'ANCLA']), anchor: short(60).regex(/^(|#[a-z0-9-]+)$/),
    imageMediaId: optionalId, imageAlt: short(180),
  }).refine(d => !d.imageMediaId || !!d.imageAlt, { path: ['imageAlt'], message: 'Indica el texto alternativo de la imagen.' })
    .refine(d => d.ctaAction !== 'ANCLA' || !!d.anchor, { path: ['anchor'], message: 'Indica el ancla del botón.' }),
  ABOUT: z.object({ title: required(60), description: short(400), imageMediaId: optionalId }),
  SERVICES_GRID: z.object({ title: required(60), items: z.array(z.object({
    name: required(60), description: short(140), priceGtq: z.number().min(0).max(1000000),
  })).max(30) }),
  FEATURES: z.object({ title: required(60), items: z.array(z.object({ title: required(50), description: short(140) })).min(3).max(4) }),
  GALLERY: z.object({ title: required(60), imageMediaIds: z.array(id).max(30) }),
  CATALOG_PREVIEW: z.object({ title: required(60), count: z.number().int().min(1).max(12), buttonText: short(40) }),
  TESTIMONIALS: z.object({ title: required(60), items: z.array(z.object({
    author: required(60), position: short(70), text: required(300), approved: z.boolean(),
  })).max(30) }),
  CONTACT_WHATSAPP: z.object({ title: required(60), text: short(180) }),
}
export type BlockData<T extends keyof typeof blockDataSchemas> = z.infer<(typeof blockDataSchemas)[T]>
export const defaults = {
  HERO: { title: 'Nueva portada', subtitle: '', ctaText: 'Escríbenos', ctaAction: 'WHATSAPP', anchor: '#contacto', imageMediaId: null, imageAlt: '' },
  ABOUT: { title: 'Nuestra historia', description: '', imageMediaId: null },
  SERVICES_GRID: { title: 'Servicios', items: [] },
  FEATURES: { title: 'Lo que nos distingue', items: [{ title: 'Distintivo 1', description: '' }, { title: 'Distintivo 2', description: '' }, { title: 'Distintivo 3', description: '' }] },
  GALLERY: { title: 'Galería', imageMediaIds: [] },
  CATALOG_PREVIEW: { title: 'Del catálogo', count: 3, buttonText: 'Ver catálogo' },
  TESTIMONIALS: { title: 'Testimonios', items: [] },
  CONTACT_WHATSAPP: { title: 'Visítanos', text: '' },
} satisfies { [T in keyof typeof blockDataSchemas]: BlockData<T> }
export const blockInput = z.object({
  id, type: z.enum(blockTypes), visible: z.boolean(), data: z.record(z.string(), z.unknown()),
}).superRefine((block, ctx) => {
  const checked = blockDataSchemas[block.type].safeParse(block.data)
  if (!checked.success) for (const issue of checked.error.issues) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: ['data', ...issue.path] })
  }
})
export const pageFields = z.object({ title: required(80), slug: slug.refine(value => !reservedSlugs.includes(value), 'Esta ruta está reservada.') })
export const seoFields = z.object({ seoTitle: short(60), seoDescription: short(155), ogImageMediaId: optionalId })
export const productFields = z.object({
  name: required(100), categoryId: id, priceGtq: z.number().min(0).max(1000000)
    .refine(price => Math.abs(price * 100 - Math.round(price * 100)) < 0.000001, 'Usa hasta dos decimales.'),
  description: short(250), badge: z.enum(['Nuevo', 'Destacado']).nullable(),
  imageMediaId: optionalId,
}).strict()
const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
export const hoursSchema = z.record(z.enum(days), z.object({ open: z.boolean(), from: time, to: time })
  .refine(day => !day.open || day.from < day.to, 'La hora de cierre debe ser posterior a la apertura.'))
export const socialSchema = z.object({ instagram: webUrl, facebook: webUrl, tiktok: webUrl })
export const contactFields = z.object({
  whatsappNumber: z.string().regex(/^\d{8}$/, 'Ingresa los 8 dígitos del número en Guatemala.'),
  whatsappDefaultMessage: short(160), mapsUrl: webUrl, address: short(250),
  social: socialSchema, hours: hoursSchema,
})
export const identityFields = z.object({
  siteName: required(90), tagline: short(140), domain: webUrl, logoMediaId: optionalId,
  faviconMediaId: optionalId, footerCreditText: short(100),
})
export const planFields = z.object({
  planName: z.enum(Object.keys(plans) as (keyof typeof plans)[]), maxPages: z.number().int().min(1).max(500),
  maxProducts: order, maxCategories: order, maxStorageMb: z.number().int().min(1).max(65536),
  enableCatalog: z.boolean(), enableBlog: z.boolean(), enableForms: z.boolean(), footerCreditEnabled: z.boolean(),
})
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const themeFields = z.object({
  preset: z.enum(Object.keys(themes) as (keyof typeof themes)[]), primaryColor: color,
  secondaryColor: color, accentColor: color, backgroundColor: color, surfaceColor: color, textColor: color,
  headingFont: z.enum(fonts), bodyFont: z.enum(fonts), borderRadius: z.enum(radii), animationLevel: z.enum(animationLevels),
})
export const loginFields = z.object({ email: z.email().max(254).trim().toLowerCase(), password: z.string().min(1).max(128) })
export const passwordField = z.string().min(12, 'Usa al menos 12 caracteres.').max(72)
  .refine(value => new TextEncoder().encode(value).byteLength <= 72, 'La contraseña supera 72 bytes.')
export const uploadFields = z.object({ folder: z.enum(folders), altText: required(180), replaceId: id.optional() })
export const cmsActions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('page.create'), data: pageFields }),
  z.object({ action: z.literal('page.save'), pageId: id, blocks: z.array(blockInput).max(50), publish: z.boolean(), version: z.string() }),
  z.object({ action: z.literal('seo.save'), pageId: id, data: seoFields }),
  z.object({ action: z.literal('category.save'), categoryId: id.optional(), name: required(80) }),
  z.object({ action: z.literal('category.delete'), categoryId: id }),
  z.object({ action: z.literal('product.save'), productId: id.optional(), data: productFields }),
  z.object({ action: z.literal('product.visibility'), productId: id, visible: z.boolean() }),
  z.object({ action: z.literal('product.duplicate'), productId: id }),
  z.object({ action: z.literal('product.delete'), productId: id }),
  z.object({ action: z.literal('media.update'), mediaId: id, altText: required(180), folder: z.enum(folders) }),
  z.object({ action: z.literal('media.delete'), mediaId: id }),
  z.object({ action: z.literal('contact.save'), data: contactFields }),
  z.object({ action: z.literal('revision.restore'), revisionId: id }),
])
export const agencyActions = z.discriminatedUnion('action', [
  z.object({ action: z.literal('plan.save'), data: planFields }),
  z.object({ action: z.literal('theme.save'), data: themeFields }),
  z.object({ action: z.literal('identity.save'), data: identityFields }),
  z.object({ action: z.literal('user.create'), data: z.object({ name: required(90), email: loginFields.shape.email, password: passwordField }) }),
  z.object({ action: z.literal('user.active'), userId: id, active: z.boolean() }),
  z.object({ action: z.literal('user.password'), userId: id, password: passwordField }),
])
export function blockMediaIds(data: Record<string, unknown>): string[] {
  return [
    ...(typeof data.imageMediaId === 'string' ? [data.imageMediaId] : []),
    ...(Array.isArray(data.imageMediaIds) ? data.imageMediaIds.filter((value): value is string => typeof value === 'string') : []),
  ]
}
