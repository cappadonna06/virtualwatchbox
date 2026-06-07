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
  userSessionCacheKey,
  userProfileCacheKey,
} from '@/lib/storageKeys'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { remapLegacyCatalogId } from '@/lib/catalog/legacyIdRemap'
import { createCatalogWatchMap, resolveCatalogWatchId, resolveOwnedWatches } from '@/lib/watchData'
import { getEffectiveSlotCount, packToSlotCount } from '@/lib/watchboxOverflow'
import { migratePlaygroundBox, normalizePlaygroundBoxes } from '@/lib/playground'
import { createSeededPlaygroundBoxes } from '@/lib/playgroundData'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import type {
  CatalogWatch,
  OwnedWatch,
  OwnershipStatus,
  PhotoType,
  PlaygroundBox,
  PlaygroundBoxEntry,
  ResolvedOwnedWatch,
  ServiceIntervalYears,
  ServiceType,
  StrapWatchOverride,
  UserStrap,
  UserWatchPhoto,
  WatchCondition,
  WatchSavedState,
  WatchServiceRecord,
  WatchStateSource,
  WatchTarget,
} from '@/types/watch'
import type { ProfileImageCropState } from '@/types/profile'
import { brand } from '@/lib/brand'
import { isDocumentPhotoType, normalizeInterval } from '@/lib/serviceRoom/derive'
import {
  rowToOverride,
  rowToStrap,
  type OverrideRow,
  type StrapRow,
} from '@/lib/strapDrawer/strapsApi'

// Mutable fields accepted when creating or editing a strap.
export type StrapInput = Partial<Omit<UserStrap, 'id' | 'userId' | 'createdAt'>>

// Mutable fields accepted when logging or editing a service record.
export type ServiceRecordInput = {
  serviceDate: string
  serviceType: ServiceType
  provider?: string
  cost?: number | null
  currency?: string
  notes?: string
}

export type WatchboxPhotoCrop = ProfileImageCropState & { aspect?: number }

const WATCHBOX_PHOTO_CROP_SESSION_KEY = 'vwb-watchbox-photo-crop'

function isValidPhotoCrop(value: unknown): value is WatchboxPhotoCrop {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<WatchboxPhotoCrop> & { area?: Partial<WatchboxPhotoCrop['area']> }
  if (
    typeof v.x !== 'number'
    || typeof v.y !== 'number'
    || typeof v.zoom !== 'number'
    || !v.area
    || typeof v.area.x !== 'number'
    || typeof v.area.y !== 'number'
    || typeof v.area.width !== 'number'
    || typeof v.area.height !== 'number'
  ) return false
  if (v.aspect !== undefined && (typeof v.aspect !== 'number' || !Number.isFinite(v.aspect) || v.aspect <= 0)) return false
  return true
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
  photoUrl?: string
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
  photosByWatchId?: Map<string, UserWatchPhoto[]>
  serviceRecordsByWatchId?: Map<string, WatchServiceRecord[]>
  straps?: UserStrap[]
  strapOverrides?: StrapWatchOverride[]
  playgroundBoxes?: PlaygroundBox[]
}

// Bump when the cached payload shape changes so stale caches are ignored
// rather than mis-parsed.
const SESSION_CACHE_VERSION = 1

type CachedSessionPayload = {
  v: number
  collectionWatches: OwnedWatch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  collectionJewelWatchId: string | null
  watchboxConfig: WatchboxConfig
  // Referenced catalog rows, seeded synchronously on hydrate so the box/grail
  // resolve without waiting on a catalog round-trip.
  catalogRows: CatalogWatch[]
  photos: [string, UserWatchPhoto[]][]
  playgroundBoxes: PlaygroundBox[]
}

function readUserSessionCache(userId: string): CachedSessionPayload | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(userSessionCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSessionPayload
    if (!parsed || parsed.v !== SESSION_CACHE_VERSION) return null
    if (!Array.isArray(parsed.collectionWatches) || !isValidWatchboxConfig(parsed.watchboxConfig)) return null
    return parsed
  } catch {
    return null
  }
}

