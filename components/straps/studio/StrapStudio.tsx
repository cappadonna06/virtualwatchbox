'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import { Kicker, SpecBadge } from '@/components/straps/atoms'
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
        paddingBottom: isMobile ? '30vh' : 20,
      }}
    >
      <Masthead c={c} isMobile={isMobile} />

      <main style={{ padding: isMobile ? '4px 12px 0' : '4px 24px 0' }}>
        <Stage c={c} isMobile={isMobile} />
        <CycleDots c={c} />
        <CaptionBlock c={c} isMobile={isMobile} />
      </main>

      {!isMobile && (
        <section style={{ maxWidth: 860, margin: '12px auto 0', padding: '0 24px' }}>
          <div
            style={{
              background: brand.studio.panel,
              border: `1px solid ${brand.studio.hairlineSoft}`,
              borderRadius: brand.radius.xl,
              padding: '14px 16px',
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

function Masthead({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  return (
    <header
      style={{
        height: 52,
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
        <span style={{ fontSize: 15 }}>←</span> {isMobile ? '' : 'Collection'}
      </Link>
      <div
        style={{
          justifySelf: 'center', font: `600 ${isMobile ? 10.5 : 12}px ${brand.font.sans}`,
          letterSpacing: isMobile ? '0.18em' : '0.32em', textTransform: 'uppercase', color: brand.colors.goldDeep,
          whiteSpace: 'nowrap',
        }}
      >
        Strap Studio
      </div>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>
        {c.buyUrl && <CaptionCta label={isMobile ? 'Buy ↗' : 'Buy This Strap ↗'} href={c.buyUrl} primary compact />}
        <CaptionCta label={isMobile ? 'Share ↗' : 'Share This Look ↗'} onClick={() => void c.shareLook()} compact />
        <WatchPickerDropdown c={c} />
      </div>
    </header>
  )
}

// Cycle indicators tied to the carousel: clickable dots for small sets, a tiny
// counter for the big side-by-side catalog.
function CycleDots({ c }: { c: StudioController }) {
  const n = c.categoryStraps.length
  if (n < 2 || c.strapIndex < 0) return <div style={{ height: 18 }} />
  return (
    <div style={{ height: 18, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {n <= 8 ? (
        c.categoryStraps.map((s, i) => {
          const active = i === c.strapIndex
          return (
            <button
              key={s.key}
              onClick={() => c.selectStrap(s.id)}
              aria-label={`Show ${s.label}`}
              title={s.label}
              style={{
                width: active ? 7 : 6,
                height: active ? 7 : 6,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: active ? brand.colors.gold : brand.colors.borderLight,
                transition: 'background 0.2s ease, width 0.2s ease, height 0.2s ease',
              }}
            />
          )
        })
      ) : (
        <Kicker color={brand.studio.textLow} size={10} style={{ letterSpacing: '0.18em' }}>
          {c.strapIndex + 1} / {n}
        </Kicker>
      )}
    </div>
  )
}

// Editorial caption beneath the composite — three lines, nothing more: gold
// brand kicker, serif watch identity with the lug-width chip, italic strap
// caption. Counter lives in the CycleDots; share/buy live in the masthead.
function CaptionBlock({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const w = c.studioWatch
  const s = c.currentStrap

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        marginTop: isMobile ? 4 : 8,
        padding: '0 12px',
      }}
    >
      {w?.brand && (
        <Kicker color={brand.colors.goldDeep} size={10} style={{ letterSpacing: '0.28em', marginBottom: isMobile ? 3 : 6 }}>
          {w.brand}
        </Kicker>
      )}
      <h1
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: brand.font.serif,
          fontSize: isMobile ? 21 : 26,
          fontWeight: 400,
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          color: brand.studio.textHi,
          margin: 0,
        }}
      >
        {w ? (w.model || w.brand) : 'Select a watch'}
        {w?.lugWidthMm != null && <SpecBadge tone="width">{w.lugWidthMm} mm</SpecBadge>}
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
    </div>
  )
}

// Our button grammar: square corners, letterspaced DM Sans; the primary action
// is ink with gold type (the Strap Drawer's studio-CTA treatment).
function CaptionCta({ label, href, onClick, primary, compact }: { label: string; href?: string; onClick?: () => void; primary?: boolean; compact?: boolean }) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: brand.font.sans,
    fontSize: compact ? 11.5 : 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    padding: compact ? '7px 12px' : '9px 18px',
    background: primary ? brand.colors.ink : 'transparent',
    color: primary ? brand.colors.gold : brand.colors.ink,
    border: primary ? `1px solid ${brand.colors.ink}` : `1px solid ${brand.colors.borderLight}`,
    borderRadius: brand.radius.btn,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
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
  const caseHeight = isMobile ? 130 : 230

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 10 : 26,
        paddingTop: isMobile ? 8 : 6,
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

