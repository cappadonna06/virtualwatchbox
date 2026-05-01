import { SEEDED_OWNED_WATCHES } from '@/lib/collectionData'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { normalizePlaygroundBoxes, resolvePlaygroundWatches } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import {
  COLLECTION_SESSION_STORAGE_KEY,
  LEGACY_COLLECTION_SESSION_STORAGE_KEY,
  PLAYGROUND_BOXES_STORAGE_KEY,
  PROFILE_DEMO_STORAGE_KEY,
  PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY,
  WATCHBOX_CONFIG_STORAGE_KEY,
} from '@/lib/storageKeys'
import { watches as catalogWatches } from '@/lib/watches'
import { createCatalogDisplayWatch, createCatalogWatchMap, resolveOwnedWatches } from '@/lib/watchData'
import type {
  CatalogWatch,
  OwnedWatch,
  PlaygroundBox,
  ResolvedOwnedWatch,
  ResolvedWatch,
  WatchSavedState,
  WatchTarget,
} from '@/types/watch'
import type {
  ProfileDemoState,
  ProfileVisibilitySettings,
  PublicBoxSnapshot,
  PublicFollowedWatchSnapshot,
  PublicProfileSnapshot,
} from '@/types/profile'

type WatchboxConfig = {
  frame: string
  lining: string
  slotCount: number
}

type StoredCollectionSession = {
  collectionWatches?: unknown
  followedWatchIds?: unknown
  nextTargets?: unknown
  grailWatchId?: unknown
  watchboxConfig?: unknown
}

type SnapshotSyncOptions = {
  profile?: ProfileDemoState
  collectionWatches?: ResolvedOwnedWatch[]
  followedWatches?: Array<CatalogWatch | ResolvedWatch>
  nextTargets?: WatchTarget[]
  grailWatch?: CatalogWatch | ResolvedWatch | null
  watchboxConfig?: WatchboxConfig
  playgroundBoxes?: PlaygroundBox[]
}

const catalogWatchMap = createCatalogWatchMap(catalogWatches)

const DEFAULT_WATCHBOX_CONFIG: WatchboxConfig = {
  frame: 'light-oak',
  lining: 'cream',
  slotCount: 6,
}

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibilitySettings = {
  showCollection: true,
  showCollectionStats: true,
  showPlayground: true,
  showFollowedWatches: true,
  showGrail: true,
}

export function createDefaultProfileDemoState(): ProfileDemoState {
  return {
    displayName: 'Private Collector',
    bio: 'Building a collection with room for classics, travel watches, and one long-term grail.',
    profileImageUrl: '',
    coverImageUrl: '',
    collectionHeroImageUrl: '',
    visibility: DEFAULT_PROFILE_VISIBILITY,
    updatedAt: new Date().toISOString(),
  }
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined'
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

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

function normalizeVisibility(value: unknown): ProfileVisibilitySettings {
  const fallback = DEFAULT_PROFILE_VISIBILITY

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const partial = value as Partial<ProfileVisibilitySettings>

  return {
    showCollection: typeof partial.showCollection === 'boolean' ? partial.showCollection : fallback.showCollection,
    showCollectionStats: typeof partial.showCollectionStats === 'boolean' ? partial.showCollectionStats : fallback.showCollectionStats,
    showPlayground: typeof partial.showPlayground === 'boolean' ? partial.showPlayground : fallback.showPlayground,
    showFollowedWatches: typeof partial.showFollowedWatches === 'boolean' ? partial.showFollowedWatches : fallback.showFollowedWatches,
    showGrail: typeof partial.showGrail === 'boolean' ? partial.showGrail : fallback.showGrail,
  }
}

function normalizeProfileDemoState(value: unknown): ProfileDemoState {
  const fallback = createDefaultProfileDemoState()

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const state = value as Partial<ProfileDemoState>

  return {
    displayName: typeof state.displayName === 'string' && state.displayName.trim().length > 0
      ? state.displayName
      : fallback.displayName,
    bio: typeof state.bio === 'string' ? state.bio : fallback.bio,
    profileImageUrl: typeof state.profileImageUrl === 'string' ? state.profileImageUrl : '',
    coverImageUrl: typeof state.coverImageUrl === 'string' && state.coverImageUrl.length > 0
      ? state.coverImageUrl
      : typeof state.collectionHeroImageUrl === 'string'
        ? state.collectionHeroImageUrl
        : '',
    collectionHeroImageUrl: typeof state.collectionHeroImageUrl === 'string' ? state.collectionHeroImageUrl : '',
    visibility: normalizeVisibility(state.visibility),
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : fallback.updatedAt,
  }
}

function normalizeOwnedWatches(value: unknown): OwnedWatch[] {
  if (!Array.isArray(value)) return SEEDED_OWNED_WATCHES

  const normalized = value.filter((entry): entry is OwnedWatch => {
    if (!entry || typeof entry !== 'object') return false

    const watch = entry as Partial<OwnedWatch>
    return (
      typeof watch.id === 'string'
      && typeof watch.watchId === 'string'
      && typeof watch.condition === 'string'
      && typeof watch.purchaseDate === 'string'
      && typeof watch.purchasePrice === 'number'
      && typeof watch.notes === 'string'
      && typeof watch.ownershipStatus === 'string'
    )
  })

  return normalized.length > 0 ? normalized : SEEDED_OWNED_WATCHES
}

function normalizeFollowedWatchIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [...new Set(
    value.filter((watchId): watchId is string => typeof watchId === 'string' && catalogWatchMap.has(watchId)),
  )]
}

