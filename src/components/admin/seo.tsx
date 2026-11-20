'use client'

import { useState } from 'react'
import { Globe, MessageCircle } from 'lucide-react'
import type { Picture } from '../public'
import { Field, Heading, MediaPicker, Notice, TextField, useMutation } from './ui'

type SeoPage = { id: string, slug: string, isHome: boolean, title: string, seoTitle: string, seoDescription: string, ogImageMediaId: string | null }
type SeoProps = { pages: SeoPage[], media: (Picture & { filename: string, width: number | null, height: number | null })[], domain: string, name: string, tagline: string }
export function SeoAdmin({ pages, media, domain, name, tagline }: SeoProps) {
  const [id, setId] = useState(pages[0]?.id ?? '')
  const page = pages.find(p => p.id === id)
  return <>
    <Heading title="SEO" text="Edita cómo aparece cada página en búsquedas y al compartirla."/>
    <div className="panel-card mb-4"><Field label="Página"><select className="control" aria-label="Página" value={id} onChange={e => setId(e.target.value)}>
      {!pages.length && <option value="">Sin páginas</option>}
      {pages.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select></Field></div>
    {page && <SeoEditor key={page.id} page={page} media={media} domain={domain} name={name} tagline={tagline}/>}
  </>
}
function SeoEditor({ page, media, domain, name, tagline }: Omit<SeoProps, 'pages'> & { page: SeoPage }) {
  const [data, set] = useState({ seoTitle: page.seoTitle, seoDescription: page.seoDescription, ogImageMediaId: page.ogImageMediaId })
  const mutation = useMutation()
  const image = media.find(item => item.id === data.ogImageMediaId)
  const url = (domain || 'http://localhost:3000').replace(/\/$/, '') + (page.isHome ? '/' : '/' + page.slug)
  const title = data.seoTitle || (page.isHome ? name : page.title + ' | ' + name)
  const description = data.seoDescription || tagline
  return <div className="seo-grid">
    <form className="panel-card form-stack" onSubmit={event => {
      event.preventDefault()
      void mutation.run({ action: 'seo.save', pageId: page.id, data })
    }}>
      <h2>Metadatos de la página</h2>
      <TextField label="Título SEO" value={data.seoTitle} max={60} change={value => set(old => ({ ...old, seoTitle: value }))}/>
      <TextField label="Meta descripción" value={data.seoDescription} max={155} change={value => set(old => ({ ...old, seoDescription: value }))} multiline/>
      <MediaPicker label="Imagen para redes (OG 1200 × 630)" media={media} value={data.ogImageMediaId} change={value => set(old => ({ ...old, ogImageMediaId: value }))}/>
      {image && (image.width !== 1200 || image.height !== 630) && <p className="subtle">Imagen seleccionada de {image.width} × {image.height} px. La vista previa muestra el recorte.</p>}
      <Notice value={mutation.notice}/><button className="btn primary" disabled={mutation.busy}>Guardar SEO</button>
    </form>
    <div className="form-stack">
      <section className="panel-card seo-google">
        <h2 className="actions"><Globe size={17}/> Cómo se verá en Google</h2>
        <p className="subtle break-all mt-2">{url}</p><h3>{title}</h3><p className="subtle">{description}</p>
      </section>
      <section className="panel-card seo-share">
        <h2 className="actions"><MessageCircle size={17}/> Cómo se verá en WhatsApp</h2>
        {image && <img src={image.url} alt={image.altText}/>}
        <h3 className="mt-2">{title}</h3><p className="subtle">{description}</p><p className="subtle break-all mt-1">{url}</p>
      </section>
    </div>
  </div>
}
