'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { brand } from '@/lib/brand'
import { trackPlaygroundShare } from '@/lib/launchAnalytics'

export default function SharedPlaygroundBuildLink({ shareToken }: { shareToken?: string }) {
  const viewed = useRef(false)
  useEffect(() => {
    if (!shareToken || viewed.current) return
    let retry: number | undefined
    const recordVisibleView = () => {
      if (viewed.current || document.visibilityState !== 'visible') return
      // The shared page can hydrate before the analytics component initializes its queue.
      if (!window.va) {
        retry ??= window.setTimeout(() => {
          retry = undefined
          recordVisibleView()
        }, 100)
        return
      }
      viewed.current = true
      trackPlaygroundShare('playground_share_viewed')
    }
    recordVisibleView()
    document.addEventListener('visibilitychange', recordVisibleView)
    return () => {
      window.clearTimeout(retry)
      document.removeEventListener('visibilitychange', recordVisibleView)
    }
  }, [shareToken])

  return (
    <Link
      href="/playground"
      prefetch={false}
      onClick={shareToken ? event => {
        if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          trackPlaygroundShare('playground_share_build_clicked')
        }
      } : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44,
        padding: '0 18px', borderRadius: brand.radius.btn, background: brand.colors.ink,
        color: brand.colors.white, textDecoration: 'none', fontSize: 14, fontWeight: 600,
      }}
    >
      Build your own box&nbsp;<span aria-hidden>→</span>
    </Link>
  )
}
