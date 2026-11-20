import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { db } from './db'
import { readSession, SESSION } from './session'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function currentUser() {
  const token = await readSession((await cookies()).get(SESSION)?.value)
  if (!token) return null
  const user = await db.user.findUnique({
    where: { id: token.sub },
    select: { id: true, name: true, role: true, active: true, authVersion: true },
  })
  return user?.active && user.authVersion === token.version && user.role === token.role ? user : null
}

export async function adminUser(agency = false) {
  const user = await currentUser()
  if (!user) redirect('/admin/login')
  if (agency && user.role !== 'SUPER_ADMIN') redirect('/admin')
  return user
}

export async function apiUser(agency = false) {
  const user = await currentUser()
  if (!user) throw new HttpError(401, 'Inicia sesión para continuar.')
  if (agency && user.role !== 'SUPER_ADMIN') throw new HttpError(403, 'Acceso exclusivo de Super Admin.')
  return user
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const expected = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : new URL(request.url).origin
  if (!origin || origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'El origen de la solicitud no está permitido.')
  }
}
export async function readBody(request: Request, maximum: number) {
  if (Number(request.headers.get('content-length')) > maximum) throw new HttpError(413, 'El archivo o solicitud es demasiado grande.')
  const stream = request.body?.getReader()
  if (!stream) throw new HttpError(400, 'Falta el cuerpo de la solicitud.')
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await stream.read()
      if (done) return Buffer.concat(chunks)
      total += value.byteLength
      if (total > maximum) {
        await stream.cancel()
        throw new HttpError(413, 'El archivo o solicitud es demasiado grande.')
      }
      chunks.push(value)
    }
  } finally {
    stream.releaseLock()
  }
}
export async function jsonBody(request: Request, maximum = 512 * 1024) {
  const bytes = await readBody(request, maximum)
  try { return JSON.parse(bytes.toString('utf8')) as unknown }
  catch { throw new HttpError(400, 'JSON inválido.') }
}
export async function api(run: () => Promise<Response>) {
  try { return await run() }
  catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof ZodError) return NextResponse.json({
      error: error.issues.slice(0, 3).map(issue => [issue.path.join('.'), issue.message].filter(Boolean).join(' · ')).join(' / '),
    }, { status: 400 })
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const statuses: Record<string, [number, string]> = {
        P2002: [409, 'Ya existe un registro con ese identificador.'],
        P2003: [409, 'El registro todavía está en uso.'],
        P2025: [404, 'No se encontró el registro.'],
        P2034: [409, 'El sitio cambió. Recarga e inténtalo de nuevo.'],
      }
      if (statuses[error.code]) {
        const [status, message] = statuses[error.code]
        return NextResponse.json({ error: message }, { status })
      }
    }
    console.error(error)
    return NextResponse.json({ error: 'No se pudo completar la operación.' }, { status: 500 })
  }
}
