'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { renderableWatches } from '@/lib/renderableWatches'
import { withVersion } from '@/lib/watchImages/cacheBust'
import { useIsMobile, usePrefersReducedMotion } from './useResponsiveState'

// Iconic "dream box" preview — faded, non-interactive sample watches that show
// the payoff of a filled box. Static design assets, never persisted or counted.
const SAMPLE_IDS = [
  'rolex-126334',
  'omega-310-30-42-50-01-001',
  'rolex-116500ln',
  'rolex-126710blro',
  'rolex-124270',
]

const PHANTOMS: Array<{ id: string; img: string }> = (() => {
  const byId = new Map(renderableWatches.map(w => [w.id, w]))
  const picked: typeof renderableWatches = []
  const seen = new Set<string>()
  for (const id of SAMPLE_IDS) {
    const w = byId.get(id)
    if (w && !seen.has(id)) { picked.push(w); seen.add(id) }
  }
  // Top up to 5 from the heat-ranked, image-having catalog if any id is missing.
  for (const w of renderableWatches) {
    if (picked.length >= 5) break
    if (!seen.has(w.id) && w.imageUrl) { picked.push(w); seen.add(w.id) }
  }
  return picked.slice(0, 5).map(w => ({ id: w.id, img: withVersion(w.imageUrl) ?? '' }))
})()

const BENEFITS = [
  { title: 'Synced everywhere', desc: 'Your box on desktop, tablet and phone — always current.', Icon: SyncIcon },
  { title: 'Share a public box', desc: "One link shows your collection exactly as you've arranged it.", Icon: ShareIcon },
  { title: 'Own your record', desc: 'Values, references and service history — kept privately, for you.', Icon: ShieldIcon },
]

