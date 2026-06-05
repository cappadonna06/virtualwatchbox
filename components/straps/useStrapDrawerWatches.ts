'use client'

// components/straps/useStrapDrawerWatches.ts
// Single source for normalizing owned watches into the StrapDrawerWatch shape
// the compatibility engine needs — lugWidthMm from the resolved watch,
// braceletType from the catalog row, imageUrl with a catalog fallback.

import { useMemo } from 'react'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import type { CatalogWatch, ResolvedOwnedWatch, ResolvedWatch } from '@/types/watch'
import type { StrapDrawerWatch } from './atoms'

export function toStrapDrawerWatch(
  ow: ResolvedWatch | ResolvedOwnedWatch,
  cat?: CatalogWatch,
): StrapDrawerWatch {
  return {
    id: ow.id,
    watchId: ow.watchId,
    brand: ow.brand,
    model: ow.model,
    reference: ow.reference,
    caseSizeMm: ow.caseSizeMm,
    lugWidthMm: ow.lugWidthMm ?? cat?.lugWidthMm ?? null,
    braceletType: cat?.braceletType ?? null,
    imageUrl: ow.imageUrl ?? cat?.imageUrl ?? null,
  }
}

export function useStrapDrawerWatches(): StrapDrawerWatch[] {
  const { collectionWatches, getCatalogWatch } = useCollectionSession()
  return useMemo(
    () => collectionWatches.map(ow => toStrapDrawerWatch(ow, getCatalogWatch(ow.watchId))),
    [collectionWatches, getCatalogWatch],
  )
}
