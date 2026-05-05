'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { syncPublicProfileSnapshot } from '@/lib/profileDemo'
import {
  COLLECTION_SESSION_STORAGE_KEY,
  LEGACY_COLLECTION_SESSION_STORAGE_KEY,
  PLAYGROUND_BOXES_STORAGE_KEY,
  WATCHBOX_CONFIG_STORAGE_KEY,
  WATCHBOX_PHOTO_SESSION_KEY,
} from '@/lib/storageKeys'
import { watches as catalogWatches } from '@/lib/watches'
import { createCatalogWatchMap, resolveCatalogWatchId, resolveOwnedWatches } from '@/lib/watchData'
import { getEffectiveSlotCount } from '@/lib/watchboxOverflow'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import type {
  CatalogWatch,
  OwnedWatch,
  OwnershipStatus,
  PlaygroundBox,
  ResolvedOwnedWatch,
  WatchCondition,
  WatchSavedState,
  WatchStateSource,
  WatchTarget,
} from '@/types/watch'
import type { ProfileImageCropState } from '@/types/profile'
import { brand } from '@/lib/brand'

export type WatchboxPhotoCrop = ProfileImageCropState

const WATCHBOX_PHOTO_CROP_SESSION_KEY = 'vwb-watchbox-photo-crop'

function isValidPhotoCrop(value: unknown): value is WatchboxPhotoCrop {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<WatchboxPhotoCrop> & { area?: Partial<WatchboxPhotoCrop['area']> }
  return (
    typeof v.x === 'number'
    && typeof v.y === 'number'
    && typeof v.zoom === 'number'
    && !!v.area
    && typeof v.area.x === 'number'
    && typeof v.area.y === 'number'
    && typeof v.area.width === 'number'
    && typeof v.area.height === 'number'
  )
}

const MIGRATION_DONE_KEY = 'vwb-migration-done'

const WATCH_CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
const OWNERSHIP_STATUSES: OwnershipStatus[] = ['Owned', 'For Sale', 'Recently Added', 'Needs Service']

export type WatchboxConfig = {
  frame: string
  lining: string
  slotCount: number
}

const DEFAULT_WATCHBOX_CONFIG: WatchboxConfig = {
  frame: 'light-oak',
  lining: 'cream',
  slotCount: 6,
}

type PurchaseDetails = {
  price?: number
  date?: string
  notes?: string
}

type WatchIntentAvailability = {
  isOwned: boolean
  isFollowed: boolean
  canFollow: boolean
  canSetTarget: boolean
  canSetGrail: boolean
  canSetJewel: boolean
}

type SessionSnapshot = {
  collectionWatches: OwnedWatch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  collectionJewelWatchId: string | null
  watchboxConfig: WatchboxConfig
}

type LegacyWatchSnapshot = {
  id?: unknown
  watchId?: unknown
  condition?: unknown
  purchaseDate?: unknown
  purchasePrice?: unknown
  notes?: unknown
  ownershipStatus?: unknown
}

type LegacySessionSnapshot = {
  collectionWatches?: unknown
  followedWatchIds?: unknown
  nextTargets?: unknown
  grailWatchId?: unknown
  collectionJewelWatchId?: unknown
  watchboxConfig?: unknown
}

interface CollectionSessionContextValue {
  collectionWatches: ResolvedOwnedWatch[]
  followedWatchIds: string[]
  followedWatches: CatalogWatch[]
  nextTargets: WatchTarget[]
  nextTargetWatches: { target: WatchTarget; watch: CatalogWatch }[]
  grailWatchId: string | null
  grailWatch: CatalogWatch | null
  collectionJewelWatchId: string | null
  collectionJewelWatch: CatalogWatch | null
  selectedWatchId: string | null
  watchboxConfig: WatchboxConfig
  dataLoading: boolean
  migrationPending: boolean
  setSelectedWatchId: (watchId: string | null) => void
  addToCollection: (watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) => void
  followWatch: (watchId: string) => void
  unfollowWatch: (watchId: string) => void
  toggleFollowedWatch: (watchId: string) => void
  promoteToNextTarget: (watchId: string) => void
  removeFromNextTargets: (watchId: string) => void
  setGrailWatch: (watchId: string) => void
  clearGrailWatch: () => void
  setCollectionJewelWatch: (watchId: string) => void
  clearCollectionJewelWatch: () => void
  setWatchSavedState: (
    watchId: string,
    state: WatchSavedState,
    options?: { source?: WatchStateSource },
  ) => { ok: boolean; reason?: 'target_limit' | 'invalid_watch' | 'owned_watch' | 'not_in_collection' }
  removeSavedWatchState: (watchId: string, options?: { source?: WatchStateSource }) => void
  removeFromCollection: (watchId: string) => void
  reorderCollectionWatches: (newWatches: ResolvedOwnedWatch[]) => void
  setWatchboxFrame: (frameId: string) => void
  setWatchboxLining: (liningId: string) => void
  setWatchboxSlotCount: (slotCount: number) => void
  watchboxPhotoUrl: string | null
  watchboxPhotoCrop: WatchboxPhotoCrop | null
  setWatchboxPhoto: (value: { url: string | null; crop: WatchboxPhotoCrop | null }) => void
  isInCollection: (watchId: string) => boolean
  isWatchFollowed: (watchId: string) => boolean
  isWatchTarget: (watchId: string) => boolean
  isWatchGrail: (watchId: string) => boolean
  isWatchJewel: (watchId: string) => boolean
  canSetWatchAsTarget: (watchId: string) => boolean
  canSetWatchAsGrail: (watchId: string) => boolean
  canSetWatchAsJewel: (watchId: string) => boolean
  getWatchIntentAvailability: (watchId: string) => WatchIntentAvailability | null
  getWatchSavedState: (watchId: string) => WatchSavedState | null
  getCatalogWatch: (watchId: string) => CatalogWatch | undefined
  toastMessage: string | null
  toastVisible: boolean
  showToast: (message: string) => void
  acceptMigration: () => Promise<void>
  dismissMigration: () => void
}

const CollectionSessionContext = createContext<CollectionSessionContextValue | null>(null)

function isValidWatchboxConfig(value: unknown): value is WatchboxConfig {
  if (!value || typeof value !== 'object') return false

  const config = value as Partial<WatchboxConfig>
  return (
    typeof config.frame === 'string'
    && FRAMES.some(frame => frame.id === config.frame)
    && typeof config.lining === 'string'
    && LININGS.some(lining => lining.id === config.lining)
    && typeof config.slotCount === 'number'
    && SLOT_COUNTS.some(slot => slot.n === config.slotCount)
  )
}

