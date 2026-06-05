'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import { useStudioController, type StudioController } from './useStudioController'
import StudioComposite from './StudioComposite'
import StrapPickerTray from './StrapPickerTray'
import WatchPickerDropdown from './WatchPickerDropdown'
import StudioFooter from './StudioFooter'
import type { StudioStrap } from '@/lib/strapStudio'

export default function StrapStudio() {
  const c = useStudioController()
  const isMobile = useIsMobile()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: brand.studio.canvas,
        backgroundColor: brand.studio.void,
        color: brand.studio.textHi,
        position: 'relative',
        // Break out of the centered, max-width 1280 `.site-main` so the dark
        // canvas is genuinely full-bleed on every viewport.
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        overflowX: 'hidden',
        paddingBottom: isMobile ? '44vh' : 40,
      }}
    >
      <TopBar c={c} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '8px 16px 0' : '24px 32px 0' }}>
        <Stage c={c} isMobile={isMobile} />
        <TitleBlock c={c} isMobile={isMobile} />
        {isMobile && <div style={{ marginTop: 14 }}><StudioFooter c={c} /></div>}
      </main>

      {!isMobile && (
        <section style={{ maxWidth: 860, margin: '28px auto 0', padding: '0 32px' }}>
          <div
            style={{
              background: brand.studio.panel,
              border: `1px solid ${brand.studio.hairlineSoft}`,
              borderRadius: brand.radius.xl,
              padding: '18px 20px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <StrapPickerTray c={c} />
          </div>
          <div style={{ marginTop: 22 }}><StudioFooter c={c} /></div>
        </section>
      )}

      {isMobile && <StrapPickerTray c={c} />}
    </div>
  )
}

function TopBar({ c }: { c: StudioController }) {
  return (
    <header
      style={{
        height: 56,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: `1px solid ${brand.studio.hairlineSoft}`,
        position: 'sticky',
        top: 0,
        zIndex: brand.zIndex.nav,
        background: 'rgba(10,8,6,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Link
        href="/collection"
        style={{
          justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6,
          color: brand.studio.textMid, textDecoration: 'none', font: `500 13px ${brand.font.sans}`,
        }}
      >
        <span style={{ fontSize: 15 }}>←</span> Collection
      </Link>
      <div
        style={{
          justifySelf: 'center', font: `600 12px ${brand.font.sans}`,
          letterSpacing: '0.32em', textTransform: 'uppercase', color: brand.colors.gold,
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

function Stage({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 0 : 22,
        maxWidth: 820,
        margin: '0 auto',
        paddingTop: isMobile ? 8 : 24,
      }}
    >
      {!isMobile && <FlankPreview strap={c.flankPrev} onClick={() => c.prevStrap()} side="left" />}

      <div style={{ position: 'relative', flex: '0 1 520px', width: '100%' }}>
        <Arrow dir="prev" onClick={() => c.prevStrap()} />
        <StudioComposite c={c} maxWidth={isMobile ? 'min(82vw, 36vh)' : 520} />
        <Arrow dir="next" onClick={() => c.nextStrap()} />
      </div>

      {!isMobile && <FlankPreview strap={c.flankNext} onClick={() => c.nextStrap()} side="right" />}
    </div>
  )
}

function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous strap' : 'Next strap'}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      style={{
        position: 'absolute',
        top: '50%',
        [dir === 'prev' ? 'left' : 'right']: -6,
        transform: 'translateY(-50%)',
        zIndex: 4,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: `1px solid ${brand.studio.hairline}`,
        background: 'rgba(10,8,6,0.6)',
        color: brand.colors.gold,
        cursor: 'pointer',
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      } as React.CSSProperties}
    >
      {dir === 'prev' ? '◀' : '▶'}
    </motion.button>
  )
}

function FlankPreview({ strap, onClick, side }: { strap?: StudioStrap; onClick: () => void; side: 'left' | 'right' }) {
  if (!strap) return <div style={{ width: 80 }} />
  return (
    <button
      onClick={onClick}
      aria-label={`${side === 'left' ? 'Previous' : 'Next'} strap: ${strap.label}`}
      style={{
        flex: '0 0 auto', width: 80, height: 150, padding: 0, cursor: 'pointer',
        borderRadius: brand.radius.md, overflow: 'hidden', opacity: 0.5,
        border: `1px solid ${brand.studio.hairlineSoft}`, background: strap.colorHex ?? brand.colors.dark,
        transition: 'opacity 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.borderColor = brand.colors.gold }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.borderColor = brand.studio.hairlineSoft }}
    >
      {strap.imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={strap.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : null}
    </button>
  )
}

function TitleBlock({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const w = c.studioWatch
  return (
    <div style={{ textAlign: 'center', marginTop: isMobile ? 10 : 26 }}>
      {w?.brand && (
        <div style={{ font: `600 10px ${brand.font.sans}`, letterSpacing: '0.28em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: isMobile ? 4 : 8 }}>
          {w.brand}
        </div>
      )}
      <div style={{ font: `400 ${isMobile ? 21 : 28}px ${brand.font.serif}`, color: brand.studio.textHi, lineHeight: 1.12, padding: isMobile ? '0 16px' : 0 }}>
        {w ? `${w.brand} ${w.model}`.trim() : 'Select a watch'}
      </div>
      <div style={{ height: isMobile ? 22 : 26, marginTop: 4 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={c.currentStrap?.key ?? 'none'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ font: `italic 400 ${isMobile ? 15 : 18}px ${brand.font.serif}`, color: brand.studio.textMid }}
          >
            {c.currentStrap ? `on ${c.currentStrap.label}` : 'Choose a strap'}
          </motion.div>
        </AnimatePresence>
      </div>
      {!isMobile && w?.lugWidthMm != null && (
        <div style={{ font: `400 11px ${brand.font.sans}`, letterSpacing: '0.05em', color: brand.studio.textLow, marginTop: 6 }}>
          {w.lugWidthMm}mm compatible
        </div>
      )}
    </div>
  )
}
