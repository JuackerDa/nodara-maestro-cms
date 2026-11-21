'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SiteConfig } from '@prisma/client'
import { ArrowDown, ArrowRight, ArrowUpRight, Coffee, MapPin, MessageCircle } from 'lucide-react'
import { blockLabels, days, money, productMessage, readJson, whatsapp, type BlockType } from '@/lib/content'
import type { BlockData } from '@/lib/schemas'
import { PublicMotion } from './public-motion'
import type { Theme } from './theme'

export type Picture = { id: string, url: string, altText: string }
export type CardProduct = { id: string, name: string, priceGtq: number, description: string, badge: string | null, image: Picture | null, category: { name: string } }
type Contact = Pick<SiteConfig, 'whatsappNumber' | 'whatsappDefaultMessage' | 'mapsUrl' | 'address' | 'businessHoursJson'>
export type RenderBlock = { id: string, type: BlockType, visible: boolean, data: Record<string, unknown> }
type Context = { media: Picture[], products: CardProduct[], site: Contact, catalog: boolean }
export type PublicIdentity = Contact & Pick<SiteConfig, 'siteName' | 'tagline' | 'footerCreditEnabled' | 'footerCreditText' | 'socialLinksJson'> & { logo: Picture | null }
export type NavigationPage = { slug: string, title: string, isHome: boolean }

function Photo({ image, alt, eager = false }: { image: Picture, alt?: string, eager?: boolean }) {
  return <img src={image.url} alt={alt || image.altText} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : undefined} />
}
export function ProductCard({ product, site }: { product: CardProduct, site: Contact }) {
  const link = whatsapp(site, productMessage(product))
  return <article className="product-card" data-scroll-item>
    {product.image && <div className="product-photo"><Photo image={product.image} />{product.badge && <span>{product.badge}</span>}</div>}
    <div className="product-info">
      <p className="public-kicker">{product.category.name}</p>
      <div className="product-name"><h3>{product.name}</h3><strong>{money(product.priceGtq)}</strong></div>
      <p>{product.description}</p>
      {link && <a className="public-text-link" href={link} target="_blank" rel="noopener noreferrer">Pedir por WhatsApp <ArrowUpRight size={15} /></a>}
    </div>
  </article>
}

