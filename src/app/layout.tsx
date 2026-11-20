import type { Metadata } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/plus-jakarta-sans'
import './globals.css'

export const metadata: Metadata = { title: 'Nodara Maestro' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es-GT"><body>{children}</body></html>
}
