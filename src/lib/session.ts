import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import { z } from 'zod'

export const SESSION = 'nodara_session'
export const SESSION_SECONDS = 60 * 60 * 8
const payloadSchema = z.object({ sub: z.string(), role: z.enum(['SUPER_ADMIN', 'EDITOR']), version: z.number().int() })
function secret() {
  const key = process.env.SESSION_SECRET ?? ''
  if (key.length < 32) throw new Error('Configura SESSION_SECRET con al menos 32 caracteres.')
  return new TextEncoder().encode(key)
}
export async function signSession(user: { id: string, role: string, authVersion: number }) {
  return new SignJWT({ role: user.role, version: user.authVersion })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(user.id)
    .setIssuer('nodara-maestro').setAudience('nodara-cms')
    .setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).sign(secret())
}
export async function readSession(token?: string) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: 'nodara-maestro', audience: 'nodara-cms' })
    const parsed = payloadSchema.safeParse(payload)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
