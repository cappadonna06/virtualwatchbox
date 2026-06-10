'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { channelMetrics } from '@/lib/caseOnlyImages'
import type { BandHalf } from '@/lib/strapStudio'
import type { StudioController } from './useStudioController'

// The hero: a watch wearing the active strap.
//   • composite     — case-only render over worn band halves; each half's
//                      spring-bar row is anchored into the watch's lug channel
//                      and scaled so the strap end fills it snugly.
//   • side-by-side   — full watch centred, flat strap photo flanking both
//                      sides (watches without a case-only render).
export default function StudioComposite({ c, caseHeight }: { c: StudioController; caseHeight: number }) {
  const { caseOnly, renderMode } = c

  return renderMode === 'composite' && caseOnly
    ? <BandComposite c={c} caseHeight={caseHeight} />
    : <SideBySide c={c} maxWidth={Math.round(caseHeight * 1.3)} />
}

// ── Composite: worn band halves behind the case ──────────────────────────────
function BandComposite({ c, caseHeight }: { c: StudioController; caseHeight: number }) {
  const { caseOnly, currentStrap, isSwapping, reducedMotion, studioWatch } = c
  if (!caseOnly) return null
  const g = caseOnly.lugGeometry
  const { centerXRatio, widthRatio } = channelMetrics(g)

  const caseH = caseHeight
  const caseW = caseH * (g.imageWidth / g.imageHeight)
  const stageH = Math.round(caseH * 2.15)
  const stageW = Math.round(caseW * 1.2)
  const caseTop = (stageH - caseH) / 2
  const caseLeft = (stageW - caseW) / 2

  // Lug channel in stage px. The detected channel y sits at the lug tips; the
  // spring bar lives a touch inside, hence the small inset toward case centre.
  const chCenterX = caseLeft + centerXRatio * caseW
  const chW = widthRatio * caseW
  const inset = caseH * 0.04
  const topChY = caseTop + ((g.topLugLeft.y + g.topLugRight.y) / 2 / g.imageHeight) * caseH + inset
  const botChY = caseTop + ((g.bottomLugLeft.y + g.bottomLugRight.y) / 2 / g.imageHeight) * caseH - inset

  const bandRect = (half: BandHalf, anchorY: number) => {
    const s = chW / (half.bodyRight - half.bodyLeft)
    return {
      left: chCenterX - ((half.bodyLeft + half.bodyRight) / 2) * s,
      top: anchorY - half.pinY * s,
      width: half.w * s,
      height: half.h * s,
    }
  }

  const band = currentStrap?.band
  const topRect = band ? bandRect(band.top, topChY) : null
  const bottomRect = band ? bandRect(band.bottom, botChY) : null

  const fade = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, scale: 0.99 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.99 },
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
      }

  return (
    <div style={{ position: 'relative', width: stageW, height: stageH, flex: '0 0 auto' }}>
      {/* z1 — both band halves crossfade as one unit */}
      <AnimatePresence mode="popLayout" initial={false}>
        {band && (
          <motion.div key={currentStrap?.key ?? 'none'} {...fade} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={band.top.url} alt="" style={{ position: 'absolute', ...topRect!, display: 'block' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={band.bottom.url} alt="" style={{ position: 'absolute', ...bottomRect!, display: 'block' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* z2 — case-only render on top; lugs cover the band edges */}
      <motion.div
        animate={reducedMotion ? {} : { scale: isSwapping ? 1.012 : 1 }}
        transition={reducedMotion ? undefined : { type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          position: 'absolute',
          left: caseLeft,
          top: caseTop,
          width: caseW,
          height: caseH,
          zIndex: 2,
          filter: 'drop-shadow(0 14px 22px rgba(26,20,16,0.18))',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={caseOnly.caseOnlyUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </motion.div>

      <span style={srOnly}>
        {studioWatch ? `${studioWatch.brand} ${studioWatch.model}` : 'Watch'}
        {currentStrap ? ` on ${currentStrap.label}` : ''}
      </span>
    </div>
  )
}

// ── Side-by-side: flat strap photo flanking the full watch ───────────────────
function SideBySide({ c, maxWidth }: { c: StudioController; maxWidth: number }) {
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
          background: currentStrap?.imageUrl ? 'transparent' : currentStrap?.colorHex ?? brand.colors.paperWarm,
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
    <div style={{ position: 'relative', width: '100%', maxWidth, margin: '0 auto', aspectRatio: '1 / 1', flex: '0 1 auto' }}>
      {/* Luminance key: flat strap templates ship as white-bg photos (no alpha).
          Near-white → transparent; feComposite clips back to source alpha so the
          object-fit letterbox (genuinely transparent) doesn't turn black. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <filter id="studioStrapKey" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 2.55" result="keyed" />
          <feComponentTransfer in="keyed" result="hardened"><feFuncA type="linear" slope="3" intercept="-0.5" /></feComponentTransfer>
          <feComposite in="hardened" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>

      <Flank side="left" />
      <Flank side="right" />
      <div style={{ position: 'absolute', inset: '8% 0 8% 0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
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
              style={{ width: '70%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 14px 22px rgba(26,20,16,0.16))' }}
            />
          </AnimatePresence>
        ) : (
          <div style={{ color: brand.studio.textLow, font: `400 14px ${brand.font.sans}` }}>
            Image processing pending
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          textAlign: 'center',
          font: `italic 400 12px/1.4 ${brand.font.serif}`,
          color: brand.studio.textLow,
          pointerEvents: 'none',
        }}
      >
        Side-by-side preview — true composite coming soon for this watch
      </div>

      <span style={srOnly}>
        {studioWatch ? `${studioWatch.brand} ${studioWatch.model}` : 'Watch'}
        {currentStrap ? ` on ${currentStrap.label}` : ''}
      </span>
    </div>
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