function isWatchCondition(value: unknown): value is WatchCondition {
  return typeof value === 'string' && WATCH_CONDITIONS.includes(value as WatchCondition)
}

function isOwnershipStatus(value: unknown): value is OwnershipStatus {
  return typeof value === 'string' && OWNERSHIP_STATUSES.includes(value as OwnershipStatus)
}

function isWatchTarget(value: unknown): value is WatchTarget {
  if (!value || typeof value !== 'object') return false

  const target = value as Partial<WatchTarget>
  return (
    typeof target.watchId === 'string'
    && isWatchCondition(target.desiredCondition)
    && (target.intent === 'Addition' || target.intent === 'Replacement')
  )
}

function normalizeOwnedWatch(
  rawWatch: LegacyWatchSnapshot,
  catalogIds: string[],
  fallbackDate: string,
): OwnedWatch | null {
  const rawId = typeof rawWatch.id === 'string' ? rawWatch.id : null
  const catalogWatchId = typeof rawWatch.watchId === 'string'
    ? rawWatch.watchId
    : rawId
      ? resolveCatalogWatchId(rawId, catalogIds)
      : null

  if (!rawId || !catalogWatchId || !catalogIds.includes(catalogWatchId)) return null

  return {
    id: rawId,
    watchId: catalogWatchId,
    condition: isWatchCondition(rawWatch.condition) ? rawWatch.condition : 'Excellent',
    purchaseDate: typeof rawWatch.purchaseDate === 'string' ? rawWatch.purchaseDate : fallbackDate,
    purchasePrice: typeof rawWatch.purchasePrice === 'number' ? rawWatch.purchasePrice : 0,
    notes: typeof rawWatch.notes === 'string' ? rawWatch.notes : '',
    ownershipStatus: isOwnershipStatus(rawWatch.ownershipStatus) ? rawWatch.ownershipStatus : 'Owned',
  }
}

function normalizeCollectionWatches(rawValue: unknown, catalogIds: string[]) {
  if (!Array.isArray(rawValue)) return []

  const fallbackDate = new Date().toISOString().split('T')[0]
  return rawValue
    .map(entry => normalizeOwnedWatch(entry as LegacyWatchSnapshot, catalogIds, fallbackDate))
    .filter((watch): watch is OwnedWatch => watch !== null)
}

function normalizeFollowedWatchIds(rawValue: unknown, catalogIds: Set<string>) {
  if (!Array.isArray(rawValue)) return []

  return [...new Set(
    rawValue.filter((watchId): watchId is string => typeof watchId === 'string' && catalogIds.has(watchId)),
  )]
}

function normalizeNextTargets(rawValue: unknown) {
  if (!Array.isArray(rawValue)) return []

  return rawValue
    .filter(isWatchTarget)
    .slice(0, 3)
}

function normalizeSessionSnapshot(rawValue: unknown, catalogIds: string[], catalogIdSet: Set<string>): SessionSnapshot | null {
  if (!rawValue || typeof rawValue !== 'object') return null

  const snapshot = rawValue as LegacySessionSnapshot
  const collectionWatches = normalizeCollectionWatches(snapshot.collectionWatches, catalogIds)
  const nextTargets = normalizeNextTargets(snapshot.nextTargets)
  const grailWatchId = typeof snapshot.grailWatchId === 'string' ? snapshot.grailWatchId : null
  const collectionJewelWatchId = typeof snapshot.collectionJewelWatchId === 'string' ? snapshot.collectionJewelWatchId : null
  const collectionWatchIds = new Set(collectionWatches.map(watch => watch.watchId))

  const followedFromSnapshot = normalizeFollowedWatchIds(snapshot.followedWatchIds, catalogIdSet)
  const followedWatchIds = [...new Set([
    ...followedFromSnapshot,
    ...nextTargets.map(target => target.watchId).filter(watchId => catalogIdSet.has(watchId)),
    ...(grailWatchId && catalogIdSet.has(grailWatchId) ? [grailWatchId] : []),
  ])]

  const followedSet = new Set(followedWatchIds)
  const normalizedTargets = nextTargets
    .filter(target => followedSet.has(target.watchId) && !collectionWatchIds.has(target.watchId))
    .slice(0, 3)
  const normalizedGrailWatchId = grailWatchId && followedSet.has(grailWatchId) && !collectionWatchIds.has(grailWatchId)
    ? grailWatchId
    : null
  const normalizedCollectionJewelWatchId = collectionJewelWatchId && collectionWatchIds.has(collectionJewelWatchId)
    ? collectionJewelWatchId
    : null

  return {
    collectionWatches,
    followedWatchIds,
    nextTargets: normalizedTargets,
    grailWatchId: normalizedGrailWatchId,
    collectionJewelWatchId: normalizedCollectionJewelWatchId,
    watchboxConfig: isValidWatchboxConfig(snapshot.watchboxConfig) ? snapshot.watchboxConfig : DEFAULT_WATCHBOX_CONFIG,
  }
}

// ── Supabase row shapes ────────────────────────────────────────────────────

type DbWatch = {
  id: string
  catalog_id: string
  condition: string | null
  ownership_status: string | null
  purchase_price: number | null
  purchase_date: string | null
  notes: string | null
  sort_order: number
}

type DbWatchState = {
  catalog_watch_id: string
  state: string
  metadata: Record<string, unknown>
}

type DbWatchboxConfig = {
  frame: string
  lining: string
  slot_count: number
}

// ── Supabase sync helpers (fire-and-forget) ────────────────────────────────

async function syncWatchAdd(watch: OwnedWatch, catalogWatch: CatalogWatch, userId: string, sortOrder: number) {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('watches').upsert({
      id: watch.id.startsWith('owned-') ? undefined : watch.id,
      user_id: userId,
      catalog_id: watch.watchId,
      brand: catalogWatch.brand,
      model: catalogWatch.model,
      reference: catalogWatch.reference,
      case_size_mm: catalogWatch.caseSizeMm,
      case_material: catalogWatch.caseMaterial,
      dial_color: catalogWatch.dialColor,
      movement: catalogWatch.movement,
      complications: catalogWatch.complications,
      watch_type: catalogWatch.watchType,
      estimated_value: catalogWatch.estimatedValue,
      condition: watch.condition,
      ownership_status: watch.ownershipStatus,
      purchase_price: watch.purchasePrice,
      purchase_date: watch.purchaseDate || null,
      notes: watch.notes,
      sort_order: sortOrder,
    })
    if (error) console.error('[vwb] syncWatchAdd error', error)
  } catch (err) {
    console.error('[vwb] syncWatchAdd failed', err)
  }
}

