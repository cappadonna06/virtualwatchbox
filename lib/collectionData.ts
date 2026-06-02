import type { OwnedWatch } from '@/types/watch'

// Demo/seed collection intentionally empty — the app ships with no fake owned
// watches. New and guest sessions start from real empty states. Kept as a
// typed export so existing importers (heatScore, profileDemo) stay wired.
export const SEEDED_OWNED_WATCHES: OwnedWatch[] = []