function normalizeNextTargets(value: unknown): WatchTarget[] {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is WatchTarget => {
    if (!entry || typeof entry !== 'object') return false

    const target = entry as Partial<WatchTarget>
    return (
      typeof target.watchId === 'string'
      && (target.intent === 'Addition' || target.intent === 'Replacement')
      && typeof target.desiredCondition === 'string'
    )
  }).slice(0, 3)
}

function readStoredCollectionSession() {
  if (!canUseBrowserStorage()) {
    return {
      collectionWatches: resolveOwnedWatches(SEEDED_OWNED_WATCHES, catalogWatchMap),
      followedWatches: [] as CatalogWatch[],
      nextTargets: [] as WatchTarget[],
      grailWatch: null as CatalogWatch | null,
      watchboxConfig: DEFAULT_WATCHBOX_CONFIG,
    }
  }

  const sessionSnapshot = safeParseJson<StoredCollectionSession>(
    window.sessionStorage.getItem(COLLECTION_SESSION_STORAGE_KEY)
      ?? window.sessionStorage.getItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY),
  )

  const collectionEntries = normalizeOwnedWatches(sessionSnapshot?.collectionWatches)
  const followedWatchIds = normalizeFollowedWatchIds(sessionSnapshot?.followedWatchIds)
  const nextTargets = normalizeNextTargets(sessionSnapshot?.nextTargets)
  const grailWatchId = typeof sessionSnapshot?.grailWatchId === 'string' ? sessionSnapshot.grailWatchId : null

  const storedConfig = safeParseJson<WatchboxConfig>(window.localStorage.getItem(WATCHBOX_CONFIG_STORAGE_KEY))
  const watchboxConfig = isValidWatchboxConfig(sessionSnapshot?.watchboxConfig)
    ? sessionSnapshot.watchboxConfig
    : isValidWatchboxConfig(storedConfig)
      ? storedConfig
      : DEFAULT_WATCHBOX_CONFIG

  return {
    collectionWatches: resolveOwnedWatches(collectionEntries, catalogWatchMap),
    followedWatches: followedWatchIds
      .map(watchId => catalogWatchMap.get(watchId))
      .filter((watch): watch is CatalogWatch => watch !== undefined),
    nextTargets,
    grailWatch: grailWatchId ? catalogWatchMap.get(grailWatchId) ?? null : null,
    watchboxConfig,
  }
}

export function getStoredPlaygroundBoxes() {
  if (!canUseBrowserStorage()) {
    return SEEDED_PLAYGROUND_BOXES
  }

  const stored = safeParseJson<PlaygroundBox[]>(window.localStorage.getItem(PLAYGROUND_BOXES_STORAGE_KEY))
  return normalizePlaygroundBoxes(stored, SEEDED_PLAYGROUND_BOXES)
}

function slugifySegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'box'
}

export function getCollectionBoxSlug() {
  return 'collection'
}

export function getPlaygroundBoxSlug(box: Pick<PlaygroundBox, 'id' | 'name'>) {
  return `${slugifySegment(box.name)}-${slugifySegment(box.id)}`
}

export function createCollectionBoxSnapshot(
  watches: ResolvedOwnedWatch[],
  watchboxConfig: WatchboxConfig,
  updatedAt: string,
): PublicBoxSnapshot {
  return {
    slug: getCollectionBoxSlug(),
    source: 'collection',
    sourceId: 'collection',
    title: 'My Collection',
    subtitle: 'The owned box.',
    tags: ['Collection'],
    frame: watchboxConfig.frame,
    lining: watchboxConfig.lining,
    slotCount: watchboxConfig.slotCount,
    watchCount: watches.length,
    watches: watches.map(watch => ({ ...watch })),
    updatedAt,
  }
}

export function createPlaygroundBoxSnapshot(box: PlaygroundBox, updatedAt: string): PublicBoxSnapshot {
  return {
    slug: getPlaygroundBoxSlug(box),
    source: 'playground',
    sourceId: box.id,
    title: box.name,
    subtitle: 'Dream Box',
    tags: box.tags,
    frame: box.frame,
    lining: box.lining,
    slotCount: box.slotCount,
    watchCount: box.entries.length,
    watches: resolvePlaygroundWatches(box.entries, catalogWatches).map(item => item.displayWatch),
    updatedAt,
  }
}

function toResolvedWatch(watch: CatalogWatch | ResolvedWatch): ResolvedWatch {
  return 'watchId' in watch ? watch : createCatalogDisplayWatch(watch)
}

function buildPublicProfileSnapshot({
  profile,
  collectionWatches,
  followedWatches,
  nextTargets,
  grailWatch,
  watchboxConfig,
  playgroundBoxes,
}: {
  profile: ProfileDemoState
  collectionWatches: ResolvedOwnedWatch[]
  followedWatches: Array<CatalogWatch | ResolvedWatch>
  nextTargets: WatchTarget[]
  grailWatch: CatalogWatch | ResolvedWatch | null
  watchboxConfig: WatchboxConfig
  playgroundBoxes: PlaygroundBox[]
}): PublicProfileSnapshot {
  const updatedAt = new Date().toISOString()
  const collectionBox = createCollectionBoxSnapshot(collectionWatches, watchboxConfig, updatedAt)
  const resolvedFollowedWatches = followedWatches.map(toResolvedWatch)
  const resolvedGrailWatch = grailWatch ? toResolvedWatch(grailWatch) : null
  const collectionValue = collectionWatches.reduce((sum, watch) => sum + watch.estimatedValue, 0)
  const collectionBrandCount = new Set(collectionWatches.map(watch => watch.brand)).size
  const targetIds = new Set(nextTargets.map(target => target.watchId))
  const grailWatchId = resolvedGrailWatch?.watchId ?? null

  const followedSnapshots: PublicFollowedWatchSnapshot[] = resolvedFollowedWatches
    .map(watch => {
      let profileState: WatchSavedState = 'followed'
      if (grailWatchId && watch.watchId === grailWatchId) profileState = 'grail'
      else if (targetIds.has(watch.watchId)) profileState = 'target'

      return {
        ...watch,
        profileState,
      }
    })
    .sort((a, b) => {
      const priority: Record<WatchSavedState, number> = {
        target: 0,
        followed: 1,
        grail: 2,
      }

      const stateDelta = priority[a.profileState] - priority[b.profileState]
      if (stateDelta !== 0) return stateDelta
      return b.estimatedValue - a.estimatedValue
    })

  const publicRadarWatches = followedSnapshots.filter(watch => watch.profileState !== 'grail')

  return {
    profile: {
      ...profile,
      visibility: normalizeVisibility(profile.visibility),
      updatedAt,
    },
    visibility: normalizeVisibility(profile.visibility),
    summaryStats: {
      collectionCount: collectionWatches.length,
      followedCount: publicRadarWatches.length,
      playgroundBoxCount: playgroundBoxes.length,
      playgroundWatchCount: playgroundBoxes.reduce((sum, box) => sum + box.entries.length, 0),
      totalEstimatedValue: collectionValue,
    },
    collectionStats: {
      watchCount: collectionWatches.length,
      totalEstimatedValue: collectionValue,
      brandCount: collectionBrandCount,
    },
    collectionBox,
    playgroundBoxes: playgroundBoxes.map(box => createPlaygroundBoxSnapshot(box, updatedAt)),
    followedWatches: followedSnapshots,
    grailWatch: resolvedGrailWatch,
    updatedAt,
  }
}

