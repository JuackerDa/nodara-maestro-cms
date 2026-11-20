export const folders = ['PORTADA', 'SERVICIOS', 'CATALOGO', 'GENERAL'] as const
export const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
export const fonts = ['Inter', 'Playfair Display', 'Plus Jakarta Sans', 'DM Sans'] as const
export const radii = ['SHARP', 'SOFT', 'ROUNDED'] as const
export const animationLevels = ['SUBTLE', 'EXPRESSIVE', 'NONE'] as const
export const blockLabels = {
  HERO: 'Portada', ABOUT: 'Nosotros', SERVICES_GRID: 'Servicios', FEATURES: 'Características',
  GALLERY: 'Galería', CATALOG_PREVIEW: 'Catálogo destacado', TESTIMONIALS: 'Testimonios', CONTACT_WHATSAPP: 'Contacto',
} as const
export type BlockType = keyof typeof blockLabels
export const blockTypes = Object.keys(blockLabels) as [BlockType, ...BlockType[]]
export const plans = {
  LANDING: { label: 'Landing Esencial', maxPages: 1, maxProducts: 0, maxCategories: 0, maxStorageMb: 128, enableCatalog: false, enableBlog: false, enableForms: false },
  WEB_CMS: { label: 'Web Autoadministrable', maxPages: 5, maxProducts: 0, maxCategories: 0, maxStorageMb: 512, enableCatalog: false, enableBlog: true, enableForms: true },
  CATALOGO: { label: 'Catálogo Comercial', maxPages: 5, maxProducts: 40, maxCategories: 5, maxStorageMb: 1024, enableCatalog: true, enableBlog: true, enableForms: true },
} as const
export const themes = {
  EDITORIAL_WARM: { label: 'Editorial cálido', primaryColor: '#523427', secondaryColor: '#755848', accentColor: '#E6A372', backgroundColor: '#FAF5EB', surfaceColor: '#F3E7D6', textColor: '#231B17', headingFont: 'Playfair Display', bodyFont: 'DM Sans', borderRadius: 'SOFT', animationLevel: 'SUBTLE' },
  CORPORATE_CLEAN: { label: 'Corporativo limpio', primaryColor: '#1649B2', secondaryColor: '#425473', accentColor: '#2DC7C1', backgroundColor: '#FFFFFF', surfaceColor: '#EBF2FC', textColor: '#101D33', headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter', borderRadius: 'ROUNDED', animationLevel: 'SUBTLE' },
  MODERN_BOLD: { label: 'Moderno audaz', primaryColor: '#C7F052', secondaryColor: '#BCCAC5', accentColor: '#F093FF', backgroundColor: '#121615', surfaceColor: '#202825', textColor: '#F8FFF8', headingFont: 'Inter', bodyFont: 'DM Sans', borderRadius: 'SHARP', animationLevel: 'EXPRESSIVE' },
} as const
export const demo = {
  admin: { email: 'admin@nodaraweb.com' },
  editor: { email: 'editor@casanomada.com.gt' },
}
export const slugify = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const money = (price: number) => 'Q' + price.toFixed(2)
export const sizeMb = (bytes: number) => (bytes / 1048576).toFixed(2)
export const productMessage = (product: { name: string, priceGtq: number }) => `Hola, me interesa ${product.name} (${money(product.priceGtq)})`
export const whatsapp = (site: { whatsappNumber: string, whatsappDefaultMessage: string }, message = site.whatsappDefaultMessage) =>
  site.whatsappNumber ? `https://wa.me/502${site.whatsappNumber}?text=${encodeURIComponent(message)}` : undefined
export const readJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T } catch { return fallback }
}
export const catalogPageId = 'system-catalogo'
export const reservedSlugs = ['admin', 'api', 'catalogo', 'uploads', 'robots-txt', 'sitemap-xml']
