'use client'

import { useState } from 'react'
import { Download, ShieldCheck, UploadCloud } from 'lucide-react'
import { animationLevels, fonts, plans, radii, themes } from '@/lib/content'
import type { z } from 'zod'
import type { identityFields, planFields, themeFields } from '@/lib/schemas'
import type { Picture } from '../public'
import { Confirm, Dialog, Field, Heading, MediaPicker, Notice, PersistentToggle, TextField, Toggle, useMutation } from './ui'

type Plan = z.infer<typeof planFields>
type Theme = z.infer<typeof themeFields>
type Identity = z.infer<typeof identityFields>
type Editor = { id: string, name: string, email: string, active: boolean }
type Media = Picture & { filename: string }
const tabs = ['Módulos y límites', 'Estética y tema', 'Usuarios y respaldos'] as const
export function AgencyAdmin({ plan, theme, identity, media, editors }: { plan: Plan, theme: Theme, identity: Identity, media: Media[], editors: Editor[] }) {
  const [tab, setTab] = useState(0)
  return <>
    <Heading title="Modo Agencia" text="Configura el plan, la identidad del sitio y los accesos del cliente."/>
    <div className="agency-banner"><ShieldCheck size={20}/> Modo Agencia · Solo visible para Super Admin</div>
    <div className="segment mb-4" role="group" aria-label="Secciones de agencia">
      {tabs.map((name, index) => <button key={name} type="button" aria-pressed={tab === index} onClick={() => setTab(index)}>{name}</button>)}
    </div>
    <div hidden={tab !== 0}><PlanForm initial={plan}/></div>
    <div hidden={tab !== 1} className="form-stack"><ThemeForm initial={theme}/><IdentityForm initial={identity} media={media}/></div>
    <div hidden={tab !== 2} className="form-stack"><Users editors={editors}/><Backups/></div>
  </>
}
function PlanForm({ initial }: { initial: Plan }) {
  const [data, set] = useState(initial)
  const mutation = useMutation('/api/agency')
  const limits = [['maxPages', 'Páginas', 1], ['maxProducts', 'Productos', 0], ['maxCategories', 'Categorías', 0], ['maxStorageMb', 'Almacenamiento (MB)', 1]] as const
  const flags = [['enableCatalog', 'Catálogo'], ['enableBlog', 'Blog'], ['enableForms', 'Formularios'], ['footerCreditEnabled', 'Crédito de Nodara Web']] as const
  return <form className="panel-card form-stack" onSubmit={event => {
    event.preventDefault()
    void mutation.run({ action: 'plan.save', data })
  }}>
    <h2>Plan comercial</h2>
    <Field label="Plan"><select className="control" value={data.planName} onChange={e => {
      const planName = e.target.value as Plan['planName']
      const { label, ...template } = plans[planName]
      set(old => ({ ...old, ...template, planName }))
    }}>{Object.entries(plans).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></Field>
    <div className="form-grid">{limits.map(([key, label, min]) => <Field key={key} label={label}>
      <input className="control" type="number" min={min} max={key === 'maxPages' ? 500 : key === 'maxStorageMb' ? 65536 : 1000000} required
        value={data[key]} onChange={e => set(old => ({ ...old, [key]: e.target.valueAsNumber || min }))}/>
    </Field>)}</div>
    <div className="form-grid">{flags.map(([key, label]) => <Toggle key={key} label={label} checked={data[key]} change={value => set(old => ({ ...old, [key]: value }))}/>)}</div>
    <Notice value={mutation.notice}/><div><button className="btn primary" disabled={mutation.busy}>Guardar plan</button></div>
  </form>
}
const colors = [
  ['primaryColor', 'Primario'], ['secondaryColor', 'Secundario'], ['accentColor', 'Acento'],
  ['backgroundColor', 'Fondo'], ['surfaceColor', 'Superficie'], ['textColor', 'Texto'],
] as const
const presets = Object.keys(themes) as Theme['preset'][]
function ThemeForm({ initial }: { initial: Theme }) {
  const [data, set] = useState(initial)
  const mutation = useMutation('/api/agency')
  return <form className="panel-card form-stack" onSubmit={event => {
    event.preventDefault()
    void mutation.run({ action: 'theme.save', data }, 'Tema actualizado en el sitio público.')
  }}>
    <div className="actions justify-between"><h2>Estética del sitio público</h2><a className="btn" href="/" target="_blank" rel="noopener noreferrer">Abrir sitio público</a></div>
    <div className="preset-grid">{presets.map(preset => {
      const { label, ...values } = themes[preset]
      return <button key={preset} className="preset-card" type="button" aria-pressed={data.preset === preset}
        style={{ background: values.backgroundColor, color: values.textColor, fontFamily: `"${values.headingFont} Variable"` }}
        onClick={() => set({ ...values, preset })}>
        <b>{label}</b><span className="actions">{[values.primaryColor, values.accentColor, values.surfaceColor].map(color =>
          <i key={color} style={{ background: color, width: 20, height: 20, border: '1px solid #8888', borderRadius: 20 }}/>)}</span>
      </button>
    })}</div>
    <div className="form-grid">{colors.map(([key, label]) => <Field key={key} label={label}>
      <span className="color-control"><input type="color" value={data[key]} onChange={e => set(old => ({ ...old, [key]: e.target.value }))}/><span>{data[key]}</span></span>
    </Field>)}</div>
    <div className="form-grid">
      {(['headingFont', 'bodyFont'] as const).map((key, index) => <Field label={index ? 'Tipografía de texto' : 'Tipografía de títulos'} key={key}>
        <select className="control" value={data[key]} onChange={e => set(old => ({ ...old, [key]: e.target.value as Theme[typeof key] }))}>
          {fonts.map(font => <option key={font}>{font}</option>)}
        </select>
      </Field>)}
      <Field label="Bordes"><select className="control" value={data.borderRadius} onChange={e => set(old => ({ ...old, borderRadius: e.target.value as Theme['borderRadius'] }))}>
        {radii.map((value, i) => <option key={value} value={value}>{['Rectos', 'Suaves', 'Redondeados'][i]}</option>)}</select></Field>
      <Field label="Animación"><select className="control" value={data.animationLevel} onChange={e => set(old => ({ ...old, animationLevel: e.target.value as Theme['animationLevel'] }))}>
        {animationLevels.map((value, i) => <option key={value} value={value}>{['Sutil', 'Expresiva', 'Sin animación'][i]}</option>)}</select></Field>
    </div>
    <Notice value={mutation.notice}/><div><button className="btn primary" disabled={mutation.busy}>Guardar tema</button></div>
  </form>
}
function IdentityForm({ initial, media }: { initial: Identity, media: Media[] }) {
  const [data, set] = useState(initial)
  const mutation = useMutation('/api/agency')
  const fields = [['siteName', 'Nombre del negocio', 90], ['tagline', 'Descripción corta', 140], ['domain', 'Dominio (URL)', 2048], ['footerCreditText', 'Texto del crédito', 100]] as const
  return <form className="panel-card form-stack" onSubmit={event => { event.preventDefault(); void mutation.run({ action: 'identity.save', data }) }}>
    <h2>Identidad del sitio</h2><div className="form-grid">{fields.map(([key, label, max]) => <TextField key={key} label={label}
      type={key === 'domain' ? 'url' : 'text'} value={data[key]} max={max} required={key === 'siteName'} change={value => set(old => ({ ...old, [key]: value }))}/>)}
      <MediaPicker label="Logotipo" media={media} value={data.logoMediaId} change={logoMediaId => set(old => ({ ...old, logoMediaId }))}/>
      <MediaPicker label="Icono del sitio" media={media} value={data.faviconMediaId} change={faviconMediaId => set(old => ({ ...old, faviconMediaId }))}/>
    </div><Notice value={mutation.notice}/><div><button className="btn primary" disabled={mutation.busy}>Guardar identidad</button></div>
  </form>
}
function Users({ editors }: { editors: Editor[] }) {
  const [dialog, setDialog] = useState<Editor | 'new'>()
  const mutation = useMutation('/api/agency')
  return <section className="panel-card form-stack">
    <div className="actions justify-between"><h2>Cuentas de editor</h2><button className="btn primary" onClick={() => setDialog('new')}>Crear editor</button></div>
    <Notice value={mutation.notice}/>
    {!editors.length && <p className="subtle">Aún no hay cuentas de editor.</p>}
    {editors.map(editor => <div className="activity-row" key={editor.id}>
      <div><strong>{editor.name}</strong><small>{editor.email}</small></div>
      <div className="actions">
        <PersistentToggle onLabel="Activa" offLabel="Desactivada" checked={editor.active} disabled={mutation.busy}
          change={active => mutation.run({ action: 'user.active', userId: editor.id, active })}/>
        <button className="btn" type="button" onClick={() => setDialog(editor)}>Restablecer contraseña</button>
      </div>
    </div>)}
    {dialog && <UserForm editor={dialog === 'new' ? undefined : dialog} close={() => setDialog(undefined)}/>}
  </section>
}
function UserForm({ editor, close }: { editor?: Editor, close: () => void }) {
  const mutation = useMutation('/api/agency')
  return <Dialog title={editor ? 'Restablecer contraseña' : 'Crear cuenta de editor'} close={close}>
    <form className="form-stack" onSubmit={async event => {
      event.preventDefault()
      const data = Object.fromEntries(new FormData(event.currentTarget))
      if (await mutation.run(editor ? { action: 'user.password', userId: editor.id, password: data.password } : { action: 'user.create', data })) close()
    }}>
      {editor ? <p>{editor.name} · {editor.email}</p> : <>
        <Field label="Nombre"><input className="control" name="name" maxLength={90} required/></Field>
        <Field label="Correo electrónico"><input className="control" type="email" name="email" maxLength={254} required/></Field>
      </>}
      <Field label="Nueva contraseña" hint="Mínimo 12 caracteres"><input className="control" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required/></Field>
      <Notice value={mutation.notice}/><button className="btn primary" disabled={mutation.busy}>{editor ? 'Guardar contraseña' : 'Crear cuenta'}</button>
    </form>
  </Dialog>
}
function Backups() {
  const [file, setFile] = useState<File>()
  const [confirm, setConfirm] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const mutation = useMutation('/api/agency/backup')
  return <section className="panel-card form-stack"><h2>Respaldos del sitio</h2>
    <p className="subtle">El JSON incluye contenido, biblioteca y cuentas. Guárdalo en un lugar privado.</p>
    <div><a className="btn" href="/api/agency/backup" download><Download size={16}/> Descargar respaldo (.json)</a></div>
    <Field label="Restaurar desde respaldo (.json)" hint="Tamaño máximo: 64 MB">
      <input key={inputKey} className="control" type="file" accept=".json,application/json" onChange={e => { setFile(e.target.files?.[0]); mutation.setNotice(undefined) }}/>
    </Field>
    <div><button className="btn danger" disabled={!file || mutation.busy} onClick={() => {
      if (file && file.size > 64 * 1048576) mutation.setNotice({ error: true, text: 'El archivo supera 64 MB.' })
      else setConfirm(true)
    }}><UploadCloud size={16}/> Restaurar respaldo</button></div>
    {!confirm && <Notice value={mutation.notice}/>}
    {confirm && file && <Confirm title="Restaurar el sitio" text={`Se reemplazarán los datos actuales con «${file.name}». Tu cuenta de administrador seguirá activa.`}
      label="Restaurar ahora" close={() => setConfirm(false)} busy={mutation.busy} notice={mutation.notice} confirm={async () => {
        if (await mutation.run(file, 'Respaldo restaurado.')) {
          setConfirm(false); setFile(undefined); setInputKey(k => k + 1)
        }
      }}/>}
  </section>
}
