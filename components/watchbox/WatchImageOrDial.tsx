'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { CatalogWatch, ResolvedWatch } from '@/types/watch'
import DialSVG from './DialSVG'
import { brand } from '@/lib/brand'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'

type WatchVisual = Pick<CatalogWatch | ResolvedWatch, 'id' | 'model' | 'imageUrl' | 'dialConfig'> & {
  // Resolved owned watches set `id = ownedWatch.id` (per-instance UUID) and
  // expose the catalog id as `watchId`. The watch_images lookup is keyed on
  // the catalog id, so prefer `watchId` when present. Raw CatalogWatch
  // callers (search results, hover cards) leave `watchId` undefined and
  // their `id` already is the catalog id, so the fallback is a no-op.
  watchId?: string
}

const PROCESSED_CUTOUT = /\/(?:watch-images\/(?:[^/]+\/primary|processed\/(?:webp\/)?[^/]+)|watch-assets\/processed\/(?:webp\/)?[^/]+)\.(?:webp|png)(?:[?#]|$)/i

type Props = {
  watch: WatchVisual
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  imageStyle?: CSSProperties
  dialSize?: number
  onCushion?: boolean
  /** Forward HTML `draggable` attr to the underlying <img>. Pass `false` to
   *  suppress iOS Safari's native image-drag/callout gesture so a custom
   *  long-press handler on a parent can fire instead. */
  draggable?: boolean
}

export default function WatchImageOrDial({
  watch,
  fill = false,
  width,
  height,
  sizes,
  imageStyle,
  dialSize = 88,
  onCushion = false,
  draggable,
}: Props) {
  const { getImageUrl } = useWatchImages()
  const lookupId = watch.watchId ?? watch.id
  const effectiveImageUrl = getImageUrl(lookupId) ?? watch.imageUrl

  if (effectiveImageUrl) {
    // Processed cutouts have 5% transparent padding on each end. Other
    // sources can be uncropped photos or dial-only images and need their full frame.
    if (fill && onCushion && PROCESSED_CUTOUT.test(effectiveImageUrl)) {
      return (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          maskImage: brand.watchbox.cushionMask,
        }}>
          <div style={{ position: 'absolute', inset: '-7.5% 6%', filter: brand.watchbox.contactShadow }}>
            <Image
              src={effectiveImageUrl}
              alt={watch.model}
              fill
              sizes={sizes}
              style={imageStyle}
              draggable={draggable}
            />
          </div>
        </div>
      )
    }

    return fill ? (
      <Image
        src={effectiveImageUrl}
        alt={watch.model}
        fill
        sizes={sizes}
        style={imageStyle}
        draggable={draggable}
      />
    ) : (
      <Image
        src={effectiveImageUrl}
        alt={watch.model}
        width={width ?? dialSize}
        height={height ?? dialSize}
        sizes={sizes}
        style={imageStyle}
        draggable={draggable}
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
