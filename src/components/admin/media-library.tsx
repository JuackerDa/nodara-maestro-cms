'use client'

import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { folders, sizeMb } from '@/lib/content'
import { Confirm, Dialog, Field, Heading, Notice, TextField, useMutation } from './ui'
import { folderNames, UploadForm, type LibraryImage, type MediaFolder } from './media-upload'

export function MediaLibrary({ images, used, maxMb }: { images: LibraryImage[], used: Record<string, number>, maxMb: number }) {
  const [folder, setFolder] = useState<MediaFolder | ''>('')
  const [imageId, setImageId] = useState(images[0]?.id)
  const [drag, setDrag] = useState(false)
  const [upload, setUpload] = useState<{ file?: File, replace?: LibraryImage }>()
  const [recent, setRecent] = useState<LibraryImage>()
  const [message, setMessage] = useState('')
  const combined = recent ? [recent, ...images.filter(image => image.id !== recent.id)] : images
  const shown = combined.filter(image => !folder || image.folder === folder)
  const picked = shown.find(image => image.id === imageId) ?? shown[0]
  const total = combined.reduce((sum, image) => sum + image.sizeBytes, 0)
  return <>
    <Heading title="Multimedia" text="Organiza imágenes y actualiza los recursos que usa el sitio.">
      <button className="btn primary" onClick={() => setUpload({})}><UploadCloud size={16}/> Subir imagen</button>
    </Heading>
    {message && <div className="notice mb-3" role="status">{message}</div>}
    <div className="media-layout">
      <section className="panel-card form-stack">
        <div><strong>{sizeMb(total)} MB / {maxMb} MB</strong><progress className="usage-meter" value={Math.min(total, maxMb * 1048576)} max={maxMb * 1048576} aria-label="Almacenamiento usado"/></div>
        <div className="media-drop" data-drag={drag} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={event => {
            event.preventDefault()
            setDrag(false)
            const file = event.dataTransfer.files[0]
            if (file) setUpload({ file })
          }}><UploadCloud size={22}/><p className="subtle">Arrastra una imagen aquí o usa «Subir imagen».</p></div>
        <div className="segment" aria-label="Carpeta multimedia">
          <button type="button" aria-pressed={!folder} onClick={() => setFolder('')}>Todas</button>
          {folders.map(item => <button key={item} type="button" aria-pressed={folder === item} onClick={() => setFolder(item)}>{folderNames[item]}</button>)}
        </div>
        <div className="media-grid">{shown.map(image => <button type="button" key={image.id} className="media-tile" aria-pressed={picked?.id === image.id} onClick={() => setImageId(image.id)}>
          <img src={image.url} alt={image.altText}/><span>{image.filename}</span>
        </button>)}</div>
        {!shown.length && <p className="empty">Esta carpeta está vacía.</p>}
      </section>
      {picked && <Details key={picked.id + picked.url + picked.altText + picked.folder} image={picked} count={used[picked.id] ?? 0}
        replace={() => setUpload({ replace: picked })} changed={() => { if (recent?.id === picked.id) setRecent(undefined) }}/>}
    </div>
    {upload && <Dialog title={upload.replace ? 'Reemplazar imagen' : 'Subir imagen'} close={() => setUpload(undefined)}>
      <UploadForm initial={upload.file} replace={upload.replace} folder={folder || 'GENERAL'} saved={image => {
        setRecent(image)
        setImageId(image.id)
        if (folder && image.folder !== folder) setFolder(image.folder)
        setMessage(upload.replace ? 'Imagen reemplazada.' : 'Imagen subida a la biblioteca.')
        setUpload(undefined)
      }}/>
    </Dialog>}
  </>
}
function Details({ image, count, replace, changed }: { image: LibraryImage, count: number, replace: () => void, changed: () => void }) {
  const [altText, setAltText] = useState(image.altText)
  const [folder, setFolder] = useState(image.folder)
  const [remove, setRemove] = useState(false)
  const mutation = useMutation()
  return <section className="panel-card media-detail form-stack">
    <h2>Detalles de imagen</h2>
    <img src={image.url} alt={image.altText}/>
    <div><strong className="break-all">{image.filename}</strong><p className="subtle">{image.width ?? '—'} × {image.height ?? '—'} px · {sizeMb(image.sizeBytes)} MB</p>
      <p className="subtle">Usada en {count} {count === 1 ? 'lugar' : 'lugares'}</p></div>
    <form className="form-stack" onSubmit={async event => {
      event.preventDefault()
      if (await mutation.run({ action: 'media.update', mediaId: image.id, altText, folder })) changed()
    }}>
      <TextField label="Texto alternativo (Alt)" value={altText} change={setAltText} required max={180}/>
      <Field label="Carpeta"><select className="control" value={folder} onChange={e => setFolder(e.target.value as MediaFolder)}>
        {folders.map(item => <option key={item} value={item}>{folderNames[item]}</option>)}
      </select></Field>
      <button className="btn primary" disabled={mutation.busy}>Guardar detalles</button>
    </form>
    {!remove && <Notice value={mutation.notice}/>}
    <div className="actions"><button type="button" className="btn" onClick={replace}>Reemplazar imagen</button>
      <button type="button" className="btn danger" disabled={!!count} onClick={() => { mutation.setNotice(undefined); setRemove(true) }}>Eliminar</button></div>
    {remove && <Confirm title="Eliminar imagen" text={`Se eliminará «${image.filename}» de la biblioteca.`} close={() => setRemove(false)} label="Eliminar imagen"
      busy={mutation.busy} notice={mutation.notice} confirm={async () => {
        if (await mutation.run({ action: 'media.delete', mediaId: image.id })) { changed(); setRemove(false) }
      }}/>}
  </section>
}
