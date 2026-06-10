'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import { Kicker } from '@/components/straps/atoms'
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

      <main style={{ padding: isMobile ? '4px 12px 0' : '8px 24px 0' }}>
        <Stage c={c} isMobile={isMobile} />
        <CaptionBlock c={c} isMobile={isMobile} />
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

// Editorial caption beneath the composite — the Studio's voice. Gold brand
// kicker, serif watch identity, italic strap caption, a short gold hairline,
// then one quiet meta line absorbing the counter / fit / materials.
function CaptionBlock({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const w = c.studioWatch
  const s = c.currentStrap
  const n = c.categoryStraps.length

  const cats = Array.from(new Set(c.sourceStraps.map(x => x.category)))
  const materials = cats.length > 1
    ? `${cats.slice(0, -1).join(', ')} & ${cats[cats.length - 1]}`
    : cats[0] ?? ''
  const meta = [
    n > 0 && c.strapIndex >= 0 ? `${c.strapIndex + 1} of ${n}` : null,
    w?.lugWidthMm ? `Fits ${w.lugWidthMm}mm lugs` : null,
    isMobile ? null : materials || null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginTop: isMobile ? 8 : 24,
        padding: '0 12px',
      }}
    >
      {w?.brand && (
        <Kicker color={brand.colors.goldDeep} size={10} style={{ letterSpacing: '0.28em', marginBottom: isMobile ? 4 : 8 }}>
          {w.brand}
        </Kicker>
      )}
      <h1
        style={{
          fontFamily: brand.font.serif,
          fontSize: isMobile ? 21 : 27,
          fontWeight: 400,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          color: brand.studio.textHi,
          margin: 0,
        }}
      >
        {w ? (w.model || w.brand) : 'Select a watch'}
      </h1>
      <div style={{ height: isMobile ? 22 : 26, marginTop: 2 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={s?.key ?? 'none'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ font: `italic 400 ${isMobile ? 15 : 18}px ${brand.font.serif}`, color: brand.studio.textMid }}
          >
            {s ? `on ${s.label}` : 'Choose a strap'}
          </motion.div>
        </AnimatePresence>
      </div>

      <div aria-hidden style={{ width: 36, height: 1, background: brand.colors.goldLine, margin: isMobile ? '6px 0' : '12px 0' }} />

      {meta && (
        <Kicker color={brand.studio.textLow} size={10} style={{ letterSpacing: '0.22em' }}>
          {meta}
        </Kicker>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: isMobile ? 10 : 16 }}>
        <CaptionCta label="Share This Look ↗" onClick={() => void c.shareLook()} />
        {c.buyUrl && <CaptionCta label="Buy This Strap ↗" href={c.buyUrl} primary />}
      </div>
    </div>
  )
}

// Our button grammar: square corners, letterspaced DM Sans; the primary action
// is ink with gold type (the Strap Drawer's studio-CTA treatment).
function CaptionCta({ label, href, onClick, primary }: { label: string; href?: string; onClick?: () => void; primary?: boolean }) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: brand.font.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    padding: '9px 18px',
    background: primary ? brand.colors.ink : 'transparent',
    color: primary ? brand.colors.gold : brand.colors.ink,
    border: primary ? `1px solid ${brand.colors.ink}` : `1px solid ${brand.colors.borderLight}`,
    borderRadius: brand.radius.btn,
    cursor: 'pointer',
    textDecoration: 'none',
  }
  const motionProps = { whileTap: { scale: 0.97 }, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } }
  if (href) {
    return <motion.a {...motionProps} href={href} target="_blank" rel="noopener noreferrer" style={style}>{label}</motion.a>
  }
  return <motion.button {...motionProps} onClick={onClick} style={style}>{label}</motion.button>
}

function Stage({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const vw = useViewportWidth()
  const ghostsPerSide = isMobile ? 0 : vw >= 1140 ? 2 : 1
  const ghostW = vw >= 1280 ? 130 : 108
  const caseHeight = isMobile ? 130 : 280

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

// Ghosted carousel neighbor — the full-strap product photo (the worn halves
// render only in the composite centerpiece).
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
      <div
        style={{
          width: '100%', aspectRatio: '1000 / 1200', borderRadius: brand.radius.md, overflow: 'hidden',
          background: brand.studio.panel, border: `1px solid ${brand.studio.hairlineSoft}`,
        }}
      >
        {strap.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={strap.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
      </div>
    </button>
  )
}