async function syncWatchRemove(watchId: string, userId: string) {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('watches').delete().eq('user_id', userId).eq('id', watchId)
    if (error) console.error('[vwb] syncWatchRemove error', error)
  } catch (err) {
    console.error('[vwb] syncWatchRemove failed', err)
  }
}

async function syncWatchReorder(watches: OwnedWatch[], userId: string) {
  try {
    const supabase = createClient()
    const results = await Promise.all(
      watches.map((w, i) =>
        supabase.from('watches').update({ sort_order: i }).eq('user_id', userId).eq('id', w.id)
      )
    )
    for (const r of results) {
      if (r.error) console.error('[vwb] syncWatchReorder error', r.error)
    }
  } catch (err) {
    console.error('[vwb] syncWatchReorder failed', err)
  }
}

async function syncWatchboxConfig(config: WatchboxConfig, userId: string) {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('watchbox_config').upsert({
      user_id: userId,
      frame: config.frame,
      lining: config.lining,
      slot_count: config.slotCount,
    }, { onConflict: 'user_id' })
    if (error) console.error('[vwb] syncWatchboxConfig error', error)
  } catch (err) {
    console.error('[vwb] syncWatchboxConfig failed', err)
  }
}

async function syncWatchState(
  catalogWatchId: string,
  state: 'follow' | 'target' | 'grail' | 'jewel',
  active: boolean,
  metadata: Record<string, unknown> = {},
  userId?: string,
) {
  if (!userId) return
  try {
    const supabase = createClient()
    if (active) {
      const { error } = await supabase.from('watch_states').upsert({
        user_id: userId,
        catalog_watch_id: catalogWatchId,
        state,
        metadata,
      }, { onConflict: 'user_id,catalog_watch_id,state' })
      if (error) console.error('[vwb] syncWatchState upsert error', error)
    } else {
      const { error } = await supabase.from('watch_states')
        .delete()
        .eq('user_id', userId)
        .eq('catalog_watch_id', catalogWatchId)
        .eq('state', state)
      if (error) console.error('[vwb] syncWatchState delete error', error)
    }
  } catch (err) {
    console.error('[vwb] syncWatchState failed', err)
  }
}

async function syncPlaygroundBoxes(boxes: PlaygroundBox[], userId: string) {
  try {
    const supabase = createClient()
    const { data: existing, error: selectError } = await supabase
      .from('playground_boxes')
      .select('id')
      .eq('user_id', userId)
    if (selectError) console.error('[vwb] syncPlaygroundBoxes select error', selectError)

    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const incomingIds = new Set(boxes.map(b => b.id))

    const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from('playground_boxes').delete().in('id', toDelete)
      if (deleteError) console.error('[vwb] syncPlaygroundBoxes delete error', deleteError)
    }

    const upsertResults = await Promise.all(
      boxes.map((box, i) =>
        supabase.from('playground_boxes').upsert({
          id: box.id,
          user_id: userId,
          name: box.name,
          frame: box.frame,
          lining: box.lining,
          slot_count: box.slotCount,
          tags: box.tags,
          entries: box.entries,
          sort_order: i,
        })
      )
    )
    for (const r of upsertResults) {
      if (r.error) console.error('[vwb] syncPlaygroundBoxes upsert error', r.error)
    }
  } catch (err) {
    console.error('[vwb] syncPlaygroundBoxes failed', err)
  }
}

// ── Load from Supabase ─────────────────────────────────────────────────────

