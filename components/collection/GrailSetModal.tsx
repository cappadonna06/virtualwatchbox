'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
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

export default function GrailSetModal({ open, watch, previousWatch, onClose }: Props) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [isVisible, setIsVisible] = useState(prefersReducedMotion)
  const [showPreviousFootnote, setShowPreviousFootnote] = useState(prefersReducedMotion)
  const isChange = previousWatch !== null
  const ceremonialTransition = prefersReducedMotion ? 'none' : '0.42s cubic-bezier(0.4, 0, 0.2, 1)'

  useModalEscape(open, onClose)

  useEffect(() => {
    if (!open) return

    setIsVisible(prefersReducedMotion)
    setShowPreviousFootnote(prefersReducedMotion || !isChange)

    if (prefersReducedMotion) return

    const enterFrame = requestAnimationFrame(() => setIsVisible(true))
    let footnoteTimer: ReturnType<typeof setTimeout> | null = null

    if (isChange) {
      footnoteTimer = setTimeout(() => setShowPreviousFootnote(true), 200)
    }

    return () => {
      cancelAnimationFrame(enterFrame)
      if (footnoteTimer) clearTimeout(footnoteTimer)
    }
  }, [isChange, open, prefersReducedMotion])

  if (!open || !watch || typeof document === 'undefined') return null

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26,20,16,0.56)',
    backdropFilter: 'blur(4px)',
    opacity: isVisible ? 1 : 0,
    transition: prefersReducedMotion ? 'none' : `opacity ${brand.transition.smooth}`,
  }

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
        transform: `translate(-50%, ${isVisible ? '-50%' : 'calc(-50% + 18px)'})`,
        opacity: isVisible ? 1 : 0,
        transition: prefersReducedMotion ? 'none' : `transform ${brand.transition.smooth}, opacity ${brand.transition.smooth}`,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 'min(440px, calc(100vw - 32px))',
        transform: `translate(-50%, ${isVisible ? '-50%' : 'calc(-50% + 18px)'})`,
        opacity: isVisible ? 1 : 0,
        transition: prefersReducedMotion ? 'none' : `transform ${brand.transition.smooth}, opacity ${brand.transition.smooth}`,
      }

  return createPortal(
    <>
      <div onClick={onClose} style={{ ...backdropStyle, zIndex: 360 }} />
      <div role="dialog" aria-modal="true" style={{ ...shellStyle, zIndex: 361 }}>
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
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: isMobile ? 44 : 28,
              left: '50%',
              width: isMobile ? 300 : 368,
              height: isMobile ? 168 : 228,
              transform: `translateX(-50%) scale(${isVisible ? 1 : 0.92})`,
              borderRadius: brand.radius.circle,
              background: isMobile ? brand.colors.goldWash : brand.colors.bg,
              opacity: isVisible ? 0.9 : 0.22,
              filter: isMobile ? 'blur(32px)' : 'blur(34px)',
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition}, opacity ${ceremonialTransition}`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: isMobile ? 166 : 296,
              left: '50%',
              width: isMobile ? 236 : 336,
              height: isMobile ? 96 : 162,
              transform: `translateX(-50%) scale(${isVisible ? 1 : 0.94})`,
              borderTopLeftRadius: 9999,
              borderTopRightRadius: 9999,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: brand.colors.goldWash,
              border: `1px solid ${brand.colors.goldLine}`,
              borderBottom: 'none',
              boxShadow: isVisible ? brand.shadow.gold : 'none',
              opacity: isVisible ? 0.34 : 0.1,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition}, opacity ${ceremonialTransition}, box-shadow ${ceremonialTransition}`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? 14 : 24, position: 'relative', zIndex: 2 }}>
            <div
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
                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.88)',
                opacity: isVisible ? 1 : 0,
                transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition}, opacity ${ceremonialTransition}`,
              }}
            >
              <CrownIcon size={isMobile ? 20 : 24} />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              marginBottom: isMobile ? 16 : 34,
              transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition} 110ms, opacity ${ceremonialTransition} 110ms`,
            }}
          >
            <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 28 : 36, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.02, marginBottom: isMobile ? 10 : 14 }}>
              Your Grail
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 13 : 14, fontWeight: 500, color: brand.colors.ink, marginBottom: isMobile ? 8 : 10 }}>
              {watch.brand} {watch.model}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
              {isChange ? 'The crown moves to a new watch.' : 'The watch worth chasing.'}
            </div>
          </div>

          <div
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
              transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.96)',
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition} 170ms, opacity ${ceremonialTransition} 170ms`,
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
                watch={watch}
                fill
                sizes="320px"
                imageStyle={{ objectFit: 'contain', padding: isMobile ? 20 : 28, filter: brand.shadow.drop }}
                dialSize={isMobile ? 126 : 152}
              />
            </div>
            <div style={{ padding: isMobile ? '12px 14px 14px' : '16px 18px 18px' }}>
              <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 4 }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 22 : 28, fontWeight: 400, lineHeight: 1.06, color: brand.colors.ink, marginBottom: 4 }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, marginBottom: isMobile ? 10 : 14 }}>
                Ref. {watch.reference}
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
                <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
                  Est. Market Value
                </span>
                <span style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 16 : 18, fontWeight: 600, color: brand.colors.gold }}>
                  {fmt(watch.estimatedValue)}
                </span>
              </div>
            </div>
          </div>

          {isChange && (
            <div
              style={{
                marginTop: 12,
                textAlign: 'center',
                fontFamily: brand.font.sans,
                fontSize: 13,
                color: brand.colors.ink,
                opacity: showPreviousFootnote ? 1 : 0,
                transition: prefersReducedMotion ? 'none' : `opacity ${ceremonialTransition}`,
              }}
            >
              Previously: {previousWatch?.brand} {previousWatch?.model}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: isMobile ? 12 : 16,
              transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition} 240ms, opacity ${ceremonialTransition} 240ms`,
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
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
