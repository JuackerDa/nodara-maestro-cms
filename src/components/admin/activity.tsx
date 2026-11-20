'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { Confirm, Notice, useMutation } from './ui'

const date = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' })
export function ActivityList({ revisions }: { revisions: { id: string, summary: string, authorName: string, createdAt: Date, restorable: boolean }[] }) {
  const [target, setTarget] = useState<string>()
  const mutation = useMutation()
  return <section className="panel-card"><h2>Actividad reciente</h2>
    {!target && <Notice value={mutation.notice}/>}
    <div className="activity-list">{revisions.length ? revisions.map(revision => <article className="activity-row" key={revision.id}>
      <div><strong>{revision.summary}</strong><small>{revision.authorName} · {date.format(revision.createdAt)}</small></div>
      {revision.restorable && <button className="btn" onClick={() => { mutation.setNotice(undefined); setTarget(revision.id) }}><History size={15}/> Restaurar versión anterior</button>}
    </article>) : <p className="empty">Todavía no hay actividad.</p>}</div>
    {target && <Confirm title="Restaurar versión anterior" text="La versión seleccionada se publicará en el sitio. Tu borrador actual se conservará."
      label="Restaurar versión" busy={mutation.busy} notice={mutation.notice} close={() => setTarget(undefined)}
      confirm={async () => { if (await mutation.run({ action: 'revision.restore', revisionId: target }, 'Versión restaurada.')) setTarget(undefined) }}/>}
  </section>
}
