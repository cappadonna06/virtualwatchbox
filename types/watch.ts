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

export interface DialConfig {
  dialColor: string
  markerColor: string
  handColor: string
}

export interface Watch {
  id: string
  brand: string
  model: string
  reference: string
  caseSizeMm: number
  caseMaterial: string
  dialColor: string
  movement: string
  complications: string[]
  condition: WatchCondition
  purchaseDate: string
  purchasePrice: number
  estimatedValue: number
  notes: string
  imageUrl: string
  dialConfig: DialConfig
  watchType: WatchType
  ownershipStatus: OwnershipStatus
}