type LegacyWatchSnapshot = {
  id?: unknown
  watchId?: unknown
  condition?: unknown
  purchaseDate?: unknown
  purchasePrice?: unknown
  notes?: unknown
  ownershipStatus?: unknown
  slot?: unknown
  acquisitionMethod?: unknown
  hasBox?: unknown
  hasPapers?: unknown
  warrantyExpiresAt?: unknown
  lastServicedAt?: unknown
  serviceNotes?: unknown
  intervalYears?: unknown
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
  cacheHydrated: boolean
  migrationPending: boolean
  setSelectedWatchId: (watchId: string | null) => void
  addToCollection: (watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails, slot?: number) => string
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
  updateCollectionWatch: (watchId: string, updates: Partial<Pick<OwnedWatch, 'condition' | 'ownershipStatus' | 'purchasePrice' | 'purchaseDate' | 'notes' | 'hasBox' | 'hasPapers' | 'warrantyExpiresAt' | 'lastServicedAt'>>) => void
  reorderCollectionWatches: (newWatches: ResolvedOwnedWatch[]) => void
  /** Swap the watches at two slots (preserves sparse gaps). No-op if both slots are empty. */
  swapCollectionSlots: (fromSlot: number, toSlot: number) => void
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
  // Per-watch photo gallery (user_watch_photos)
  getWatchPhotos: (ownedWatchId: string) => UserWatchPhoto[]
  uploadWatchPhotos: (ownedWatchId: string, files: File[], photoType?: PhotoType | null, serviceRecordId?: string) => Promise<UserWatchPhoto[]>
  setPrimaryWatchPhoto: (ownedWatchId: string, photoId: string) => Promise<void>
  updateWatchPhotoCaption: (ownedWatchId: string, photoId: string, caption: string) => Promise<void>
  deleteWatchPhoto: (ownedWatchId: string, photoId: string) => Promise<void>
  reorderWatchPhotos: (ownedWatchId: string, orderedIds: string[]) => Promise<void>
  refreshWatchPhotos: (ownedWatchId?: string) => Promise<void>
  updateWatchPhotoType: (ownedWatchId: string, photoId: string, photoType: PhotoType | null) => Promise<void>
  // Papers & Provenance — the watch's document-type photos.
  getWatchDocuments: (ownedWatchId: string) => UserWatchPhoto[]
  // Service history (watch_service_records)
  getWatchServiceRecords: (ownedWatchId: string) => WatchServiceRecord[]
  logServiceRecord: (ownedWatchId: string, data: ServiceRecordInput) => Promise<WatchServiceRecord>
  updateServiceRecord: (ownedWatchId: string, recordId: string, data: Partial<ServiceRecordInput>) => Promise<void>
  deleteServiceRecord: (ownedWatchId: string, recordId: string) => Promise<void>
  refreshServiceRecords: (ownedWatchId?: string) => Promise<void>
  // Configurable per-watch full-service cadence.
  setWatchInterval: (ownedWatchId: string, years: ServiceIntervalYears) => Promise<void>
  // Strap Drawer (user_straps + strap_watch_overrides)
  straps: UserStrap[]
  strapOverrides: StrapWatchOverride[]
  getStraps: () => UserStrap[]
  createStrap: (data: StrapInput) => Promise<UserStrap>
  updateStrap: (id: string, data: StrapInput) => Promise<UserStrap>
  deleteStrap: (id: string) => Promise<void>
  reorderStraps: (orderedIds: string[]) => Promise<void>
  setStrapWatchOverride: (strapId: string, watchId: string, override: 'fits' | 'excluded') => Promise<void>
  removeStrapWatchOverride: (strapId: string, watchId: string) => Promise<void>
  uploadStrapPhoto: (strapId: string, file: File) => Promise<UserStrap>
  refreshStraps: () => Promise<void>
  // Playground boxes (synced to Supabase for logged-in users)
  playgroundBoxes: PlaygroundBox[]
  setPlaygroundBoxes: (boxes: PlaygroundBox[] | ((prev: PlaygroundBox[]) => PlaygroundBox[])) => void
  playgroundHydrated: boolean
  // Discover rotation
  discoverRefreshOffsets: Record<string, number>
  bumpDiscoverRefresh: (seedKey: string) => void
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

const ACQUISITION_METHODS = ['new', 'pre-owned', 'gift', 'inherited', 'trade', 'auction'] as const
function isAcquisitionMethod(value: unknown): value is NonNullable<OwnedWatch['acquisitionMethod']> {
  return typeof value === 'string' && (ACQUISITION_METHODS as readonly string[]).includes(value)
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
  fallbackSlot: number,
): OwnedWatch | null {
  const rawId = typeof rawWatch.id === 'string' ? rawWatch.id : null
  // Catalog id can come from the modern `watchId` field, or be inferred from
  // a legacy `id` slug (e.g. `omega-aqua-terra-abc123` → `omega-aqua-terra`).
  // We DO NOT drop entries whose catalog id isn't in the loaded discovery
  // cache: the owned-set hydrator (replaceOwnedCatalog) will fetch the row
  // directly by id, independent of heat score. Render-layer null-filter
  // (resolveOwnedWatch) handles truly-missing refs.
  const rawCatalogWatchId = typeof rawWatch.watchId === 'string'
    ? rawWatch.watchId
    : rawId
      ? (resolveCatalogWatchId(rawId, catalogIds) ?? rawId)
      : null

  // Heal legacy seed-catalog IDs (see lib/catalog/legacyIdRemap.ts).
  const catalogWatchId = remapLegacyCatalogId(rawCatalogWatchId)

  if (!rawId || !catalogWatchId) return null

  return {
    id: rawId,
    watchId: catalogWatchId,
    condition: isWatchCondition(rawWatch.condition) ? rawWatch.condition : 'Excellent',
    purchaseDate: typeof rawWatch.purchaseDate === 'string' ? rawWatch.purchaseDate : fallbackDate,
    purchasePrice: typeof rawWatch.purchasePrice === 'number' ? rawWatch.purchasePrice : 0,
    notes: typeof rawWatch.notes === 'string' ? rawWatch.notes : '',
    ownershipStatus: isOwnershipStatus(rawWatch.ownershipStatus) ? rawWatch.ownershipStatus : 'Owned',
    slot: typeof rawWatch.slot === 'number' && Number.isFinite(rawWatch.slot) ? rawWatch.slot : fallbackSlot,
    acquisitionMethod: isAcquisitionMethod(rawWatch.acquisitionMethod) ? rawWatch.acquisitionMethod : undefined,
    hasBox: typeof rawWatch.hasBox === 'boolean' ? rawWatch.hasBox : undefined,
    hasPapers: typeof rawWatch.hasPapers === 'boolean' ? rawWatch.hasPapers : undefined,
    warrantyExpiresAt: typeof rawWatch.warrantyExpiresAt === 'string' ? rawWatch.warrantyExpiresAt : undefined,
    lastServicedAt: typeof rawWatch.lastServicedAt === 'string' ? rawWatch.lastServicedAt : undefined,
    serviceNotes: typeof rawWatch.serviceNotes === 'string' ? rawWatch.serviceNotes : undefined,
    intervalYears: rawWatch.intervalYears === undefined ? undefined : normalizeInterval(rawWatch.intervalYears),
  }
}

function normalizeCollectionWatches(rawValue: unknown, catalogIds: string[]) {
  if (!Array.isArray(rawValue)) return []

  const fallbackDate = new Date().toISOString().split('T')[0]
  return rawValue
    .map((entry, index) => normalizeOwnedWatch(entry as LegacyWatchSnapshot, catalogIds, fallbackDate, index))
    .filter((watch): watch is OwnedWatch => watch !== null)
}

function normalizeFollowedWatchIds(rawValue: unknown, _catalogIds: Set<string>) {
  if (!Array.isArray(rawValue)) return []

  // No catalog-existence gate here — out-of-top-2000 refs are legitimate
  // and the owned-set hydrator will fetch them by id. The render-layer
  // catalogWatchMap.get() filter is the single source of truth for
  // "is this catalog ref real?".
  return [...new Set(
    rawValue
      .filter((watchId): watchId is string => typeof watchId === 'string' && watchId.length > 0)
      .map(watchId => remapLegacyCatalogId(watchId)),
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
    .map(target => ({ ...target, watchId: remapLegacyCatalogId(target.watchId) }))
  const grailWatchId = typeof snapshot.grailWatchId === 'string'
    ? remapLegacyCatalogId(snapshot.grailWatchId)
    : null
  const collectionJewelWatchId = typeof snapshot.collectionJewelWatchId === 'string'
    ? remapLegacyCatalogId(snapshot.collectionJewelWatchId)
    : null
  const collectionWatchIds = new Set(collectionWatches.map(watch => watch.watchId))

  const followedFromSnapshot = normalizeFollowedWatchIds(snapshot.followedWatchIds, catalogIdSet)
  // No catalog-membership gate when union-ing nextTargets/grail into followed —
  // out-of-top-2000 refs are valid and hydrate on demand.
  const followedWatchIds = [...new Set([
    ...followedFromSnapshot,
    ...nextTargets.map(target => target.watchId).filter((id): id is string => typeof id === 'string' && id.length > 0),
    ...(grailWatchId ? [grailWatchId] : []),
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
  photo_url: string | null
  acquisition_method: string | null
  has_box: boolean | null
  has_papers: boolean | null
  warranty_expires_at: string | null
  last_serviced_at: string | null
  service_notes: string | null
  interval_years: number | null
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

// ── Supabase sync helpers ──────────────────────────────────────────────────
//
// Every cloud write is idempotent (upsert on a stable id / delete by id), so a
// transient failure can be retried safely. `withRetry` re-runs the operation
// with exponential backoff, then logs and gives up. The promise stays pending
// across retries, so a sync wrapped in `trackedSync` keeps the in-flight count
// raised — correctly deferring the tab-focus refetch until the write settles.
const SYNC_RETRY_DELAYS = [400, 800, 1600, 3200]

async function withRetry(label: string, op: () => Promise<void>): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await op()
      return
    } catch (err) {
      const delay = SYNC_RETRY_DELAYS[attempt]
      if (delay === undefined) {
        console.error(`[vwb] ${label} failed after ${attempt + 1} attempts`, err)
        return
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function syncWatchAdd(watch: OwnedWatch, _catalogWatch: CatalogWatch, userId: string, sortOrder: number) {
  // Slim payload: catalog facts resolve through catalog_id; only ownership
  // and instance fields are persisted on the watches row. This requires
  // migration 017 to have dropped NOT NULL on brand/model.
  //
  // watch.id is always passed so the upsert is idempotent on the client-
  // generated UUID (Strict-mode double-invoke / transient duplicates update
  // the same row instead of inserting two).
  await withRetry('syncWatchAdd', async () => {
    const supabase = createClient()
    const { error } = await supabase.from('watches').upsert({
      id: watch.id,
      user_id: userId,
      catalog_id: watch.watchId,
      condition: watch.condition,
      ownership_status: watch.ownershipStatus,
      purchase_price: watch.purchasePrice,
      purchase_date: watch.purchaseDate || null,
      notes: watch.notes,
      photo_url: watch.photoUrl ?? null,
      sort_order: sortOrder,
    })
    if (error) throw error
  })
}

async function syncWatchUpdate(watchId: string, updates: Partial<OwnedWatch>, userId: string) {
  const payload: Record<string, unknown> = {}
  if (updates.condition !== undefined) payload.condition = updates.condition
  if (updates.ownershipStatus !== undefined) payload.ownership_status = updates.ownershipStatus
  if (updates.purchasePrice !== undefined) payload.purchase_price = updates.purchasePrice
  if (updates.purchaseDate !== undefined) payload.purchase_date = updates.purchaseDate || null
  if (updates.notes !== undefined) payload.notes = updates.notes
  if (updates.hasBox !== undefined) payload.has_box = updates.hasBox
  if (updates.hasPapers !== undefined) payload.has_papers = updates.hasPapers
  if (updates.acquisitionMethod !== undefined) payload.acquisition_method = updates.acquisitionMethod || null
  if (updates.warrantyExpiresAt !== undefined) payload.warranty_expires_at = updates.warrantyExpiresAt || null
  if (updates.lastServicedAt !== undefined) payload.last_serviced_at = updates.lastServicedAt || null
  if (updates.serviceNotes !== undefined) payload.service_notes = updates.serviceNotes
  if (updates.intervalYears !== undefined) payload.interval_years = updates.intervalYears
  if (Object.keys(payload).length === 0) return
  await withRetry('syncWatchUpdate', async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('watches')
      .update(payload)
      .eq('user_id', userId)
      .eq('id', watchId)
    if (error) throw error
  })
}

async function syncWatchRemove(watchId: string, userId: string) {
  await withRetry('syncWatchRemove', async () => {
    const supabase = createClient()
    const { error } = await supabase.from('watches').delete().eq('user_id', userId).eq('id', watchId)
    if (error) throw error
  })
}

async function syncWatchReorder(watches: OwnedWatch[], userId: string) {
  await withRetry('syncWatchReorder', async () => {
    const supabase = createClient()
    const results = await Promise.all(
      watches.map(w =>
        supabase.from('watches').update({ sort_order: w.slot }).eq('user_id', userId).eq('id', w.id)
      )
    )
    const failed = results.find(r => r.error)
    if (failed?.error) throw failed.error
  })
}

async function syncWatchboxConfig(config: WatchboxConfig, userId: string) {
  await withRetry('syncWatchboxConfig', async () => {
    const supabase = createClient()
    const { error } = await supabase.from('watchbox_config').upsert({
      user_id: userId,
      frame: config.frame,
      lining: config.lining,
      slot_count: config.slotCount,
    }, { onConflict: 'user_id' })
    if (error) throw error
  })
}

// Photo columns are upserted independently of frame/lining/slot_count so the two
// debounced writers don't clobber each other (both target watchbox_config).
async function syncWatchboxPhoto(url: string | null, crop: WatchboxPhotoCrop | null, userId: string) {
  await withRetry('syncWatchboxPhoto', async () => {
    const supabase = createClient()
    const { error } = await supabase.from('watchbox_config').upsert({
      user_id: userId,
      watchbox_photo_url: url,
      watchbox_photo_crop: crop,
    }, { onConflict: 'user_id' })
    if (error) throw error
  })
}

async function syncWatchState(
  catalogWatchId: string,
  state: 'follow' | 'target' | 'grail' | 'jewel',
  active: boolean,
  metadata: Record<string, unknown> = {},
  userId?: string,
) {
  if (!userId) return
  await withRetry('syncWatchState', async () => {
    const supabase = createClient()
    if (active) {
      const { error } = await supabase.from('watch_states').upsert({
        user_id: userId,
        catalog_watch_id: catalogWatchId,
        state,
        metadata,
      }, { onConflict: 'user_id,catalog_watch_id,state' })
      if (error) throw error
    } else {
      const { error } = await supabase.from('watch_states')
        .delete()
        .eq('user_id', userId)
        .eq('catalog_watch_id', catalogWatchId)
        .eq('state', state)
      if (error) throw error
    }
  })
}

async function syncPlaygroundBoxes(boxes: PlaygroundBox[], userId: string) {
  await withRetry('syncPlaygroundBoxes', async () => {
    const supabase = createClient()
    const { data: existing, error: selectError } = await supabase
      .from('playground_boxes')
      .select('id')
      .eq('user_id', userId)
    if (selectError) throw selectError

    const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id))
    const incomingIds = new Set(boxes.map(b => b.id))

    const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.from('playground_boxes').delete().in('id', toDelete)
      if (deleteError) throw deleteError
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
    const failed = upsertResults.find(r => r.error)
    if (failed?.error) throw failed.error
  })
}

// ── Load from Supabase ─────────────────────────────────────────────────────

async function loadFromSupabase(
  userId: string,
): Promise<SessionSnapshot | null> {
  // We deliberately do NOT pre-filter rows by the caller's catalog id set.
  // The dynamic catalog (CatalogProvider) loads asynchronously, so on first
  // login this load can fire before user-submitted catalog rows are in the
  // map. Dropping owned watches/states here would silently truncate state
  // until the next tab-focus refetch. The render layer (resolveOwnedWatches,
  // catalogWatchMap.get(...)) already filters unknown ids, and the relevant
  // useMemos re-run when the catalog finishes loading — so the watch becomes
  // visible the moment the catalog row arrives.
  try {
    const supabase = createClient()

    const [watchesRes, statesRes, configRes, photosRes, serviceRes, strapsRes, strapOverridesRes, playgroundRes] = await Promise.all([
      supabase.from('watches').select('*').eq('user_id', userId).order('sort_order'),
      supabase.from('watch_states').select('*').eq('user_id', userId),
      supabase.from('watchbox_config').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_watch_photos').select('*').eq('user_id', userId)
        .order('watch_id').order('sort_order').order('created_at'),
      supabase.from('watch_service_records').select('*').eq('user_id', userId)
        .order('watch_id').order('service_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('user_straps').select('*').eq('user_id', userId)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('strap_watch_overrides').select('*').eq('user_id', userId),
      supabase.from('playground_boxes').select('*').eq('user_id', userId).order('sort_order'),
    ])

    if (watchesRes.error) console.error('[vwb] loadFromSupabase watches error', watchesRes.error)
    if (statesRes.error) console.error('[vwb] loadFromSupabase watch_states error', statesRes.error)
    if (configRes.error) console.error('[vwb] loadFromSupabase watchbox_config error', configRes.error)
    if (playgroundRes.error) console.error('[vwb] loadFromSupabase playground_boxes error', playgroundRes.error)

    const dbWatches: DbWatch[] = watchesRes.data ?? []
    const dbStates: DbWatchState[] = statesRes.data ?? []
    const dbConfig: DbWatchboxConfig | null = configRes.data ?? null

    const fallbackDate = new Date().toISOString().split('T')[0]

    const collectionWatches: OwnedWatch[] = dbWatches
      .map((w, index) => ({
        id: w.id,
        watchId: remapLegacyCatalogId(w.catalog_id),
        condition: isWatchCondition(w.condition) ? w.condition : 'Excellent',
        ownershipStatus: isOwnershipStatus(w.ownership_status) ? w.ownership_status : 'Owned',
        purchasePrice: w.purchase_price ?? 0,
        purchaseDate: w.purchase_date ?? fallbackDate,
        notes: w.notes ?? '',
        photoUrl: w.photo_url ?? undefined,
        slot: typeof w.sort_order === 'number' ? w.sort_order : index,
        acquisitionMethod: isAcquisitionMethod(w.acquisition_method) ? w.acquisition_method : undefined,
        hasBox: w.has_box ?? undefined,
        hasPapers: w.has_papers ?? undefined,
        warrantyExpiresAt: w.warranty_expires_at ?? undefined,
        lastServicedAt: w.last_serviced_at ?? undefined,
        serviceNotes: w.service_notes ?? undefined,
        intervalYears: w.interval_years == null ? undefined : normalizeInterval(w.interval_years),
      }))

    const followedWatchIds: string[] = []
    const nextTargets: WatchTarget[] = []
    let grailWatchId: string | null = null
    let collectionJewelWatchId: string | null = null

    const collectionWatchIdSet = new Set(collectionWatches.map(w => w.watchId))

    for (const s of dbStates) {
      const stateWatchId = remapLegacyCatalogId(s.catalog_watch_id)
      if (s.state === 'follow') {
        followedWatchIds.push(stateWatchId)
      } else if (s.state === 'target' && !collectionWatchIdSet.has(stateWatchId) && nextTargets.length < 3) {
        const meta = s.metadata as Record<string, unknown>
        nextTargets.push({
          watchId: stateWatchId,
          desiredCondition: isWatchCondition(meta.desiredCondition) ? meta.desiredCondition : 'Excellent',
          intent: meta.intent === 'Replacement' ? 'Replacement' : 'Addition',
          targetPrice: typeof meta.targetPrice === 'number' ? meta.targetPrice : undefined,
          notes: typeof meta.notes === 'string' ? meta.notes : undefined,
          targetDate: typeof meta.targetDate === 'string' ? meta.targetDate : undefined,
        })
        if (!followedWatchIds.includes(stateWatchId)) followedWatchIds.push(stateWatchId)
      } else if (s.state === 'grail' && !collectionWatchIdSet.has(stateWatchId)) {
        grailWatchId = stateWatchId
        if (!followedWatchIds.includes(stateWatchId)) followedWatchIds.push(stateWatchId)
      } else if (s.state === 'jewel' && collectionWatchIdSet.has(stateWatchId)) {
        collectionJewelWatchId = stateWatchId
      }
    }

    const watchboxConfig: WatchboxConfig = dbConfig && isValidWatchboxConfig({
      frame: dbConfig.frame,
      lining: dbConfig.lining,
      slotCount: dbConfig.slot_count,
    })
      ? { frame: dbConfig.frame, lining: dbConfig.lining, slotCount: dbConfig.slot_count }
      : DEFAULT_WATCHBOX_CONFIG

    if (photosRes.error) console.error('[vwb] loadFromSupabase user_watch_photos error', photosRes.error)
    const photosByWatchId = new Map<string, UserWatchPhoto[]>()
    for (const row of (photosRes.data ?? []) as Array<Record<string, unknown>>) {
      const watchId = String(row.watch_id ?? '')
      if (!watchId) continue
      const photo: UserWatchPhoto = {
        id: String(row.id),
        watchId,
        photoUrl: String(row.photo_url ?? ''),
        caption: typeof row.caption === 'string' ? row.caption : null,
        sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
        isPrimary: !!row.is_primary,
        createdAt: String(row.created_at ?? new Date().toISOString()),
        photoType: typeof row.photo_type === 'string' ? (row.photo_type as PhotoType) : undefined,
        takenAt: typeof row.taken_at === 'string' ? row.taken_at : undefined,
        mimeType: typeof row.mime_type === 'string' ? row.mime_type : undefined,
        serviceRecordId: typeof row.service_record_id === 'string' ? row.service_record_id : undefined,
      }
      const list = photosByWatchId.get(watchId) ?? []
      list.push(photo)
      photosByWatchId.set(watchId, list)
    }

    if (serviceRes.error) console.error('[vwb] loadFromSupabase watch_service_records error', serviceRes.error)
    const serviceRecordsByWatchId = new Map<string, WatchServiceRecord[]>()
    for (const row of (serviceRes.data ?? []) as Array<Record<string, unknown>>) {
      const watchId = String(row.watch_id ?? '')
      if (!watchId) continue
      const record: WatchServiceRecord = {
        id: String(row.id),
        watchId,
        serviceDate: String(row.service_date ?? ''),
        serviceType: String(row.service_type ?? 'other') as ServiceType,
        provider: typeof row.provider === 'string' ? row.provider : undefined,
        cost: typeof row.cost === 'number' ? row.cost : undefined,
        currency: typeof row.currency === 'string' ? row.currency : undefined,
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        createdAt: String(row.created_at ?? new Date().toISOString()),
      }
      const list = serviceRecordsByWatchId.get(watchId) ?? []
      list.push(record)
      serviceRecordsByWatchId.set(watchId, list)
    }

    if (strapsRes.error) console.error('[vwb] loadFromSupabase user_straps error', strapsRes.error)
    const straps: UserStrap[] = (strapsRes.data ?? []).map(r => rowToStrap(r as StrapRow))

    if (strapOverridesRes.error) console.error('[vwb] loadFromSupabase strap_watch_overrides error', strapOverridesRes.error)
    const strapOverrides: StrapWatchOverride[] = (strapOverridesRes.data ?? []).map(r => rowToOverride(r as OverrideRow))

    // Opportunistic self-heal: any row whose catalog_id was a legacy seed
    // slug gets rewritten to the canonical id, fire-and-forget. First load
    // after deploy cleans up the user's rows; subsequent loads no-op.
    const watchesToFix = dbWatches.filter(w => w.catalog_id !== remapLegacyCatalogId(w.catalog_id))
    if (watchesToFix.length > 0) {
      void Promise.all(watchesToFix.map(w =>
        supabase
          .from('watches')
          .update({ catalog_id: remapLegacyCatalogId(w.catalog_id) })
          .eq('id', w.id),
      )).catch(err => console.warn('[vwb] legacy catalog_id backfill (watches) failed', err))
    }
    const statesToFix = dbStates.filter(s => s.catalog_watch_id !== remapLegacyCatalogId(s.catalog_watch_id))
    if (statesToFix.length > 0) {
      void Promise.all(statesToFix.map(s =>
        supabase
          .from('watch_states')
          .update({ catalog_watch_id: remapLegacyCatalogId(s.catalog_watch_id) })
          .eq('user_id', userId)
          .eq('catalog_watch_id', s.catalog_watch_id)
          .eq('state', s.state),
      )).catch(err => console.warn('[vwb] legacy catalog_id backfill (watch_states) failed', err))
    }

    const dbPlaygroundBoxes = (playgroundRes.data ?? []) as Array<Record<string, unknown>>
    const playgroundBoxes: PlaygroundBox[] = dbPlaygroundBoxes
      .map(row => {
        const entries = Array.isArray(row.entries) ? row.entries as PlaygroundBoxEntry[] : []
        const tags = Array.isArray(row.tags) ? (row.tags as string[]).filter(Boolean) : []
        return migratePlaygroundBox({
          id: String(row.id),
          name: String(row.name ?? 'Untitled'),
          tags,
          entries,
          frame: typeof row.frame === 'string' ? row.frame : undefined,
          lining: typeof row.lining === 'string' ? row.lining : undefined,
          slotCount: typeof row.slot_count === 'number' ? row.slot_count : undefined,
          createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
        })
      })
      .filter((box): box is PlaygroundBox => box !== null)

    return {
      collectionWatches,
      followedWatchIds: [...new Set(followedWatchIds)],
      nextTargets,
      grailWatchId,
      collectionJewelWatchId,
      watchboxConfig,
      photosByWatchId,
      serviceRecordsByWatchId,
      straps,
      strapOverrides,
      playgroundBoxes: playgroundBoxes.length > 0 ? playgroundBoxes : undefined,
    }
  } catch (err) {
    console.error('[vwb] loadFromSupabase failed', err)
    return null
  }
}

// Debounced cloud writer that coalesces bursts (drags, slot repacks, rapid
// typing) into a single write, but flushes the pending write immediately when
// the tab is hidden or the page is being unloaded — so the last change inside
// the debounce window isn't lost on tab-switch/close. visibilitychange→hidden
// is the reliable trigger (fires on mobile background and tab switch); pagehide
// is best-effort for hard navigation/close.
function useDebouncedCloudWrite() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jobRef = useRef<(() => void) | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const job = jobRef.current
    jobRef.current = null
    job?.()
  }, [])

  const schedule = useCallback((delay: number, job: () => void) => {
    jobRef.current = job
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const pending = jobRef.current
      jobRef.current = null
      pending?.()
    }, delay)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [flush])

  return useMemo(() => ({ schedule, flush }), [schedule, flush])
}

// ── Provider ───────────────────────────────────────────────────────────────

export function CollectionSessionProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()

  const { allWatches: catalogWatches, registerWatches, fetchWatchesByIds } = useCatalog()

  // Owned-set catalog rows — the catalog rows for every id the user actually
  // references (collection, followed, targets, grail, jewel). This is the
  // SOURCE OF TRUTH for owned-watch resolution and is deliberately kept
  // separate from `catalogWatches` (the heat-score top-2000 discovery cache).
  //
  // Why: heat score is a discovery-ranking signal — it must not gate whether
  // the user's own watches resolve. Previously, owned-watch resolution went
  // through the top-2000 set with `ensureWatches` as the stragglers escape
  // hatch, which made the watchbox vulnerable to race conditions between the
  // discovery load and the stragglers fetch ("flash then gone"). The owned
  // set lives in its own state, is populated once per hydration, mutated by
  // the user-facing actions (follow/target/grail/addToCollection), and never
  // touched by `load()`.
  const [ownedCatalogWatches, setOwnedCatalogWatches] = useState<Map<string, CatalogWatch>>(new Map())

  // Resolver map prefers the owned set, with the discovery cache as a
  // best-effort fallback for surfaces that share the same catalog map.
  const catalogWatchMap = useMemo(() => {
    const m = createCatalogWatchMap(catalogWatches)
    ownedCatalogWatches.forEach((watch, id) => m.set(id, watch))
    return m
  }, [catalogWatches, ownedCatalogWatches])

  const catalogIds = useMemo(() => catalogWatches.map(watch => watch.id), [catalogWatches])
  const catalogIdSet = useMemo(() => new Set(catalogIds), [catalogIds])

  const [collectionEntries, setCollectionEntries] = useState<OwnedWatch[]>([])
  const [photosByWatchId, setPhotosByWatchId] = useState<Map<string, UserWatchPhoto[]>>(new Map())
  const [serviceRecordsByWatchId, setServiceRecordsByWatchId] = useState<Map<string, WatchServiceRecord[]>>(new Map())
  const [straps, setStraps] = useState<UserStrap[]>([])
  const [strapOverrides, setStrapOverrides] = useState<StrapWatchOverride[]>([])
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
  // True once the authed user's local instant-paint cache has been applied, so
  // consumers (the profile page) can skip the loading skeleton on warm loads
  // even while the authoritative network load is still in flight.
  const [cacheHydrated, setCacheHydrated] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)
  const [playgroundBoxes, setPlaygroundBoxesState] = useState<PlaygroundBox[]>(createSeededPlaygroundBoxes)
  const [playgroundHydrated, setPlaygroundHydrated] = useState(false)
  const [discoverRefreshOffsets, setDiscoverRefreshOffsets] = useState<Record<string, number>>({})

  const setPlaygroundBoxes = useCallback(
    (update: PlaygroundBox[] | ((prev: PlaygroundBox[]) => PlaygroundBox[])) => {
      setPlaygroundBoxesState(update)
    },
    [],
  )

  const bumpDiscoverRefresh = useCallback((seedKey: string) => {
    setDiscoverRefreshOffsets(prev => ({ ...prev, [seedKey]: (prev[seedKey] ?? 0) + 1 }))
  }, [])

  const prevUserIdRef = useRef<string | null>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pending-writes tracking for the save/refetch coordination.
  //
  // Every cloud mutation (collection upsert, watch_states upsert/delete,
  // watchbox_config upsert, playground sync, …) is fire-and-forget after an
  // optimistic local setState. The tab-focus refetch and the auth-change
  // hydrate both call `loadFromSupabase` and unconditionally setState the
  // returned snapshot — which clobbers the local optimistic value if the
  // mutation hasn't landed on the server yet. The dirty counter records the
  // number of mutations currently in flight; refetch is skipped (or its result
  // is dropped) while the counter is non-zero. `loadInFlightRef` prevents
  // overlapping reads — also covers the cleanup-cancellation pattern (a
  // refetch that started before a write must not apply its stale result after
  // the write has begun).
  const pendingWritesRef = useRef(0)
  const loadInFlightRef = useRef(false)

  const playgroundWriter = useDebouncedCloudWrite()
  const watchboxPhotoWriter = useDebouncedCloudWrite()

  const trackedSync = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    pendingWritesRef.current += 1
    promise.finally(() => {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1)
    })
    return promise
  }, [])

  // Replace the entire owned-set with fresh rows for the given ids. Use on
  // hydration boundaries (initial load, auth change, tab focus). Atomic
  // replace ensures no rows from a previous user can leak through.
  const replaceOwnedCatalog = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) {
      setOwnedCatalogWatches(new Map())
      return
    }
    const rows = await fetchWatchesByIds(ids)
    setOwnedCatalogWatches(new Map(rows.map(w => [w.id, w])))
  }, [fetchWatchesByIds])

  // Merge new rows into the owned-set. Use for incremental mutations
  // (followWatch, setNextTarget, setGrail, addToCollection) so the new
  // reference is resolvable on the next render without a round-trip race.
  const mergeOwnedCatalog = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return
    const rows = await fetchWatchesByIds(ids)
    if (rows.length === 0) return
    setOwnedCatalogWatches(prev => {
      const next = new Map(prev)
      for (const w of rows) next.set(w.id, w)
      return next
    })
  }, [fetchWatchesByIds])

  // Synchronous merge of an already-resolved catalog row into the owned-set.
  // Use right after `registerWatches` in addToCollection so the new row is
  // visible on the very next render — no fetchWatchesByIds round-trip needed.
  const injectOwnedCatalog = useCallback((watch: CatalogWatch) => {
    setOwnedCatalogWatches(prev => {
      if (prev.get(watch.id) === watch) return prev
      const next = new Map(prev)
      next.set(watch.id, watch)
      return next
    })
  }, [])

  const applyServerSnapshot = useCallback((snapshot: SessionSnapshot) => {
    setCollectionEntries(snapshot.collectionWatches)
    if (snapshot.photosByWatchId) setPhotosByWatchId(snapshot.photosByWatchId)
    if (snapshot.serviceRecordsByWatchId) setServiceRecordsByWatchId(snapshot.serviceRecordsByWatchId)
    if (snapshot.straps) setStraps(snapshot.straps)
    if (snapshot.strapOverrides) setStrapOverrides(snapshot.strapOverrides)
    setFollowedWatchIds(snapshot.followedWatchIds)
    setNextTargets(snapshot.nextTargets)
    setGrailWatchId(snapshot.grailWatchId)
    setCollectionJewelWatchId(snapshot.collectionJewelWatchId)
    setWatchboxConfig(snapshot.watchboxConfig)

    if (snapshot.playgroundBoxes && snapshot.playgroundBoxes.length > 0) {
      setPlaygroundBoxesState(snapshot.playgroundBoxes)
      try {
        localStorage.setItem(PLAYGROUND_BOXES_STORAGE_KEY, JSON.stringify(snapshot.playgroundBoxes))
      } catch {}
    }
    setPlaygroundHydrated(true)

    // Owned-set catalog hydration — independent of heat score. Every id the
    // user references gets its catalog row fetched directly and stored in
    // `ownedCatalogWatches`. This is the load-bearing path for owned-watch
    // resolution; the heat-score top-2000 (`dynamicWatches`) only feeds the
    // discovery surfaces (browse/search/hero) and never gates the watchbox.
    const referencedIds: string[] = [
      ...snapshot.collectionWatches.map(w => w.watchId),
      ...snapshot.followedWatchIds,
      ...snapshot.nextTargets.map(t => t.watchId),
      ...(snapshot.grailWatchId ? [snapshot.grailWatchId] : []),
      ...(snapshot.collectionJewelWatchId ? [snapshot.collectionJewelWatchId] : []),
    ]
    void replaceOwnedCatalog(referencedIds)
  }, [replaceOwnedCatalog])

  // Instant-paint hydrate from the per-user local cache. Unlike
  // applyServerSnapshot this seeds the resolver rows synchronously from the
  // cached catalog rows (no replaceOwnedCatalog round-trip) so the box/grail
  // render on the first frame. The authoritative loadFromSupabase →
  // applyServerSnapshot that follows always overwrites this.
  const hydrateFromCache = useCallback((cached: CachedSessionPayload) => {
    if (cached.catalogRows.length > 0) {
      setOwnedCatalogWatches(new Map(cached.catalogRows.map(w => [w.id, w])))
    }
    setCollectionEntries(cached.collectionWatches)
    setFollowedWatchIds(cached.followedWatchIds)
    setNextTargets(cached.nextTargets)
    setGrailWatchId(cached.grailWatchId)
    setCollectionJewelWatchId(cached.collectionJewelWatchId)
    setWatchboxConfig(cached.watchboxConfig)
    if (Array.isArray(cached.photos) && cached.photos.length > 0) {
      setPhotosByWatchId(new Map(cached.photos))
    }
    if (Array.isArray(cached.playgroundBoxes) && cached.playgroundBoxes.length > 0) {
      setPlaygroundBoxesState(cached.playgroundBoxes)
    }
    setPlaygroundHydrated(true)
  }, [])

  const primaryPhotoByOwnedId = useMemo(() => {
    const map = new Map<string, string>()
    photosByWatchId.forEach((list, watchId) => {
      const primary = list.find(p => p.isPrimary)?.photoUrl
      if (primary) map.set(watchId, primary)
    })
    return map
  }, [photosByWatchId])

  const collectionWatches = useMemo(
    () => resolveOwnedWatches(collectionEntries, catalogWatchMap, primaryPhotoByOwnedId),
    [collectionEntries, catalogWatchMap, primaryPhotoByOwnedId],
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
      const sourceRaw = raw ?? legacyRaw
      const normalized = normalizeSessionSnapshot(
        sourceRaw ? JSON.parse(sourceRaw) : null,
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

        // Owned-set catalog hydration for guest sessions. Same architectural
        // reasoning as the authenticated path: fetch the user's referenced
        // catalog rows directly into `ownedCatalogWatches` so resolution
        // never depends on the heat-score top-2000.
        const referencedIds: string[] = [
          ...normalized.collectionWatches.map(w => w.watchId),
          ...normalized.followedWatchIds,
          ...normalized.nextTargets.map(t => t.watchId),
          ...(normalized.grailWatchId ? [normalized.grailWatchId] : []),
          ...(normalized.collectionJewelWatchId ? [normalized.collectionJewelWatchId] : []),
        ]
        void replaceOwnedCatalog(referencedIds)

        // Self-heal: if normalization rewrote any legacy seed-catalog IDs,
        // persist the canonicalized snapshot so subsequent hydrations are
        // a no-op rather than re-normalizing the same stale strings.
        try {
          const rewritten = JSON.stringify(normalized)
          if (sourceRaw && sourceRaw !== rewritten) {
            sessionStorage.setItem(COLLECTION_SESSION_STORAGE_KEY, rewritten)
            if (legacyRaw && !raw) {
              sessionStorage.removeItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY)
            }
          }
        } catch {
          // sessionStorage write can fail (quota, private mode) — non-fatal.
        }
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
      if (rawConfig) {
        const parsedConfig = JSON.parse(rawConfig)
        if (isValidWatchboxConfig(parsedConfig)) {
          setWatchboxConfig(parsedConfig)
        }
      }
    } catch {
      // Ignore malformed config data.
    }

    try {
      const rawPg = localStorage.getItem(PLAYGROUND_BOXES_STORAGE_KEY)
      const pgNormalized = normalizePlaygroundBoxes(
        rawPg ? JSON.parse(rawPg) : null,
        createSeededPlaygroundBoxes(),
      )
      setPlaygroundBoxesState(pgNormalized)
    } catch {
      // Ignore malformed playground data.
    }

    setPlaygroundHydrated(true)
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  // ── Auth state change → load from Supabase or offer migration ───────────

  useEffect(() => {
    if (authLoading) return  // wait for auth init before deciding signed-in vs signed-out

    const prevId = prevUserIdRef.current
    const currentId = user?.id ?? null
    prevUserIdRef.current = currentId

    // Identity changed (sign-out or account switch): drop the previous user's
    // local caches so a different account on this device never reads them, and
    // reset the cache-hydrated flag for the new identity.
    if (prevId && prevId !== currentId) {
      try {
        localStorage.removeItem(userSessionCacheKey(prevId))
        localStorage.removeItem(userProfileCacheKey(prevId))
      } catch {}
    }
    if (prevId !== currentId) setCacheHydrated(false)

    if (!currentId) return  // signed out → guest hydration effect handles state

    if (prevId === currentId) return  // same user, already loaded

    // Instant paint from the per-user cache while the authoritative network
    // load is in flight. A cache hit lets the profile skip its skeleton; the
    // server result below always overwrites whatever the cache painted.
    const cached = readUserSessionCache(currentId)
    if (cached) {
      hydrateFromCache(cached)
      setCacheHydrated(true)
      setHydrated(true)
    }

    const migrationAlreadyDone = (() => {
      try { return localStorage.getItem(MIGRATION_DONE_KEY) === 'true' } catch { return false }
    })()

    if (migrationAlreadyDone) {
      // Load fresh from Supabase
      setDataLoading(true)
      loadInFlightRef.current = true
      loadFromSupabase(currentId).then(snapshot => {
        loadInFlightRef.current = false
        if (snapshot) applyServerSnapshot(snapshot)
        else setPlaygroundHydrated(true)
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
      setPlaygroundHydrated(true)
      setHydrated(true)
    } else {
      // No local state — load from Supabase directly
      setDataLoading(true)
      loadInFlightRef.current = true
      loadFromSupabase(currentId).then(snapshot => {
        loadInFlightRef.current = false
        if (snapshot) applyServerSnapshot(snapshot)
        else setPlaygroundHydrated(true)
        setDataLoading(false)
        setHydrated(true)
        markMigrationDone()
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  // ── Tab-focus refetch ──────────────────────────────────────────────────
  // When the tab becomes visible again, re-pull collection/states/config from
  // Supabase so cross-browser edits show up without a hard reload.
  //
  // Dirty-aware gates (in order):
  //  - migrationPending    — never refetch while the user is mid-migration
  //  - loadInFlightRef     — another loadFromSupabase is already running (auth
  //                          change, dismissMigration, or an earlier refetch)
  //  - pendingWritesRef    — local optimistic mutations haven't all landed on
  //                          the server yet; reading now would yield a stale
  //                          snapshot that overwrites the just-mutated field
  // The post-await re-check covers the case where a mutation started during
  // the network round-trip — drop the refetch result rather than apply it.
  useEffect(() => {
    const currentId = user?.id ?? null
    if (!currentId || authLoading || migrationPending) return

    let cancelled = false

    function refetch() {
      if (document.visibilityState !== 'visible') return
      if (cancelled || !currentId) return
      if (loadInFlightRef.current) return
      if (pendingWritesRef.current > 0) return

      loadInFlightRef.current = true
      loadFromSupabase(currentId).then(snapshot => {
        loadInFlightRef.current = false
        if (cancelled || !snapshot) return
        if (pendingWritesRef.current > 0) return
        applyServerSnapshot(snapshot)
      })
    }

    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('focus', refetch)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('focus', refetch)
    }
  }, [user?.id, authLoading, migrationPending, applyServerSnapshot])

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

  // ── Authed instant-paint cache write ────────────────────────────────────
  // Mirror the signed-in user's lightweight session snapshot (plus the catalog
  // rows needed to resolve it) to a per-user localStorage key, so the next cold
  // load / hard refresh / mobile tab restart paints real data immediately. Gated
  // so we never cache the empty bootstrap state, a mid-load state, or a snapshot
  // taken while optimistic mutations are still in flight.
  useEffect(() => {
    if (!user || !hydrated || dataLoading || migrationPending) return
    if (pendingWritesRef.current > 0) return
    try {
      const referencedIds = new Set<string>([
        ...collectionEntries.map(w => w.watchId),
        ...followedWatchIds,
        ...nextTargets.map(t => t.watchId),
        ...(grailWatchId ? [grailWatchId] : []),
        ...(collectionJewelWatchId ? [collectionJewelWatchId] : []),
      ])
      const catalogRows: CatalogWatch[] = []
      referencedIds.forEach(id => {
        const row = catalogWatchMap.get(id)
        if (row) catalogRows.push(row)
      })
      const payload: CachedSessionPayload = {
        v: SESSION_CACHE_VERSION,
        collectionWatches: collectionEntries,
        followedWatchIds,
        nextTargets,
        grailWatchId,
        collectionJewelWatchId,
        watchboxConfig,
        catalogRows,
        photos: [...photosByWatchId.entries()],
        playgroundBoxes,
      }
      localStorage.setItem(userSessionCacheKey(user.id), JSON.stringify(payload))
    } catch {
      // Best-effort cache; quota/serialization failures just skip this write.
    }
  }, [user, hydrated, dataLoading, migrationPending, collectionEntries, followedWatchIds, nextTargets, grailWatchId, collectionJewelWatchId, watchboxConfig, photosByWatchId, playgroundBoxes, catalogWatchMap])

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
  //
  // Wrapped in trackedSync so a concurrent loadFromSupabase refetch doesn't
  // proceed until the photo upsert has landed (loadFromSupabase pulls
  // watchbox_config, which would otherwise read stale photo + frame/lining and
  // stomp the debounced photo write).
  useEffect(() => {
    if (!user || !watchboxPhotoCloudHydrated) return
    const userId = user.id
    const url = watchboxPhotoUrl ?? null
    const crop = watchboxPhotoCrop ?? null
    watchboxPhotoWriter.schedule(500, () => {
      void trackedSync(syncWatchboxPhoto(url, crop, userId))
    })
  }, [user, watchboxPhotoUrl, watchboxPhotoCrop, watchboxPhotoCloudHydrated, trackedSync, watchboxPhotoWriter])

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

  // Playground: persist to localStorage for guests, debounced Supabase sync for
  // logged-in users. The debounced write flushes on tab-hide/unload (see
  // useDebouncedCloudWrite) so a final drag/edit isn't lost inside the window.
  useEffect(() => {
    if (!playgroundHydrated) return
    if (!user) {
      try {
        localStorage.setItem(PLAYGROUND_BOXES_STORAGE_KEY, JSON.stringify(playgroundBoxes))
      } catch {}
      return
    }
    const userId = user.id
    const boxesSnapshot = playgroundBoxes
    playgroundWriter.schedule(1000, () => {
      void trackedSync(syncPlaygroundBoxes(boxesSnapshot, userId))
    })
  }, [playgroundBoxes, playgroundHydrated, user, trackedSync, playgroundWriter])

  useEffect(() => {
    if (!playgroundHydrated) return
    syncPublicProfileSnapshot({ playgroundBoxes })
  }, [playgroundBoxes, playgroundHydrated])

  useEffect(() => {
    setWatchboxConfig(prev => {
      const effectiveSlotCount = getEffectiveSlotCount(prev.slotCount, collectionWatches.length)
      return effectiveSlotCount === prev.slotCount
        ? prev
        : { ...prev, slotCount: effectiveSlotCount }
    })
  }, [collectionWatches.length])

  // Persist the auto-grown slot count so it survives page reload. Without this,
  // adding a 7th watch grows the local slot count to 8 but the DB stays at 6;
  // a refresh reads 6 back, the auto-grow re-fires, and the user sees the box
  // appear to "shrink" then "grow" again. Side effect lives outside the state
  // updater above (strict-mode purity).
  useEffect(() => {
    if (!hydrated || !user) return
    void trackedSync(syncWatchboxConfig(watchboxConfig, user.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchboxConfig.slotCount])

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

    // Bump pendingWritesRef around the whole migration so a tab-focus refetch
    // landing mid-migration doesn't read a partial cloud snapshot and snap the
    // local UI back to nothing.
    await trackedSync((async () => {
      // Upsert all current watches — write each entry's own slot value so
      // sparse-slot positions persist through guest → signed-in migration.
      await Promise.all(
        collectionEntries.map(w => {
          const catalogWatch = catalogWatchMapLocal.get(w.watchId)
          if (!catalogWatch) return Promise.resolve()
          return syncWatchAdd(w, catalogWatch, userId, w.slot)
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
    })())

    clearLocalState()
    markMigrationDone()
    setMigrationPending(false)
  }, [user, collectionEntries, followedWatchIds, nextTargets, grailWatchId, collectionJewelWatchId, watchboxConfig, catalogWatchMap, trackedSync])

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
    loadInFlightRef.current = true
    loadFromSupabase(userId).then(snapshot => {
      loadInFlightRef.current = false
      if (snapshot) applyServerSnapshot(snapshot)
      setDataLoading(false)
    })
  }, [user, applyServerSnapshot])

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
    // No catalog-membership gate — UI surfaces (watch detail, sidebar) drive
    // this with watchIds they've successfully loaded via Add Watch search or
    // fetchById. The catalog map only holds the top-2000-by-heat, but the
    // user can legitimately interact with any of the ~35k refs.
    if (typeof watchId !== 'string' || watchId.length === 0) return null

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
      void trackedSync(syncWatchState(watchId, 'follow', false, {}, user.id))
      void trackedSync(syncWatchState(watchId, 'target', false, {}, user.id))
      void trackedSync(syncWatchState(watchId, 'grail', false, {}, user.id))
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
      if (user) void trackedSync(syncWatchState(watchId, 'target', false, {}, user.id))
      return
    }

    if (currentState === 'grail') {
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      if (user) void trackedSync(syncWatchState(watchId, 'grail', false, {}, user.id))
      return
    }

    if (currentState === 'jewel') {
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
      if (user) void trackedSync(syncWatchState(watchId, 'jewel', false, {}, user.id))
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

  function addToCollection(watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails, slot?: number) {
    // Inject the catalog row into BOTH the discovery cache (registerWatches
    // → dynamicWatches, so other surfaces can see it) AND the owned-set
    // (injectOwnedCatalog → ownedCatalogWatches, the load-bearing resolver
    // map). Doing it synchronously before setCollectionEntries means the
    // very next render finds the row regardless of heat-score / discovery
    // cache state.
    registerWatches([watch])
    injectOwnedCatalog(watch)

    const wasTarget = nextTargets.some(target => target.watchId === watch.id)
    const wasGrail = grailWatchId === watch.id
    // Slot selection: if the caller passed an explicit slot (tap on empty
    // slot 6 → land at 6), respect it. Otherwise pick the first unused slot
    // so adds from search/photo land somewhere visible without disturbing
    // existing positions.
    const claimedSlots = new Set(collectionEntries.map(e => e.slot))
    let targetSlot: number
    if (typeof slot === 'number') {
      targetSlot = slot
    } else {
      targetSlot = 0
      while (claimedSlots.has(targetSlot)) targetSlot++
    }
    // Tapping an empty slot that already has a watch (e.g. race) replaces.
    // For sparse-slot semantics, a manual add to a claimed slot should
    // displace nothing — clamp to the next free slot instead so the user
    // never silently loses an existing watch.
    if (typeof slot === 'number' && claimedSlots.has(targetSlot)) {
      while (claimedSlots.has(targetSlot)) targetSlot++
    }
    const newWatch: OwnedWatch = {
      // Real UUID (no 'owned-' prefix) so it's a valid value for the watches.id
      // uuid column. The client-generated id is used unchanged in the server
      // upsert, which makes the write idempotent — a stray double-invoke (eg
      // React strict mode in dev) updates the same row instead of inserting
      // a duplicate.
      id: crypto.randomUUID(),
      watchId: watch.id,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: purchaseDetails?.price ?? 0,
      purchaseDate: purchaseDetails?.date ?? new Date().toISOString().split('T')[0],
      notes: purchaseDetails?.notes ?? '',
      photoUrl: purchaseDetails?.photoUrl,
      slot: targetSlot,
    }

    // Compute next entries from the current closure value — avoids putting a
    // side effect inside a state updater (which strict-mode double-invokes).
    const nextEntries = [...collectionEntries, newWatch]
    setCollectionEntries(nextEntries)
    if (user) {
      void trackedSync(syncWatchAdd(newWatch, watch, user.id, targetSlot))
    }

    setNextTargets(prev => prev.filter(target => target.watchId !== watch.id))
    if (user && wasTarget) {
      void trackedSync(syncWatchState(watch.id, 'target', false, {}, user.id))
    }
    if (grailWatchId === watch.id) {
      setGrailWatchId(null)
      if (user && wasGrail) {
        void trackedSync(syncWatchState(watch.id, 'grail', false, {}, user.id))
      }
    }

    const isFirstEverAdd =
      nextEntries.length === 1 &&
      typeof window !== 'undefined' &&
      !localStorage.getItem('vwb:firstWatchToastShown')

    if (isFirstEverAdd) {
      try {
        localStorage.setItem('vwb:firstWatchToastShown', '1')
      } catch {
        // localStorage may be unavailable in private/embedded contexts
      }
      showToast('Your watchbox is open.')
    } else {
      showToast(
        wasTarget || wasGrail
          ? 'Aspirational notes cleared now that it is in your collection.'
          : `${watch.brand} ${watch.model} added to your collection`,
      )
    }
    return newWatch.id
  }

  function followWatch(watchId: string) {
    if (!watchId || followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => [...prev, watchId])
    // Pull the catalog row into the owned-set so it resolves regardless of
    // heat score / discovery cache state.
    void mergeOwnedCatalog([watchId])
    if (user) void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
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
    if (!watchId) return
    if (nextTargets.some(target => target.watchId === watchId)) return
    void mergeOwnedCatalog([watchId])
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
      if (user) void trackedSync(syncWatchState(watchId, 'target', true, {
        desiredCondition: 'Excellent', intent: 'Addition',
      }, user.id))
      return [...prev, target]
    })
    if (user) void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
    showToast('Added to your next targets.')
  }

  function removeFromNextTargets(watchId: string) {
    if (!nextTargets.some(target => target.watchId === watchId)) return
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    if (user) void trackedSync(syncWatchState(watchId, 'target', false, {}, user.id))
  }

  function setGrailWatch(watchId: string) {
    if (!watchId) return
    if (grailWatchId === watchId) return
    void mergeOwnedCatalog([watchId])
    if (isOwnedWatch(watchId)) {
      showToast('Owned watches can be marked as your Jewel instead.')
      return
    }

    if (grailWatchId) {
      if (user) void trackedSync(syncWatchState(grailWatchId, 'grail', false, {}, user.id))
    }
    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(watchId)
    if (user) {
      void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
      void trackedSync(syncWatchState(watchId, 'grail', true, {}, user.id))
    }
  }

  function clearGrailWatch() {
    if (!grailWatchId) return
    if (user) void trackedSync(syncWatchState(grailWatchId, 'grail', false, {}, user.id))
    setGrailWatchId(null)
  }

  function setCollectionJewelWatch(watchId: string) {
    if (!watchId) return
    if (collectionJewelWatchId === watchId) return
    // No ensureWatches here — jewel is gated on isOwnedWatch below, meaning
    // the watch is already in collectionEntries, which means addToCollection
    // already injected it via registerWatches.
    if (!isOwnedWatch(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return
    }

    if (collectionJewelWatchId) {
      if (user) void trackedSync(syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id))
    }
    setCollectionJewelWatchId(watchId)
    if (user) void trackedSync(syncWatchState(watchId, 'jewel', true, {}, user.id))
  }

  function clearCollectionJewelWatch() {
    if (!collectionJewelWatchId) return
    if (user) void trackedSync(syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id))
    setCollectionJewelWatchId(null)
  }

  function setWatchSavedState(
    watchId: string,
    state: WatchSavedState,
    _options?: { source?: WatchStateSource },
  ) {
    if (!watchId) {
      return { ok: false as const, reason: 'invalid_watch' as const }
    }
    // Pull the catalog row into the owned-set so resolve layers can map the
    // saved state back to a CatalogWatch on the next render.
    void mergeOwnedCatalog([watchId])

    if (state === 'followed') {
      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
      if (user) void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
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
        void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
        void trackedSync(syncWatchState(watchId, 'target', true, { desiredCondition: 'Excellent', intent: 'Addition' }, user.id))
      }
      showToast('Added to your next targets.')
      return { ok: true as const }
    }

    if (state === 'grail') {
      if (!canSetGrail(watchId)) {
        showToast('Owned watches can be marked as your Jewel instead.')
        return { ok: false as const, reason: 'owned_watch' as const }
      }

      if (grailWatchId && user) void trackedSync(syncWatchState(grailWatchId, 'grail', false, {}, user.id))
      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(watchId)
      if (user) {
        void trackedSync(syncWatchState(watchId, 'follow', true, {}, user.id))
        void trackedSync(syncWatchState(watchId, 'grail', true, {}, user.id))
      }
      return { ok: true as const }
    }

    if (!canSetJewel(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return { ok: false as const, reason: 'not_in_collection' as const }
    }

    if (collectionJewelWatchId && user) void trackedSync(syncWatchState(collectionJewelWatchId, 'jewel', false, {}, user.id))
    setCollectionJewelWatchId(watchId)
    if (user) void trackedSync(syncWatchState(watchId, 'jewel', true, {}, user.id))
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
          void trackedSync(syncWatchState(removedWatch.watchId, 'jewel', false, {}, user.id))
        }
      }
    }
    setCollectionEntries(prev => prev.filter(watch => watch.id !== watchId))
    if (user) void trackedSync(syncWatchRemove(watchId, user.id))
    setSelectedWatchId(prev => (prev === watchId ? null : prev))
  }

  function updateCollectionWatch(
    watchId: string,
    updates: Partial<Pick<OwnedWatch,
      | 'condition' | 'ownershipStatus' | 'purchasePrice' | 'purchaseDate' | 'notes'
      | 'acquisitionMethod' | 'hasBox' | 'hasPapers' | 'warrantyExpiresAt' | 'lastServicedAt' | 'serviceNotes'
    >>,
  ) {
    setCollectionEntries(prev => {
      const target = prev.find(watch => watch.id === watchId)
      if (!target) return prev
      const next = prev.map(watch => (watch.id === watchId ? { ...watch, ...updates } : watch))
      if (user) void trackedSync(syncWatchUpdate(watchId, updates, user.id))
      return next
    })
  }

  function reorderCollectionWatches(newWatches: ResolvedOwnedWatch[]) {
    // Legacy interface: caller passed a fully-reordered list. Reassign slot
    // = arrayIndex so positions match the new order; this packs back into
    // dense slots (gaps will only appear via sparse-aware paths below).
    setCollectionEntries(prev => {
      const byId = new Map(prev.map(watch => [watch.id, watch]))
      const next = newWatches
        .map((w, i) => {
          const existing = byId.get(w.id)
          return existing ? { ...existing, slot: i } : null
        })
        .filter((watch): watch is OwnedWatch => watch !== null)

      if (next.length !== prev.length) return prev
      if (user) void trackedSync(syncWatchReorder(next, user.id))
      return next
    })
  }

  function swapCollectionSlots(fromSlot: number, toSlot: number) {
    if (fromSlot === toSlot) return
    setCollectionEntries(prev => {
      const next = prev.map(w => {
        if (w.slot === fromSlot) return { ...w, slot: toSlot }
        if (w.slot === toSlot) return { ...w, slot: fromSlot }
        return w
      })
      // No-op if neither slot had a watch.
      if (next.every((w, i) => w === prev[i])) return prev
      if (user) void trackedSync(syncWatchReorder(next, user.id))
      return next
    })
  }

  function setWatchboxFrame(frameId: string) {
    if (!FRAMES.some(frame => frame.id === frameId)) return
    setWatchboxConfig(prev => {
      const next = { ...prev, frame: frameId }
      if (user) void trackedSync(syncWatchboxConfig(next, user.id))
      return next
    })
  }

  function setWatchboxLining(liningId: string) {
    if (!LININGS.some(lining => lining.id === liningId)) return
    setWatchboxConfig(prev => {
      const next = { ...prev, lining: liningId }
      if (user) void trackedSync(syncWatchboxConfig(next, user.id))
      return next
    })
  }

  function setWatchboxSlotCount(slotCount: number) {
    if (!SLOT_COUNTS.some(slot => slot.n === slotCount)) return
    setWatchboxConfig(prev => {
      if (prev.slotCount === slotCount) return prev
      const next = { ...prev, slotCount }
      if (user) void trackedSync(syncWatchboxConfig(next, user.id))
      return next
    })
    // Shrinking can leave watches at slot indices that no longer exist (e.g.
    // [W][ ][ ][ ][ ][ ][ ][W] at 8 slots → 6 slots leaves slot-7 stranded).
    // Pack any out-of-range watches into the lowest empty slots so nothing
    // silently falls into overflow.
    setCollectionEntries(prev => {
      const repacked = packToSlotCount(
        prev,
        slotCount,
        owned => owned.slot,
        (owned, newSlot) => ({ ...owned, slot: newSlot }),
      )
      if (repacked === prev) return prev
      const prevById = new Map(prev.map(w => [w.id, w.slot]))
      const changed = repacked.some(w => prevById.get(w.id) !== w.slot)
      if (!changed) return prev
      if (user) void trackedSync(syncWatchReorder(repacked, user.id))
      return repacked
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

  // ── User watch photos ─────────────────────────────────────────────────────

  const getWatchPhotos = useCallback(
    (ownedWatchId: string) => photosByWatchId.get(ownedWatchId) ?? [],
    [photosByWatchId],
  )

  const refreshWatchPhotos = useCallback(async (ownedWatchId?: string) => {
    if (!user) return
    try {
      const supabase = createClient()
      const query = supabase.from('user_watch_photos').select('*').eq('user_id', user.id)
      if (ownedWatchId) query.eq('watch_id', ownedWatchId)
      query.order('watch_id').order('sort_order').order('created_at')
      const { data, error } = await query
      if (error) throw error
      const next = new Map(photosByWatchId)
      // If ownedWatchId is given, replace just that bucket; else replace all.
      if (ownedWatchId) next.delete(ownedWatchId)
      else next.clear()
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const wId = String(row.watch_id ?? '')
        if (!wId) continue
        const photo: UserWatchPhoto = {
          id: String(row.id),
          watchId: wId,
          photoUrl: String(row.photo_url ?? ''),
          caption: typeof row.caption === 'string' ? row.caption : null,
          sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
          isPrimary: !!row.is_primary,
          createdAt: String(row.created_at ?? new Date().toISOString()),
          photoType: typeof row.photo_type === 'string' ? (row.photo_type as PhotoType) : undefined,
          takenAt: typeof row.taken_at === 'string' ? row.taken_at : undefined,
          mimeType: typeof row.mime_type === 'string' ? row.mime_type : undefined,
          serviceRecordId: typeof row.service_record_id === 'string' ? row.service_record_id : undefined,
        }
        const list = next.get(wId) ?? []
        list.push(photo)
        next.set(wId, list)
      }
      setPhotosByWatchId(next)
    } catch (err) {
      console.error('[vwb] refreshWatchPhotos failed', err)
    }
  }, [user, photosByWatchId])

  const uploadWatchPhotos = useCallback(async (ownedWatchId: string, files: File[], photoType?: PhotoType | null, serviceRecordId?: string) => {
    const formData = new FormData()
    for (const f of files) formData.append('image', f, f.name || 'photo.jpg')
    if (photoType) formData.append('photoType', photoType)
    if (serviceRecordId) formData.append('serviceRecordId', serviceRecordId)
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos`, { method: 'POST', body: formData })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.detail ?? errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { photos: UserWatchPhoto[] }
    setPhotosByWatchId(prev => {
      const next = new Map(prev)
      const list = next.get(ownedWatchId) ?? []
      next.set(ownedWatchId, [...list, ...body.photos])
      return next
    })
    return body.photos
  }, [])

  const setPrimaryWatchPhoto = useCallback(async (ownedWatchId: string, photoId: string) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setPhotosByWatchId(prev => {
      const next = new Map(prev)
      const list = (next.get(ownedWatchId) ?? []).map(p => ({ ...p, isPrimary: p.id === photoId }))
      next.set(ownedWatchId, list)
      return next
    })
  }, [])

  const updateWatchPhotoCaption = useCallback(async (ownedWatchId: string, photoId: string, caption: string) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: caption || null }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setPhotosByWatchId(prev => {
      const next = new Map(prev)
      const list = (next.get(ownedWatchId) ?? []).map(p => p.id === photoId ? { ...p, caption: caption || null } : p)
      next.set(ownedWatchId, list)
      return next
    })
  }, [])

  const deleteWatchPhoto = useCallback(async (ownedWatchId: string, photoId: string) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos/${photoId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // Server may have promoted another photo to primary; reload this bucket to be safe.
    await refreshWatchPhotos(ownedWatchId)
  }, [refreshWatchPhotos])

  const reorderWatchPhotos = useCallback(async (ownedWatchId: string, orderedIds: string[]) => {
    // Optimistic local update.
    setPhotosByWatchId(prev => {
      const next = new Map(prev)
      const current = next.get(ownedWatchId) ?? []
      const byId = new Map(current.map(p => [p.id, p] as const))
      const reordered = orderedIds
        .map((id, i) => {
          const p = byId.get(id)
          return p ? { ...p, sortOrder: i } : null
        })
        .filter((p): p is UserWatchPhoto => p !== null)
      next.set(ownedWatchId, reordered)
      return next
    })
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
    if (!res.ok) {
      // Roll back from server state.
      await refreshWatchPhotos(ownedWatchId)
      throw new Error(`HTTP ${res.status}`)
    }
  }, [refreshWatchPhotos])

  const updateWatchPhotoType = useCallback(async (ownedWatchId: string, photoId: string, photoType: PhotoType | null) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoType }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setPhotosByWatchId(prev => {
      const next = new Map(prev)
      const list = (next.get(ownedWatchId) ?? []).map(p =>
        p.id === photoId ? { ...p, photoType: photoType ?? undefined } : p)
      next.set(ownedWatchId, list)
      return next
    })
  }, [])

  // ── Service records (watch_service_records) ──────────────────────────────
  const getWatchServiceRecords = useCallback(
    (ownedWatchId: string) => serviceRecordsByWatchId.get(ownedWatchId) ?? [],
    [serviceRecordsByWatchId],
  )

  const getWatchDocuments = useCallback(
    (ownedWatchId: string) => (photosByWatchId.get(ownedWatchId) ?? [])
      .filter(p => isDocumentPhotoType(p.photoType)),
    [photosByWatchId],
  )

  const refreshServiceRecords = useCallback(async (ownedWatchId?: string) => {
    if (!user) return
    try {
      const supabase = createClient()
      const query = supabase.from('watch_service_records').select('*').eq('user_id', user.id)
      if (ownedWatchId) query.eq('watch_id', ownedWatchId)
      query.order('watch_id').order('service_date', { ascending: false }).order('created_at', { ascending: false })
      const { data, error } = await query
      if (error) throw error
      setServiceRecordsByWatchId(prev => {
        const next = new Map(prev)
        if (ownedWatchId) next.delete(ownedWatchId)
        else next.clear()
        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          const wId = String(row.watch_id ?? '')
          if (!wId) continue
          const record: WatchServiceRecord = {
            id: String(row.id),
            watchId: wId,
            serviceDate: String(row.service_date ?? ''),
            serviceType: String(row.service_type ?? 'other') as ServiceType,
            provider: typeof row.provider === 'string' ? row.provider : undefined,
            cost: typeof row.cost === 'number' ? row.cost : undefined,
            currency: typeof row.currency === 'string' ? row.currency : undefined,
            notes: typeof row.notes === 'string' ? row.notes : undefined,
            createdAt: String(row.created_at ?? new Date().toISOString()),
          }
          const list = next.get(wId) ?? []
          list.push(record)
          next.set(wId, list)
        }
        return next
      })
    } catch (err) {
      console.error('[vwb] refreshServiceRecords failed', err)
    }
  }, [user])

  const logServiceRecord = useCallback(async (ownedWatchId: string, data: ServiceRecordInput) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/service-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { record: WatchServiceRecord }
    setServiceRecordsByWatchId(prev => {
      const next = new Map(prev)
      const list = [body.record, ...(next.get(ownedWatchId) ?? [])]
      list.sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
      next.set(ownedWatchId, list)
      return next
    })
    return body.record
  }, [])

  const updateServiceRecord = useCallback(async (ownedWatchId: string, recordId: string, data: Partial<ServiceRecordInput>) => {
    const res = await fetch(`/api/user-watches/${ownedWatchId}/service-records/${recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { record: WatchServiceRecord }
    setServiceRecordsByWatchId(prev => {
      const next = new Map(prev)
      const list = (next.get(ownedWatchId) ?? []).map(r => r.id === recordId ? body.record : r)
      list.sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
      next.set(ownedWatchId, list)
      return next
    })
  }, [])

  const deleteServiceRecord = useCallback(async (ownedWatchId: string, recordId: string) => {
    // Optimistic removal.
    setServiceRecordsByWatchId(prev => {
      const next = new Map(prev)
      next.set(ownedWatchId, (next.get(ownedWatchId) ?? []).filter(r => r.id !== recordId))
      return next
    })
    const res = await fetch(`/api/user-watches/${ownedWatchId}/service-records/${recordId}`, { method: 'DELETE' })
    if (!res.ok) {
      await refreshServiceRecords(ownedWatchId)
      throw new Error(`HTTP ${res.status}`)
    }
  }, [refreshServiceRecords])

  const setWatchInterval = useCallback(async (ownedWatchId: string, years: ServiceIntervalYears) => {
    // Optimistic local update on the owned entry.
    setCollectionEntries(prev => prev.map(w => w.id === ownedWatchId ? { ...w, intervalYears: years } : w))
    if (!user) return  // guest: persisted via the sessionStorage snapshot effect
    await trackedSync(syncWatchUpdate(ownedWatchId, { intervalYears: years }, user.id))
  }, [user, trackedSync])

  // ─── Strap Drawer (user_straps + strap_watch_overrides) ──────────────────
  const getStraps = useCallback(() => straps, [straps])

  const refreshStraps = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/user-straps')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json() as { straps: UserStrap[] }
      setStraps(body.straps)
      // Overrides ride along on the next full hydrate; pull them fresh too.
      const supabase = createClient()
      const { data } = await supabase.from('strap_watch_overrides').select('*').eq('user_id', user.id)
      setStrapOverrides((data ?? []).map(r => rowToOverride(r as OverrideRow)))
    } catch (err) {
      console.error('[vwb] refreshStraps failed', err)
    }
  }, [user])

  const createStrap = useCallback(async (data: StrapInput) => {
    const res = await fetch('/api/user-straps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { strap: UserStrap }
    setStraps(prev => [body.strap, ...prev].sort((a, b) => a.sortOrder - b.sortOrder))
    return body.strap
  }, [])

  const updateStrap = useCallback(async (id: string, data: StrapInput) => {
    const res = await fetch(`/api/user-straps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { strap: UserStrap }
    setStraps(prev => prev.map(s => s.id === id ? body.strap : s))
    return body.strap
  }, [])

  const deleteStrap = useCallback(async (id: string) => {
    setStraps(prev => prev.filter(s => s.id !== id))
    setStrapOverrides(prev => prev.filter(o => o.strapId !== id))
    const res = await fetch(`/api/user-straps/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      await refreshStraps()
      throw new Error(`HTTP ${res.status}`)
    }
  }, [refreshStraps])

  const reorderStraps = useCallback(async (orderedIds: string[]) => {
    setStraps(prev => {
      const byId = new Map(prev.map(s => [s.id, s] as const))
      return orderedIds
        .map((id, i) => { const s = byId.get(id); return s ? { ...s, sortOrder: i } : null })
        .filter((s): s is UserStrap => s !== null)
    })
    const res = await fetch('/api/user-straps/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    })
    if (!res.ok) {
      await refreshStraps()
      throw new Error(`HTTP ${res.status}`)
    }
  }, [refreshStraps])

  const setStrapWatchOverride = useCallback(async (strapId: string, watchId: string, override: 'fits' | 'excluded') => {
    const res = await fetch(`/api/user-straps/${strapId}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchId, override }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { override: StrapWatchOverride }
    setStrapOverrides(prev => {
      const rest = prev.filter(o => !(o.strapId === strapId && o.watchId === watchId))
      return [...rest, body.override]
    })
  }, [])

  const removeStrapWatchOverride = useCallback(async (strapId: string, watchId: string) => {
    setStrapOverrides(prev => prev.filter(o => !(o.strapId === strapId && o.watchId === watchId)))
    const res = await fetch(`/api/user-straps/${strapId}/overrides/${watchId}`, { method: 'DELETE' })
    if (!res.ok) {
      await refreshStraps()
      throw new Error(`HTTP ${res.status}`)
    }
  }, [refreshStraps])

  const uploadStrapPhoto = useCallback(async (strapId: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file, file.name || 'strap.jpg')
    const res = await fetch(`/api/user-straps/${strapId}/photo`, { method: 'POST', body: formData })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error ?? `HTTP ${res.status}`)
    }
    const body = await res.json() as { strap: UserStrap }
    setStraps(prev => prev.map(s => s.id === strapId ? body.strap : s))
    return body.strap
  }, [])

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
    cacheHydrated,
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
    updateCollectionWatch,
    reorderCollectionWatches,
    swapCollectionSlots,
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
    getWatchPhotos,
    uploadWatchPhotos,
    setPrimaryWatchPhoto,
    updateWatchPhotoCaption,
    deleteWatchPhoto,
    reorderWatchPhotos,
    refreshWatchPhotos,
    updateWatchPhotoType,
    getWatchDocuments,
    getWatchServiceRecords,
    logServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
    refreshServiceRecords,
    setWatchInterval,
    straps,
    strapOverrides,
    getStraps,
    createStrap,
    updateStrap,
    deleteStrap,
    reorderStraps,
    setStrapWatchOverride,
    removeStrapWatchOverride,
    uploadStrapPhoto,
    refreshStraps,
    playgroundBoxes,
    setPlaygroundBoxes,
    playgroundHydrated,
    discoverRefreshOffsets,
    bumpDiscoverRefresh,
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
            fontSize: 12,
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
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <p
              style={{
                fontFamily: brand.font.serif,
                fontSize: 18,
                fontWeight: 400,
                margin: '0 0 4px',
                letterSpacing: '0.01em',
              }}
            >
              Welcome.
            </p>
            <p
              style={{
                fontFamily: brand.font.sans,
                fontSize: 15,
                margin: 0,
                letterSpacing: '0.02em',
                color: 'rgba(250,248,244,0.78)',
                lineHeight: 1.5,
              }}
            >
              You added {localWatchCount} {localWatchCount === 1 ? 'watch' : 'watches'} as a guest. Import to sync them across devices.
            </p>
          </div>
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
              Save to my account →
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
              Skip
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
