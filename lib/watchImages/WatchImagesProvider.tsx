'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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

export function WatchImagesProvider({ children }: { children: React.ReactNode }) {
  const [imageMap, setImageMap] = useState<Map<string, ImageEntry>>(new Map())
  const supabaseRef = useRef<SupabaseClient | null>(null)

  const load = useCallback(async () => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    try {
      const { data } = await supabaseRef.current
        .from('watch_images')
        .select('watch_id, webp_url, png_url')
      if (!data) return
      setImageMap(new Map(
        data.map((row: { watch_id: string; webp_url: string; png_url: string }) => [
          row.watch_id,
          { imageUrl: row.webp_url, imageTransparentUrl: row.png_url },
        ])
      ))
    } catch {
      // Supabase not configured or unavailable — silently skip dynamic images
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const contextValue = useMemo(() => ({
    getImageUrl: (watchId: string) => imageMap.get(watchId)?.imageUrl,
    getTransparentUrl: (watchId: string) => imageMap.get(watchId)?.imageTransparentUrl,
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
