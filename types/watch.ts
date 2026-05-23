export type WatchCondition = 'Unworn' | 'Like New' | 'Excellent' | 'Good' | 'Fair'

export type WatchType =
  | 'Diver'
  | 'Dress'
  | 'Sport'
  | 'Chronograph'
  | 'GMT'
  | 'Pilot'
  | 'Field'
  | 'Integrated Bracelet'
  | 'Vintage'

export type OwnershipStatus = 'Owned' | 'For Sale' | 'Recently Added' | 'Needs Service'

export type WatchTargetIntent = 'Addition' | 'Replacement'
export type WatchSavedState = 'followed' | 'target' | 'grail' | 'jewel'
export type WatchStateSource =
  | 'search'
  | 'add_flow'
  | 'add_detail'
  | 'hero'
  | 'sidebar'
  | 'playground'
  | 'cards'
  | 'profile'
  | 'discover_upgrade'
  | 'discover_lead'
  | 'discover_next_slot'

export interface DialConfig {
  dialColor: string
  markerColor: string
  handColor: string
}

// Optional movement classification — populated by ingestion as data arrives.
export type MovementType = 'automatic' | 'manual' | 'quartz' | 'mecaquartz' | 'solar' | 'spring-drive'
export type BraceletType = 'bracelet' | 'strap' | 'integrated'
export type ProductionStatus = 'current' | 'discontinued' | 'limited' | 'one-off' | 'prototype'
export type GenderTarget = 'unisex' | 'mens' | 'womens'
export type CatalogSource = 'manual' | 'seed' | 'ingestion' | 'user_submission' | 'partner_feed'
export type ModerationStatus = 'approved' | 'pending' | 'rejected'
export type VerificationStatus = 'verified' | 'unverified' | 'community'

// Market layer: data that changes over time. Read from catalog_watch_market.
// All fields optional because a catalog row may not have a market snapshot
// yet (pre-pricing-job, freshly ingested watches, etc.). UI surfaces should
// always treat market as nullable.
export interface CatalogWatchMarket {
  marketValueUsd?: number
  marketValueLowUsd?: number
  marketValueHighUsd?: number
  currency?: string
  valueSource?: string
  valueConfidence?: 'low' | 'medium' | 'high'
  trend30dPct?: number
  trend90dPct?: number
  lastPricedAt?: string
  heatScore?: number
  popularityRank?: number
  followCount?: number
  targetCount?: number
  grailCount?: number
  ownedCount?: number
}

// CatalogWatch is the runtime shape served to UI. Required fields preserve
// the existing surface; optional fields are populated by ingestion as data
// is captured, and may be null for older catalog rows.
//
// estimatedValue is DERIVED at the resolver/provider boundary:
//   market.marketValueUsd  (if present)
//   ↳ msrpAtLaunchUsd      (if present)
//   ↳ legacy estimated_value column (transitional fallback)
//   ↳ 0
// Callsites can keep reading watch.estimatedValue without knowing which
// layer the value came from.
export interface CatalogWatch {
  id: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number
  lugWidthMm?: number
  caseMaterial: string
  dialColor: string
  movement: string
  complications: string[]
  estimatedValue: number
  imageUrl?: string
  imageTransparentUrl?: string
  imageSourceUrl?: string
  dialConfig: DialConfig
  watchType: WatchType

  // ── Expanded facts (optional; populated by ingestion) ─────────────────
  // Identity
  modelFamily?: string
  nickname?: string
  slug?: string

  // Case
  lugToLugMm?: number
  thicknessMm?: number
  caseFinish?: string
  bezelMaterial?: string
  bezelType?: string
  crystalMaterial?: string
  waterResistanceM?: number
  weightG?: number

  // Dial
  dialFinish?: string
  markerType?: string
  lumeColor?: string

  // Movement
  caliber?: string
  movementType?: MovementType
  powerReserveHours?: number
  frequencyVph?: number
  jewelCount?: number

  // Strap / bracelet
  braceletType?: BraceletType
  claspType?: string

  // Production
  yearIntroduced?: number
  yearDiscontinued?: number
  productionStatus?: ProductionStatus
  limitedEditionCount?: number
  msrpAtLaunchUsd?: number
  countryOfOrigin?: string

