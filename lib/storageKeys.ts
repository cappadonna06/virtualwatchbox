export const COLLECTION_SESSION_STORAGE_KEY = 'collection-session-v2'
export const LEGACY_COLLECTION_SESSION_STORAGE_KEY = 'collection-session-v1'
export const WATCHBOX_CONFIG_STORAGE_KEY = 'watchbox-config'
export const PLAYGROUND_BOXES_STORAGE_KEY = 'playgroundBoxes'
export const PROFILE_DEMO_STORAGE_KEY = 'profile-demo-state-v1'
export const PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY = 'public-profile-snapshot-v1'
export const WATCHBOX_PHOTO_SESSION_KEY = 'watchbox-photo-v1'

// Per-user instant-paint read caches (localStorage). Scoped by user id so a
// different account on the same device never reads another user's data; cleared
// on sign-out / account switch. Supabase remains authoritative — these are only
// hydrated to avoid a cold-load flash and are always overwritten by the server.
export const userSessionCacheKey = (userId: string) => `vwb-cache-session-${userId}`
export const userProfileCacheKey = (userId: string) => `vwb-cache-profile-${userId}`
