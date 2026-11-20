import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { blockLabels, catalogPageId, days, demo, slugify, themes } from '../src/lib/content'
import { blockInput, passwordField } from '../src/lib/schemas'
import type { BlockType } from '../src/lib/content'

const prisma = new PrismaClient()
const photos = [
  ['barra', 'Tres personas sostienen sus tazas de café', 'PORTADA'],
  ['equipo', 'Interior de una cafetería con barra de madera', 'PORTADA'],
  ['filtrado', 'Café de especialidad listo para preparar', 'SERVICIOS'],
  ['espresso', 'Taza de espresso', 'CATALOGO'],
  ['latte', 'Latte frío servido sobre hielo', 'CATALOGO'],
  ['matcha', 'Bebida de matcha', 'CATALOGO'],
  ['croissant', 'Croissants dorados recién horneados', 'CATALOGO'],
  ['grano', 'Café en grano tostado', 'CATALOGO'],
] as const
const products = [
  ['Espresso de la casa', 22, 'espresso', 0, 'Espresso doble de origen guatemalteco con notas a cacao.', 'Destacado'],
  ['Filtrado de temporada', 32, 'filtrado', 0, 'Preparado a mano con nuestro café de temporada.', null],
  ['Latte frío', 34, 'latte', 1, 'Café de especialidad, leche y hielo.', null],
  ['Matcha latte', 38, 'matcha', 1, 'Matcha batido con leche, servido frío.', 'Nuevo'],
  ['Croissant de mantequilla', 26, 'croissant', 2, 'Hojaldre artesanal dorado y crujiente.', null],
  ['Café Antigua · 340 g', 96, 'grano', 3, 'Café en grano con notas de cacao y panela.', 'Destacado'],
] as const
const mediaId = (name: string) => 'demo-' + name
function block(type: BlockType, data: Record<string, unknown>, order: number) {
  const id = 'demo-block-' + type.toLowerCase().replaceAll('_','-')
  const parsed = blockInput.parse({ id, type, visible: true, data })
  const json = JSON.stringify(parsed.data)
  return { id, type, label: blockLabels[type], order, draftDataJson: json, publishedDataJson: json, publishedOrder: order, publishedVisible: true }
}
const catalogPage = {
  id: catalogPageId, slug: 'catalogo', title: 'Catálogo', order: 1000000, status: 'PUBLISHED' as const,
}
async function seed() {
  if (await prisma.siteConfig.findUnique({ where: { id: 'site' } })) {
    await prisma.page.upsert({ where: { id: catalogPageId }, update: {}, create: catalogPage })
    console.log('El sitio ya está inicializado. Se conservaron los datos actuales.')
    return
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  const editorPassword = process.env.SEED_EDITOR_PASSWORD
  if (!adminPassword || !editorPassword) {
    throw new Error('Configura SEED_ADMIN_PASSWORD y SEED_EDITOR_PASSWORD antes de inicializar el sitio.')
  }
  const accounts = await Promise.all([
    hash(passwordField.parse(adminPassword), 12),
    hash(passwordField.parse(editorPassword), 12),
  ])
  const media = await Promise.all(photos.map(async ([name, altText, folder]) => {
    const storageKey = `seed/${name}.webp`
    const bytes = await readFile('public/uploads/' + storageKey)
    const { width, height } = await sharp(bytes).metadata()
    return { id: mediaId(name), filename: name + '.webp', storageKey, url: '/uploads/' + storageKey, mimeType: 'image/webp', altText, folder, sizeBytes: bytes.length, width, height }
  }))
  const { label: _label, ...theme } = themes.EDITORIAL_WARM
  await prisma.$transaction(async tx => {
    await tx.user.createMany({ data: [
      { name: 'Equipo Nodara', email: demo.admin.email, passwordHash: accounts[0], role: 'SUPER_ADMIN' },
      { name: 'Equipo Casa Nómada', email: demo.editor.email, passwordHash: accounts[1], role: 'EDITOR' },
    ] })
    await tx.media.createMany({ data: media })
    await tx.siteConfig.create({ data: {
      siteName: 'Casa Nómada', tagline: 'Café de especialidad en Guatemala', domain: '',
      whatsappNumber: '55500123', whatsappDefaultMessage: '¡Hola, Casa Nómada! Me gustaría saber más sobre el menú.',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Antigua+Guatemala', address: 'Antigua Guatemala, Sacatepéquez',
      socialLinksJson: JSON.stringify({ instagram: '', facebook: '', tiktok: '' }),
      businessHoursJson: JSON.stringify(Object.fromEntries(days.map((day, i) => [day, { open: i !== 0, from: '08:00', to: i >= 5 ? '18:00' : '17:00' }]))),
    } })
    await tx.planModules.create({ data: {} })
    await tx.themeConfig.create({ data: { ...theme, preset: 'EDITORIAL_WARM' } })
    await tx.page.create({ data: {
      id: 'demo-inicio', title: 'Inicio', slug: 'inicio', isHome: true, status: 'PUBLISHED', publishedAt: new Date(),
      seoTitle: 'Casa Nómada | Café de especialidad en Guatemala',
      seoDescription: 'Café guatemalteco de origen, filtrados hechos a mano y repostería artesanal en Antigua Guatemala.',
      ogImageMediaId: mediaId('barra'),
      blocks: { create: [
        block('HERO', { title: 'Café de origen, sin prisa.', subtitle: 'De fincas guatemaltecas a tu taza. Un espacio para sentarte, probar algo nuevo y volver.', ctaText: 'Explorar el menú', ctaAction: 'CATALOGO', anchor: '', imageMediaId: mediaId('barra'), imageAlt: media[0].altText }, 0),
        block('ABOUT', { title: 'Una casa para los curiosos del café', description: 'En Casa Nómada trabajamos con café guatemalteco y preparamos cada taza a mano. Ven a descubrir los perfiles de temporada o a quedarte con tu espresso favorito.', imageMediaId: mediaId('equipo') }, 1),
        block('CATALOG_PREVIEW', { title: 'De nuestra barra', count: 3, buttonText: 'Ver todo el menú' }, 2),
        block('FEATURES', { title: 'Así trabajamos el café', items: [
          { title: 'Origen guatemalteco', description: 'Elegimos granos de fincas locales y contamos la historia que trae cada cosecha.' },
          { title: 'Preparado a mano', description: 'Ajustamos la receta de cada filtrado para resaltar el carácter de su origen.' },
          { title: 'Pan recién horneado', description: 'Acompaña tu taza con una pieza de nuestra pequeña selección artesanal.' },
        ] }, 3),
        block('CONTACT_WHATSAPP', { title: 'Pasa por una taza', text: 'Estamos en Antigua Guatemala. Escríbenos para saber qué cafés están en la barra hoy.' }, 4),
      ] },
    } })
    await tx.page.create({ data: {
      title: 'Nosotros', slug: 'nosotros', order: 1, status: 'PUBLISHED', publishedAt: new Date(),
      seoTitle: 'Nuestra historia | Casa Nómada', seoDescription: 'Conoce el trabajo detrás de una taza de café guatemalteco en Casa Nómada.',
      blocks: { create: { ...block('ABOUT', { title: 'La historia detrás de cada taza', description: 'Casa Nómada nació para compartir el café que se cosecha en Guatemala. Una barra pequeña, recetas cuidadas y una mesa para conversar.', imageMediaId: mediaId('equipo') }, 0), id: 'demo-nosotros-about' } },
    } })
    await tx.page.create({ data: { ...catalogPage, seoTitle: 'Menú de café | Casa Nómada' } })
    const categories = ['Café de especialidad', 'Bebidas frías', 'Repostería', 'Para llevar']
    await tx.category.createMany({ data: categories.map((name, order) => ({ id: 'demo-category-' + order, name, slug: slugify(name), order })) })
    await tx.product.createMany({ data: products.map(([name, priceGtq, img, cat, description, badge], order) => ({
      name, priceGtq, description, badge, slug: slugify(name), categoryId: 'demo-category-' + cat, imageMediaId: mediaId(img), order,
    })) })
    await tx.revision.create({ data: { authorName: 'Equipo Nodara', summary: 'Publicó el sitio inicial de Casa Nómada' } })
  })
  console.log('Casa Nómada está lista.')
}
seed().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
