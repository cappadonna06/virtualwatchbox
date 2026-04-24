export type WatchCondition = 'Unworn' | 'Like New' | 'Excellent' | 'Good' | 'Fair'

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
}
