'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { CatalogWatch, ResolvedWatch } from '@/types/watch'
import DialSVG from './DialSVG'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'

type WatchVisual = Pick<CatalogWatch | ResolvedWatch, 'id' | 'model' | 'imageUrl' | 'dialConfig'> & {
  // Resolved owned watches set `id = ownedWatch.id` (per-instance UUID) and
  // expose the catalog id as `watchId`. The watch_images lookup is keyed on
  // the catalog id, so prefer `watchId` when present. Raw CatalogWatch
  // callers (search results, hover cards) leave `watchId` undefined and
  // their `id` already is the catalog id, so the fallback is a no-op.
  watchId?: string
}

type Props = {
  watch: WatchVisual
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  imageStyle?: CSSProperties
  dialSize?: number
}

export default function WatchImageOrDial({
  watch,
  fill = false,
  width,
  height,
  sizes,
  imageStyle,
  dialSize = 88,
}: Props) {
  const { getImageUrl } = useWatchImages()
  const lookupId = watch.watchId ?? watch.id
  const effectiveImageUrl = getImageUrl(lookupId) ?? watch.imageUrl

  if (effectiveImageUrl) {
    return fill ? (
      <Image
        src={effectiveImageUrl}
        alt={watch.model}
        fill
        sizes={sizes}
        style={imageStyle}
      />
    ) : (
      <Image
        src={effectiveImageUrl}
        alt={watch.model}
        width={width ?? dialSize}
        height={height ?? dialSize}
        sizes={sizes}
        style={imageStyle}
      />
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      <DialSVG
        dialColor={watch.dialConfig.dialColor}
        markerColor={watch.dialConfig.markerColor}
        handColor={watch.dialConfig.handColor}
        size={dialSize}
      />
    </div>
  )
}