export function getProfileDemoState() {
  if (!canUseBrowserStorage()) {
    return createDefaultProfileDemoState()
  }

  return normalizeProfileDemoState(
    safeParseJson<ProfileDemoState>(window.localStorage.getItem(PROFILE_DEMO_STORAGE_KEY)),
  )
}

export function saveProfileDemoState(state: ProfileDemoState) {
  if (!canUseBrowserStorage()) return state

  const normalizedState = normalizeProfileDemoState({
    ...state,
    updatedAt: new Date().toISOString(),
  })

  window.localStorage.setItem(PROFILE_DEMO_STORAGE_KEY, JSON.stringify(normalizedState))
  return normalizedState
}

export function getPublicProfileSnapshot() {
  if (!canUseBrowserStorage()) return null

  return safeParseJson<PublicProfileSnapshot>(window.localStorage.getItem(PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY))
}

export function syncPublicProfileSnapshot(options: SnapshotSyncOptions = {}) {
  if (!canUseBrowserStorage()) return null

  const storedCollection = readStoredCollectionSession()
  const profile = options.profile ?? getProfileDemoState()
  const collectionWatches = options.collectionWatches ?? storedCollection.collectionWatches
  const followedWatches = options.followedWatches ?? storedCollection.followedWatches
  const nextTargets = options.nextTargets ?? storedCollection.nextTargets
  const grailWatch = options.grailWatch === undefined ? storedCollection.grailWatch : options.grailWatch
  const watchboxConfig = options.watchboxConfig ?? storedCollection.watchboxConfig
  const playgroundBoxes = options.playgroundBoxes ?? getStoredPlaygroundBoxes()

  const snapshot = buildPublicProfileSnapshot({
    profile,
    collectionWatches,
    followedWatches,
    nextTargets,
    grailWatch,
    watchboxConfig,
    playgroundBoxes,
  })

  window.localStorage.setItem(PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot))
  return snapshot
}

export function getOrCreatePublicProfileSnapshot() {
  return getPublicProfileSnapshot() ?? syncPublicProfileSnapshot()
}

export function getPublicBoxSnapshotBySlug(slug: string) {
  const snapshot = getOrCreatePublicProfileSnapshot()
  if (!snapshot) return null

  if (snapshot.collectionBox.slug === slug) return snapshot.collectionBox
  return snapshot.playgroundBoxes.find(box => box.slug === slug) ?? null
}

export function getProfileSharePath() {
  return '/profile/preview'
}

export function getBoxSharePath(slug: string) {
  return `/profile/box/${slug}`
}

export function buildAbsoluteProfileDemoUrl(path: string) {
  if (!canUseBrowserStorage()) return path
  return new URL(path, window.location.origin).toString()
}

export async function copyProfileDemoUrl(path: string) {
  if (!canUseBrowserStorage()) return false

  const url = buildAbsoluteProfileDemoUrl(path)

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return true
  }

  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied
}

export async function resizeImageFileToDataUrl(
  file: File,
  options: {
    maxWidth: number
    maxHeight: number
    quality?: number
  },
) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Unable to read file'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image()
    nextImage.onload = () => resolve(nextImage)
    nextImage.onerror = () => reject(new Error('Unable to load image'))
    nextImage.src = dataUrl
  })

  const ratio = Math.min(options.maxWidth / image.width, options.maxHeight / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to prepare image')
  }

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', options.quality ?? 0.8)
}
