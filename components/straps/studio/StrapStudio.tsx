'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import type { StudioStrap } from '@/lib/strapStudio'
import { useStudioController, type StudioController } from './useStudioController'
import StudioComposite from './StudioComposite'
import StrapPickerTray from './StrapPickerTray'
import WatchPickerDropdown from './WatchPickerDropdown'

function useViewportWidth() {
  const [w, setW] = useState(1280)
  useEffect(() => {
    const sync = () => setW(window.innerWidth)
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  return w
}

export default function StrapStudio() {
  const c = useStudioController()
  const isMobile = useIsMobile()

  return (
    <div
      style={{
        background: brand.studio.canvas,
        backgroundColor: brand.studio.void,
        minHeight: '82vh',
        paddingBottom: isMobile ? '30vh' : 48,
      }}
    >
      <Masthead c={c} />
      <CompatibilityStrip c={c} isMobile={isMobile} />

      <main style={{ padding: isMobile ? '4px 12px 0' : '8px 24px 0' }}>
        <Stage c={c} isMobile={isMobile} />
        <InfoRow c={c} isMobile={isMobile} />
      </main>

      {!isMobile && (
        <section style={{ maxWidth: 860, margin: '26px auto 0', padding: '0 24px' }}>
          <div
            style={{
              background: brand.studio.panel,
              border: `1px solid ${brand.studio.hairlineSoft}`,
              borderRadius: brand.radius.xl,
              padding: '18px 20px',
              boxShadow: brand.shadow.sm,
            }}
          >
            <StrapPickerTray c={c} />
          </div>
        </section>
      )}

      {isMobile && <StrapPickerTray c={c} />}
    </div>
  )
}

function Masthead({ c }: { c: StudioController }) {
  return (
    <header
      style={{
        height: 58,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: `1px solid ${brand.studio.hairlineSoft}`,
      }}
    >
      <Link
        href="/collection"
        style={{
          justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6,
          color: brand.studio.textLow, textDecoration: 'none', font: `500 13px ${brand.font.sans}`,
        }}
      >
        <span style={{ fontSize: 15 }}>←</span> Collection
      </Link>
      <div
        style={{
          justifySelf: 'center', font: `600 12px ${brand.font.sans}`,
          letterSpacing: '0.32em', textTransform: 'uppercase', color: brand.colors.goldDeep,
        }}
      >
        Strap Studio
      </div>
      <div style={{ justifySelf: 'end' }}>
        <WatchPickerDropdown c={c} />
      </div>
    </header>
  )
}

function CompatibilityStrip({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const w = c.studioWatch
  if (!w?.lugWidthMm) return null
  const materials = isMobile ? '' : Array.from(new Set(c.sourceStraps.map(s => s.category.toLowerCase()))).join(', ')
  return (
    <div
      style={{
        textAlign: 'center',
        padding: isMobile ? '8px 12px' : '10px 16px',
        background: brand.studio.panel,
        borderBottom: `1px solid ${brand.studio.hairlineSoft}`,
        font: `400 ${isMobile ? 12 : 13}px ${brand.font.sans}`,
        color: brand.studio.textMid,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span style={{ color: brand.colors.goldDeep, marginRight: 8 }}>✓</span>
      All {w.lugWidthMm}mm straps fit your {w.brand} {w.model}{materials ? ` — ${materials}` : ''}
    </div>
  )
}

function Stage({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const vw = useViewportWidth()
  const ghostsPerSide = isMobile ? 0 : vw >= 1140 ? 2 : 1
  const ghostW = vw >= 1280 ? 130 : 108
  const caseHeight = isMobile ? 138 : 280

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 10 : 26,
        paddingTop: isMobile ? 10 : 18,
      }}
    >
      {ghostsPerSide >= 2 && <GhostStrap strap={c.ghostAt(-2)} width={ghostW} opacity={0.22} onClick={c.prevStrap} />}
      {ghostsPerSide >= 1 && <GhostStrap strap={c.ghostAt(-1)} width={ghostW} opacity={0.45} onClick={c.prevStrap} />}

      <Arrow dir="prev" onClick={c.prevStrap} />
      <StudioComposite c={c} caseHeight={caseHeight} />
      <Arrow dir="next" onClick={c.nextStrap} />

      {ghostsPerSide >= 1 && <GhostStrap strap={c.ghostAt(1)} width={ghostW} opacity={0.45} onClick={c.nextStrap} />}
      {ghostsPerSide >= 2 && <GhostStrap strap={c.ghostAt(2)} width={ghostW} opacity={0.22} onClick={c.nextStrap} />}
    </div>
  )
}

// In normal flow (flex-centered) — never absolutely positioned and never given a
// static transform, so Framer's whileTap scale can't displace it.
function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous strap' : 'Next strap'}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      style={{
        flex: '0 0 auto',
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: `1px solid ${brand.studio.hairline}`,
        background: brand.studio.panel,
        color: brand.studio.textHi,
        cursor: 'pointer',
        fontSize: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: brand.shadow.sm,
      }}
    >
      {dir === 'prev' ? '‹' : '›'}
    </motion.button>
  )
}

