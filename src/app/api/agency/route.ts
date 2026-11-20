import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { api, apiUser, jsonBody, sameOrigin } from '@/lib/http'
import { agencyActions } from '@/lib/schemas'
import { activity, requireMedia, write } from '@/lib/write'

export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request)
    const user = await apiUser(true)
    const input = agencyActions.parse(await jsonBody(request))
    await write(user, async tx => {
      switch (input.action) {
        case 'plan.save': {
          const { footerCreditEnabled, ...data } = input.data
          await tx.planModules.update({ where: { id: 'site' }, data })
          await tx.siteConfig.update({ where: { id: 'site' }, data: { footerCreditEnabled } })
          await activity(tx, user, 'Actualizó los módulos y límites del plan')
          break
        }
        case 'theme.save':
          await tx.themeConfig.update({ where: { id: 'site' }, data: input.data })
          await activity(tx, user, 'Actualizó el tema del sitio público')
          break
        case 'identity.save':
          await requireMedia(tx, [input.data.logoMediaId, input.data.faviconMediaId])
          await tx.siteConfig.update({ where: { id: 'site' }, data: input.data })
          await activity(tx, user, 'Actualizó la identidad del sitio')
          break
        case 'user.create': {
          const { password, ...data } = input.data
          await tx.user.create({ data: { ...data, passwordHash: await hash(password, 12), role: 'EDITOR' } })
          await activity(tx, user, `Creó la cuenta de ${data.name}`)
          break
        }
        case 'user.active': {
          const editor = await tx.user.update({ where: { id: input.userId, role: 'EDITOR' }, data: {
            active: input.active, authVersion: { increment: 1 },
          } })
          await activity(tx, user, `${input.active ? 'Activó' : 'Desactivó'} la cuenta de ${editor.name}`)
          break
        }
        case 'user.password': {
          const editor = await tx.user.update({ where: { id: input.userId, role: 'EDITOR' }, data: {
            passwordHash: await hash(input.password, 12), authVersion: { increment: 1 },
          } })
          await activity(tx, user, `Restableció la contraseña de ${editor.name}`)
          break
        }
      }
    })
    return NextResponse.json({ ok: true })
  })
}
