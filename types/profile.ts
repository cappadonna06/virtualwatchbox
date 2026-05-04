import type { ResolvedWatch, WatchSavedState } from '@/types/watch'

export type FeaturedProfileWatch = 'grail' | 'jewel' | 'none'

export type ProfileVisibilitySettings = {
  isPublic: boolean
  showCollection: boolean
  showCollectionStats: boolean
  showPlayground: boolean
  showFollowedWatches: boolean
  showGrail: boolean
}

export type ProfileImageCropState = {
  x: number
  y: number
  zoom: number
  area: {
    x: number
    y: number
    width: number
    height: number
  }
}

export type ProfileDemoState = {
  displayName: string
  bio: string
  profileImageUrl: string
  profileImageCrop?: ProfileImageCropState
  coverImageUrl: string
  collectionHeroImageUrl: string
  featuredProfileWatch: FeaturedProfileWatch
  visibility: ProfileVisibilitySettings
  updatedAt: string
}

export type PublicProfileSummaryStats = {
  collectionCount: number
  followedCount: number
  playgroundBoxCount: number
  playgroundWatchCount: number
  totalEstimatedValue: number
}

export type PublicCollectionStats = {
  watchCount: number
  totalEstimatedValue: number
  brandCount: number
}

export type PublicFollowedWatchSnapshot = ResolvedWatch & {
  profileState: WatchSavedState
}

export type PublicBoxSnapshot = {
  slug: string
  source: 'collection' | 'playground'
  sourceId: string
  title: string
  subtitle: string
  tags: string[]
  frame: string
  lining: string
  slotCount: number
  watchCount: number
  watches: ResolvedWatch[]
  updatedAt: string
}

export type PublicProfileSnapshot = {
  profile: ProfileDemoState
  visibility: ProfileVisibilitySettings
  summaryStats: PublicProfileSummaryStats
  collectionStats: PublicCollectionStats
  collectionBox: PublicBoxSnapshot
  playgroundBoxes: PublicBoxSnapshot[]
  followedWatches: PublicFollowedWatchSnapshot[]
  grailWatch: ResolvedWatch | null
  jewelWatch: ResolvedWatch | null
  updatedAt: string
}