function Section({ block, data, nextSection }: { block: RenderBlock, data: Context, nextSection?: string }) {
  const { media, site, catalog, products } = data
  const picture = (id?: string | null) => media.find(image => image.id === id)
  switch (block.type) {
    case 'HERO': {
      const d = block.data as Partial<BlockData<'HERO'>>
      const image = picture(d?.imageMediaId)
      const href = d?.ctaAction === 'CATALOGO' ? catalog ? '/catalogo' : undefined : d?.ctaAction === 'ANCLA' ? d.anchor : whatsapp(site)
      return <section className="public-hero" data-hero-layout={image ? 'image' : 'text'}>
        <div className="hero-text">
          {site.address && <p className="public-kicker" data-hero-intro><MapPin size={15} aria-hidden="true" />{site.address}</p>}
          <h1 data-hero-intro>{d?.title}</h1>
          {d?.subtitle && <p className="hero-summary" data-hero-intro>{d.subtitle}</p>}
          {href && d?.ctaText && <a className="public-button" href={href} data-hero-intro
            {...(d.ctaAction === 'WHATSAPP' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {d.ctaText}<ArrowUpRight size={18} aria-hidden="true" />
          </a>}
        </div>
        {image && <div className="hero-frame" data-hero-frame><div className="hero-photo"><Photo image={image} alt={d?.imageAlt} eager /></div></div>}
        {nextSection && <a className="hero-scroll" href={'#' + nextSection} aria-label="Ir a la siguiente sección">
          <ArrowDown size={18} aria-hidden="true" />
        </a>}
      </section>
    }
    case 'ABOUT': {
      const value = block.data as Partial<BlockData<'ABOUT'>>
      const image = picture(value?.imageMediaId)
      return <section className="public-section about-section" data-with-image={!!image}>
        {image && <div className="about-photo" data-scroll-item><Photo image={image} /></div>}
        <div className="about-copy" data-scroll-item><h2>{value?.title}</h2><p>{value?.description}</p></div>
      </section>
    }
    case 'SERVICES_GRID': {
      const d = block.data as Partial<BlockData<'SERVICES_GRID'>>
      return <section className="public-section"><h2>{d.title}</h2><div className="public-grid">
        {d.items?.map((item, index) => <article className="public-tile" data-scroll-item key={index}><strong>{money(item.priceGtq || 0)}</strong><h3>{item.name}</h3><p>{item.description}</p></article>)}
      </div></section>
    }
    case 'FEATURES': {
      const d = block.data as Partial<BlockData<'FEATURES'>>
      return <section className="public-section feature-section"><h2>{d.title}</h2><div className="public-grid">
        {d.items?.map((item, index) => <article className="public-tile" data-scroll-item key={index}><h3>{item.title}</h3><p>{item.description}</p></article>)}
      </div></section>
    }
    case 'GALLERY': {
      const d = block.data as Partial<BlockData<'GALLERY'>>
      return <section className="public-section"><h2>{d.title}</h2><div className="public-grid">
        {d.imageMediaIds?.map((id, i) => { const image = picture(id); return image && <div className="gallery-photo" data-scroll-item key={id + i}><Photo image={image} /></div> })}
      </div></section>
    }
    case 'CATALOG_PREVIEW': {
      const d = block.data as Partial<BlockData<'CATALOG_PREVIEW'>>
      const selected = [...products].sort((a, b) => Number(b.badge === 'Destacado') - Number(a.badge === 'Destacado')).slice(0, d.count || 3)
      if (!catalog) return null
      return <section className="public-section"><header className="public-section-title"><h2>{d.title}</h2>
        {d.buttonText && <Link href="/catalogo" className="public-text-link">{d.buttonText} <ArrowRight size={18} /></Link>}</header>
        <div className="public-grid">{selected.map(product => <ProductCard key={product.id} product={product} site={site} />)}</div>
      </section>
    }
    case 'TESTIMONIALS': {
      const d = block.data as Partial<BlockData<'TESTIMONIALS'>>
      return <section className="public-section"><h2>{d.title}</h2><div className="public-grid">
        {d.items?.filter(item => item.approved).map((item, i) => <figure key={i} className="public-tile" data-scroll-item><blockquote>{item.text}</blockquote><figcaption><strong>{item.author}</strong> {item.position}</figcaption></figure>)}
      </div></section>
    }
    case 'CONTACT_WHATSAPP': {
      const d = block.data as Partial<BlockData<'CONTACT_WHATSAPP'>>
      const link = whatsapp(site)
      const hours = readJson<Record<string, { open: boolean, from: string, to: string }>>(site.businessHoursJson, {})
      return <section className="public-section contact-section"><div data-scroll-item><h2>{d.title}</h2><p>{d.text}</p>
        {site.address && <p><MapPin size={16} />{site.mapsUrl ? <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer">{site.address}</a> : site.address}</p>}
        {link && <a className="public-button" href={link} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Escríbenos</a>}
      </div><dl data-scroll-item>{days.map(day => hours[day] && <div key={day}><dt>{day}</dt><dd>{hours[day].open ? `${hours[day].from}–${hours[day].to}` : 'Cerrado'}</dd></div>)}</dl></section>
    }
  }
}
export function BlockRenderer({ blocks, theme, data, onEdit, selected }: {
  blocks: RenderBlock[], theme: Theme, data: Context, onEdit?: (id: string) => void, selected?: string,
}) {
  const shown = blocks.filter(block => block.visible && (data.catalog || block.type !== 'CATALOG_PREVIEW'))
  const contact = shown.find(block => block.type === 'CONTACT_WHATSAPP')
  const blockId = (block: RenderBlock) => block === contact ? 'contacto' : 'seccion-' + block.id
  return <PublicMotion level={onEdit ? 'NONE' : theme.animationLevel}>
    <div className="public-blocks">{shown.map((block, index) => (
      <div key={block.id} id={onEdit && block !== contact ? undefined : blockId(block)}
        className={onEdit ? 'preview-block' : 'public-block'}
        data-scroll-scene={!onEdit && index > 0 && block.type !== 'HERO' ? '' : undefined}
        data-selected={selected === block.id ? true : undefined}>
        {onEdit && <button type="button" className="edit-block" onClick={() => onEdit(block.id)} aria-label={`Editar bloque ${blockLabels[block.type]}`}>Editar bloque</button>}
        <Section block={block} data={data} nextSection={!onEdit && shown[index + 1] ? blockId(shown[index + 1]) : undefined} />
      </div>
    ))}</div>
  </PublicMotion>
}
export function PublicHeader({ site, pages, catalog, preview = false }: { site: PublicIdentity, pages: NavigationPage[], catalog: boolean, preview?: boolean }) {
  const pathname = usePathname()
  const links = pages.map(page => ({ href: page.isHome ? '/' : '/' + page.slug, label: page.title }))
  if (catalog) links.push({ href: '/catalogo', label: 'Catálogo' })
  const contact = whatsapp(site)
  return <header className="public-header">
    <a className="public-brand" href={preview ? undefined : '/'}>
      {site.logo ? <img src={site.logo.url} alt="" /> : <span className="public-mark"><Coffee size={21} strokeWidth={1.7} aria-hidden="true" /></span>}
      <span>{site.siteName}</span>
    </a>
    <nav aria-label="Navegación pública">
      {links.map(({ href, label }) => preview
        ? <span key={href}>{label}</span>
        : <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {contact && <a className="public-text-link public-header-contact" href={preview ? undefined : contact}
      target="_blank" rel="noopener noreferrer">Escríbenos <ArrowUpRight size={16} aria-hidden="true" /></a>}
  </header>
}
export function PublicFooter({ site, pages, catalog }: { site: PublicIdentity, pages: NavigationPage[], catalog: boolean }) {
  const socials = readJson<Record<string, string>>(site.socialLinksJson, {})
  return <footer className="public-footer">
    <div className="footer-identity">
      <Link className="public-brand" href="/">{site.siteName}</Link>
      {site.tagline && <p>{site.tagline}</p>}
      {site.address && <p><MapPin size={15} aria-hidden="true" /> {site.address}</p>}
    </div>
    <nav aria-label="Navegación del pie">{pages.map(page => <Link href={page.isHome ? '/' : '/' + page.slug} key={page.slug}>{page.title}</Link>)}
      {catalog && <Link href="/catalogo">Catálogo</Link>}
      {Object.entries(socials).filter(([, url]) => url).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name}</a>)}
    </nav>
    {site.footerCreditEnabled && site.footerCreditText && <small>{site.footerCreditText}</small>}
  </footer>
}
