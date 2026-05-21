'use client'

import { brand } from '@/lib/brand'
import EditorialHeader from './EditorialHeader'

type StrapId = 'leather-black' | 'suede-brown' | 'rubber' | 'nato' | 'sailcloth'

type StrapOption = {
  id: StrapId
  label: string
  material: string
  use: string
}

const STRAPS: StrapOption[] = [
  { id: 'leather-black', label: 'Black Leather', material: 'Calfskin', use: 'classic' },
  { id: 'suede-brown',   label: 'Brown Suede',   material: 'Suede',     use: 'casual' },
  { id: 'rubber',        label: 'Rubber Sport',  material: 'FKM rubber', use: 'diver' },
  { id: 'nato',          label: 'NATO',          material: 'Nylon',     use: 'military' },
  { id: 'sailcloth',     label: 'Sailcloth',     material: 'Technical weave', use: 'sport' },
]

const STRAP_TEXTURES: Record<StrapId, { base: string; overlay: string; overlaySize?: string; stitch: string }> = {
  'leather-black': {
    base: '#1A1410',
    overlay: 'radial-gradient(ellipse 70% 90% at 35% 30%, rgba(255,255,255,0.07) 0%, transparent 60%), repeating-linear-gradient(125deg, transparent 0 18px, rgba(0,0,0,0.22) 18px 19px), repeating-linear-gradient(40deg, transparent 0 22px, rgba(0,0,0,0.16) 22px 23px), linear-gradient(155deg, #2E2922 0%, #1A1410 70%)',
    stitch: '#7A5230',
  },
  'suede-brown': {
    base: '#7A5430',
    overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), linear-gradient(180deg, #9A7752 0%, #6F4926 100%)',
    stitch: '#E0C599',
  },
  rubber: {
    base: '#1C1C1C',
    overlay: 'radial-gradient(circle 1.5px at 3px 3px, rgba(255,255,255,0.10) 50%, transparent 51%), radial-gradient(circle 1.5px at 9px 9px, rgba(255,255,255,0.06) 50%, transparent 51%), linear-gradient(180deg, #2A2A2A 0%, #161616 100%)',
    overlaySize: '12px 12px, 12px 12px, auto',
    stitch: 'transparent',
  },
  nato: {
    base: '#44523B',
    overlay: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, #44523B 0 22px, #C9A84C 22px 26px, #44523B 26px 56px, #8A3838 56px 60px, #44523B 60px 82px)',
    stitch: 'transparent',
  },
  sailcloth: {
    base: '#1F2330',
    overlay: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.16) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px), linear-gradient(180deg, #2F3441 0%, #1B1F2B 100%)',
    stitch: '#8A8E96',
  },
}

type Props = {
  summary: string
  lugMode: number | null
}

export default function StrapEditorial({ summary, lugMode }: Props) {
  return (
    <section
      id="straps"
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '56px 56px 32px',
      }}
    >
      <EditorialHeader
        kicker="§ 04"
        title="Upgrade this strap."
        sub={summary}
      />
      <div
        className="discover-strap-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 14,
        }}
      >
        {STRAPS.map((s) => (
          <StrapCard key={s.id} strap={s} lugMode={lugMode} />
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: brand.font.serif,
          fontStyle: 'italic',
          fontSize: 12,
          color: brand.colors.muted,
          letterSpacing: '0.02em',
        }}
      >
        Compatibility filtered by your owned lug widths. Affiliate partners coming soon.
      </div>
    </section>
  )
}

function StrapCard({ strap, lugMode }: { strap: StrapOption; lugMode: number | null }) {
  const lugLabel = lugMode ? `${lugMode} mm` : '20 mm'
  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <StrapSwatch id={strap.id} />
      <div style={{ padding: '18px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: brand.font.serif,
              fontSize: 20,
              fontWeight: 400,
              color: brand.colors.ink,
              lineHeight: 1.1,
            }}
          >
            {strap.label}
          </div>
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              flexShrink: 0,
            }}
          >
            {lugLabel}
          </div>
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            marginBottom: 14,
            letterSpacing: '0.03em',
          }}
        >
          {strap.material} · {strap.use}
        </div>
        <button
          type="button"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            marginTop: 'auto',
          }}
        >
          Explore strap swap ↗
        </button>
      </div>
    </article>
  )
}

function StrapSwatch({ id }: { id: StrapId }) {
  const tex = STRAP_TEXTURES[id]
  return (
    <div
      style={{
        position: 'relative',
        height: 128,
        background: brand.colors.paperWarm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderBottom: `1px solid ${brand.colors.border}`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(168,152,128,0.05) 0 1px, transparent 1px 12px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '82%',
          height: 52,
          borderRadius: 7,
          background: tex.base,
          backgroundImage: tex.overlay,
          backgroundSize: tex.overlaySize ?? 'auto',
          boxShadow: '0 10px 18px rgba(26,20,16,0.22), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}
      >
        {tex.stitch !== 'transparent' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 10,
                right: 10,
                height: 1,
                borderTop: `1px dashed ${tex.stitch}`,
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 10,
                right: 10,
                height: 1,
                borderTop: `1px dashed ${tex.stitch}`,
                opacity: 0.55,
              }}
            />
          </>
        )}
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)',
                boxShadow: 'inset 0 0 1px rgba(255,255,255,0.1), 0 1px 0 rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
