'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { days, whatsapp } from '@/lib/content'
import type { contactFields } from '@/lib/schemas'
import type { z } from 'zod'
import { Field, Heading, Notice, TextField, Toggle, useMutation } from './ui'

type Contact = z.infer<typeof contactFields>
export function ContactAdmin({ initial }: { initial: Contact }) {
  const [data, setData] = useState(initial)
  const mutation = useMutation()
  const change = <K extends keyof Contact>(key: K, value: Contact[K]) => setData(d => ({ ...d, [key]: value }))
  const link = /^\d{8}$/.test(data.whatsappNumber) ? whatsapp(data) : undefined
  return <><Heading title="Contacto" text="Actualiza WhatsApp, ubicación y horarios de atención."/>
    <form className="form-stack" onSubmit={e => { e.preventDefault(); void mutation.run({ action: 'contact.save', data }) }}>
      <section className="panel-card form-stack">
        <h2>WhatsApp</h2>
        <div className="form-grid">
          <Field label="Número de Guatemala" hint="8 dígitos"><span className="actions flex-nowrap"><span className="pill">+502</span>
            <input className="control" type="tel" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" required value={data.whatsappNumber}
              onChange={e => change('whatsappNumber', e.target.value.replace(/\D/g, ''))}/></span></Field>
          <TextField label="Mensaje inicial" max={160} value={data.whatsappDefaultMessage} change={value => change('whatsappDefaultMessage', value)} multiline/>
        </div>
        {link && <div><a className="btn" href={link} target="_blank" rel="noopener noreferrer">Probar enlace de WhatsApp <ArrowUpRight size={16}/></a></div>}
      </section>
      <section className="panel-card form-stack">
        <h2>Horarios</h2>
        <div className="contact-hours">{days.map(day => {
          const hours = data.hours[day]
          const set = (patch: Partial<typeof hours>) => change('hours', { ...data.hours, [day]: { ...hours, ...patch } })
          return <div className="contact-hour" key={day}><strong>{day}</strong>
            <Toggle label={hours.open ? 'Abierto' : 'Cerrado'} checked={hours.open} change={value => set({ open: value })}/>
            <input className="control" aria-label={day + ' apertura'} type="time" required disabled={!hours.open} value={hours.from} onChange={e => set({ from: e.target.value })}/>
            <input className="control" aria-label={day + ' cierre'} type="time" required disabled={!hours.open} value={hours.to} onChange={e => set({ to: e.target.value })}/>
          </div>
        })}</div>
      </section>
      <section className="panel-card form-stack">
        <h2>Ubicación y redes</h2>
        <div className="form-grid">
          <TextField label="Dirección" value={data.address} change={value => change('address', value)} max={250}/>
          <TextField label="Enlace de Google Maps" type="url" value={data.mapsUrl} change={value => change('mapsUrl', value)} max={2048}/>
          {(['instagram', 'facebook', 'tiktok'] as const).map((key, i) => <TextField key={key} label={['Instagram', 'Facebook', 'TikTok'][i]}
            type="url" max={2048} value={data.social[key]} change={value => change('social', { ...data.social, [key]: value })}/>)}
        </div>
      </section>
      <Notice value={mutation.notice}/><div><button className="btn primary" disabled={mutation.busy}>Guardar contacto</button></div>
    </form>
  </>
}
