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

type CatalogContextValue = {
  dynamicWatches: CatalogWatch[]
  allWatches: CatalogWatch[]
  loading: boolean
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue>({
  dynamicWatches: [],
  allWatches: [],
  loading: false,
  refresh: async () => {},
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
    // estimatedValue is the legacy column; the resolver overrides this with
    // market.marketValueUsd or msrpAtLaunchUsd when those are populated.
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

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  // dynamicWatches mirrors the DB. allWatches is what callers consume —
  // identical to dynamicWatches in normal operation. We keep both names so
  // existing destructures (`useCatalog().allWatches` vs `dynamicWatches`)
  // continue to compile during the cutover.
  const [dynamicWatches, setDynamicWatches] = useState<CatalogWatch[]>([])
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  // Local-dev safety: if the catalog table is empty (or Supabase is
  // unreachable / not configured) we surface the static seed so the UI
  // doesn't render an empty box. Production should always have a populated
  // catalog_watches table after `npm run catalog:seed`.
  const [usingStaticFallback, setUsingStaticFallback] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!supabaseRef.current) supabaseRef.current = createClient()
      const supabase = supabaseRef.current

      const [catalogRes, marketRes] = await Promise.all([
        supabase.from('catalog_watches').select('*').order('brand'),
        supabase.from('catalog_watch_market').select('*'),
      ])

      const catalogRows = (catalogRes.data ?? []) as Array<Record<string, unknown>>
      const marketRows = (marketRes.data ?? []) as Array<Record<string, unknown>>

      if (catalogRows.length === 0) {
        // DB hasn't been seeded yet (or env missing). Fall back to the
        // static TS seed so the app keeps rendering.
        if (!usingStaticFallback) {
          console.warn(
            '[CatalogProvider] catalog_watches is empty — falling back to lib/watches.ts. ' +
            'Run `npm run catalog:seed` to populate the database.',
          )
        }
        setDynamicWatches([])
        setUsingStaticFallback(true)
        return
      }

      const marketByCatalogId = new Map<string, CatalogWatchMarket>()
      for (const row of marketRows) {
        const id = typeof row.catalog_watch_id === 'string' ? row.catalog_watch_id : null
        if (!id) continue
        marketByCatalogId.set(id, rowToMarket(row))
      }

      const merged = catalogRows.map(row => {
        const watch = rowToWatch(row)
        const market = marketByCatalogId.get(watch.id)
        return market ? { ...watch, market } : watch
      })

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

  // Source of truth: the database. The static seed in lib/watches.ts is
  // ONLY consulted when the DB hasn't been seeded yet (local dev or a
  // pre-seed deploy) so the app keeps working. Once `npm run catalog:seed`
  // has run, dynamicWatches owns the catalog completely.
  const allWatches = usingStaticFallback ? staticSeedWatches : dynamicWatches

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