export default function CollectionEmptyState() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [addHover, setAddHover] = useState(false)

  const handleAdd = () => router.push('/collection/add')
  const ringSize = isMobile ? 30 : 46
  const lift = addHover && !prefersReducedMotion

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.35fr) minmax(0, 1fr)',
        gap: isMobile ? 24 : 48,
        alignItems: 'stretch',
      }}
    >
      {/* Left — sample tray */}
      <div>
        <div
          style={{
            background: `linear-gradient(155deg, ${brand.colors.trayStart} 0%, ${brand.colors.trayEnd} 100%)`,
            borderRadius: isMobile ? 15 : 18,
            padding: isMobile ? 13 : 20,
            boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.25), 0 14px 36px rgba(26,20,16,0.16)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 9 : 14 }}>
            {/* Slot 1 — focal add affordance */}
            <button
              onClick={handleAdd}
              onMouseEnter={() => setAddHover(true)}
              onMouseLeave={() => setAddHover(false)}
              aria-label="Add your first watch"
              style={{
                position: 'relative',
                aspectRatio: '3 / 4',
                borderRadius: brand.radius.lg,
                background: brand.colors.white,
                border: `1.5px dashed ${addHover ? brand.colors.gold : brand.colors.goldDeep}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isMobile ? 8 : 12,
                padding: 8,
                cursor: 'pointer',
                boxShadow: lift ? '0 0 0 3px rgba(201,168,76,0.18), 0 10px 28px rgba(201,168,76,0.16)' : 'none',
                transform: lift ? 'translateY(-2px)' : 'none',
                transition: prefersReducedMotion ? 'none' : 'border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease',
              }}
            >
              <span
                style={{
                  width: ringSize,
                  height: ringSize,
                  borderRadius: '50%',
                  border: `1.5px solid ${brand.colors.goldDeep}`,
                  background: addHover ? brand.colors.goldDeep : 'transparent',
                  color: addHover ? brand.colors.white : brand.colors.goldDeep,
                  display: 'grid',
                  placeItems: 'center',
                  transition: prefersReducedMotion ? 'none' : 'background 0.16s ease, color 0.16s ease',
                }}
              >
                <PlusIcon size={isMobile ? 15 : 22} />
              </span>
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: isMobile ? brand.text.labelSm : brand.text.label,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: brand.colors.ink,
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {isMobile ? 'Add watch' : 'Add your first watch'}
              </span>
            </button>

            {/* Slots 2–6 — faded sample watches */}
            {PHANTOMS.map((p, i) => (
              <div
                key={p.id}
                aria-hidden="true"
                style={{
                  position: 'relative',
                  aspectRatio: '3 / 4',
                  borderRadius: brand.radius.lg,
                  background: brand.colors.slot,
                  border: `1px solid ${brand.colors.borderMid}`,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 10,
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: isMobile ? 6 : 9,
                    left: isMobile ? 8 : 11,
                    fontFamily: brand.font.sans,
                    fontSize: brand.text.labelSm,
                    fontWeight: 600,
                    color: brand.colors.faint,
                    opacity: 0.7,
                  }}
                >
                  0{i + 2}
                </span>
                {p.img ? (
                  <div style={{ position: 'relative', width: '84%', height: '80%' }}>
                    <Image
                      src={p.img}
                      alt=""
                      fill
                      sizes="140px"
                      style={{ objectFit: 'contain', filter: 'grayscale(1) brightness(1.08)', opacity: 0.16 }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <p
          style={{
            margin: '14px 0 0',
            fontFamily: brand.font.sans,
            fontSize: brand.text.bodySm,
            color: brand.colors.muted,
            lineHeight: 1.5,
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          The faded watches are a sample box — yours fills these slots as you add.
        </p>
      </div>

      {/* Right — welcome panel */}
      <div
        style={{
          background: brand.colors.white,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.xl,
          boxShadow: brand.shadow.lg,
          padding: isMobile ? '28px 22px' : '40px 38px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: isMobile ? brand.text.labelSm : brand.text.label,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.colors.goldDeep,
            marginBottom: 14,
          }}
        >
          Welcome
        </div>
        <h3
          style={{
            fontFamily: brand.font.serif,
            fontSize: isMobile ? 29 : 34,
            fontWeight: 400,
            lineHeight: 1.08,
            color: brand.colors.ink,
            margin: 0,
          }}
        >
          Start your <em style={{ fontStyle: 'italic' }}>collection.</em>
        </h3>
        <p
          style={{
            margin: '14px 0 0',
            fontFamily: brand.font.sans,
            fontSize: brand.text.body,
            lineHeight: 1.6,
            color: brand.colors.inkSoft,
            maxWidth: '42ch',
          }}
        >
          Add a watch to open the box. Everything you own, kept in one considered place — and ready wherever you are.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18, marginTop: 26 }}>
          {BENEFITS.map(({ title, desc, Icon }) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span
                style={{
                  flexShrink: 0,
                  width: isMobile ? 32 : 38,
                  height: isMobile ? 32 : 38,
                  borderRadius: 9,
                  background: brand.colors.paperWarm,
                  color: brand.colors.goldDeep,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: isMobile ? 13.5 : brand.text.body,
                    fontWeight: 600,
                    color: brand.colors.ink,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontFamily: brand.font.sans,
                    fontSize: isMobile ? brand.text.label : brand.text.bodySm,
                    color: brand.colors.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: brand.font.sans,
              fontSize: brand.text.label,
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '15px 30px',
              background: brand.colors.ink,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={14} />
            Add your first watch
          </button>
          <Link
            href="/playground"
            style={{
              textAlign: 'center',
              fontFamily: brand.font.sans,
              fontSize: brand.text.label,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: brand.colors.goldDeep,
              textDecoration: 'none',
            }}
          >
            Build a dream box first →
          </Link>
        </div>
      </div>
    </div>
  )
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SyncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <polyline points="21 4 21 8 17 8" />
      <polyline points="3 20 3 16 7 16" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.7" x2="15.4" y2="6.3" />
      <line x1="8.6" y1="13.3" x2="15.4" y2="17.7" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
    </svg>
  )
}
