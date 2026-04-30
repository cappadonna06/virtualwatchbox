'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { brand } from '@/lib/brand'
import type { CatalogWatch } from '@/types/watch'
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
        left: 0,
        right: 0,
        bottom: 0,
        padding: '18px 16px 20px',
        borderRadius: '22px 22px 0 0',
        background: brand.colors.bg,
        transform: isVisible ? 'translateY(0)' : 'translateY(22px)',
        opacity: isVisible ? 1 : 0,
        transition: prefersReducedMotion ? 'none' : `transform ${brand.transition.sheet}, opacity ${brand.transition.smooth}`,
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
      <div style={{ ...shellStyle, zIndex: 361 }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
          </div>
        )}

        <div
          style={{
            position: 'relative',
            padding: isMobile ? '12px 0 0' : '16px 0 0',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: isMobile ? 22 : 28,
              left: '50%',
              width: isMobile ? 320 : 368,
              height: isMobile ? 196 : 228,
              transform: `translateX(-50%) scale(${isVisible ? 1 : 0.94})`,
              borderRadius: brand.radius.circle,
              background: brand.colors.bg,
              opacity: isVisible ? 0.48 : 0.18,
              filter: 'blur(34px)',
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition}, opacity ${ceremonialTransition}`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: isMobile ? 254 : 296,
              left: '50%',
              width: isMobile ? 276 : 336,
              height: isMobile ? 136 : 162,
              transform: `translateX(-50%) scale(${isVisible ? 1 : 0.96})`,
              borderTopLeftRadius: 9999,
              borderTopRightRadius: 9999,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: brand.colors.goldWash,
              border: `1px solid ${brand.colors.goldLine}`,
              borderBottom: 'none',
              boxShadow: isVisible ? brand.shadow.gold : 'none',
              opacity: isVisible ? 0.24 : 0.1,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition}, opacity ${ceremonialTransition}, box-shadow ${ceremonialTransition}`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isMobile ? 22 : 24 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: brand.radius.circle,
                border: `1px solid ${brand.colors.goldLine}`,
                background: brand.colors.white,
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
              <CrownIcon size={24} />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              marginBottom: isMobile ? 30 : 34,
              transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition} 110ms, opacity ${ceremonialTransition} 110ms`,
            }}
          >
            <div style={{ fontFamily: brand.font.serif, fontSize: 36, fontWeight: 400, color: brand.colors.white, lineHeight: 1.02, marginBottom: 14 }}>
              Your Grail
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, color: brand.colors.white, marginBottom: 10 }}>
              {watch.brand} {watch.model}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.bg }}>
              {isChange ? 'The crown moves to a new watch.' : 'The watch worth chasing.'}
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: isMobile ? 304 : 320,
              margin: '0 auto',
              background: brand.colors.white,
              border: `1px solid ${brand.colors.goldLine}`,
              borderRadius: brand.radius.xl,
              boxShadow: brand.shadow.gold,
              overflow: 'hidden',
              transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.98)',
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : `transform ${ceremonialTransition} 170ms, opacity ${ceremonialTransition} 170ms`,
            }}
          >
            <div
              style={{
                background: brand.colors.slot,
                borderBottom: `1px solid ${brand.colors.border}`,
                position: 'relative',
                aspectRatio: '1 / 1',
              }}
            >
              <Image
                src={watch.imageUrl}
                alt={watch.model}
                fill
                sizes="320px"
                style={{ objectFit: 'contain', padding: 28, filter: brand.shadow.drop }}
              />
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 5 }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400, lineHeight: 1.08, color: brand.colors.ink, marginBottom: 6 }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginBottom: 14 }}>
                Ref. {watch.reference}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: brand.radius.md,
                  background: brand.colors.bg,
                  border: `1px solid ${brand.colors.border}`,
                }}
              >
                <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
                  Est. Market Value
                </span>
                <span style={{ fontFamily: brand.font.sans, fontSize: 18, fontWeight: 600, color: brand.colors.gold }}>
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
                fontSize: 10,
                color: brand.colors.muted,
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
              marginTop: 16,
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
                padding: '11px 18px',
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
