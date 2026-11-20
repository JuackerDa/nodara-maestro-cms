'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Monitor, Plus, Smartphone, Tablet, Trash2 } from 'lucide-react'
import { blockLabels, blockTypes, slugify, type BlockType } from '@/lib/content'
import { defaults } from '@/lib/schemas'
import { BlockRenderer, PublicHeader, type NavigationPage, type PublicIdentity, type RenderBlock, type CardProduct, type Picture } from '../public'
import { ThemeProvider, type Theme } from '../theme'
import { Dialog, Field, Heading, MediaPicker, Notice, TextField, Toggle, useMutation } from './ui'

type EditorBlock = RenderBlock & { locked: boolean }
type EditorPage = { id: string, title: string, status: 'DRAFT' | 'PUBLISHED', version: string, pending: boolean, blocks: EditorBlock[] }
type Media = Picture & { filename: string }
const devices = { Desktop: [1140, Monitor], Tablet: [768, Tablet], Celular: [390, Smartphone] } as const
type Device = keyof typeof devices

export function PageEditor({ pages, media, products, theme, site, navigation, maxPages, catalog, agency }: {
  pages: EditorPage[], media: Media[], products: CardProduct[], theme: Theme, site: PublicIdentity,
  navigation: NavigationPage[], maxPages: number, catalog: boolean, agency: boolean,
}) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? '')
  const page = pages.find(item => item.id === pageId) ?? pages[0]
  const [newPage, setNewPage] = useState(false)
  const [dirty, setDirty] = useState(false)
  return <>
    <Heading title="Páginas" text="Edita bloques de contenido y revisa el resultado antes de publicar.">
      <span className="pill">{pages.length} / {maxPages} páginas</span></Heading>
    <Editor key={page?.id ?? 'empty'} page={page} pages={pages} media={media} products={products}
      theme={theme} site={site} navigation={navigation} catalog={catalog} agency={agency}
      onDirty={setDirty} changePage={id => {
        if (!dirty || window.confirm('¿Cambiar de página y descartar los cambios sin guardar?')) {
          setDirty(false)
          setPageId(id)
        }
      }} addPage={() => setNewPage(true)} canAdd={pages.length < maxPages}/>
    {newPage && <NewPage close={() => setNewPage(false)} created={id => {
      setPageId(id)
      setDirty(false)
      setNewPage(false)
    }} />}
  </>
}

