export const COMING_SOON_FEATURES = {
  discover: {
    key: 'discover',
    label: 'Discover catalog',
    message: 'Discover is coming soon.',
  },
  news: {
    key: 'news',
    label: 'News feed',
    message: 'News is coming soon.',
  },
  editCollectionWatchDetails: {
    key: 'editCollectionWatchDetails',
    label: 'Edit collection watch details',
    message: 'Editing collection watch details is coming soon.',
  },
} as const

export type ComingSoonFeatureKey = keyof typeof COMING_SOON_FEATURES
