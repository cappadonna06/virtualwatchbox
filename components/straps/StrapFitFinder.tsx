'use client'

import { brand } from '@/lib/brand'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import { compatibleStraps } from '@/lib/strapCompatibility'
import { Kicker, StrapIcon, type StrapDrawerWatch } from './atoms'

function WatchTile({ watch, count, active, isAll, onClick }: { watch?: StrapDrawerWatch; count: number; active: boolean; isAll?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, width: 168, textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
      <div style={{
        height: 150, borderRadius: brand.radius.xl, position: 'relative',
        background: active ? `radial-gradient(ellipse 120% 90% at 50% 30%, #FFFEFB 0%, ${brand.colors.paper} 100%)` : brand.colors.paperWarm,
        border: active ? `1.5px solid ${brand.colors.gold}` : `1px solid ${brand.colors.borderMid}`,
        boxShadow: active ? '0 0 0 1px rgba(201,168,76,0.35)' : 'none',
        transition: 'border-color 0.16s, box-shadow 0.16s, background 0.16s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {isAll
          ? (
            <div style={{ display: 'flex', gap: 7 }}>
              {['#1A1410', '#8A4B24', '#44523B', '#2A3550'].map((c, i) => (
                <div key={i} style={{ width: 14, height: 72, borderRadius: 5, background: c, boxShadow: '0 6px 12px rgba(26,20,16,0.2), inset 0 1px 0 rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          )
          : watch?.imageUrl
            ? <img src={watch.imageUrl} alt={watch.model} style={{ height: '94%', maxWidth: '90%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.2))' }} />
            : <span style={{ fontFamily: brand.font.serif, fontSize: 56, color: brand.colors.borderLight }}>{(watch?.brand || '?').charAt(0)}</span>}
        {active && (
          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: brand.colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand.colors.ink, boxShadow: '0 2px 6px rgba(26,20,16,0.25)' }}>
            <StrapIcon name="check" size={12} sw={2.4} />
          </div>
        )}
      </div>
      <div style={{ padding: '11px 2px 0' }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.13em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isAll ? 'Everything' : watch?.brand}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 17, color: active ? brand.colors.ink : brand.colors.inkSoft, lineHeight: 1.1, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isAll ? 'All straps' : watch?.model}
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, color: count > 0 ? brand.colors.mutedDark : brand.colors.muted }}>
          <span style={{ color: count > 0 ? brand.colors.goldDeep : brand.colors.muted, fontWeight: 600 }}>{count}</span>
          {isAll ? ' in drawer' : (count === 1 ? ' strap fits' : ' straps fit')}
        </div>
      </div>
    </button>
  )
}

export function WatchFocusBar({
  watches,
  straps,
  overrides,
  focusId,
  setFocus,
}: {
  watches: StrapDrawerWatch[]
  straps: UserStrap[]
  overrides: StrapWatchOverride[]
  focusId: string | null
  setFocus: (id: string | null) => void
}) {
  return (
    <section style={{ paddingTop: 4, paddingBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <Kicker color={brand.colors.goldDeep}>Fit Finder</Kicker>
        <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 15, color: brand.colors.muted }}>
          {focusId ? 'Showing straps for one watch' : 'Pick a watch to see only what fits it'}
        </span>
      </div>
      <div className="sd-focus-rail" style={{ display: 'flex', gap: 16, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6 }}>
        <WatchTile isAll count={straps.length} active={!focusId} onClick={() => setFocus(null)} />
        <div style={{ width: 1, flexShrink: 0, background: brand.colors.border, margin: '6px 4px' }} />
        {watches.map(w => (
          <WatchTile
            key={w.id}
            watch={w}
            count={compatibleStraps(w, straps, overrides).length}
            active={focusId === w.id}
            onClick={() => setFocus(focusId === w.id ? null : w.id)}
          />
        ))}
      </div>
    </section>
  )
}

export function FocusBanner({ watch, count, onClear }: { watch: StrapDrawerWatch; count: number; onClear: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', background: brand.colors.ink, borderRadius: brand.radius.lg, padding: '13px 18px', marginBottom: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: 9, background: 'rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {watch.imageUrl
          ? <img src={watch.imageUrl} alt={watch.model} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
          : <span style={{ fontFamily: brand.font.serif, fontSize: 24, color: 'rgba(250,248,244,0.6)' }}>{watch.brand.charAt(0)}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 3 }}>
          {watch.braceletType === 'integrated' ? 'Integrated bracelet' : `${watch.lugWidthMm} mm lugs`}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 18, color: brand.colors.slot, lineHeight: 1.1 }}>
          {count > 0
            ? <>{count} strap{count === 1 ? '' : 's'} fit your <em style={{ fontStyle: 'italic' }}>{watch.model}</em></>
            : <>Nothing fits your <em style={{ fontStyle: 'italic' }}>{watch.model}</em> yet</>}
        </div>
      </div>
      <button onClick={onClear} style={{
        fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: brand.colors.slot, background: 'transparent', border: '1px solid rgba(250,248,244,0.3)', borderRadius: brand.radius.btn,
        padding: '8px 14px', cursor: 'pointer', flexShrink: 0,
      }}>Clear</button>
    </div>
  )
}
