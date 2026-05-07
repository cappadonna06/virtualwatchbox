'use client'

import { useRouter } from 'next/navigation'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function buildAddDetailHref(
  watchId: string,
  options: { duplicate?: boolean; dest?: string | null; boxId?: string | null } = {},
) {
  const params = new URLSearchParams()
  if (options.duplicate) params.set('duplicate', 'true')
  if (options.dest) params.set('dest', options.dest)
  if (options.boxId) params.set('boxId', options.boxId)
  const query = params.toString()
  return `/collection/add/${watchId}${query ? `?${query}` : ''}`
}

type Props = {
  watch: CatalogWatch
  dest?: string | null
  boxId?: string | null
}

export default function AddSearchWatchCard({ watch, dest = null, boxId = null }: Props) {
  const router = useRouter()
  const { isInCollection } = useCollectionSession()
  const { getImageUrl } = useWatchImages()
  const inCollection = isInCollection(watch.id)
  const watchHasImage = !!(getImageUrl(watch.id) || watch.imageUrl)

  return (
    <div
      onClick={() => router.push(buildAddDetailHref(watch.id, { dest, boxId }))}
      onMouseEnter={e => { e.currentTarget.style.borderColor = brand.colors.goldLine }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = brand.colors.border }}
      style={{
        position: 'relative',
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <WatchStateControl
        catalogWatchId={watch.id}
        source="add_flow"
        size="sm"
        placement="top-right"
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          background: brand.colors.bg,
          borderBottom: `1px solid ${brand.colors.border}`,
        }}
      >
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          dialSize={140}
          imageStyle={{ objectFit: 'contain', padding: 14 }}
        />
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
          {watch.brand}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 20, fontWeight: 400, lineHeight: 1.1, color: brand.colors.ink }}>
          {watch.model}
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Ref. {watch.reference}
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginTop: 2 }}>
          {watch.caseSizeMm}mm · {watch.caseMaterial} · {watch.dialColor}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: brand.font.sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink }}>
            {fmt(watch.estimatedValue)}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!watchHasImage && (
              <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 7px', borderRadius: brand.radius.pill, border: `1px solid ${brand.colors.border}`, color: brand.colors.muted, fontStyle: 'italic' }}>
                no photo
              </span>
            )}
            {inCollection ? (
              <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 8px', borderRadius: brand.radius.pill, background: '#E8F4E8', color: '#2D6A2D' }}>
                In Collection
              </span>
            ) : (
              <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 8px', borderRadius: brand.radius.pill, background: brand.colors.ink, color: brand.colors.bg }}>
                {watch.watchType}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
