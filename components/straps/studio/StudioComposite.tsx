'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { strapBandPlacement, strapCaseFrame, type CaseOnlyEntry } from '@/lib/caseOnlyImages'
import type { StudioStrap } from '@/lib/strapStudio'
import type { StudioController, StudioWatch } from './useStudioController'

// The hero: a watch wearing the active strap.
//   • composite     — case-only render over worn band halves; each half's
//                      spring-bar row is anchored into the watch's lug channel
//                      and scaled so the strap end fills it snugly.
//   • side-by-side   — full watch centred, flat strap photo flanking both
//                      sides (watches without a case-only render).
export default function StudioComposite({ c, rowHeight }: { c: StudioController; rowHeight: number }) {
  const { caseOnly, renderMode, currentStrap, studioWatch } = c

  // Both modes size off the fixed stage row so the watch centre never shifts
  // between composite and side-by-side watches.
  return renderMode === 'composite' && caseOnly
    ? <MountedWatchPreview
        caseOnly={caseOnly}
        strap={currentStrap}
        rowHeight={rowHeight}
        watchLabel={studioWatch ? `${studioWatch.brand} ${studioWatch.model}` : 'Watch'}
        reducedMotion={c.reducedMotion}
        isSwapping={c.isSwapping}
        onCaseError={c.setFailedCaseUrl}
      />
    : <SideBySideWatchPreview
        watch={studioWatch}
        strap={currentStrap}
        reducedMotion={c.reducedMotion}
        blockHeight={Math.round(rowHeight * 0.88)}
      />
}

// ── Composite: worn band halves behind the case ──────────────────────────────
export function MountedWatchPreview({
  caseOnly, strap, rowHeight, watchLabel, reducedMotion, isSwapping, onCaseError, loading,
}: {
  caseOnly: CaseOnlyEntry
  strap?: StudioStrap
  rowHeight: number
  watchLabel: string
  reducedMotion: boolean
  isSwapping?: boolean
  onCaseError: (url: string) => void
  loading?: 'lazy'
}) {
  const caseImage = useRef<HTMLImageElement>(null)
  const caseUrl = caseOnly.caseOnlyUrl
  useEffect(() => {
    const image = caseImage.current
    if (image?.complete && !image.naturalWidth) onCaseError(caseUrl)
  }, [caseUrl, onCaseError])
  const g = caseOnly.lugGeometry

  const stageH = rowHeight
  const { stageWidth: stageW, frame } = strapCaseFrame(g, stageH)
  const band = strap?.band
  const topRect = band ? strapBandPlacement(g, band.top, 'top', frame) : null
  const bottomRect = band ? strapBandPlacement(g, band.bottom, 'bottom', frame) : null

  // "Fit-in" swap: the halves slide INTO the lugs (top half drops down, bottom
  // half rises up) with a spring, like snapping onto the spring bars; the
  // outgoing strap just fades fast so it never fights the incoming one.
  const halfMotion = (dir: 1 | -1) => reducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, transition: { duration: 0 } }
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
            key={strap.key}
            exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.14 } }}
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
          >
            <motion.img
              {...halfMotion(1)}
              src={band.top.url}
              alt=""
              loading={loading}
              style={{ position: 'absolute', ...topRect!, display: 'block' }}
            />
            <motion.img
              {...halfMotion(-1)}
              src={band.bottom.url}
              alt=""
              loading={loading}
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
          ...frame,
          zIndex: 2,
          filter: 'drop-shadow(0 14px 22px rgba(26,20,16,0.18))',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={caseImage} src={caseUrl} onError={() => onCaseError(caseUrl)} alt="" loading={loading} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </motion.div>

      <span style={srOnly}>
        {watchLabel}
        {strap ? ` on ${strap.label}` : ''}
      </span>
    </div>
  )
}

export function WornStrapPreview({ caseOnly, band, rowHeight, opacity }: {
  caseOnly: CaseOnlyEntry
  band: NonNullable<StudioStrap['band']>
  rowHeight: number
  opacity?: number
}) {
  const geometry = caseOnly.lugGeometry
  const { frame } = strapCaseFrame(geometry, rowHeight)
  const top = strapBandPlacement(geometry, band.top, 'top', frame)
  const bottom = strapBandPlacement(geometry, band.bottom, 'bottom', frame)
  const left = Math.min(top.left, bottom.left)
  const width = Math.max(top.left + top.width, bottom.left + bottom.width) - left

  return (
    <div aria-hidden="true" style={{ position: 'relative', width: '100%', maxWidth: width, height: rowHeight, opacity }}>
      {([['top', top], ['bottom', bottom]] as const).map(([end, rect]) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={end} src={band[end].url} alt="" loading="lazy"
          width={band[end].w} height={band[end].h}
          style={{
            position: 'absolute', display: 'block', height: 'auto',
            left: `${(rect.left - left) / width * 100}%`, width: `${rect.width / width * 100}%`,
            bottom: end === 'top' ? rowHeight - rect.top - rect.height : undefined,
            top: end === 'bottom' ? rect.top : undefined,
            clipPath: rect.clipPath,
          }}
        />
      ))}
    </div>
  )
}

// ── Side-by-side: the full watch photo beside the selected strap, both upright.
// Watches without a case-only render often ship on their factory strap in the
// catalog photo, so a literal pairing reads honestly — no fake compositing.
export function SideBySideWatchPreview({ watch, strap, reducedMotion, blockHeight, loading }: {
  watch: Pick<StudioWatch, 'catalogId' | 'brand' | 'model' | 'transparentUrl' | 'imageUrl'> | null
  strap?: StudioStrap
  reducedMotion: boolean
  blockHeight: number
  loading?: 'lazy'
}) {
  const watchSrc = watch?.transparentUrl || watch?.imageUrl
  const h = blockHeight
  const maxWidth = Math.round(h * 1.04)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: '0 1 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: Math.round(maxWidth * 0.09), height: h }}>
        {watchSrc ? (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={watch?.catalogId ?? 'none'}
              src={watchSrc}
              alt=""
              loading={loading}
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
              key={strap?.key ?? 'none'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0.15 } : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: 'absolute', inset: 0 }}
            >
              {strap?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={strap.imageUrl} alt="" loading={loading} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: strap?.colorHex ?? brand.colors.paperWarm }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <span style={srOnly}>
        {watch ? `${watch.brand} ${watch.model}` : 'Watch'}
        {strap ? ` with ${strap.label}` : ''}
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
