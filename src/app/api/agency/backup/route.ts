import { NextResponse } from 'next/server'
import { api, apiUser, jsonBody, sameOrigin } from '@/lib/http'
import { backupLimit, exportBackup, restoreBackup } from '@/lib/backup'

export async function GET() {
  return api(async () => {
    const user = await apiUser(true)
    const backup = await exportBackup(user)
    const date = new Date().toISOString().slice(0, 10)
    return new Response(backup, { headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="nodara-respaldo-${date}.json"`,
      'Cache-Control': 'private, no-store',
    } })
  })
}
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request)
    const user = await apiUser(true)
    await restoreBackup(user, await jsonBody(request, backupLimit))
    return NextResponse.json({ ok: true })
  })
}
