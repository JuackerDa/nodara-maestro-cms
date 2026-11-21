'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { Animation } from '@prisma/client'

export function PublicMotion({ children, level }: { children: ReactNode, level: Animation }) {
  const scope = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = scope.current
    if (!root || level === 'NONE') return

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cancelled = false
    let media: ReturnType<typeof import('gsap').gsap.matchMedia> | undefined
    let loading = false

    async function start() {
      if (!root || cancelled || loading || preference.matches || media) return
      loading = true
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
        if (cancelled || preference.matches) return
        gsap.registerPlugin(ScrollTrigger)
        media = gsap.matchMedia()
        const expressive = level === 'EXPRESSIVE'

        media.add({
          animated: '(prefers-reduced-motion: no-preference)',
          desktop: '(min-width: 900px) and (pointer: fine)',
        }, ({ conditions }) => {
          if (!conditions?.animated) return
          const select = <T extends Element>(query: string) => Array.from(root.querySelectorAll<T>(query))
          const intro = select<HTMLElement>('[data-hero-intro]')
          const frame = select<HTMLElement>('[data-hero-frame]')
          const distance = expressive ? 36 : 20

          if (intro.length || frame.length) {
            const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
            if (intro.length) entrance.from(intro, { y: distance, opacity: .2, duration: .7, stagger: .09, clearProps: 'transform,opacity' })
            if (frame.length) entrance.from(frame, {
              y: distance, scale: .98, opacity: .45, duration: .9, clearProps: 'transform,opacity',
            }, 0)
          }

          for (const section of select<HTMLElement>('[data-scroll-scene]')) {
            const items = Array.from(section.querySelectorAll<HTMLElement>('[data-scroll-item]'))
            gsap.from(items.length ? items : section, {
              y: distance, opacity: .2, duration: expressive ? .75 : .55,
              stagger: .08, ease: 'power2.out', clearProps: 'transform,opacity',
              scrollTrigger: { trigger: section, start: 'top 90%', once: true },
            })
          }

          if (!conditions.desktop) return
          for (const image of select<HTMLImageElement>('[data-hero-frame] img')) {
            const hero = image.closest<HTMLElement>('.public-hero')
            if (!hero) continue
            gsap.fromTo(image, { yPercent: -2, scale: 1.06 }, {
              yPercent: 3, scale: 1.13, ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: expressive ? .7 : .35 },
            })
          }
        }, root)
      } catch {
        // The server-rendered site remains usable if animation assets fail to load.
        media?.revert()
        media = undefined
      } finally {
        loading = false
      }
    }

    void start()
    preference.addEventListener('change', start)
    return () => {
      cancelled = true
      preference.removeEventListener('change', start)
      media?.revert()
    }
  }, [level])

  return <div ref={scope}>{children}</div>
}
