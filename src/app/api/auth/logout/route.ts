import { NextResponse } from 'next/server'
import { api, sameOrigin } from '@/lib/http'
import { SESSION } from '@/lib/session'

export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request)
    const response = NextResponse.json({ ok: true })
    response.cookies.delete(SESSION)
    return response
  })
}
