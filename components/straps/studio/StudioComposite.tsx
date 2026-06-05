'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { channelMetrics } from '@/lib/caseOnlyImages'
import type { StudioController } from './useStudioController'

// The hero: a watch wearing the active strap. Two render paths share one box so
// switching watches never reflows the layout.
//   • composite     — case-only render (z2) over a strap band (z1), positioned
//                      from the watch's lug geometry.
//   • side-by-side   — full watch centred, the strap flanking both sides.
export default function StudioComposite({ c, maxWidth = 520 }: { c: StudioController; maxWidth?: number | string }) {
  const { caseOnly, currentStrap, studioWatch, renderMode, reducedMotion } = c
  const glow = currentStrap ? brand.studio.glow[currentStrap.category] : brand.studio.glow.Other

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        margin: '0 auto',
        aspectRatio: '1 / 1',
      }}
    >
      {/* Luminance key: strap templates ship as white-bg photos (no alpha), so
          map near-white → transparent while keeping the strap (mid/dark tones)
          opaque. Lets the strap sit cleanly behind the case on the dark canvas. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="studioStrapKey" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 2.55" result="keyed" />
          {/* Harden the matte: drop the template's faint grey shadow vignette to
              zero while keeping the strap solid. */}
          <feComponentTransfer in="keyed" result="hardened"><feFuncA type="linear" slope="3" intercept="-0.5" /></feComponentTransfer>
          {/* Critical: the matrix derives alpha from RGB, so fully-transparent
              pixels (the object-fit letterbox) would become opaque black. Clip
              the result back to the source's own alpha so they stay transparent. */}
          <feComposite in="hardened" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>

      {/* Ambient material-tinted glow + soft contact shadow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-12% -12% -6% -12%',
          background: `radial-gradient(ellipse 58% 52% at 50% 46%, ${glow} 0%, transparent 70%)`,
          transition: reducedMotion ? 'none' : 'background 0.6s ease',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '24%',
          right: '24%',
          bottom: '8%',
          height: '8%',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.45)',
          filter: 'blur(22px)',
          pointerEvents: 'none',
        }}
      />

      {renderMode === 'composite' && caseOnly
        ? <CompositeLayers c={c} />
        : <SideBySideLayers c={c} />}

      {renderMode === 'side-by-side' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '-9%',
            textAlign: 'center',
            font: `italic 400 12px/1.4 ${brand.font.serif}`,
            color: brand.studio.textLow,
            letterSpacing: '0.01em',
            pointerEvents: 'none',
          }}
        >
          Side-by-side preview — true composite coming soon for this watch
        </div>
      )}

      {/* a11y: announce the look without affecting layout */}
      <span style={srOnly}>
        {studioWatch ? `${studioWatch.brand} ${studioWatch.model}` : 'Watch'}
        {currentStrap ? ` on ${currentStrap.label}` : ''}
      </span>
    </div>
  )
}

function CompositeLayers({ c }: { c: StudioController }) {
  const { caseOnly, currentStrap, isSwapping, reducedMotion, studioWatch } = c
  if (!caseOnly) return null
  const g = caseOnly.lugGeometry
  const { centerXRatio } = channelMetrics(g)

  // Render the case to ~96% of the box height; everything else is a % of that.
  const caseHPct = 96
  const caseWPct = caseHPct * (g.imageWidth / g.imageHeight)
  const caseLeftPct = (100 - caseWPct) / 2
  const caseTopPct = (100 - caseHPct) / 2

  // The strap template is a full "worn strap" (strap up both sides + a
  // watch-shaped white gap in the centre). Scale the WHOLE image to the case
  // footprint so the gap sits behind the case and the strap runs past the lugs;
  // a gentle lug-width factor widens/narrows it per watch. Centre on the lug
  // channel — the case can sit off-centre in its image because of the crown.
  const lugWidthMm = caseOnly.lugWidthMm ?? studioWatch?.lugWidthMm
  const lugFactor = lugWidthMm ? Math.min(1.14, Math.max(0.86, lugWidthMm / 20)) : 1
  const strapWidthPct = caseWPct * lugFactor
  const strapHeightPct = caseHPct * 1.5
  const strapCenterPct = caseLeftPct + centerXRatio * caseWPct
  const strapLeftPct = strapCenterPct - strapWidthPct / 2
  const strapTopPct = caseTopPct - (strapHeightPct - caseHPct) / 2

  const settle = reducedMotion
    ? {}
    : { scale: isSwapping ? 1.015 : 1 }

  return (
    <>
      {/* z1 — strap, behind the case (gap aligns with the watch) */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentStrap?.key ?? 'none'}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          transition={reducedMotion ? { duration: 0.15 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'absolute',
            top: `${strapTopPct}%`,
            height: `${strapHeightPct}%`,
            left: `${strapLeftPct}%`,
            width: `${strapWidthPct}%`,
            zIndex: 1,
            background: currentStrap?.imageUrl ? 'transparent' : currentStrap?.colorHex ?? brand.colors.dark,
          }}
        >
          {currentStrap?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentStrap.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'url(#studioStrapKey)' }}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* z2 — case-only render, on top */}
      <motion.div
        animate={settle}
        transition={reducedMotion ? undefined : { type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute',
          left: `${caseLeftPct}%`,
          top: `${caseTopPct}%`,
          width: `${caseWPct}%`,
          height: `${caseHPct}%`,
          zIndex: 2,
          filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.45))',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={caseOnly.caseOnlyUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </motion.div>
    </>
  )
}

function SideBySideLayers({ c }: { c: StudioController }) {
  const { currentStrap, studioWatch, reducedMotion } = c
  const watchSrc = studioWatch?.transparentUrl || studioWatch?.imageUrl
  const strapTransition = reducedMotion ? { duration: 0.15 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }

  const Flank = ({ side }: { side: 'left' | 'right' }) => (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={`${side}:${currentStrap?.key ?? 'none'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.96 }}
        exit={{ opacity: 0 }}
        transition={strapTransition}
        style={{
          position: 'absolute',
          top: '50%',
          [side]: '-6%',
          width: '42%',
          height: '26%',
          transform: `translateY(-50%) rotate(${side === 'left' ? 90 : -90}deg) scaleX(${side === 'left' ? 1 : -1})`,
          transformOrigin: 'center',
          borderRadius: brand.radius.sm,
          background: currentStrap?.imageUrl ? 'transparent' : currentStrap?.colorHex ?? brand.colors.dark,
          zIndex: 1,
        } as React.CSSProperties}
      >
        {currentStrap?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentStrap.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'url(#studioStrapKey)' }} />
        ) : null}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <>
      <Flank side="left" />
      <Flank side="right" />
      <div
        style={{
          position: 'absolute',
          inset: '8% 0 8% 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        {watchSrc ? (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={studioWatch?.catalogId ?? 'none'}
              src={watchSrc}
              alt=""
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={reducedMotion ? { duration: 0.15 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: '70%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.45))' }}
            />
          </AnimatePresence>
        ) : (
          <div style={{ color: brand.studio.textLow, font: `400 14px ${brand.font.sans}` }}>
            Image processing pending
          </div>
        )}
      </div>
    </>
  )
}

const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}
