'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { Picture } from '../public'

export function useMutation(endpoint = '/api/cms') {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string, error: boolean }>()
  const active = useRef(false)
  const router = useRouter()
  async function run<T = Record<string, unknown>>(payload: object | FormData, success = 'Cambios guardados.', refresh = true): Promise<T | undefined> {
    if (active.current) return
    active.current = true
    setBusy(true)
    setNotice(undefined)
    try {
      const multipart = payload instanceof FormData
      const response = await fetch(endpoint, {
        method: 'POST', body: multipart || payload instanceof File ? payload : JSON.stringify(payload),
        headers: multipart ? undefined : { 'Content-Type': 'application/json' },
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'No se pudo guardar el cambio.')
      if (success) setNotice({ text: success, error: false })
      if (refresh) router.refresh()
      return data as T
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'No se pudo conectar.', error: true })
    } finally {
      setBusy(false)
      active.current = false
    }
  }
  return { run, busy, notice, setNotice }
}
export function Notice({ value }: { value?: { text: string, error: boolean } }) {
  return value ? <div className={'notice' + (value.error ? ' error' : '')} role={value.error ? 'alert' : 'status'}>{value.text}</div> : null
}
export function Heading({ title, text, children }: { title: string, text?: string, children?: ReactNode }) {
  return <header className="admin-heading"><div><h1>{title}</h1>{text && <p>{text}</p>}</div>{children}</header>
}
export function Field({ label, hint, children }: { label: string, hint?: ReactNode, children: ReactNode }) {
  return <label className="field">{label}{children}{hint && <small>{hint}</small>}</label>
}
export function TextField({ label, value, change, max, multiline, type = 'text', required = false, placeholder }: {
  label: string, value: string, change: (value: string) => void, max: number, multiline?: boolean, type?: string, required?: boolean, placeholder?: string,
}) {
  return <Field label={label} hint={`${value.length} / ${max}`}>
    {multiline ? <textarea className="control" maxLength={max} value={value} onChange={e => change(e.target.value)} required={required} placeholder={placeholder}/> :
      <input className="control" maxLength={max} type={type} value={value} onChange={e => change(e.target.value)} required={required} placeholder={placeholder}/>}
  </Field>
}
export function Toggle({ checked, change, label, disabled }: { checked: boolean, change: (value: boolean) => void, label: string, disabled?: boolean }) {
  return <label className="check"><input type="checkbox" checked={checked} disabled={disabled} onChange={e => change(e.target.checked)} />{label}</label>
}
export function PersistentToggle({ checked, change, onLabel, offLabel, disabled }: {
  checked: boolean, change: (value: boolean) => Promise<unknown>, onLabel: string, offLabel: string, disabled?: boolean,
}) {
  const [pending, setPending] = useState<boolean>()
  const value = pending ?? checked
  useEffect(() => setPending(undefined), [checked])
  return <Toggle checked={value} label={value ? onLabel : offLabel} disabled={disabled} change={async next => {
    setPending(next)
    if (!await change(next)) setPending(undefined)
  }}/>
}
export function MediaPicker({ label = 'Imagen', media, value, change }: { label?: string, media: (Picture & { filename?: string })[], value: string | null, change: (value: string | null) => void }) {
  const current = media.find(item => item.id === value)
  return <div className="actions">
    {current && <img className="thumb" src={current.url} alt={current.altText}/>}
    <div className="flex-1 min-w-0"><Field label={label}><select className="control" value={value ?? ''} onChange={e => change(e.target.value || null)}>
      <option value="">Sin imagen</option>
      {media.map(image => <option key={image.id} value={image.id}>{image.filename || image.altText}</option>)}
    </select></Field></div>
  </div>
}
export function Dialog({ title, close, children, drawer = false }: { title: string, close: () => void, children: ReactNode, drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close() }, [])
  return <dialog ref={ref} className={'overlay' + (drawer ? ' drawer' : '')} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    <header className="dialog-head"><h2 id={id}>{title}</h2><button className="btn icon" type="button" onClick={close} aria-label="Cerrar"><X size={17}/></button></header>
    <div className="dialog-body">{children}</div>
  </dialog>
}
export function Confirm({ title, text, label, close, confirm, busy, notice }: {
  title: string, text: string, label: string, close: () => void, confirm: () => void,
  busy: boolean, notice?: { text: string, error: boolean },
}) {
  return <Dialog title={title} close={close}><div className="form-stack"><p className="muted">{text}</p><Notice value={notice}/>
    <div className="actions"><button className="btn" type="button" onClick={close}>Cancelar</button>
      <button className="btn danger" type="button" disabled={busy} onClick={confirm}>{label}</button></div>
  </div></Dialog>
}
