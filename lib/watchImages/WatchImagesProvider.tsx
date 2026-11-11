'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { withVersion } from './cacheBust'

type ImageEntry = {
  imageUrl: string
  imageTransparentUrl: string
}

type WatchImagesContextValue = {
  getImageUrl: (watchId: string) => string | undefined
  getTransparentUrl: (watchId: string) => string | undefined
  refresh: () => Promise<void>
}

const WatchImagesContext = createContext<WatchImagesContextValue>({
  getImageUrl: () => undefined,
  getTransparentUrl: () => undefined,
  refresh: async () => {},
})

// PostgREST caps a response at 1000 rows by default.
const PAGE_SIZE = 1000

// The full primary-image index (~4k rows, ~800 KB) only pays off in admin,
// where an image approved a moment ago must show before CatalogProvider
// reloads. Public pages get images from CatalogProvider, which attaches them
// to every watch it hands out, and callers fall back to `watch.imageUrl`.
function wantsIndex(pathname: string | null): boolean {
  return !!pathname && pathname.startsWith('/admin')
}

export function WatchImagesProvider({ children }: { children: React.ReactNode }) {
  const [imageMap, setImageMap] = useState<Map<string, ImageEntry>>(new Map())
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const loadedRef = useRef(false)
  const inflightRef = useRef<Promise<void> | null>(null)
  const pathname = usePathname()
  const enabled = wantsIndex(pathname)

  const fetchIndex = useCallback(async () => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    try {
      const next = new Map<string, ImageEntry>()
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('watch_images')
          .select('catalog_watch_id, webp_url, png_url')
          .eq('variant', 'primary')
          .order('catalog_watch_id')
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        const rows = (data ?? []) as Array<{ catalog_watch_id: string; webp_url: string | null; png_url: string | null }>
        for (const row of rows) {
          next.set(row.catalog_watch_id, {
            imageUrl: withVersion(row.webp_url ?? undefined) ?? '',
            imageTransparentUrl: withVersion(row.png_url ?? row.webp_url ?? undefined) ?? '',
          })
        }
        if (rows.length < PAGE_SIZE) break
      }
      loadedRef.current = true
      setImageMap(next)
    } catch (err) {
      console.warn('[watch-images] index load failed; falling back to catalog image URLs', err)
    }
  }, [])

  const load = useCallback(() => {
    if (!inflightRef.current) {
      inflightRef.current = fetchIndex().finally(() => { inflightRef.current = null })
    }
    return inflightRef.current
  }, [fetchIndex])

  useEffect(() => {
    if (enabled && !loadedRef.current) void load()
  }, [enabled, load])

  const contextValue = useMemo(() => ({
    getImageUrl: (watchId: string) => imageMap.get(watchId)?.imageUrl || undefined,
    getTransparentUrl: (watchId: string) => imageMap.get(watchId)?.imageTransparentUrl || undefined,
    refresh: load,
  }), [imageMap, load])

  return (
    <WatchImagesContext.Provider value={contextValue}>
      {children}
    </WatchImagesContext.Provider>
  )
}

export function useWatchImages() {
  return useContext(WatchImagesContext)
}
