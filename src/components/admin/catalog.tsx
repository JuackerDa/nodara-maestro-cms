'use client'

import { useState } from 'react'
import { Copy, Image, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react'
import { money, productMessage } from '@/lib/content'
import { Confirm, Dialog, Field, Heading, MediaPicker, Notice, PersistentToggle, TextField, useMutation } from './ui'
import { UploadForm, type LibraryImage } from './media-upload'
import type { CardProduct, Picture } from '../public'

type Category = { id: string, name: string }
type Product = CardProduct & { categoryId: string, imageMediaId: string | null, visible: boolean }
type Media = Picture & { filename: string }
export function CatalogAdmin({ products, categories, media, maxProducts, maxCategories, enabled }: {
  products: Product[], categories: Category[], media: Media[], maxProducts: number, maxCategories: number, enabled: boolean,
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [drawer, setDrawer] = useState<Product | 'new'>()
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [remove, setRemove] = useState<Product>()
  const mutation = useMutation()
  const shown = products.filter(product => (!category || product.categoryId === category)
    && product.name.toLocaleLowerCase('es-GT').includes(query.trim().toLocaleLowerCase('es-GT')))
  return <>
    <Heading title="Catálogo" text="Gestiona productos, precios en quetzales y categorías.">
      <div className="actions"><span className="pill">{products.length} / {maxProducts} productos</span><span className="pill">{categories.length} / {maxCategories} categorías</span></div></Heading>
    {!enabled && <p className="notice mb-3">El catálogo está oculto al público por el plan actual.</p>}
    <section className="panel-card form-stack">
      <div className="actions justify-between">
        <div className="actions">
          <input className="control w-auto" type="search" placeholder="Buscar productos" aria-label="Buscar productos" value={query} onChange={e => setQuery(e.target.value)}/>
          <select className="control w-auto" aria-label="Filtrar por categoría" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Todas las categorías</option>{categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setCategoryDialog(true)}>Gestionar categorías</button>
          <button className="btn primary" disabled={products.length >= maxProducts || !categories.length} onClick={() => setDrawer('new')}><Plus size={15}/> Nuevo producto</button>
        </div>
      </div>
      {!remove && <Notice value={mutation.notice}/>}
      <div className="table-scroll"><table className="admin-table">
        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{shown.map(product => <tr key={product.id}>
          <td><div className="td-product">{product.image ? <img className="thumb" src={product.image.url} alt={product.image.altText}/> :
            <span className="thumb"><Image size={18}/></span>}{product.name}</div></td>
          <td>{product.category.name}</td><td>{money(product.priceGtq)}</td>
          <td><PersistentToggle onLabel="Visible" offLabel="Oculto" checked={product.visible} disabled={mutation.busy}
            change={visible => mutation.run({ action: 'product.visibility', productId: product.id, visible })}/></td>
          <td><div className="actions">
            <button className="btn icon" title="Editar" aria-label={'Editar ' + product.name} onClick={() => setDrawer(product)}><Pencil size={15}/></button>
            <button className="btn icon" title="Duplicar" aria-label={'Duplicar ' + product.name} disabled={mutation.busy || products.length >= maxProducts}
              onClick={() => mutation.run({ action: 'product.duplicate', productId: product.id }, 'Se creó una copia oculta.')}><Copy size={15}/></button>
            <button className="btn danger icon" title="Eliminar" aria-label={'Eliminar ' + product.name} onClick={() => { mutation.setNotice(undefined); setRemove(product) }}><Trash2 size={15}/></button>
          </div></td>
        </tr>)}</tbody></table>
        {!shown.length && <p className="empty">No hay productos que coincidan.</p>}
      </div>
    </section>
    {drawer && <ProductDrawer product={drawer === 'new' ? undefined : drawer} categories={categories} media={media} close={() => setDrawer(undefined)}/>}
    {categoryDialog && <Categories rows={categories} used={products.map(product => product.categoryId)} limit={maxCategories} close={() => setCategoryDialog(false)}/>}
    {remove && <Confirm title="Eliminar producto" text={`Se eliminará «${remove.name}» del catálogo.`} close={() => setRemove(undefined)} label="Eliminar producto"
      busy={mutation.busy} notice={mutation.notice} confirm={async () => {
        if (await mutation.run({ action: 'product.delete', productId: remove.id }, 'Producto eliminado.')) setRemove(undefined)
      }}/>}
  </>
}
function ProductDrawer({ product, categories, media, close }: { product?: Product, categories: Category[], media: Media[], close: () => void }) {
  const [data, setData] = useState({
    name: product?.name ?? '', categoryId: product?.categoryId ?? categories[0]?.id ?? '', priceGtq: product?.priceGtq ?? 0,
    description: product?.description ?? '', badge: product?.badge ?? '', imageMediaId: product?.imageMediaId ?? null,
  })
  const [showUpload, setShowUpload] = useState(false)
  const [uploaded, setUploaded] = useState<LibraryImage[]>([])
  const allMedia = [...uploaded.filter(image => !media.some(item => item.id === image.id)), ...media]
  const change = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) => setData(old => ({ ...old, [key]: value }))
  const mutation = useMutation()
  return <Dialog drawer title={product ? 'Editar producto' : 'Nuevo producto'} close={close}><div className="form-stack">
    <form className="form-stack" onSubmit={async event => {
      event.preventDefault()
      if (await mutation.run({ action: 'product.save', productId: product?.id, data: { ...data, badge: data.badge || null } })) close()
    }}>
      <MediaPicker label="Imagen principal" media={allMedia} value={data.imageMediaId} change={id => change('imageMediaId', id)}/>
      <button type="button" className="btn" onClick={() => setShowUpload(!showUpload)}><UploadCloud size={15}/>{showUpload ? 'Ocultar carga' : 'Subir imagen'}</button>
      <TextField label="Nombre" value={data.name} change={value => change('name', value)} required max={100}/>
      <Field label="Categoría"><select className="control" required value={data.categoryId} onChange={e => change('categoryId', e.target.value)}>
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></Field>
      <Field label="Precio en GTQ"><input className="control" type="number" min={0} max={1000000} step=".01" required value={data.priceGtq}
        onChange={e => change('priceGtq', e.target.valueAsNumber || 0)}/></Field>
      <TextField label="Descripción breve" value={data.description} change={value => change('description', value)} max={250} multiline/>
      <Field label="Distintivo"><select className="control" value={data.badge} onChange={e => change('badge', e.target.value)}>
        <option value="">Sin distintivo</option><option>Nuevo</option><option>Destacado</option>
      </select></Field>
      <div className="panel-card"><h3>Mensaje de WhatsApp</h3><p>{productMessage({ ...data, name: data.name || 'Nombre del producto' })}</p></div>
      <Notice value={mutation.notice}/>
      <button className="btn primary" disabled={mutation.busy}>Guardar producto</button>
    </form>
    {showUpload && <div className="panel-card"><UploadForm folder="CATALOGO" saved={image => {
      setUploaded(items => [...items, image]); change('imageMediaId', image.id); setShowUpload(false)
    }}/></div>}
  </div></Dialog>
}
function Categories({ rows, used, limit, close }: { rows: Category[], used: string[], limit: number, close: () => void }) {
  const [edit, setEdit] = useState<Category>()
  const [name, setName] = useState('')
  const mutation = useMutation()
  return <Dialog title="Gestionar categorías" close={close}><div className="form-stack">
    <p className="subtle">{rows.length} de {limit} categorías</p>
    {rows.map(row => <div key={row.id} className="actions justify-between"><strong>{row.name}</strong><div className="actions">
      <button type="button" className="btn icon" aria-label={'Editar categoría ' + row.name} onClick={() => { setEdit(row); setName(row.name) }}><Pencil size={14}/></button>
      <button type="button" className="btn danger icon" aria-label={'Eliminar categoría ' + row.name} disabled={used.includes(row.id) || mutation.busy}
        onClick={() => { if (window.confirm(`¿Eliminar la categoría «${row.name}»?`)) void mutation.run({ action: 'category.delete', categoryId: row.id }) }}><Trash2 size={14}/></button>
    </div></div>)}
    <form className="form-stack" onSubmit={async event => {
      event.preventDefault()
      if (await mutation.run({ action: 'category.save', categoryId: edit?.id, name })) { setEdit(undefined); setName('') }
    }}>
      <TextField label={edit ? 'Editar nombre' : 'Nueva categoría'} required max={80} value={name} change={setName}/>
      <div className="actions"><button className="btn primary" disabled={mutation.busy || !edit && rows.length >= limit}>Guardar categoría</button>
        {edit && <button type="button" className="btn" onClick={() => { setEdit(undefined); setName('') }}>Cancelar edición</button>}</div>
    </form>
    <Notice value={mutation.notice}/>
  </div></Dialog>
}
