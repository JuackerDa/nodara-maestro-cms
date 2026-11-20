import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { createHash } from 'node:crypto'
import { api, HttpError, jsonBody, sameOrigin } from '@/lib/http'
import { loginFields } from '@/lib/schemas'
import { db } from '@/lib/db'
import { SESSION, SESSION_SECONDS, signSession } from '@/lib/session'

const dummyHash = '$2b$12$h1TPnfE.GvYjv4SmFhx8K.l.RlwJTNjrvpKrYl9H.vSHMELF8M1Mq'
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request)
    const { email, password } = loginFields.parse(await jsonBody(request, 4096))
    const key = createHash('sha256').update(email).digest('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    await db.loginAttempt.deleteMany({ where: { expiresAt: { lt: now } } })
    const attempt = await db.loginAttempt.upsert({
      where: { key }, create: { key, count: 1, expiresAt }, update: { count: { increment: 1 } },
    })
    if (attempt.count > 10) throw new HttpError(429, 'Demasiados intentos. Intenta de nuevo en 15 minutos.')
    const user = await db.user.findUnique({ where: { email } })
    const valid = await compare(password, user?.passwordHash ?? dummyHash)
    if (!valid || !user?.active || new TextEncoder().encode(password).byteLength > 72) {
      throw new HttpError(401, 'Correo o contraseña incorrectos.')
    }
    await db.loginAttempt.deleteMany({ where: { key } })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION, await signSession(user), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS,
    })
    return response
  })
}
