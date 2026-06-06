'use client'

import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import type { UserStrap } from '@/types/watch'
import { compatibleStraps, effectiveCompatibility } from '@/lib/strapCompatibility'
import { findTemplatePhoto } from '@/lib/strapTemplates'
import { StrapPhotoFallback } from './StrapPhotoFallback'
import { strapTitle, type StrapDrawerWatch } from './atoms'

// Horizontal "Straps that fit" thumbnail strip, shown on a watch's surfaces.
// Renders nothing when the user owns no straps; the caller decides whether to
// show its own zero-strap CTA instead.
export function StrapsThatFit({
  watch,
  variant = 'sidebar',
}: {
  watch: StrapDrawerWatch
  variant?: 'sidebar' | 'detail'
}) {
  const router = useRouter()
  const { straps, strapOverrides } = useCollectionSession()
  if (straps.length === 0) return null

  const fits = compatibleStraps(watch, straps, strapOverrides)
  const excludedCount = straps.filter(s => effectiveCompatibility(s, watch, strapOverrides) === 'excluded').length
  const thumbW = variant === 'detail' ? 120 : 64
  const thumbH = variant === 'detail' ? 150 : 80

  const openStrap = (s: UserStrap) => router.push(`/collection/straps?strap=${s.id}`)

  return (
    <div id="straps-that-fit">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontFamily: brand.font.serif, fontSize: variant === 'detail' ? 22 : 16, fontWeight: 500, color: brand.colors.ink, margin: 0 }}>Straps that fit</h3>
        <span style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, color: brand.colors.goldDeep }}>{fits.length}</span>
      </div>

      {fits.length === 0 ? (
        <button
          onClick={() => router.push(`/collection/straps?addStrap=1&suggestLug=${watch.lugWidthMm ?? ''}`)}
          style={{
            fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, color: brand.colors.goldDeep,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left',
          }}
        >
          Add a {watch.lugWidthMm ?? '—'} mm strap →
        </button>
      ) : (
        <div className="sd-chiprow" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {fits.map(s => {
            const photo = s.photoUrl ?? findTemplatePhoto(s.material, s.subMaterial, s.color)
            return (
            <button key={s.id} onClick={() => openStrap(s)} style={{ flexShrink: 0, width: thumbW, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <div style={{ width: thumbW, height: thumbH, borderRadius: brand.radius.md, overflow: 'hidden', border: `1px solid ${brand.colors.borderMid}` }}>
                {photo
                  ? <div style={{ width: '100%', height: '100%', background: brand.colors.paperWarm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={photo} alt={strapTitle(s)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} /></div>
                  : <StrapPhotoFallback height={thumbH} />}
              </div>
              <div style={{ marginTop: 6, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.brand || `${s.color} ${s.material}`}
              </div>
            </button>
          )})}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>
          {fits.length} compatible · {excludedCount} excluded
        </span>
        <button
          onClick={() => router.push(`/collection/straps?watchId=${watch.id}`)}
          style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.goldDeep, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          View all in Strap Drawer →
        </button>
      </div>
    </div>
  )
}
