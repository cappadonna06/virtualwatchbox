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
export type WatchSavedState = 'followed' | 'target' | 'grail'
export type WatchStateSource =
  | 'search'
  | 'add_flow'
  | 'add_detail'
  | 'hero'
  | 'sidebar'
  | 'playground'
  | 'cards'
  | 'profile'

export interface DialConfig {
  dialColor: string
  markerColor: string
  handColor: string
}

export interface CatalogWatch {
  id: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number
  caseMaterial: string
  dialColor: string
  movement: string
  complications: string[]
  estimatedValue: number
  imageUrl: string
  dialConfig: DialConfig
  watchType: WatchType
}

export interface OwnedWatch {
  id: string
  watchId: string
  condition: WatchCondition
  purchaseDate: string
  purchasePrice: number
  notes: string
  ownershipStatus: OwnershipStatus
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
  caseMaterial: string
  dialColor: string
  movement: string
  complications: string[]
  estimatedValue: number
  imageUrl: string
  dialConfig: DialConfig
  watchType: WatchType
  condition: WatchCondition
  notes: string
}

export interface ResolvedOwnedWatch extends ResolvedWatch {
  purchaseDate: string
  purchasePrice: number
  ownershipStatus: OwnershipStatus
}

export type PlaygroundWatchOverrides = Partial<Pick<
  CatalogWatch,
  | 'reference'
  | 'caseSizeMm'
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
