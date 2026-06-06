'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import type { CatalogWatch } from '@/types/watch'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { CrownIcon } from './WatchStateIcons'
import { useIsMobile, usePrefersReducedMotion } from './useResponsiveState'

type Props = {
  open: boolean
  watch: CatalogWatch | null
  previousWatch: CatalogWatch | null
  onClose: () => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function useModalEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.25 2.25L9.75 9.75M9.75 2.25L2.25 9.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

const CEREMONY_EASE = [0.4, 0, 0.2, 1] as const

export default function GrailSetModal({ open, watch, previousWatch, onClose }: Props) {
  const isMobile = useIsMobile()
  const reduce = usePrefersReducedMotion()
  const isChange = previousWatch !== null

  useModalEscape(open, onClose)

  // The crown moment is driven by a single grailMoment object that the parent
  // nulls on close, so watch/previousWatch vanish the instant `open` flips
  // false. Hold them so the ceremony keeps its content while it animates out.
  const held = useRef<{ watch: CatalogWatch | null; previous: CatalogWatch | null }>({ watch, previous: previousWatch })
  if (open && watch) held.current = { watch, previous: previousWatch }
  const shownWatch = open ? watch : held.current.watch
  const shownPrevious = open ? previousWatch : held.current.previous
  const shownIsChange = open ? isChange : held.current.previous !== null

  if (typeof document === 'undefined') return null

  // Each ceremony element animates in on mount with the original staggered
  // delays; exit is carried by the shell fading/scaling out as a whole.
  const enter = (from: Record<string, number>, delay = 0) => ({
    initial: reduce ? false : from,
    animate: Object.keys(from).reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: k === 'opacity' ? 1 : k === 'scale' ? 1 : 0 }), {}),
    transition: { duration: reduce ? 0 : 0.42, ease: CEREMONY_EASE, delay: reduce ? 0 : delay },
  })

  const shellStyle: CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 'min(360px, calc(100vw - 24px))',
        maxHeight: 'min(92dvh, 760px)',
        overflowY: 'auto',
        padding: '18px 16px calc(18px + env(safe-area-inset-bottom))',
        borderRadius: brand.radius.xl,
        background: brand.colors.bg,
        border: `1px solid ${brand.colors.border}`,
        boxShadow: brand.shadow.xl,
        zIndex: 361,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 'min(440px, calc(100vw - 32px))',
        zIndex: 361,
      }

  return createPortal(
    <AnimatePresence>
      {open && shownWatch && (
        <motion.div
          key="grail-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: CEREMONY_EASE }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,20,16,0.56)',
            backdropFilter: 'blur(4px)',
            zIndex: 360,
          }}
        />
      )}
      {open && shownWatch && (
        <motion.div
          key="grail-shell"
          role="dialog"
          aria-modal="true"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: reduce ? 0 : 0.34, ease: CEREMONY_EASE }}
          style={{ ...shellStyle, x: '-50%', y: '-50%' }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close grail modal"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 34,
                height: 34,
                borderRadius: brand.radius.circle,
                border: `1px solid ${brand.colors.border}`,
                background: brand.colors.white,
                color: brand.colors.ink,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: brand.shadow.sm,
                zIndex: 3,
              }}
            >
              <CloseIcon />
            </button>
          )}

          <div
            style={{
              position: 'relative',
              padding: isMobile ? '10px 0 0' : '16px 0 0',
            }}
          >
            <motion.div
              aria-hidden="true"
              initial={reduce ? false : { scale: 0.92, opacity: 0.22 }}
              animate={{ scale: 1, opacity: 0.9 }}
              transition={{ duration: reduce ? 0 : 0.42, ease: CEREMONY_EASE }}
              style={{
                position: 'absolute',
                top: isMobile ? 44 : 28,
                left: '50%',
                x: '-50%',
                width: isMobile ? 300 : 368,
                height: isMobile ? 168 : 228,
                borderRadius: brand.radius.circle,
                background: isMobile ? brand.colors.goldWash : brand.colors.bg,
                filter: isMobile ? 'blur(32px)' : 'blur(34px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <motion.div
              aria-hidden="true"
              initial={reduce ? false : { scale: 0.94, opacity: 0.1 }}
              animate={{ scale: 1, opacity: 0.34 }}
              transition={{ duration: reduce ? 0 : 0.42, ease: CEREMONY_EASE }}
              style={{
                position: 'absolute',
                top: isMobile ? 166 : 296,
                left: '50%',
                x: '-50%',
                width: isMobile ? 236 : 336,
                height: isMobile ? 96 : 162,
                borderTopLeftRadius: 9999,
                borderTopRightRadius: 9999,
                background: brand.colors.goldWash,
                border: `1px solid ${brand.colors.goldLine}`,
                borderBottom: 'none',
                boxShadow: brand.shadow.gold,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? 14 : 24, position: 'relative', zIndex: 2 }}>
              <motion.div
                {...enter({ opacity: 0, y: -12, scale: 0.88 })}
                style={{
                  width: isMobile ? 50 : 56,
                  height: isMobile ? 50 : 56,
                  borderRadius: brand.radius.circle,
                  border: `1px solid ${brand.colors.goldLine}`,
                  background: isMobile ? brand.colors.slot : brand.colors.white,
                  color: brand.colors.gold,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: brand.shadow.gold,
                }}
              >
                <CrownIcon size={isMobile ? 20 : 24} />
              </motion.div>
            </div>

            <motion.div
              {...enter({ opacity: 0, y: 10 }, 0.11)}
              style={{
                position: 'relative',
                zIndex: 1,
                textAlign: 'center',
                marginBottom: isMobile ? 16 : 34,
              }}
            >
              <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 28 : 36, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, marginBottom: isMobile ? 10 : 14 }}>
                Your Grail
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink, marginBottom: isMobile ? 8 : 10 }}>
                {shownWatch.brand} {shownWatch.model}
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>
                {shownIsChange ? 'The crown moves to a new watch.' : 'The watch worth chasing.'}
              </div>
            </motion.div>

            <motion.div
              {...enter({ opacity: 0, y: 18, scale: 0.96 }, 0.17)}
              style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: isMobile ? 258 : 320,
                margin: '0 auto',
                background: brand.colors.white,
                border: `1px solid ${brand.colors.goldLine}`,
                borderRadius: brand.radius.xl,
                boxShadow: brand.shadow.gold,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: brand.colors.slot,
                  borderBottom: `1px solid ${brand.colors.border}`,
                  position: 'relative',
                  aspectRatio: isMobile ? '1 / 0.78' : '1 / 1',
                }}
              >
                <WatchImageOrDial
                  watch={shownWatch}
                  fill
                  sizes="320px"
                  imageStyle={{ objectFit: 'contain', padding: isMobile ? 20 : 28, filter: brand.shadow.drop }}
                  dialSize={isMobile ? 126 : 152}
                />
              </div>
              <div style={{ padding: isMobile ? '12px 14px 14px' : '16px 18px 18px' }}>
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 4 }}>
                  {shownWatch.brand}
                </div>
                <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.06, color: brand.colors.ink, marginBottom: 4 }}>
                  {shownWatch.model}
                </div>
                <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: isMobile ? 10 : 14 }}>
                  Ref. {shownWatch.reference}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: isMobile ? '8px 10px' : '10px 12px',
                    borderRadius: brand.radius.md,
                    background: brand.colors.bg,
                    border: `1px solid ${brand.colors.border}`,
                  }}
                >
                  <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
                    Est. Market Value
                  </span>
                  <span style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 16 : 18, fontWeight: 600, color: brand.colors.goldDeep }}>
                    {fmt(shownWatch.estimatedValue)}
                  </span>
                </div>
              </div>
            </motion.div>

            {shownIsChange && (
              <motion.div
                {...enter({ opacity: 0 }, 0.2)}
                style={{
                  marginTop: 12,
                  textAlign: 'center',
                  fontFamily: brand.font.sans,
                  fontSize: 15,
                  color: brand.colors.ink,
                }}
              >
                Previously: {shownPrevious?.brand} {shownPrevious?.model}
              </motion.div>
            )}

            <motion.div
              {...enter({ opacity: 0, y: 8 }, 0.24)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: isMobile ? 12 : 16,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  minWidth: 132,
                  padding: isMobile ? '10px 18px' : '11px 18px',
                  borderRadius: brand.radius.btn,
                  border: `1px solid ${brand.colors.goldLine}`,
                  background: brand.colors.white,
                  color: brand.colors.ink,
                  cursor: 'pointer',
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: brand.shadow.md,
                }}
              >
                Done
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
