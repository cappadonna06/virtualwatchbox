'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { brand } from '@/lib/brand'

interface SortOption {
  value: string
  label: string
}

interface Props {
  value: string
  options: SortOption[]
  onChange: (value: string) => void
}

export default function SortControl({
  value,
  options,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeOption = useMemo(
    () => options.find(option => option.value === value) ?? options[0],
    [options, value],
  )

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
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        style={{
          minWidth: 184,
          height: 36,
          padding: '0 11px 0 12px',
          borderRadius: brand.radius.md,
          border: `1px solid ${open ? brand.colors.goldLine : brand.colors.borderLight}`,
          background: brand.colors.white,
          boxShadow: open ? brand.shadow.md : brand.shadow.sm,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          lineHeight: 1.05,
          transition: `border-color ${brand.transition.base}, box-shadow ${brand.transition.base}`,
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            color: brand.colors.ink,
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ color: brand.colors.muted }}>Sort:</span>{' '}
          <span>{activeOption?.label}</span>
        </span>

        <svg
          width="11"
          height="7"
          viewBox="0 0 11 7"
          fill="none"
          aria-hidden="true"
          style={{
            color: open ? brand.colors.ink : brand.colors.muted,
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform ${brand.transition.base}, color ${brand.transition.base}`,
          }}
        >
          <path d="M1 1.25L5.5 5.75L10 1.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          top: `calc(100% + ${brand.controls.dropdown.menuOffset}px)`,
          left: 0,
          minWidth: 220,
          padding: 4,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.borderMid}`,
          background: brand.colors.white,
          boxShadow: brand.shadow.md,
          zIndex: brand.zIndex.dropdown,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.985)',
          transformOrigin: 'top left',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
        }}
      >
        {options.map(option => {
          const isActive = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              style={{
                width: '100%',
                minHeight: 32,
                padding: '0 10px',
                borderRadius: brand.radius.sm,
                border: 'none',
                background: isActive ? brand.colors.goldWash : 'transparent',
                boxShadow: isActive ? `inset 0 0 0 1px ${brand.colors.goldLine}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10.5,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? brand.colors.ink : brand.colors.muted,
                  opacity: isActive ? 1 : 0.78,
                }}
              >
                {option.label}
              </span>

              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? brand.colors.gold : 'transparent',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.2 8.2L11 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
