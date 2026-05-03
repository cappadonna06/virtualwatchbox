import type { CatalogWatch } from '@/types/watch'
import { watches } from './watches'

export function hasProcessedImage(watch: Pick<CatalogWatch, 'imageUrl'>) {
  return Boolean(watch.imageUrl?.startsWith('/watch-assets/processed/'))
}

export const renderableWatches = watches.filter(hasProcessedImage)
