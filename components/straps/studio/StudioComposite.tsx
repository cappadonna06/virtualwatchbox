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
export default function StudioComposite({ c, rowHeight }: { c: StudioController; rowHeight: number }) {
  const { caseOnly, renderMode } = c

  // Both modes size off the fixed stage row so the watch centre never shifts
  // between composite and side-by-side watches.
  return renderMode === 'composite' && caseOnly
    ? <BandComposite c={c} rowHeight={rowHeight} />
    : <SideBySide c={c} blockHeight={Math.round(rowHeight * 0.8)} />
}

// ── Composite: worn band halves behind the case ──────────────────────────────
function BandComposite({ c, rowHeight }: { c: StudioController; rowHeight: number }) {
  const { caseOnly, currentStrap, isSwapping, reducedMotion, studioWatch } = c
  if (!caseOnly) return null
  const g = caseOnly.lugGeometry
  const { centerXRatio, widthRatio } = channelMetrics(g)

  const caseH = Math.floor(rowHeight / 2.05)
  const caseW = caseH * (g.imageWidth / g.imageHeight)
  const stageH = rowHeight
  const stageW = Math.round(caseW * 1.2)
  const caseTop = (stageH - caseH) / 2
  const caseLeft = (stageW - caseW) / 2

  // Lug channel in stage px. lug_geometry y values are the channel OUTER TIP
  // rows; the spring bar sits a touch inside, hence the tuck insets toward
  // case centre. The insets are ASYMMETRIC because the band images are: the
  // top half has ~40px of strap texture below its pins (fills the transparent
  // top channel seamlessly), but the bottom half's tuck edge sits ~35px above
  // its pins with lining above it — a deeper bottom inset pulls the whole
  // tuck across the channel window so no lining/stitched edge peeks through.
  const chCenterX = caseLeft + centerXRatio * caseW
  const chW = widthRatio * caseW
  const topChY = caseTop + ((g.topLugLeft.y + g.topLugRight.y) / 2 / g.imageHeight) * caseH + caseH * 0.04
  const botChY = caseTop + ((g.bottomLugLeft.y + g.bottomLugRight.y) / 2 / g.imageHeight) * caseH - caseH * 0.075

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

  // "Fit-in" swap: the halves slide INTO the lugs (top half drops down, bottom
  // half rises up) with a spring, like snapping onto the spring bars; the
  // outgoing strap just fades fast so it never fights the incoming one.
  const halfMotion = (dir: 1 | -1) => reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: dir * -14 },
        animate: { opacity: 1, y: 0 },
        transition: { type: 'spring' as const, stiffness: 380, damping: 26 },
      }

  return (
    <div style={{ position: 'relative', width: stageW, height: stageH, flex: '0 0 auto' }}>
      {/* z1 — band halves; each slides into its lug channel on swap */}
      <AnimatePresence mode="popLayout" initial={false}>
        {band && (
          <motion.div
            key={currentStrap?.key ?? 'none'}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          >
            <motion.img
              {...halfMotion(1)}
              src={band.top.url}
              alt=""
              style={{ position: 'absolute', ...topRect!, display: 'block' }}
            />
            <motion.img
              {...halfMotion(-1)}
              src={band.bottom.url}
              alt=""
              style={{ position: 'absolute', ...bottomRect!, display: 'block' }}
            />
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
function SideBySide({ c, blockHeight }: { c: StudioController; blockHeight: number }) {
  const { currentStrap, studioWatch, reducedMotion } = c
  const watchSrc = studioWatch?.transparentUrl || studioWatch?.imageUrl
  const h = blockHeight
  const maxWidth = Math.round(h * 1.04)

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
