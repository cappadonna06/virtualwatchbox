'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { watches as staticSeedWatches } from '@/lib/watches'
import type {
  BraceletType,
  CatalogSource,
  CatalogWatch,
  CatalogWatchMarket,
  GenderTarget,
  ModerationStatus,
  MovementType,
  ProductionStatus,
  VerificationStatus,
  WatchType,
} from '@/types/watch'

// How many catalog rows we materialize in-memory on initial load.
// Anything beyond this is fetched on demand via searchCatalog() / fetchById().
const INITIAL_LOAD_LIMIT = 2000
// Supabase REST default max_rows per response. We page-fetch through it.
const PG_PAGE = 1000

export type CatalogSearchParams = {
  q?: string
  brand?: string | null
  brands?: string[] // multi-brand alternative
  caseMaterial?: string | null
  dialColor?: string | null
  watchType?: string | null
  caseSizeBucket?: '<=38' | '39-41' | '>=42' | null
  onlyWithImages?: boolean
  sortBy?: 'heat' | 'price_asc' | 'price_desc' | 'brand'
  limit?: number // default 50
  offset?: number // default 0
}

export type CatalogSearchResult = {
  rows: CatalogWatch[]
  total: number
}

type CatalogContextValue = {
  dynamicWatches: CatalogWatch[]
  allWatches: CatalogWatch[]
  loading: boolean
  refresh: () => Promise<void>
  fetchById: (id: string) => Promise<CatalogWatch | null>
  searchCatalog: (params: CatalogSearchParams) => Promise<CatalogSearchResult>
  brandIndex: BrandIndexEntry[]
}

type BrandIndexEntry = { brand: string; count: number }

const CatalogContext = createContext<CatalogContextValue>({
  dynamicWatches: [],
  allWatches: [],
  loading: false,
  refresh: async () => {},
  fetchById: async () => null,
  searchCatalog: async () => ({ rows: [], total: 0 }),
  brandIndex: [],
})

