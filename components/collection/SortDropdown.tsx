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
  label?: string
}

export default function SortDropdown({
  value,
  options,
  onChange,
  label = 'Order',
}: Props) {
  const [open, setOpen] = useState(false)
  const [hoveredValue, setHoveredValue] = useState<string | null>(null)
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
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        style={{
          minWidth: brand.controls.dropdown.minWidth,
          height: brand.controls.dropdown.triggerHeight,
          padding: '0 12px 0 14px',
          borderRadius: brand.radius.md,
          border: `1px solid ${open ? brand.colors.goldLine : brand.colors.borderLight}`,
          background: brand.colors.white,
          boxShadow: open ? brand.shadow.menu : brand.shadow.sm,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          transition: `border-color ${brand.transition.base}, box-shadow ${brand.transition.base}, transform ${brand.transition.base}`,
          transform: open ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 1,
              alignSelf: 'stretch',
              background: brand.colors.border,
            }}
          />
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              color: brand.colors.ink,
              whiteSpace: 'nowrap',
            }}
          >
            {activeOption?.label}
          </span>
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
            transition: `transform ${brand.transition.base}, color ${brand.transition.base}`,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
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
          right: 0,
          minWidth: brand.controls.dropdown.minWidth,
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
        {options.map(option => {
          const isActive = option.value === value
          const isHovered = hoveredValue === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onMouseEnter={() => setHoveredValue(option.value)}
              onMouseLeave={() => setHoveredValue(null)}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              style={{
                width: '100%',
                minHeight: brand.controls.dropdown.optionMinHeight,
                padding: '0 12px',
                borderRadius: brand.radius.sm,
                border: 'none',
                background: isActive
                  ? brand.colors.goldWash
                  : isHovered
                  ? brand.colors.slot
                  : 'transparent',
                boxShadow: isActive ? `inset 0 0 0 1px ${brand.colors.goldLine}` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: `background ${brand.transition.fast}, box-shadow ${brand.transition.fast}, transform ${brand.transition.fast}`,
              }}
            >
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.03em',
                  color: brand.colors.ink,
                }}
              >
                {option.label}
              </span>

              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? brand.colors.gold : 'transparent',
                  transition: `color ${brand.transition.fast}`,
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
