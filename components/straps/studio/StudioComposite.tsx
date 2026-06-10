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

// ── Side-by-side: the full watch photo beside the selected strap, both upright.
// Watches without a case-only render often ship on their factory strap in the
// catalog photo, so a literal pairing reads honestly — no fake compositing.
function SideBySide({ c, maxWidth }: { c: StudioController; maxWidth: number }) {
  const { currentStrap, studioWatch, reducedMotion } = c
  const watchSrc = studioWatch?.transparentUrl || studioWatch?.imageUrl
  const h = Math.round(maxWidth * 0.96)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: '0 1 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Math.round(maxWidth * 0.09), height: h }}>
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
              style={{ height: '100%', maxWidth: maxWidth * 0.78, objectFit: 'contain', filter: 'drop-shadow(0 14px 22px rgba(26,20,16,0.16))' }}
            />
          </AnimatePresence>
        ) : (
          <div style={{ color: brand.studio.textLow, font: `400 14px ${brand.font.sans}` }}>
            Image processing pending
          </div>
        )}

        <div
          style={{
            height: '88%',
            aspectRatio: '0.62',
            borderRadius: brand.radius.lg,
            overflow: 'hidden',
            background: brand.colors.white,
            border: `1px solid ${brand.studio.hairlineSoft}`,
            boxShadow: brand.shadow.sm,
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentStrap?.key ?? 'none'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0.15 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {currentStrap?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentStrap.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: currentStrap?.colorHex ?? brand.colors.paperWarm }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          font: `italic 400 12px/1.4 ${brand.font.serif}`,
          color: brand.studio.textLow,
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
