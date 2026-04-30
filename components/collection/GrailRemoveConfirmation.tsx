'use client'

import { useEffect, type CSSProperties } from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { brand } from '@/lib/brand'
import type { CatalogWatch } from '@/types/watch'
import { useIsMobile } from './useResponsiveState'

type Props = {
  open: boolean
  watch: CatalogWatch | null
  onCancel: () => void
  onConfirm: () => void
}

export default function GrailRemoveConfirmation({ open, watch, onCancel, onConfirm }: Props) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, open])

  if (!open || !watch || typeof document === 'undefined') return null

  const shellStyle: CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '14px 16px 20px',
        borderRadius: '22px 22px 0 0',
        background: brand.colors.bg,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 'min(400px, calc(100vw - 32px))',
        transform: 'translate(-50%, -50%)',
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        boxShadow: brand.shadow.lg,
        padding: 20,
      }

  return createPortal(
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 360,
        }}
      />
      <div style={{ ...shellStyle, zIndex: 361 }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '76px 1fr',
            gap: 12,
            alignItems: 'center',
            padding: 12,
            borderRadius: brand.radius.lg,
            background: brand.colors.slot,
            border: `1px solid ${brand.colors.border}`,
            marginBottom: 16,
          }}
        >
          <div style={{ position: 'relative', width: 76, aspectRatio: '1 / 1' }}>
            <Image
              src={watch.imageUrl}
              alt={watch.model}
              fill
              sizes="76px"
              style={{ objectFit: 'contain', padding: 8, filter: brand.shadow.drop }}
            />
          </div>
          <div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 4 }}>
              {watch.brand}
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 400, lineHeight: 1.08, color: brand.colors.ink, marginBottom: 4 }}>
              {watch.model}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
              Ref. {watch.reference}
            </div>
          </div>
        </div>

        <div style={{ fontFamily: brand.font.serif, fontSize: 30, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 8 }}>
          Remove Grail?
        </div>
        <p style={{ margin: '0 0 18px', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.55 }}>
          This watch will no longer be your Grail.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 12px',
              borderRadius: brand.radius.btn,
              border: `1px solid ${brand.colors.borderLight}`,
              background: 'transparent',
              color: brand.colors.ink,
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 12px',
              borderRadius: brand.radius.btn,
              border: 'none',
              background: brand.colors.ink,
              color: brand.colors.bg,
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