  // Categorization
  styleTags?: string[]
  genderTarget?: GenderTarget

  // Lineage
  replacesReference?: string
  replacedByReference?: string

  // Curation
  source?: CatalogSource
  moderationStatus?: ModerationStatus
  verificationStatus?: VerificationStatus
  contentVersion?: number

  // Market data attached for convenience. Optional; null/undefined when no
  // snapshot exists yet for this catalog id.
  market?: CatalogWatchMarket
}

export interface OwnedWatch {
  id: string
  watchId: string
  condition: WatchCondition
  purchaseDate: string
  purchasePrice: number
  notes: string
  ownershipStatus: OwnershipStatus
  /**
   * Sparse slot index for the user's watchbox; mirrors the `sort_order`
   * column in `public.watches`. May leave gaps (e.g. one watch at slot 0
   * and another at slot 5).
   */
  slot: number
  // Legacy single-photo field — kept for transition compatibility.
  // New writes go to user_watch_photos; reads prefer the primary photo from
  // there and fall back to this field when present.
  photoUrl?: string

  // ── Expanded ownership facts (optional; landing in app over time) ─────
  acquisitionMethod?: 'new' | 'pre-owned' | 'gift' | 'inherited' | 'trade' | 'auction'
  purchaseCurrency?: string
  purchaseLocation?: string
  hasBox?: boolean
  hasPapers?: boolean
  warrantyExpiresAt?: string
  lastServicedAt?: string
  serviceNotes?: string
  insuranceValueUsd?: number
  askingPrice?: number
  tags?: string[]
}

export interface UserWatchPhoto {
  id: string
  watchId: string         // owned-watch id
  photoUrl: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
  // Optional metadata; populated as the gallery UI gets the controls.
  photoType?: 'wrist_shot' | 'box_papers' | 'macro' | 'lifestyle' | 'dial' | 'case_back' | 'other'
  takenAt?: string
}

export interface WatchTarget {
  watchId: string
  targetPrice?: number
  desiredCondition: WatchCondition
  intent: WatchTargetIntent
  replacementWatchId?: string
  playgroundBoxId?: string
  notes?: string
  targetDate?: string
}

export interface ResolvedWatch {
  id: string
  watchId: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number
  lugWidthMm?: number
  caseMaterial: string
  dialColor: string
  movement: string
  complications: string[]
  estimatedValue: number
  imageUrl?: string
  imageTransparentUrl?: string
  imageSourceUrl?: string
  dialConfig: DialConfig
  watchType: WatchType
  condition: WatchCondition
  notes: string
  market?: CatalogWatchMarket
  /**
   * Optional sparse-slot index. Owned watches always carry one. Playground
   * resolved watches attach theirs at snapshot time. Catalog displayWatches
   * leave it undefined.
   */
  slot?: number
}

export interface ResolvedOwnedWatch extends ResolvedWatch {
  purchaseDate: string
  purchasePrice: number
  ownershipStatus: OwnershipStatus
  /** Sparse slot index; derived from watches.sort_order. */
  slot: number
}

export type PlaygroundWatchOverrides = Partial<Pick<
  CatalogWatch,
  | 'reference'
  | 'caseSizeMm'
  | 'lugWidthMm'
  | 'caseMaterial'
  | 'dialColor'
  | 'movement'
  | 'complications'
  | 'estimatedValue'
  | 'watchType'
>> & Partial<Pick<ResolvedWatch, 'condition' | 'notes'>>

export type PlaygroundBoxEntry = {
  id: string
  watchId: string
  /**
   * Sparse slot index this entry occupies in its parent box. Legacy entries
   * predating sparse-slot support omit this field — `normalizePlaygroundBoxes`
   * backfills it to the entry's array position so existing data renders
   * unchanged.
   */
  slot?: number
  overrides?: PlaygroundWatchOverrides
}

export type PlaygroundBox = {
  id: string
  name: string
  tags: string[]
  entries: PlaygroundBoxEntry[]
  frame: string
  lining: string
  slotCount: number
  createdAt: string
}