function NewPage({ close, created }: { close: () => void, created: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [custom, setCustom] = useState(false)
  const mutation = useMutation()
  return <Dialog title="Nueva página" close={close}>
    <form className="form-stack" onSubmit={async event => {
      event.preventDefault()
      const result = await mutation.run<{ id: string }>({ action: 'page.create', data: { title, slug } }, 'Página creada.')
      if (result) created(result.id)
    }}>
      <TextField label="Título de la página" value={title} max={80} required change={value => { setTitle(value); if (!custom) setSlug(slugify(value)) }}/>
      <TextField label="Ruta" value={slug} max={100} required change={value => { setCustom(true); setSlug(value) }}/>
      <Notice value={mutation.notice}/>
      <button className="btn primary" disabled={mutation.busy}>Crear borrador</button>
    </form>
  </Dialog>
}

function Editor({ page, pages, media, products, theme, site, navigation, catalog, agency, changePage, addPage, canAdd, onDirty }: {
  page: EditorPage | undefined, pages: EditorPage[], media: Media[], products: CardProduct[],
  theme: Theme, site: PublicIdentity, navigation: NavigationPage[], catalog: boolean, agency: boolean,
  changePage: (id: string) => void, addPage: () => void, canAdd: boolean, onDirty: (dirty: boolean) => void,
}) {
  const [blocks, setBlocks] = useState(page?.blocks ?? [])
  const [baseline, setBaseline] = useState(page?.blocks ?? [])
  const [version, setVersion] = useState(page?.version)
  const [pending, setPending] = useState(page?.pending ?? false)
  const [published, setPublished] = useState(page?.status === 'PUBLISHED')
  const [expanded, setExpanded] = useState(page?.blocks[0]?.id)
  const [device, setDevice] = useState<Device>('Desktop')
  const [type, setType] = useState<BlockType>('ABOUT')
  const [width, setWidth] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const mutation = useMutation()
  const dirty = JSON.stringify(blocks) !== JSON.stringify(baseline)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const node = stage.current
    if (!node) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const openBlock = (id: string) => {
    setExpanded(id)
    requestAnimationFrame(() => {
      const editor = document.getElementById('editor-' + id)
      editor?.scrollIntoView({ block: 'nearest' })
      editor?.focus({ preventScroll: true })
    })
  }
  function move(index: number, offset: number) {
    const moved = [...blocks]
    ;[moved[index], moved[index + offset]] = [moved[index + offset], moved[index]]
    setBlocks(moved)
  }
  async function save(publish: boolean) {
    if (!page) return
    const current = blocks
    const result = await mutation.run<{ version: string, published: boolean }>({
      action: 'page.save', pageId: page.id, version,
      blocks: current.map(({ locked, ...block }) => block), publish,
    }, publish ? 'Cambios publicados.' : 'Borrador guardado.')
    if (result) {
      setBaseline(current)
      setVersion(result.version)
      setPending(!publish)
      setPublished(result.published)
    }
  }
  const previewWidth = devices[device][0]
  return <>
    <div className="editor-toolbar panel-card">
      <div className="actions">
        <select className="control" aria-label="Página" value={page?.id ?? ''} onChange={e => changePage(e.target.value)}>
          {!page && <option value="">Sin páginas</option>}
          {pages.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <button className="btn" disabled={!canAdd || mutation.busy} onClick={addPage}><Plus size={15}/> Nueva página</button>
        {page && <span className={'pill ' + (dirty || pending || !published ? 'pending' : 'live')}>
          {dirty ? 'Cambios sin guardar' : pending || !published ? 'Borrador guardado' : 'Publicado'}</span>}
      </div>
      <div className="segment" aria-label="Tamaño de la vista previa">{(Object.keys(devices) as Device[]).map(name => {
        const Icon = devices[name][1]
        return <button key={name} type="button" aria-pressed={device === name} onClick={() => setDevice(name)}><Icon size={14}/>{name}</button>
      })}</div>
      <div className="actions">
        <button type="button" className="btn" disabled={!page || mutation.busy} onClick={() => save(false)}>Guardar borrador</button>
        <button type="button" className="btn primary" disabled={!page || mutation.busy} onClick={() => save(true)}>Publicar cambios</button>
      </div>
    </div>
    <Notice value={mutation.notice}/>
    {page && <div className="editor-grid mt-3">
      <section aria-label="Editor de bloques" className="block-list">
        {blocks.map((block, index) => <article key={block.id} id={'editor-' + block.id} tabIndex={-1} className="panel-card block-editor">
          <header>
            <button type="button" className="block-name" aria-expanded={block.id === expanded}
              onClick={() => setExpanded(block.id === expanded ? undefined : block.id)}>
              {block.id === expanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>} {blockLabels[block.type]}</button>
            <Toggle checked={block.visible} label={block.visible ? 'Visible' : 'Oculto'} change={visible => setBlocks(items => items.map(item => item.id === block.id ? { ...item, visible } : item))}/>
            <button className="btn icon" type="button" title="Subir bloque" aria-label="Subir bloque" disabled={!index} onClick={() => move(index, -1)}><ArrowUp size={14}/></button>
            <button className="btn icon" type="button" title="Bajar bloque" aria-label="Bajar bloque" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14}/></button>
            {(agency || !block.locked) && <button className="btn danger icon" title="Quitar bloque" aria-label="Quitar bloque" type="button" onClick={() => setBlocks(items => items.filter(item => item.id !== block.id))}><Trash2 size={14}/></button>}
          </header>
          {block.id === expanded && <Fields block={block} media={media} change={data => setBlocks(items => items.map(item => item.id === block.id ? { ...item, data } : item))}/>}
        </article>)}
        <div className="panel-card actions">
          <select className="control flex-1" aria-label="Tipo de bloque" value={type} onChange={e => setType(e.target.value as BlockType)}>
            {blockTypes.filter(candidate => agency || candidate !== 'HERO' && (catalog || candidate !== 'CATALOG_PREVIEW'))
              .map(candidate => <option value={candidate} key={candidate}>{blockLabels[candidate]}</option>)}
          </select>
          <button className="btn" type="button" disabled={blocks.length >= 50} onClick={() => {
            const id = crypto.randomUUID()
            setBlocks([...blocks, { id, type, visible: true, locked: false, data: structuredClone(defaults[type]) }])
            openBlock(id)
          }}><Plus size={15}/> Agregar bloque</button>
        </div>
      </section>
      <div className="preview-stage" ref={stage} aria-label="Vista previa del sitio">
        <div className="preview-frame" style={{ width: previewWidth, zoom: width ? Math.min(1, width / previewWidth) : 0.5 }}
          onClick={event => { if ((event.target as Element).closest('a')) event.preventDefault() }}>
          <ThemeProvider theme={theme}><PublicHeader site={site} pages={navigation} catalog={catalog} preview/>
            <BlockRenderer blocks={blocks} theme={theme} data={{ site, media, products, catalog }} onEdit={openBlock} selected={expanded}/>
          </ThemeProvider>
        </div>
      </div>
    </div>}
  </>
}

function Fields({ block, media, change }: { block: EditorBlock, media: Media[], change: (value: Record<string, unknown>) => void }) {
  const d = block.data
  const text = (key: string) => typeof d[key] === 'string' ? d[key] : ''
  const patch = (key: string, value: unknown) => change({ ...d, [key]: value })
  const field = (key: string, label: string, max: number, multiline = false) =>
    <TextField label={label} value={text(key)} change={value => patch(key, value)} max={max} multiline={multiline}/>
  const image = <MediaPicker media={media} value={text('imageMediaId') || null} change={id => {
    if (block.type === 'HERO') change({ ...d, imageMediaId: id, imageAlt: media.find(item => item.id === id)?.altText || '' })
    else patch('imageMediaId', id)
  }}/>
  const collection = {
    SERVICES_GRID: { name: 'servicio', min: 0, max: 30, initial: { name: '', description: '', priceGtq: 0 },
      fields: [['name', 'Nombre', 60], ['description', 'Descripción corta', 140]] },
    FEATURES: { name: 'característica', min: 3, max: 4, initial: { title: '', description: '' },
      fields: [['title', 'Título', 50], ['description', 'Descripción', 140]] },
    TESTIMONIALS: { name: 'testimonio', min: 0, max: 30, initial: { author: '', position: '', text: '', approved: true },
      fields: [['author', 'Autor', 60], ['position', 'Negocio o cargo', 70], ['text', 'Reseña', 300]] },
  } as const
  return <div className="form-stack">{field('title', 'Título', 60)}
    {block.type === 'HERO' && <>
      {field('subtitle', 'Subtítulo', 140, true)}{field('ctaText', 'Texto del botón', 40)}
      <Field label="Acción del botón"><select className="control" value={text('ctaAction')} onChange={e => patch('ctaAction', e.target.value)}>
        <option value="WHATSAPP">WhatsApp</option><option value="CATALOGO">Catálogo</option><option value="ANCLA">Ancla</option>
      </select></Field>
      {text('ctaAction') === 'ANCLA' && field('anchor', 'Ancla (ej. #contacto)', 60)}
      {image}{field('imageAlt', 'Texto alternativo de la portada', 180)}
    </>}
    {block.type === 'ABOUT' && <>{field('description', 'Descripción', 400, true)}{image}</>}
    {block.type === 'GALLERY' && <div className="media-grid">{media.map(item => {
      const ids = Array.isArray(d.imageMediaIds) ? d.imageMediaIds as string[] : []
      return <button key={item.id} className="media-tile" type="button" aria-pressed={ids.includes(item.id)} onClick={() => patch('imageMediaIds',
        ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id])}>
        <img src={item.url} alt={item.altText}/><span>{item.filename}</span>
      </button>
    })}</div>}
    {block.type === 'CATALOG_PREVIEW' && <><Field label="Cantidad de productos"><input className="control" type="number" min={1} max={12}
      value={Number(d.count ?? 1)} onChange={e => patch('count', e.target.valueAsNumber || 1)}/></Field>{field('buttonText', 'Texto del botón', 40)}</>}
    {block.type === 'CONTACT_WHATSAPP' && <>
      {field('text', 'Texto breve', 180, true)}<p className="subtle">WhatsApp y horarios se sincronizan desde Contacto.</p>
    </>}
    {(block.type === 'SERVICES_GRID' || block.type === 'FEATURES' || block.type === 'TESTIMONIALS') && (() => {
      const config = collection[block.type]
      const items = (Array.isArray(d.items) ? d.items : []) as Record<string, unknown>[]
      const set = (index: number, key: string, value: unknown) => patch('items', items.map((item, i) => i === index ? { ...item, [key]: value } : item))
      function reorder(index: number, offset: number) {
        const next = [...items]
        ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
        patch('items', next)
      }
      return <>{items.map((item, index) => <div className="block-item" key={index}>
        {config.fields.map(([key, label, max]) => <TextField key={key} label={label} max={max} value={String(item[key] ?? '')} change={value => set(index, key, value)} multiline={max > 70}/>)}
        {block.type === 'SERVICES_GRID' && <Field label="Precio en GTQ"><input className="control" type="number" min={0} step=".01"
          value={Number(item.priceGtq ?? 0)} onChange={e => set(index, 'priceGtq', e.target.valueAsNumber || 0)}/></Field>}
        {block.type === 'TESTIMONIALS' && <Toggle label="Aprobado" checked={!!item.approved} change={value => set(index, 'approved', value)}/>}
        <div className="actions">
          <button type="button" className="btn icon" aria-label={'Subir ' + config.name} disabled={!index} onClick={() => reorder(index, -1)}><ArrowUp size={14}/></button>
          <button type="button" className="btn icon" aria-label={'Bajar ' + config.name} disabled={index === items.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={14}/></button>
          <button type="button" className="btn danger icon" aria-label={'Eliminar ' + config.name} disabled={items.length <= config.min} onClick={() => patch('items', items.filter((_, i) => i !== index))}><Trash2 size={14}/></button>
        </div>
      </div>)}
      <button type="button" className="btn" disabled={items.length >= config.max} onClick={() => patch('items', [...items, config.initial])}><Plus size={15}/> Agregar {config.name}</button></>
    })()}
  </div>
}