async function loadFromSupabase(
  userId: string,
  catalogIds: string[],
  catalogIdSet: Set<string>,
): Promise<SessionSnapshot | null> {
  try {
    const supabase = createClient()

    const [watchesRes, statesRes, configRes] = await Promise.all([
      supabase.from('watches').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('watch_states').select('*').eq('user_id', userId),
      supabase.from('watchbox_config').select('*').eq('user_id', userId).maybeSingle(),
    ])

    if (watchesRes.error) console.error('[vwb] loadFromSupabase watches error', watchesRes.error)
    if (statesRes.error) console.error('[vwb] loadFromSupabase watch_states error', statesRes.error)
    if (configRes.error) console.error('[vwb] loadFromSupabase watchbox_config error', configRes.error)

    const dbWatches: DbWatch[] = watchesRes.data ?? []
    const dbStates: DbWatchState[] = statesRes.data ?? []
    const dbConfig: DbWatchboxConfig | null = configRes.data ?? null

    const fallbackDate = new Date().toISOString().split('T')[0]

    const collectionWatches: OwnedWatch[] = dbWatches
      .filter(w => catalogIdSet.has(w.catalog_id))
      .map(w => ({
        id: w.id,
        watchId: w.catalog_id,
        condition: isWatchCondition(w.condition) ? w.condition : 'Excellent',
        ownershipStatus: isOwnershipStatus(w.ownership_status) ? w.ownership_status : 'Owned',
        purchasePrice: w.purchase_price ?? 0,
        purchaseDate: w.purchase_date ?? fallbackDate,
        notes: w.notes ?? '',
      }))

    const followedWatchIds: string[] = []
    const nextTargets: WatchTarget[] = []
    let grailWatchId: string | null = null
    let collectionJewelWatchId: string | null = null

    const collectionWatchIdSet = new Set(collectionWatches.map(w => w.watchId))

    for (const s of dbStates) {
      if (!catalogIdSet.has(s.catalog_watch_id)) continue

      if (s.state === 'follow') {
        followedWatchIds.push(s.catalog_watch_id)
      } else if (s.state === 'target' && !collectionWatchIdSet.has(s.catalog_watch_id) && nextTargets.length < 3) {
        const meta = s.metadata as Record<string, unknown>
        nextTargets.push({
          watchId: s.catalog_watch_id,
          desiredCondition: isWatchCondition(meta.desiredCondition) ? meta.desiredCondition : 'Excellent',
          intent: meta.intent === 'Replacement' ? 'Replacement' : 'Addition',
          targetPrice: typeof meta.targetPrice === 'number' ? meta.targetPrice : undefined,
          notes: typeof meta.notes === 'string' ? meta.notes : undefined,
          targetDate: typeof meta.targetDate === 'string' ? meta.targetDate : undefined,
        })
        if (!followedWatchIds.includes(s.catalog_watch_id)) followedWatchIds.push(s.catalog_watch_id)
      } else if (s.state === 'grail' && !collectionWatchIdSet.has(s.catalog_watch_id)) {
        grailWatchId = s.catalog_watch_id
        if (!followedWatchIds.includes(s.catalog_watch_id)) followedWatchIds.push(s.catalog_watch_id)
      } else if (s.state === 'jewel' && collectionWatchIdSet.has(s.catalog_watch_id)) {
        collectionJewelWatchId = s.catalog_watch_id
      }
    }

    const watchboxConfig: WatchboxConfig = dbConfig && isValidWatchboxConfig({
      frame: dbConfig.frame,
      lining: dbConfig.lining,
      slotCount: dbConfig.slot_count,
    })
      ? { frame: dbConfig.frame, lining: dbConfig.lining, slotCount: dbConfig.slot_count }
      : DEFAULT_WATCHBOX_CONFIG

    return {
      collectionWatches,
      followedWatchIds: [...new Set(followedWatchIds)],
      nextTargets,
      grailWatchId,
      collectionJewelWatchId,
      watchboxConfig,
    }
  } catch (err) {
    console.error('[vwb] loadFromSupabase failed', err)
    return null
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function CollectionSessionProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()

  const catalogWatchMap = useMemo(() => createCatalogWatchMap(catalogWatches), [])
  const catalogIds = useMemo(() => catalogWatches.map(watch => watch.id), [])
  const catalogIdSet = useMemo(() => new Set(catalogIds), [catalogIds])

  const [collectionEntries, setCollectionEntries] = useState<OwnedWatch[]>([])
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  const [nextTargets, setNextTargets] = useState<WatchTarget[]>([])
  const [grailWatchId, setGrailWatchId] = useState<string | null>(null)
  const [collectionJewelWatchId, setCollectionJewelWatchId] = useState<string | null>(null)
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const [watchboxConfig, setWatchboxConfig] = useState<WatchboxConfig>(DEFAULT_WATCHBOX_CONFIG)
  const [watchboxPhotoUrl, setWatchboxPhotoUrlState] = useState<string | null>(null)
  const [watchboxPhotoCrop, setWatchboxPhotoCropState] = useState<WatchboxPhotoCrop | null>(null)
  const [watchboxPhotoCloudHydrated, setWatchboxPhotoCloudHydrated] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)

  const prevUserIdRef = useRef<string | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectionWatches = useMemo(
    () => resolveOwnedWatches(collectionEntries, catalogWatchMap),
    [collectionEntries, catalogWatchMap],
  )
  const followedWatches = useMemo(
    () => followedWatchIds
      .map(watchId => catalogWatchMap.get(watchId))
      .filter((watch): watch is CatalogWatch => watch !== undefined),
    [catalogWatchMap, followedWatchIds],
  )
  const nextTargetWatches = useMemo(
    () => nextTargets
      .map(target => {
        const watch = catalogWatchMap.get(target.watchId)
        return watch ? { target, watch } : null
      })
      .filter((item): item is { target: WatchTarget; watch: CatalogWatch } => item !== null),
    [catalogWatchMap, nextTargets],
  )
  const grailWatch = useMemo(
    () => (grailWatchId ? catalogWatchMap.get(grailWatchId) ?? null : null),
    [catalogWatchMap, grailWatchId],
  )
  const collectionJewelWatch = useMemo(
    () => (collectionJewelWatchId ? catalogWatchMap.get(collectionJewelWatchId) ?? null : null),
    [catalogWatchMap, collectionJewelWatchId],
  )

  // ── Guest hydration from sessionStorage / localStorage ──────────────────

  useEffect(() => {
    if (authLoading) return  // wait for auth init so we don't hydrate guest state for an authenticated user
    if (user) return  // authenticated mode handled separately
    if (hydrated) return  // already hydrated once

    try {
      const raw = sessionStorage.getItem(COLLECTION_SESSION_STORAGE_KEY)
      const legacyRaw = sessionStorage.getItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY)
      const normalized = normalizeSessionSnapshot(
        raw ? JSON.parse(raw) : legacyRaw ? JSON.parse(legacyRaw) : null,
        catalogIds,
        catalogIdSet,
      )

      if (normalized) {
        setCollectionEntries(normalized.collectionWatches)
        setFollowedWatchIds(normalized.followedWatchIds)
        setNextTargets(normalized.nextTargets)
        setGrailWatchId(normalized.grailWatchId)
        setCollectionJewelWatchId(normalized.collectionJewelWatchId)
        setWatchboxConfig(normalized.watchboxConfig)
      }
    } catch {
      // Ignore malformed session data.
    }

    try {
      const rawPhoto = sessionStorage.getItem(WATCHBOX_PHOTO_SESSION_KEY)
      if (typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image')) {
        setWatchboxPhotoUrlState(rawPhoto)
      }
      const rawCrop = sessionStorage.getItem(WATCHBOX_PHOTO_CROP_SESSION_KEY)
      if (rawCrop) {
        const parsed = JSON.parse(rawCrop)
        if (isValidPhotoCrop(parsed)) setWatchboxPhotoCropState(parsed)
      }
    } catch {
      // Ignore malformed photo data.
    }

    try {
      const rawConfig = localStorage.getItem(WATCHBOX_CONFIG_STORAGE_KEY)
      if (!rawConfig) return

      const parsedConfig = JSON.parse(rawConfig)
      if (isValidWatchboxConfig(parsedConfig)) {
        setWatchboxConfig(parsedConfig)
      }
    } finally {
      setHydrated(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  // ── Auth state change → load from Supabase or offer migration ───────────

  useEffect(() => {
    if (authLoading) return  // wait for auth init before deciding signed-in vs signed-out

    const prevId = prevUserIdRef.current
    const currentId = user?.id ?? null
    prevUserIdRef.current = currentId

    if (!currentId) return  // signed out → guest hydration effect handles state

    if (prevId === currentId) return  // same user, already loaded

    const migrationAlreadyDone = (() => {
      try { return localStorage.getItem(MIGRATION_DONE_KEY) === 'true' } catch { return false }
    })()

    if (migrationAlreadyDone) {
      // Load fresh from Supabase
      setDataLoading(true)
      loadFromSupabase(currentId, catalogIds, catalogIdSet).then(snapshot => {
        if (snapshot) {
          setCollectionEntries(snapshot.collectionWatches)
          setFollowedWatchIds(snapshot.followedWatchIds)
          setNextTargets(snapshot.nextTargets)
          setGrailWatchId(snapshot.grailWatchId)
          setCollectionJewelWatchId(snapshot.collectionJewelWatchId)
          setWatchboxConfig(snapshot.watchboxConfig)
        }
        setDataLoading(false)
        setHydrated(true)
      })
      return
    }

    // Check if there is meaningful local guest state to migrate
    const hasLocalState = (() => {
      try {
        const raw = sessionStorage.getItem(COLLECTION_SESSION_STORAGE_KEY)
        if (!raw) return false
        const parsed = JSON.parse(raw) as LegacySessionSnapshot
        const watches = parsed.collectionWatches
        return Array.isArray(watches) && watches.length > 0
      } catch { return false }
    })()

    if (hasLocalState) {
      // Offer migration — don't load from Supabase yet
      setMigrationPending(true)
      setHydrated(true)
    } else {
      // No local state — load from Supabase directly
      setDataLoading(true)
      loadFromSupabase(currentId, catalogIds, catalogIdSet).then(snapshot => {
        if (snapshot) {
          setCollectionEntries(snapshot.collectionWatches)
          setFollowedWatchIds(snapshot.followedWatchIds)
          setNextTargets(snapshot.nextTargets)
          setGrailWatchId(snapshot.grailWatchId)
          setCollectionJewelWatchId(snapshot.collectionJewelWatchId)
          setWatchboxConfig(snapshot.watchboxConfig)
        }
        setDataLoading(false)
        setHydrated(true)
        markMigrationDone()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  // ── Tab-focus refetch ──────────────────────────────────────────────────
  // When the tab becomes visible again, re-pull collection/states/config from
  // Supabase so cross-browser edits show up without a hard reload. Skipped while
  // a sync is in flight (dataLoading) or if a migration prompt is pending.
  useEffect(() => {
    const currentId = user?.id ?? null
    if (!currentId || authLoading || migrationPending) return

    let cancelled = false

    function refetch() {
      if (document.visibilityState !== 'visible') return
      if (cancelled || !currentId) return
      loadFromSupabase(currentId, catalogIds, catalogIdSet).then(snapshot => {
        if (cancelled || !snapshot) return
        setCollectionEntries(snapshot.collectionWatches)
        setFollowedWatchIds(snapshot.followedWatchIds)
        setNextTargets(snapshot.nextTargets)
        setGrailWatchId(snapshot.grailWatchId)
        setCollectionJewelWatchId(snapshot.collectionJewelWatchId)
        setWatchboxConfig(snapshot.watchboxConfig)
      })
    }

    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('focus', refetch)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('focus', refetch)
    }
  }, [user?.id, authLoading, migrationPending, catalogIds, catalogIdSet])

  // ── Guest state persistence to sessionStorage / localStorage ────────────

  useEffect(() => {
    if (!hydrated || user) return

    const snapshot: SessionSnapshot = {
      collectionWatches: collectionEntries,
      followedWatchIds,
      nextTargets,
      grailWatchId,
      collectionJewelWatchId,
      watchboxConfig,
    }

    sessionStorage.setItem(COLLECTION_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
  }, [hydrated, user, collectionEntries, followedWatchIds, nextTargets, grailWatchId, collectionJewelWatchId, watchboxConfig])

  useEffect(() => {
    if (!hydrated || user) return
    localStorage.setItem(WATCHBOX_CONFIG_STORAGE_KEY, JSON.stringify(watchboxConfig))
  }, [hydrated, user, watchboxConfig])

  useEffect(() => {
    if (!hydrated || user) return
    try {
      if (watchboxPhotoUrl) {
        sessionStorage.setItem(WATCHBOX_PHOTO_SESSION_KEY, watchboxPhotoUrl)
      } else {
        sessionStorage.removeItem(WATCHBOX_PHOTO_SESSION_KEY)
      }
      if (watchboxPhotoCrop) {
        sessionStorage.setItem(WATCHBOX_PHOTO_CROP_SESSION_KEY, JSON.stringify(watchboxPhotoCrop))
      } else {
        sessionStorage.removeItem(WATCHBOX_PHOTO_CROP_SESSION_KEY)
      }
    } catch {
      // sessionStorage may reject when full; the photo just won't survive a reload.
    }
  }, [hydrated, user, watchboxPhotoUrl, watchboxPhotoCrop])

  // Cloud read of the watchbox photo. Runs once per signed-in user; the hydration
  // gate prevents the debounced save below from overwriting a remote value with
  // an initial null on first mount.
  useEffect(() => {
    if (!user) {
      setWatchboxPhotoCloudHydrated(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('watchbox_config')
          .select('watchbox_photo_url,watchbox_photo_crop')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (error) console.error('[vwb] watchbox photo read error', error)
        const row = data as { watchbox_photo_url?: unknown; watchbox_photo_crop?: unknown } | null
        const remoteUrl = row && typeof row.watchbox_photo_url === 'string' ? row.watchbox_photo_url : null
        const remoteCrop = row && isValidPhotoCrop(row.watchbox_photo_crop) ? row.watchbox_photo_crop : null
        setWatchboxPhotoUrlState(remoteUrl)
        setWatchboxPhotoCropState(remoteCrop)
      } catch (err) {
        if (cancelled) return
        console.error('[vwb] watchbox photo hydrate failed', err)
      } finally {
        if (!cancelled) setWatchboxPhotoCloudHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // Debounced upsert of the watchbox photo onto watchbox_config. Frame/lining/
  // slot_count have NOT NULL defaults so a new row from this upsert will get
  // sensible defaults; an existing row is partial-updated only on the photo columns.
  useEffect(() => {
    if (!user || !watchboxPhotoCloudHydrated) return
    const handle = setTimeout(() => {
      ;(async () => {
        try {
          const supabase = createClient()
          const { error } = await supabase.from('watchbox_config').upsert({
            user_id: user.id,
            watchbox_photo_url: watchboxPhotoUrl ?? null,
            watchbox_photo_crop: watchboxPhotoCrop ?? null,
          }, { onConflict: 'user_id' })
          if (error) console.error('[vwb] watchbox photo upsert error', error)
        } catch (err) {
          console.error('[vwb] watchbox photo upsert failed', err)
        }
      })()
    }, 500)
    return () => clearTimeout(handle)
  }, [user, watchboxPhotoUrl, watchboxPhotoCrop, watchboxPhotoCloudHydrated])

  const setWatchboxPhoto = useCallback((value: { url: string | null; crop: WatchboxPhotoCrop | null }) => {
    setWatchboxPhotoUrlState(value.url)
    setWatchboxPhotoCropState(value.url ? value.crop : null)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    syncPublicProfileSnapshot({
      collectionWatches,
      followedWatches,
      nextTargets,
      grailWatch,
      collectionJewelWatch,
      watchboxConfig,
    })
  }, [hydrated, collectionWatches, followedWatches, nextTargets, grailWatch, collectionJewelWatch, watchboxConfig])

  useEffect(() => {
    setWatchboxConfig(prev => {
      const effectiveSlotCount = getEffectiveSlotCount(prev.slotCount, collectionWatches.length)
      return effectiveSlotCount === prev.slotCount
        ? prev
        : { ...prev, slotCount: effectiveSlotCount }
    })
  }, [collectionWatches.length])

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  // ── Migration helpers ────────────────────────────────────────────────────

  function markMigrationDone() {
    try { localStorage.setItem(MIGRATION_DONE_KEY, 'true') } catch {}
  }

  function clearLocalState() {
    try {
      sessionStorage.removeItem(COLLECTION_SESSION_STORAGE_KEY)
      sessionStorage.removeItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY)
      localStorage.removeItem(WATCHBOX_CONFIG_STORAGE_KEY)
    } catch {}
  }

  const acceptMigration = useCallback(async () => {
    if (!user) return

    const userId = user.id
    const catalogWatchMapLocal = catalogWatchMap

    // Upsert all current watches
    await Promise.all(
      collectionEntries.map((w, i) => {
        const catalogWatch = catalogWatchMapLocal.get(w.watchId)
        if (!catalogWatch) return Promise.resolve()
        return syncWatchAdd(w, catalogWatch, userId, i)
      })
    )

    // Upsert watch states
    const statePromises: Promise<void>[] = []
    for (const id of followedWatchIds) {
      statePromises.push(syncWatchState(id, 'follow', true, {}, userId))
    }
    for (const t of nextTargets) {
      statePromises.push(syncWatchState(t.watchId, 'target', true, {
        desiredCondition: t.desiredCondition,
        intent: t.intent,
        targetPrice: t.targetPrice,
        notes: t.notes,
        targetDate: t.targetDate,
      }, userId))
    }
    if (grailWatchId) statePromises.push(syncWatchState(grailWatchId, 'grail', true, {}, userId))
    if (collectionJewelWatchId) statePromises.push(syncWatchState(collectionJewelWatchId, 'jewel', true, {}, userId))
    await Promise.all(statePromises)

    // Sync watchbox config
    await syncWatchboxConfig(watchboxConfig, userId)

    // Sync playground boxes
    try {
      const raw = localStorage.getItem(PLAYGROUND_BOXES_STORAGE_KEY)
      if (raw) {
        const boxes = JSON.parse(raw) as PlaygroundBox[]
        if (Array.isArray(boxes)) await syncPlaygroundBoxes(boxes, userId)
      }
    } catch {}

    clearLocalState()
    markMigrationDone()
    setMigrationPending(false)
  }, [user, collectionEntries, followedWatchIds, nextTargets, grailWatchId, collectionJewelWatchId, watchboxConfig, catalogWatchMap])

  const dismissMigration = useCallback(() => {
    if (!user) return
    const userId = user.id

    clearLocalState()
    markMigrationDone()
    setMigrationPending(false)

    // Reset to empty then load from Supabase
    setCollectionEntries([])
    setFollowedWatchIds([])
    setNextTargets([])
    setGrailWatchId(null)
    setCollectionJewelWatchId(null)
    setWatchboxConfig(DEFAULT_WATCHBOX_CONFIG)

    setDataLoading(true)
    loadFromSupabase(userId, catalogIds, catalogIdSet).then(snapshot => {
      if (snapshot) {
        setCollectionEntries(snapshot.collectionWatches)
        setFollowedWatchIds(snapshot.followedWatchIds)
        setNextTargets(snapshot.nextTargets)
        setGrailWatchId(snapshot.grailWatchId)
        setCollectionJewelWatchId(snapshot.collectionJewelWatchId)
        setWatchboxConfig(snapshot.watchboxConfig)
      }
      setDataLoading(false)
    })
  }, [user, catalogIds, catalogIdSet])

  // ── Toast ────────────────────────────────────────────────────────────────

  function showToast(message: string) {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    setToastMessage(message)
    setToastVisible(true)

    showTimer.current = setTimeout(() => {
      setToastVisible(false)
      hideTimer.current = setTimeout(() => setToastMessage(null), 300)
    }, 2500)
  }

  // ── Collection helpers ───────────────────────────────────────────────────

  function isOwnedWatch(watchId: string) {
    return collectionEntries.some(watch => watch.watchId === watchId)
  }

  function getWatchIntentAvailability(watchId: string): WatchIntentAvailability | null {
    if (!catalogIdSet.has(watchId)) return null

    const isOwned = isOwnedWatch(watchId)
    const isFollowed = followedWatchIds.includes(watchId)

    return {
      isOwned,
      isFollowed,
      canFollow: true,
      canSetTarget: !isOwned && isFollowed,
      canSetGrail: !isOwned && isFollowed,
      canSetJewel: isOwned,
    }
  }

  function removeFollowedState(watchId: string) {
    setFollowedWatchIds(prev => prev.filter(id => id !== watchId))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(prev => (prev === watchId ? null : prev))
    if (user) {
      void syncWatchState(watchId, 'follow', false, {}, user.id)
      void syncWatchState(watchId, 'target', false, {}, user.id)
      void syncWatchState(watchId, 'grail', false, {}, user.id)
    }
  }

  function removeCurrentWatchState(watchId: string) {
    const currentState = getSavedState(watchId)

    if (currentState === 'followed') {
      removeFollowedState(watchId)
      return
    }

    if (currentState === 'target') {
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      if (user) void syncWatchState(watchId, 'target', false, {}, user.id)
      return
    }

    if (currentState === 'grail') {
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      if (user) void syncWatchState(watchId, 'grail', false, {}, user.id)
      return
    }

    if (currentState === 'jewel') {
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
      if (user) void syncWatchState(watchId, 'jewel', false, {}, user.id)
    }
  }

  function getSavedState(watchId: string): WatchSavedState | null {
    if (collectionJewelWatchId === watchId) return 'jewel'
    if (grailWatchId === watchId) return 'grail'
    if (nextTargets.some(target => target.watchId === watchId)) return 'target'
    if (followedWatchIds.includes(watchId)) return 'followed'
    return null
  }

  function canTargetWatch(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    if (!intent || intent.isOwned) return false

    return nextTargets.some(target => target.watchId === watchId) || nextTargets.length < 3
  }

  function canSetGrail(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    return Boolean(intent && !intent.isOwned)
  }

  function canSetJewel(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    return Boolean(intent?.canSetJewel)
  }

  function addToCollection(watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) {
    const wasTarget = nextTargets.some(target => target.watchId === watch.id)
    const wasGrail = grailWatchId === watch.id
    const newWatch: OwnedWatch = {
      id: `owned-${crypto.randomUUID()}`,
      watchId: watch.id,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: purchaseDetails?.price ?? 0,
      purchaseDate: purchaseDetails?.date ?? new Date().toISOString().split('T')[0],
      notes: purchaseDetails?.notes ?? '',
    }

    setCollectionEntries(prev => {
      const next = [...prev, newWatch]
      if (user) void syncWatchAdd(newWatch, watch, user.id, next.length - 1)
      return next
    })
    setNextTargets(prev => {
      const next = prev.filter(target => target.watchId !== watch.id)
      if (user && wasTarget) void syncWatchState(watch.id, 'target', false, {}, user.id)
      return next
    })
    setGrailWatchId(prev => {
      const next = prev === watch.id ? null : prev
      if (user && wasGrail) void syncWatchState(watch.id, 'grail', false, {}, user.id)
      return next
    })
    setSelectedWatchId(newWatch.id)
    showToast(
      wasTarget || wasGrail
        ? 'Aspirational notes cleared now that it is in your collection.'
        : `${watch.brand} ${watch.model} added to your collection`,
    )
  }

  function followWatch(watchId: string) {
    if (!catalogIdSet.has(watchId) || followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => [...prev, watchId])
    if (user) void syncWatchState(watchId, 'follow', true, {}, user.id)
    showToast('Saved to your followed watches.')
  }

  function unfollowWatch(watchId: string) {
    if (!followedWatchIds.includes(watchId)) return
    removeFollowedState(watchId)
  }

  function toggleFollowedWatch(watchId: string) {
    if (followedWatchIds.includes(watchId)) {
      unfollowWatch(watchId)
      return
    }
    followWatch(watchId)
  }

  function promoteToNextTarget(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (nextTargets.some(target => target.watchId === watchId)) return
    if (isOwnedWatch(watchId)) {
      showToast('Owned watches can be marked as your Jewel instead.')
      return
    }

    if (nextTargets.length >= 3) {
      showToast("You've reached your 3 target limit.")
      return
    }

    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setGrailWatchId(prev => (prev === watchId ? null : prev))
    setNextTargets(prev => {
      const target: WatchTarget = { watchId, desiredCondition: 'Excellent', intent: 'Addition' }
      if (user) void syncWatchState(watchId, 'target', true, {
        desiredCondition: 'Excellent', intent: 'Addition',
      }, user.id)
      return [...prev, target]
    })
    if (user) void syncWatchState(watchId, 'follow', true, {}, user.id)
    showToast('Added to your next targets.')
  }

  function removeFromNextTargets(watchId: string) {
    if (!nextTargets.some(target => target.watchId === watchId)) return
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    if (user) void syncWatchState(watchId, 'target', false, {}, user.id)
  }

  function setGrailWatch(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (grailWatchId === watchId) return
    if (isOwnedWatch(watchId)) {
      showToast('Owned watches can be marked as your Jewel instead.')
      return
    }

    if (grailWatchId) {
      if (user) void syncWatchState(grailWatchId, 'grail', false, {}, user.id)
    }
    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(watchId)
    if (user) {
      void syncWatchState(watchId, 'follow', true, {}, user.id)
      void syncWatchState(watchId, 'grail', true, {}, user.id)
    }
  }

  function clearGrailWatch() {
    if (!grailWatchId) return
    if (user) void syncWatchState(grailWatchId, 'grail', false, {}, user.id)
    setGrailWatchId(null)
  }

  function setCollectionJewelWatch(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (collectionJewelWatchId === watchId) return
    if (!isOwnedWatch(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return
    }

    if (collectionJewelWatchId) {
      if (user) void syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id)
    }
    setCollectionJewelWatchId(watchId)
    if (user) void syncWatchState(watchId, 'jewel', true, {}, user.id)
  }

  function clearCollectionJewelWatch() {
    if (!collectionJewelWatchId) return
    if (user) void syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id)
    setCollectionJewelWatchId(null)
  }

  function setWatchSavedState(
    watchId: string,
    state: WatchSavedState,
    _options?: { source?: WatchStateSource },
  ) {
    if (!catalogIdSet.has(watchId)) {
      return { ok: false as const, reason: 'invalid_watch' as const }
    }

    if (state === 'followed') {
      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
      if (user) void syncWatchState(watchId, 'follow', true, {}, user.id)
      showToast('Saved to your followed watches.')
      return { ok: true as const }
    }

    if (state === 'target') {
      if (isOwnedWatch(watchId)) {
        showToast('Owned watches can be marked as your Jewel instead.')
        return { ok: false as const, reason: 'owned_watch' as const }
      }

      if (!canTargetWatch(watchId)) {
        return { ok: false as const, reason: 'target_limit' as const }
      }

      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      setNextTargets(prev => (
        prev.some(target => target.watchId === watchId)
          ? prev
          : [
              ...prev,
              { watchId, desiredCondition: 'Excellent', intent: 'Addition' },
            ]
      ))
      if (user) {
        void syncWatchState(watchId, 'follow', true, {}, user.id)
        void syncWatchState(watchId, 'target', true, { desiredCondition: 'Excellent', intent: 'Addition' }, user.id)
      }
      showToast('Added to your next targets.')
      return { ok: true as const }
    }

    if (state === 'grail') {
      if (!canSetGrail(watchId)) {
        showToast('Owned watches can be marked as your Jewel instead.')
        return { ok: false as const, reason: 'owned_watch' as const }
      }

      if (grailWatchId && user) void syncWatchState(grailWatchId, 'grail', false, {}, user.id)
      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(watchId)
      if (user) {
        void syncWatchState(watchId, 'follow', true, {}, user.id)
        void syncWatchState(watchId, 'grail', true, {}, user.id)
      }
      return { ok: true as const }
    }

    if (!canSetJewel(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return { ok: false as const, reason: 'not_in_collection' as const }
    }

    if (collectionJewelWatchId && user) void syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id)
    setCollectionJewelWatchId(watchId)
    if (user) void syncWatchState(watchId, 'jewel', true, {}, user.id)
    return { ok: true as const }
  }

  function removeSavedWatchState(
    watchId: string,
    _options?: { source?: WatchStateSource },
  ) {
    removeCurrentWatchState(watchId)
  }

  function removeFromCollection(watchId: string) {
    const removedWatch = collectionEntries.find(watch => watch.id === watchId) ?? null
    if (removedWatch?.watchId) {
      const hasAnotherOwnedCopy = collectionEntries.some(watch => watch.id !== watchId && watch.watchId === removedWatch.watchId)
      if (!hasAnotherOwnedCopy) {
        setCollectionJewelWatchId(prev => (prev === removedWatch.watchId ? null : prev))
        if (user && collectionJewelWatchId === removedWatch.watchId) {
          void syncWatchState(removedWatch.watchId, 'jewel', false, {}, user.id)
        }
      }
    }
    setCollectionEntries(prev => prev.filter(watch => watch.id !== watchId))
    if (user) void syncWatchRemove(watchId, user.id)
    setSelectedWatchId(prev => (prev === watchId ? null : prev))
  }

  function reorderCollectionWatches(newWatches: ResolvedOwnedWatch[]) {
    setCollectionEntries(prev => {
      const byId = new Map(prev.map(watch => [watch.id, watch]))
      const next = newWatches
        .map(watch => byId.get(watch.id))
        .filter((watch): watch is OwnedWatch => watch !== undefined)

      if (next.length !== prev.length) return prev
      if (user) void syncWatchReorder(next, user.id)
      return next
    })
  }

  function setWatchboxFrame(frameId: string) {
    if (!FRAMES.some(frame => frame.id === frameId)) return
    setWatchboxConfig(prev => {
      const next = { ...prev, frame: frameId }
      if (user) void syncWatchboxConfig(next, user.id)
      return next
    })
  }

  function setWatchboxLining(liningId: string) {
    if (!LININGS.some(lining => lining.id === liningId)) return
    setWatchboxConfig(prev => {
      const next = { ...prev, lining: liningId }
      if (user) void syncWatchboxConfig(next, user.id)
      return next
    })
  }

  function setWatchboxSlotCount(slotCount: number) {
    if (!SLOT_COUNTS.some(slot => slot.n === slotCount)) return
    setWatchboxConfig(prev => {
      const next = { ...prev, slotCount }
      if (user) void syncWatchboxConfig(next, user.id)
      return next
    })
  }

  const localWatchCount = (() => {
    if (!migrationPending) return 0
    try {
      const raw = sessionStorage.getItem(COLLECTION_SESSION_STORAGE_KEY)
      if (!raw) return 0
      const parsed = JSON.parse(raw) as LegacySessionSnapshot
      return Array.isArray(parsed.collectionWatches) ? parsed.collectionWatches.length : 0
    } catch { return 0 }
  })()

  const value: CollectionSessionContextValue = {
    collectionWatches,
    followedWatchIds,
    followedWatches,
    nextTargets,
    nextTargetWatches,
    grailWatchId,
    grailWatch,
    collectionJewelWatchId,
    collectionJewelWatch,
    selectedWatchId,
    watchboxConfig,
    dataLoading,
    migrationPending,
    setSelectedWatchId,
    addToCollection,
    followWatch,
    unfollowWatch,
    toggleFollowedWatch,
    promoteToNextTarget,
    removeFromNextTargets,
    setGrailWatch,
    clearGrailWatch,
    setCollectionJewelWatch,
    clearCollectionJewelWatch,
    setWatchSavedState,
    removeSavedWatchState,
    removeFromCollection,
    reorderCollectionWatches,
    setWatchboxFrame,
    setWatchboxLining,
    setWatchboxSlotCount,
    watchboxPhotoUrl,
    watchboxPhotoCrop,
    setWatchboxPhoto,
    isInCollection: (watchId: string) => isOwnedWatch(watchId),
    isWatchFollowed: (watchId: string) => followedWatchIds.includes(watchId),
    isWatchTarget: (watchId: string) => nextTargets.some(target => target.watchId === watchId),
    isWatchGrail: (watchId: string) => grailWatchId === watchId,
    isWatchJewel: (watchId: string) => collectionJewelWatchId === watchId,
    canSetWatchAsTarget: (watchId: string) => canTargetWatch(watchId),
    canSetWatchAsGrail: (watchId: string) => canSetGrail(watchId),
    canSetWatchAsJewel: (watchId: string) => canSetJewel(watchId),
    getWatchIntentAvailability,
    getWatchSavedState: (watchId: string) => getSavedState(watchId),
    getCatalogWatch: (watchId: string) => catalogWatchMap.get(watchId),
    toastMessage,
    toastVisible,
    showToast,
    acceptMigration,
    dismissMigration,
  }

  return (
    <CollectionSessionContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: `translateX(-50%) translateY(${toastVisible ? '0' : '12px'})`,
            padding: '11px 16px',
            borderRadius: brand.radius.md,
            background: brand.colors.ink,
            color: brand.colors.bg,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            boxShadow: brand.shadow.xl,
            opacity: toastVisible ? 1 : 0,
            transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
            zIndex: 320,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
      {migrationPending && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 330,
            background: brand.colors.ink,
            color: brand.colors.bg,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: brand.shadow.xl,
          }}
        >
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 13,
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            You have {localWatchCount} {localWatchCount === 1 ? 'watch' : 'watches'} saved locally. Import them to your account?
          </p>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => void acceptMigration()}
              style={{
                padding: '9px 18px',
                background: brand.colors.gold,
                color: brand.colors.ink,
                border: 'none',
                borderRadius: brand.radius.btn,
                fontFamily: brand.font.sans,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Import →
            </button>
            <button
              onClick={dismissMigration}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                color: brand.colors.bg,
                border: `1px solid rgba(255,255,255,0.2)`,
                borderRadius: brand.radius.btn,
                fontFamily: brand.font.sans,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              Start fresh
            </button>
          </div>
        </div>
      )}
    </CollectionSessionContext.Provider>
  )
}

export function useCollectionSession() {
  const ctx = useContext(CollectionSessionContext)
  if (!ctx) {
    throw new Error('useCollectionSession must be used within CollectionSessionProvider')
  }
  return ctx
}
