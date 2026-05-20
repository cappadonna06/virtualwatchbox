import type { CatalogWatch } from '@/types/watch'
import { watches } from './watches'

// Seed images are sourced from the build-time manifest and rewritten to
// Storage URLs in lib/watches.ts. Anything with a non-empty imageUrl is
// renderable — the URL shape no longer carries meaning beyond "has an image."
export function hasProcessedImage(watch: Pick<CatalogWatch, 'imageUrl'>) {
  return Boolean(watch.imageUrl)
}

export const renderableWatches = watches.filter(hasProcessedImage)
