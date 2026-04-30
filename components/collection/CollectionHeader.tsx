'use client'

import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  totalEstValue: number
  pendingChangesCount: number
  onAddWatch: () => void
  onOpenPlayground: () => void
}

export default function CollectionHeader({ totalEstValue, pendingChangesCount, onAddWatch, onOpenPlayground }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontFamily: brand.font.serif,
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1.1,
            color: brand.colors.ink,
            margin: 0,
          }}
        >
          My Collection
        </h1>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 14,
            color: brand.colors.muted,
            margin: '6px 0 0',
            letterSpacing: '0.02em',
          }}
        >
          Your collection, wherever you go.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '5px 14px',
            borderRadius: brand.radius.pill,
            border: `1px solid ${brand.colors.goldLine}`,
            background: brand.colors.goldWash,
            color: brand.colors.gold,
          }}
        >
          Est. Value: {fmt(totalEstValue)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onAddWatch}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '8px 18px',
              background: brand.colors.ink,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: brand.radius.btn,
              cursor: 'pointer',
            }}
          >
            Add Watch
          </button>

          <CollectionHeaderActionsMenu onOpenPlayground={onOpenPlayground} />
        </div>
      </div>

      {pendingChangesCount > 0 && (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.gold,
            opacity: 0.85,
            letterSpacing: '0.02em',
            marginTop: 10,
          }}
        >
          {pendingChangesCount} unsaved {pendingChangesCount === 1 ? 'change' : 'changes'}
        </div>
      )}
    </div>
  )
}

function CollectionHeaderActionsMenu({
  onOpenPlayground,
}: {
  onOpenPlayground: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Collection actions"
        onClick={() => setOpen(value => !value)}
        style={{
          width: 40,
          height: 40,
          borderRadius: brand.radius.md,
          border: `1px solid ${open ? brand.colors.goldLine : brand.colors.borderLight}`,
          background: brand.colors.white,
          color: brand.colors.ink,
          boxShadow: open ? brand.shadow.menu : brand.shadow.sm,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: `border-color ${brand.transition.base}, box-shadow ${brand.transition.base}`,
        }}
      >
        <svg width="15" height="3" viewBox="0 0 15 3" fill="none" aria-hidden="true">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
          <circle cx="7.5" cy="1.5" r="1.5" fill="currentColor" />
          <circle cx="13.5" cy="1.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          top: `calc(100% + ${brand.controls.dropdown.menuOffset}px)`,
          right: 0,
          minWidth: 168,
          padding: brand.controls.dropdown.menuPadding,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.borderMid}`,
          background: brand.colors.white,
          boxShadow: brand.shadow.menu,
          zIndex: brand.zIndex.dropdown,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.98)',
          transformOrigin: 'top right',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
        }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onOpenPlayground()
            setOpen(false)
          }}
          style={{
            width: '100%',
            minHeight: brand.controls.dropdown.optionMinHeight,
            padding: '0 12px',
            borderRadius: brand.radius.sm,
            border: 'none',
            background: 'transparent',
            color: brand.colors.ink,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.03em',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          Open Playground
        </button>
      </div>
    </div>
  )
}
