'use client'

import type { Animation } from '@prisma/client'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function MotionReveal({ children, level }: { children: ReactNode, level: Animation }) {
  const reduced = useReducedMotion()
  if (reduced || level === 'NONE') return <>{children}</>
  const expressive = level === 'EXPRESSIVE'
  return <motion.div initial={{ opacity: 0.75, y: expressive ? 22 : 10 }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: expressive ? 0.5 : 0.32, ease: 'easeOut' }}>{children}</motion.div>
}