// Ghosted carousel neighbor. Band straps render their stacked worn halves
// (reads as one flat strap, clasp in the middle — like the Delugs finder);
// flat template straps render their product photo on a white card.
function GhostStrap({ strap, width, opacity, onClick }: { strap?: StudioStrap; width: number; opacity: number; onClick: () => void }) {
  if (!strap) return <div style={{ width, flex: '0 0 auto' }} />
  return (
    <button
      onClick={onClick}
      aria-label={`Show ${strap.label}`}
      title={strap.label}
      style={{
        flex: '0 0 auto', width, padding: 0, border: 'none', background: 'transparent',
        cursor: 'pointer', opacity, transition: 'opacity 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = String(opacity) }}
    >
      {strap.band ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={strap.band.top.url} alt="" style={{ width: '100%', display: 'block' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={strap.band.bottom.url} alt="" style={{ width: '100%', display: 'block', marginTop: `-${Math.round(width * 0.04)}px` }} />
        </div>
      ) : (
        <div
          style={{
            width: '100%', aspectRatio: '520 / 980', borderRadius: brand.radius.md, overflow: 'hidden',
            background: brand.studio.panel, border: `1px solid ${brand.studio.hairlineSoft}`,
          }}
        >
          {strap.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={strap.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : null}
        </div>
      )}
    </button>
  )
}

function InfoRow({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const s = c.currentStrap
  const n = c.categoryStraps.length
  const showFollow = c.studioWatch ? !c.studioWatch.isOwned : false

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: isMobile ? 12 : 20,
        marginTop: isMobile ? 14 : 22,
        padding: '0 12px',
      }}
    >
      {n > 0 && c.strapIndex >= 0 && (
        <span style={{ font: `400 13px ${brand.font.sans}`, color: brand.studio.textLow, flex: '0 0 auto' }}>
          {c.strapIndex + 1} / {n}
        </span>
      )}
      <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
        <div style={{ font: `700 ${isMobile ? 17 : 19}px ${brand.font.sans}`, color: brand.studio.textHi }}>
          {s?.label ?? 'Choose a strap'}
        </div>
        <div style={{ font: `400 12px ${brand.font.sans}`, color: brand.studio.textLow, marginTop: 2 }}>
          {s?.sublabel}
          {c.studioWatch?.lugWidthMm ? `${s?.sublabel ? ' · ' : ''}fits ${c.studioWatch.lugWidthMm}mm lugs` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <CtaButton label="Share look" onClick={() => void c.shareLook()} />
        {c.buyUrl && <CtaButton label="Buy Strap →" href={c.buyUrl} primary />}
        {showFollow && (
          <CtaButton
            label={c.followed ? 'Followed ♥' : 'Add to followed ♡'}
            active={c.followed}
            onClick={c.toggleFollow}
          />
        )}
      </div>
    </div>
  )
}

function CtaButton({ label, href, onClick, primary, active }: { label: string; href?: string; onClick?: () => void; primary?: boolean; active?: boolean }) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    height: 42,
    padding: '0 20px',
    borderRadius: brand.radius.lg,
    border: `1px solid ${primary ? brand.colors.ink : active ? brand.colors.goldLine : brand.studio.hairline}`,
    background: primary ? brand.colors.ink : active ? brand.colors.goldWash : brand.studio.panel,
    color: primary ? brand.colors.slot : active ? brand.colors.goldDeep : brand.studio.textHi,
    font: `600 13px ${brand.font.sans}`,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    textDecoration: 'none',
  }
  const motionProps = { whileTap: { scale: 0.97 }, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } }
  if (href) {
    return <motion.a {...motionProps} href={href} target="_blank" rel="noopener noreferrer" style={style}>{label}</motion.a>
  }
  return <motion.button {...motionProps} onClick={onClick} style={style}>{label}</motion.button>
}
