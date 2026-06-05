'use client'

import { useEffect, useRef } from 'react'

type PreloadState = 'loading' | 'ready' | 'error'

function warm(url: string, map: Map<string, PreloadState>, retries: number): void {
  map.set(url, 'loading')
  const img = new window.Image()
  img.onload = () => map.set(url, 'ready')
  img.onerror = () => {
    if (retries > 0) warm(url, map, retries - 1)
    else map.set(url, 'error') // skipped silently by the UI; never shown broken
  }
  img.decoding = 'async'
  img.src = url
}

/**
 * Aggressively warm the browser cache for a set of image URLs so strap/watch
 * swaps are instant — no spinner ever. Tracks per-URL state in a ref Map (so it
 * never triggers re-renders) and retries once on error.
 */
export function useStrapPreloader(urls: Array<string | undefined | null>): React.RefObject<Map<string, PreloadState>> {
  const stateRef = useRef<Map<string, PreloadState>>(new Map())
  const key = urls.filter(Boolean).join('|')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const unique = Array.from(new Set(urls.filter((u): u is string => Boolean(u))))
    for (const url of unique) {
      const cur = stateRef.current.get(url)
      if (cur === 'ready' || cur === 'loading') continue
      warm(url, stateRef.current, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return stateRef
}
