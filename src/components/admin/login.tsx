'use client'

import { ArrowRight } from 'lucide-react'
import { Field, Notice, useMutation } from './ui'

export function LoginForm() {
  const mutation = useMutation('/api/auth/login')
  return <form className="form-stack" onSubmit={async event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (await mutation.run(Object.fromEntries(form), '', false)) window.location.assign('/admin')
  }}>
    <Field label="Correo electrónico"><input name="email" type="email" autoComplete="username" className="control" required maxLength={254}/></Field>
    <Field label="Contraseña"><input name="password" type="password" autoComplete="current-password" className="control" required maxLength={128}/></Field>
    <Notice value={mutation.notice}/>
    <button className="btn primary" disabled={mutation.busy}>Entrar <ArrowRight size={16}/></button>
  </form>
}
