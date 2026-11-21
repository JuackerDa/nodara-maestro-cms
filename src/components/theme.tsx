import type { ThemeConfig } from '@prisma/client'
import type { CSSProperties, ReactNode } from 'react'

export type Theme = Pick<ThemeConfig, 'preset' | 'primaryColor' | 'secondaryColor' | 'accentColor' | 'backgroundColor' | 'surfaceColor' | 'textColor' | 'headingFont' | 'bodyFont' | 'borderRadius' | 'animationLevel'>
function colorOn(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16) / 255) ?? [0, 0, 0]
  const [r, g, b] = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#100f0e' : '#ffffff'
}
export function ThemeProvider({ theme, children }: { theme: Theme, children: ReactNode }) {
  const radius = { SHARP: '2px', SOFT: '14px', ROUNDED: '28px' }
  const style = {
    '--theme-primary': theme.primaryColor, '--theme-secondary': theme.secondaryColor,
    '--theme-accent': theme.accentColor, '--theme-on-accent': colorOn(theme.accentColor), '--theme-bg': theme.backgroundColor, '--theme-surface': theme.surfaceColor,
    '--theme-text': theme.textColor, '--theme-on-primary': colorOn(theme.primaryColor),
    '--theme-radius': radius[theme.borderRadius],
    '--theme-heading': `"${theme.headingFont} Variable", serif`,
    '--theme-body': `"${theme.bodyFont} Variable", sans-serif`,
  } as CSSProperties
  return <div className="public-theme" data-theme-preset={theme.preset} data-theme-motion={theme.animationLevel} style={style}>{children}</div>
}
