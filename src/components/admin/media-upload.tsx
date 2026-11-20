'use client'

import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { folders } from '@/lib/content'
import { Field, Notice, TextField, useMutation } from './ui'
import type { Picture } from '../public'

export type MediaFolder = typeof folders[number]
export const folderNames = { PORTADA: 'Portada', SERVICIOS: 'Servicios', CATALOGO: 'Catálogo', GENERAL: 'General' }
export type LibraryImage = Picture & { filename: string, folder: MediaFolder, sizeBytes: number, width: number | null, height: number | null }
const allowed = ['image/jpeg', 'image/png', 'image/webp']
export function UploadForm({ initial, folder = 'GENERAL', replace, saved }: {
  initial?: File, folder?: MediaFolder, replace?: LibraryImage, saved: (image: LibraryImage) => void,
}) {
  const [selected, setSelected] = useState(initial)
  const mutation = useMutation()
  const [altText, setAltText] = useState(replace?.altText ?? '')
  const [collection, setCollection] = useState(replace?.folder ?? folder)
  return <form className="form-stack" onSubmit={async event => {
    event.preventDefault()
    if (!selected) return
    if (selected.size > 2 * 1048576 || !allowed.includes(selected.type)) {
      mutation.setNotice({ error: true, text: 'Selecciona un JPG, PNG o WebP de hasta 2 MB.' })
      return
    }
    const data = new FormData()
    data.set('file', selected)
    data.set('folder', collection)
    data.set('altText', altText)
    if (replace) data.set('replaceId', replace.id)
    const result = await mutation.run<{ media: LibraryImage }>(data)
    if (result) saved(result.media)
  }}>
    <Field label="Archivo" hint="JPG, PNG o WebP · máximo 2 MB">
      <input className="control" type="file" required={!selected} accept={allowed.join(',')} onChange={e => setSelected(e.target.files?.[0])}/>
    </Field>
    {selected && <p className="subtle break-all">{selected.name}</p>}
    <TextField label="Texto alternativo (Alt)" value={altText} change={setAltText} required max={180}/>
    <Field label="Carpeta"><select className="control" value={collection} onChange={e => setCollection(e.target.value as MediaFolder)}>
      {folders.map(item => <option key={item} value={item}>{folderNames[item]}</option>)}
    </select></Field>
    <Notice value={mutation.notice}/>
    <button className="btn primary" disabled={!selected || mutation.busy}><UploadCloud size={16}/>{replace ? 'Reemplazar imagen' : 'Subir imagen'}</button>
  </form>
}