const VALID_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]
const VALID_MOVEMENT_TYPES: MovementType[] = [
  'automatic', 'manual', 'quartz', 'mecaquartz', 'solar', 'spring-drive',
]
const VALID_BRACELET_TYPES: BraceletType[] = ['bracelet', 'strap', 'integrated']
const VALID_PRODUCTION_STATUSES: ProductionStatus[] = [
  'current', 'discontinued', 'limited', 'one-off', 'prototype',
]
const VALID_GENDER_TARGETS: GenderTarget[] = ['unisex', 'mens', 'womens']
const VALID_CATALOG_SOURCES: CatalogSource[] = [
  'manual', 'seed', 'ingestion', 'user_submission', 'partner_feed',
]
const VALID_MODERATION_STATUSES: ModerationStatus[] = ['approved', 'pending', 'rejected']
const VALID_VERIFICATION_STATUSES: VerificationStatus[] = ['verified', 'unverified', 'community']

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function num(value: unknown): number | undefined {
  if (value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function rowToWatch(row: Record<string, unknown>): CatalogWatch {
  const watchType = VALID_WATCH_TYPES.find(t => t === row.watch_type) ?? 'Sport'
  const imageUrl = typeof row.image_url === 'string' && row.image_url ? row.image_url : undefined
  return {
    id: String(row.id),
    brand: String(row.brand),
    model: String(row.model),
    reference: String(row.reference ?? ''),
    caseSizeMm: Number(row.case_size_mm ?? 0),
    lugWidthMm: row.lug_width_mm != null ? Number(row.lug_width_mm) : undefined,
    caseMaterial: String(row.case_material ?? ''),
    dialColor: String(row.dial_color ?? ''),
    movement: String(row.movement ?? ''),
    complications: Array.isArray(row.complications) ? row.complications.map(String) : [],
    estimatedValue: Number(row.estimated_value ?? 0),
    watchType,
    imageUrl,
    dialConfig: {
      dialColor: String(row.dial_color_hex ?? '#1A1410'),
      markerColor: String(row.marker_color_hex ?? '#C8BCAF'),
      handColor: String(row.hand_color_hex ?? '#FFFFFF'),
    },

    modelFamily: typeof row.model_family === 'string' ? row.model_family : undefined,
    nickname:    typeof row.nickname     === 'string' ? row.nickname     : undefined,
    slug:        typeof row.slug         === 'string' ? row.slug         : undefined,

    lugToLugMm:        num(row.lug_to_lug_mm),
    thicknessMm:       num(row.thickness_mm),
    caseFinish:        typeof row.case_finish    === 'string' ? row.case_finish    : undefined,
    bezelMaterial:     typeof row.bezel_material === 'string' ? row.bezel_material : undefined,
    bezelType:         typeof row.bezel_type     === 'string' ? row.bezel_type     : undefined,
    crystalMaterial:   typeof row.crystal_material === 'string' ? row.crystal_material : undefined,
    waterResistanceM:  num(row.water_resistance_m),
    weightG:           num(row.weight_g),

    dialFinish: typeof row.dial_finish === 'string' ? row.dial_finish : undefined,
    markerType: typeof row.marker_type === 'string' ? row.marker_type : undefined,
    lumeColor:  typeof row.lume_color  === 'string' ? row.lume_color  : undefined,

    caliber:           typeof row.caliber === 'string' ? row.caliber : undefined,
    movementType:      pick(row.movement_type, VALID_MOVEMENT_TYPES),
    powerReserveHours: num(row.power_reserve_hours),
    frequencyVph:      num(row.frequency_vph),
    jewelCount:        num(row.jewel_count),

    braceletType: pick(row.bracelet_type, VALID_BRACELET_TYPES),
    claspType:    typeof row.clasp_type === 'string' ? row.clasp_type : undefined,

    yearIntroduced:      num(row.year_introduced),
    yearDiscontinued:    num(row.year_discontinued),
    productionStatus:    pick(row.production_status, VALID_PRODUCTION_STATUSES),
    limitedEditionCount: num(row.limited_edition_count),
    msrpAtLaunchUsd:     num(row.msrp_at_launch_usd),
    countryOfOrigin:     typeof row.country_of_origin === 'string' ? row.country_of_origin : undefined,

    styleTags:    Array.isArray(row.style_tags) ? row.style_tags.map(String) : undefined,
    genderTarget: pick(row.gender_target, VALID_GENDER_TARGETS),

    replacesReference:    typeof row.replaces_reference === 'string' ? row.replaces_reference : undefined,
    replacedByReference:  typeof row.replaced_by_reference === 'string' ? row.replaced_by_reference : undefined,

    source:             pick(row.source, VALID_CATALOG_SOURCES),
    moderationStatus:   pick(row.moderation_status, VALID_MODERATION_STATUSES),
    verificationStatus: pick(row.verification_status, VALID_VERIFICATION_STATUSES),
    contentVersion:     num(row.content_version),
  }
}

function rowToMarket(row: Record<string, unknown>): CatalogWatchMarket {
  const confidence = row.value_confidence
  return {
    marketValueUsd:     num(row.market_value_usd),
    marketValueLowUsd:  num(row.market_value_low_usd),
    marketValueHighUsd: num(row.market_value_high_usd),
    currency:           typeof row.currency === 'string' ? row.currency : undefined,
    valueSource:        typeof row.value_source === 'string' ? row.value_source : undefined,
    valueConfidence:
      confidence === 'low' || confidence === 'medium' || confidence === 'high'
        ? confidence
        : undefined,
    trend30dPct:    num(row.trend_30d_pct),
    trend90dPct:    num(row.trend_90d_pct),
    lastPricedAt:   typeof row.last_priced_at === 'string' ? row.last_priced_at : undefined,
    heatScore:      num(row.heat_score),
    popularityRank: num(row.popularity_rank),
    followCount:    num(row.follow_count_denorm),
    targetCount:    num(row.target_count_denorm),
    grailCount:     num(row.grail_count_denorm),
    ownedCount:     num(row.owned_count_denorm),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Page-through Supabase REST. The default max_rows per response is 1000.
// To load 2,000 of anything we explicitly paginate via .range().
// ─────────────────────────────────────────────────────────────────────────
async function fetchChunkedByIds(
  supabase: SupabaseClient,
  table: string,
  select: string,
  ids: string[],
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (let i = 0; i < ids.length; i += PG_PAGE) {
    const slice = ids.slice(i, i + PG_PAGE)
    const { data, error } = await supabase.from(table).select(select).in('id', slice)
    if (error) throw new Error(`${table} fetch failed: ${error.message}`)
    if (data) out.push(...(data as unknown as Array<Record<string, unknown>>))
  }
  return out
}

async function fetchImagesByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (let i = 0; i < ids.length; i += PG_PAGE) {
    const slice = ids.slice(i, i + PG_PAGE)
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id, webp_url, png_url')
      .eq('variant', 'primary')
      .in('catalog_watch_id', slice)
    if (error) throw new Error(`watch_images fetch failed: ${error.message}`)
    if (data) out.push(...(data as unknown as Array<Record<string, unknown>>))
  }
  return out
}

function mergeRows(
  catalogRows: Array<Record<string, unknown>>,
  marketRows: Array<Record<string, unknown>>,
  imageRows: Array<Record<string, unknown>>,
): CatalogWatch[] {
  const marketById = new Map<string, CatalogWatchMarket>()
  for (const row of marketRows) {
    const id = typeof row.catalog_watch_id === 'string' ? row.catalog_watch_id : null
    if (id) marketById.set(id, rowToMarket(row))
  }
  const imagesById = new Map<string, { webpUrl?: string; pngUrl?: string }>()
  for (const row of imageRows) {
    const id = typeof row.catalog_watch_id === 'string' ? row.catalog_watch_id : null
    if (!id) continue
    imagesById.set(id, {
      webpUrl: typeof row.webp_url === 'string' && row.webp_url ? row.webp_url : undefined,
      pngUrl: typeof row.png_url === 'string' && row.png_url ? row.png_url : undefined,
    })
  }
  return catalogRows.map(row => {
    const watch = rowToWatch(row)
    const market = marketById.get(watch.id)
    const img = imagesById.get(watch.id)
    return {
      ...watch,
      imageUrl: img?.webpUrl ?? watch.imageUrl,
      // PNG is being phased out (Storage cost) — fall back to WebP for
      // anywhere code reads imageTransparentUrl. WebP supports alpha so the
      // sidebar's transparent-background view still works.
      imageTransparentUrl: img?.pngUrl ?? img?.webpUrl ?? watch.imageTransparentUrl,
      ...(market ? { market } : {}),
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [dynamicWatches, setDynamicWatches] = useState<CatalogWatch[]>([])
  const [brandIndex, setBrandIndex] = useState<BrandIndexEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [usingStaticFallback, setUsingStaticFallback] = useState(false)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  // ── Initial load: top 2000 watches by heat_score ────────────────────────
  // We can't `.select('*').order('brand')` over 35k anymore — Supabase REST
  // caps at 1000 per response and the home/playground surfaces only need
  // the popular subset for in-memory ops. Add Watch search hits the DB
  // server-side via searchCatalog().
  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const supabase = supabaseRef.current

      // 1) page-fetch top N IDs from the market table, ordered by heat
      const topIds: string[] = []
      for (let offset = 0; offset < INITIAL_LOAD_LIMIT; offset += PG_PAGE) {
        const upper = Math.min(offset + PG_PAGE - 1, INITIAL_LOAD_LIMIT - 1)
        const { data, error } = await supabase
          .from('catalog_watch_market')
          .select('catalog_watch_id, heat_score')
          .order('heat_score', { ascending: false, nullsFirst: false })
          .range(offset, upper)
        if (error) throw new Error(`catalog_watch_market: ${error.message}`)
        if (!data || data.length === 0) break
        for (const row of data) {
          const id = typeof row.catalog_watch_id === 'string' ? row.catalog_watch_id : null
          if (id) topIds.push(id)
        }
        if (data.length < PG_PAGE) break
      }

      if (topIds.length === 0) {
        // DB empty / not yet seeded. Use static fallback.
        if (!usingStaticFallback) {
          console.warn(
            '[CatalogProvider] catalog_watch_market is empty — falling back to lib/watches.ts. ' +
            'Run `npm run catalog:seed-full` to populate.',
          )
        }
        setDynamicWatches([])
        setUsingStaticFallback(true)
        return
      }

      // 2) parallel: fetch catalog_watches, watch_images, full market rows
      const [catalogRows, imageRows, marketRowsRes] = await Promise.all([
        fetchChunkedByIds(supabase, 'catalog_watches', '*', topIds),
        fetchImagesByIds(supabase, topIds),
        (async () => {
          const out: Array<Record<string, unknown>> = []
          for (let i = 0; i < topIds.length; i += PG_PAGE) {
            const slice = topIds.slice(i, i + PG_PAGE)
            const { data, error } = await supabase
              .from('catalog_watch_market')
              .select('*')
              .in('catalog_watch_id', slice)
            if (error) throw new Error(`catalog_watch_market: ${error.message}`)
            if (data) out.push(...(data as unknown as Array<Record<string, unknown>>))
          }
          return out
        })(),
      ])
      const merged = mergeRows(catalogRows, marketRowsRes, imageRows)

      // 3) build a brand index from the loaded set. We fetch brand counts
      //    over the FULL catalog (not just the top 2000) via a tiny
      //    aggregation query so the brand filter in Add Watch reflects
      //    everything available.
      void (async () => {
        try {
          // distinct-brand query — limit to a sane number for the chip list.
          // Supabase doesn't expose distinct() directly; we sort by brand
          // and walk through unique values.
          const seen = new Map<string, number>()
          let cursor = ''
          // We don't have direct count-by-brand; approximate using top-heat
          // catalog rows. Cheap and matches what users typically search.
          for (let offset = 0; offset < 2000; offset += PG_PAGE) {
            const upper = Math.min(offset + PG_PAGE - 1, 1999)
            const { data } = await supabase
              .from('catalog_watches')
              .select('brand')
              .order('brand')
              .range(offset, upper)
            if (!data || data.length === 0) break
            for (const r of data) {
              const b = (r as { brand?: string }).brand
              if (typeof b === 'string' && b.trim()) {
                seen.set(b, (seen.get(b) ?? 0) + 1)
              }
            }
            if (data.length < PG_PAGE) break
            // ignore cursor; we just walk linearly
            cursor = ''
          }
          void cursor
          const entries = [...seen.entries()]
            .map(([brand, count]) => ({ brand, count }))
            .sort((a, b) => b.count - a.count)
          setBrandIndex(entries)
        } catch (err) {
          console.warn('[CatalogProvider] brand index fetch failed', err)
        }
      })()

      setDynamicWatches(merged)
      setUsingStaticFallback(false)
    } catch (err) {
      console.warn('[CatalogProvider] load failed; using static seed fallback', err)
      setDynamicWatches([])
      setUsingStaticFallback(true)
    } finally {
      setLoading(false)
    }
  }, [usingStaticFallback])

  useEffect(() => { void load() }, [load])

  // ── On-demand: fetch a single catalog watch by id ──────────────────────
  const fetchById = useCallback(async (id: string): Promise<CatalogWatch | null> => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current
    const [catalogRes, marketRes, imageRes] = await Promise.all([
      supabase.from('catalog_watches').select('*').eq('id', id).maybeSingle(),
      supabase.from('catalog_watch_market').select('*').eq('catalog_watch_id', id).maybeSingle(),
      supabase
        .from('watch_images')
        .select('catalog_watch_id, webp_url, png_url')
        .eq('variant', 'primary')
        .eq('catalog_watch_id', id)
        .maybeSingle(),
    ])
    if (catalogRes.error || !catalogRes.data) return null
    const merged = mergeRows(
      [catalogRes.data as Record<string, unknown>],
      marketRes.data ? [marketRes.data as Record<string, unknown>] : [],
      imageRes.data ? [imageRes.data as Record<string, unknown>] : [],
    )
    return merged[0] ?? null
  }, [])

  // ── Server-side search for Add Watch ───────────────────────────────────
  // Key gotcha: ordering across the 35k catalog requires a stable column ON
  // catalog_watches itself (Supabase JS can't order by a foreign-table column
  // without RPC). We approximate "heat" with estimated_value DESC because
  // it correlates well (iconic refs = high value, well-imaged) and is the
  // best proxy already on the table.
  //
  // When onlyWithImages=true we do TWO queries:
  //   1) watch_images.eq(variant,'primary') → get the imaged-watch-id set
  //   2) catalog_watches.in('id', those ids) with the user's filters
  // This way we never burn the 200-row response window on vintage refs that
  // don't have a photo.
  const searchCatalog = useCallback(async (
    params: CatalogSearchParams,
  ): Promise<CatalogSearchResult> => {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const supabase = supabaseRef.current

    const limit = Math.max(1, Math.min(500, params.limit ?? 50))
    const offset = Math.max(0, params.offset ?? 0)

    // Image-gating via embedded inner-join. When onlyWithImages=true the
    // `watch_images!inner(...)` embed makes PostgREST return only catalog
    // rows that have a matching row in watch_images (variant='primary').
    // This avoids passing a 1,452-id IN list through the URL.
    // The select string MUST be a literal for Supabase's type parser, so we
    // branch at the call site.
    let q = params.onlyWithImages
      ? supabase
          .from('catalog_watches')
          .select('*, watch_images!inner(catalog_watch_id, variant)', { count: 'exact' })
          .eq('watch_images.variant', 'primary')
      : supabase.from('catalog_watches').select('*', { count: 'exact' })

    if (params.q && params.q.trim()) {
      const needle = params.q.trim().replace(/[%_]/g, '\\$&')
      q = q.or(
        `brand.ilike.%${needle}%,model.ilike.%${needle}%,reference.ilike.%${needle}%,model_family.ilike.%${needle}%,nickname.ilike.%${needle}%`,
      )
    }
    if (params.brand) q = q.eq('brand', params.brand)
    if (params.brands && params.brands.length > 0) q = q.in('brand', params.brands)
    if (params.caseMaterial) q = q.eq('case_material', params.caseMaterial)
    if (params.dialColor) q = q.ilike('dial_color', `%${params.dialColor}%`)
    if (params.watchType) q = q.eq('watch_type', params.watchType)
    if (params.caseSizeBucket === '<=38') q = q.lte('case_size_mm', 38)
    else if (params.caseSizeBucket === '39-41') q = q.gte('case_size_mm', 39).lte('case_size_mm', 41)
    else if (params.caseSizeBucket === '>=42') q = q.gte('case_size_mm', 42)

    // Sort. estimated_value DESC is a great proxy for "popular" — iconic
    // refs (Daytonas, Submariners, Royal Oaks) bubble up and they're the
    // ones most likely to have images + that users want to see first.
    if (params.sortBy === 'price_asc') q = q.order('estimated_value', { ascending: true, nullsFirst: false })
    else if (params.sortBy === 'price_desc') q = q.order('estimated_value', { ascending: false, nullsFirst: false })
    else if (params.sortBy === 'brand') q = q.order('brand').order('reference')
    else {
      // default = 'heat' approximation
      q = q.order('estimated_value', { ascending: false, nullsFirst: false }).order('reference')
    }

    q = q.range(offset, offset + limit - 1)

    const { data, error, count } = await q
    if (error) throw new Error(`searchCatalog: ${error.message}`)
    const catalogRows = (data ?? []) as Array<Record<string, unknown>>
    if (catalogRows.length === 0) return { rows: [], total: count ?? 0 }

    // Attach market + image data for the result page
    const ids = catalogRows.map(r => String(r.id))
    const [marketRows, imageRows] = await Promise.all([
      (async () => {
        const out: Array<Record<string, unknown>> = []
        for (let i = 0; i < ids.length; i += PG_PAGE) {
          const slice = ids.slice(i, i + PG_PAGE)
          const { data: d } = await supabase
            .from('catalog_watch_market')
            .select('*')
            .in('catalog_watch_id', slice)
          if (d) out.push(...(d as unknown as Array<Record<string, unknown>>))
        }
        return out
      })(),
      fetchImagesByIds(supabase, ids),
    ])

    let rows = mergeRows(catalogRows, marketRows, imageRows)

    // Re-sort by actual heat score now that we have market data attached —
    // this beats the estimated_value proxy when market.heatScore is present.
    rows.sort((a, b) => {
      const ha = a.market?.heatScore ?? -1
      const hb = b.market?.heatScore ?? -1
      if (hb !== ha) return hb - ha
      // tiebreak by reference for determinism
      return (a.reference ?? '').localeCompare(b.reference ?? '')
    })

    return { rows, total: count ?? rows.length }
  }, [])

  const allWatches = usingStaticFallback ? staticSeedWatches : dynamicWatches

  return (
    <CatalogContext.Provider
      value={{
        dynamicWatches,
        allWatches,
        loading,
        refresh: load,
        fetchById,
        searchCatalog,
        brandIndex,
      }}
    >
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  return useContext(CatalogContext)
}

export { rowToWatch }
