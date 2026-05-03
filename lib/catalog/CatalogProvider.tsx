'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { renderableWatches } from '@/lib/renderableWatches'
import type { CatalogWatch, WatchType } from '@/types/watch'

type CatalogContextValue = {
  dynamicWatches: CatalogWatch[]
  allWatches: CatalogWatch[]
  loading: boolean
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue>({
  dynamicWatches: [],
  allWatches: renderableWatches,
  loading: false,
  refresh: async () => {},
})

const VALID_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

function rowToWatch(row: Record<string, unknown>): CatalogWatch {
  const watchType = VALID_WATCH_TYPES.find(t => t === row.watch_type) ?? 'Sport'
  return {
    id: String(row.id),
    brand: String(row.brand),
    model: String(row.model),
    reference: String(row.reference),
    caseSizeMm: Number(row.case_size_mm),
    lugWidthMm: row.lug_width_mm != null ? Number(row.lug_width_mm) : undefined,
    caseMaterial: String(row.case_material ?? ''),
    dialColor: String(row.dial_color ?? ''),
    movement: String(row.movement ?? ''),
    complications: Array.isArray(row.complications) ? row.complications.map(String) : [],
    estimatedValue: Number(row.estimated_value ?? 0),
    watchType,
    dialConfig: {
      dialColor: String(row.dial_color_hex ?? '#1A1410'),
      markerColor: String(row.marker_color_hex ?? '#C8BCAF'),
      handColor: String(row.hand_color_hex ?? '#FFFFFF'),
    },
  }
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [dynamicWatches, setDynamicWatches] = useState<CatalogWatch[]>([])
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const { data } = await supabaseRef.current
        .from('catalog_watches')
        .select('*')
        .order('brand')
      if (data) setDynamicWatches(data.map(rowToWatch))
    } catch {
      // Supabase not configured — dynamic catalog unavailable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const staticIds = new Set(renderableWatches.map(w => w.id))
  const allWatches = [
    ...renderableWatches,
    ...dynamicWatches.filter(dw => !staticIds.has(dw.id)),
  ]

  return (
    <CatalogContext.Provider value={{ dynamicWatches, allWatches, loading, refresh: load }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  return useContext(CatalogContext)
}

export { rowToWatch }
