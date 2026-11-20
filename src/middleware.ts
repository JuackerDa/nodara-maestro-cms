import { NextRequest, NextResponse } from 'next/server'
import { readSession, SESSION } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const api = path.startsWith('/api/')
  if (path === '/admin/login') return NextResponse.next()
  const session = await readSession(request.cookies.get(SESSION)?.value)
  if (!session) return api
    ? NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
    : NextResponse.redirect(new URL('/admin/login', request.url))
  if ((path.startsWith('/api/agency') || path.startsWith('/admin/agencia')) && session.role !== 'SUPER_ADMIN') {
    return api
      ? NextResponse.json({ error: 'Acceso exclusivo de Super Admin.' }, { status: 403 })
      : NextResponse.redirect(new URL('/admin', request.url))
  }
  return NextResponse.next()
}
export const config = { matcher: ['/admin/:path*', '/api/agency/:path*', '/api/cms/:path*'] }
