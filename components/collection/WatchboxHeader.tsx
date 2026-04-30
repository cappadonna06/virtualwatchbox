'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards'

interface HeaderOption {
  value: string
  label: string
}

interface HeaderMenuItem {
  label: string
  onSelect: () => void
  destructive?: boolean
}

interface HeaderPrimaryAction {
  label: string
  onClick: () => void
  icon?: ReactNode
  ariaLabel?: string
}

interface Props {
  title: string
  subtitle: string
  meta?: ReactNode
  summary?: ReactNode
  showAccentBar?: boolean
  selector?: {
    value: string
    options: HeaderOption[]
    onChange: (value: string) => void
  }
  primaryAction?: HeaderPrimaryAction
  activeView: View
  onViewChange: (view: View) => void
  menuItems: HeaderMenuItem[]
}

export default function WatchboxHeader({
  title,
  subtitle,
  meta,
  summary,
  showAccentBar = false,
  selector,
  primaryAction,
  activeView,
  onViewChange,
  menuItems,
}: Props) {
  const hasPrimaryCluster = Boolean(primaryAction) && !selector

  return (
    <div style={{ marginBottom: 22 }}>
      {showAccentBar ? (
        <div
          style={{
            height: 2,
            width: '100%',
            background: brand.colors.gold,
            marginBottom: 28,
          }}
        />
      ) : null}

      <div style={{ marginBottom: 14 }}>
        <h1
          style={{
            fontFamily: brand.font.serif,
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1.08,
            color: brand.colors.ink,
            margin: 0,
          }}
        >
          {title}
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
          {subtitle}
        </p>
        {meta ? (
          <div
            style={{
              marginTop: 10,
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.gold,
              letterSpacing: '0.04em',
            }}
          >
            {meta}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: hasPrimaryCluster ? 'space-between' : undefined,
          gap: 10,
        }}
      >
        {selector ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <SelectorControl
              value={selector.value}
              options={selector.options}
              onChange={selector.onChange}
            />
          </div>
        ) : primaryAction ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <PrimaryActionControl action={primaryAction} />
            <CompactViewToggle activeView={activeView} onChange={onViewChange} />
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {primaryAction && !selector ? null : (
          <CompactViewToggle activeView={activeView} onChange={onViewChange} />
        )}
        <HeaderOverflowMenu items={menuItems} />
      </div>

      {summary ? (
        <div
          style={{
            marginTop: 14,
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            letterSpacing: '0.02em',
          }}
        >
          {summary}
        </div>
      ) : null}
    </div>
  )
}

function PrimaryActionControl({
  action,
}: {
  action: HeaderPrimaryAction
}) {
  return (
    <button
      type="button"
      aria-label={action.ariaLabel ?? action.label}
      onClick={action.onClick}
      style={{
        width: 'fit-content',
        flex: '0 0 auto',
        height: brand.controls.dropdown.triggerHeight,
        padding: '0 14px',
        borderRadius: brand.radius.md,
        border: `1px solid ${brand.colors.borderLight}`,
        background: brand.colors.white,
        boxShadow: brand.shadow.sm,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `border-color ${brand.transition.base}, box-shadow ${brand.transition.base}`,
      }}
    >
      {action.icon ? (
        <span
          aria-hidden="true"
          style={{
            width: 14,
            height: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.colors.gold,
            flexShrink: 0,
          }}
        >
          {action.icon}
        </span>
      ) : null}

      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: brand.colors.ink,
          textAlign: 'left',
        }}
      >
        {action.label}
      </span>
    </button>
  )
}

function SelectorControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: HeaderOption[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeOption = options.find(option => option.value === value) ?? options[0]
  const interactive = options.length > 1

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
        aria-haspopup={interactive ? 'menu' : undefined}
        aria-expanded={interactive ? open : undefined}
        onClick={() => {
          if (interactive) setOpen(current => !current)
        }}
        style={{
          width: '100%',
          minWidth: 0,
          height: brand.controls.dropdown.triggerHeight,
          padding: '0 14px',
          borderRadius: brand.radius.md,
          border: `1px solid ${interactive && open ? brand.colors.goldLine : brand.colors.borderLight}`,
          background: brand.colors.white,
          boxShadow: interactive && open ? brand.shadow.md : brand.shadow.sm,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: interactive ? 'pointer' : 'default',
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
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: brand.colors.ink,
            textAlign: 'left',
          }}
        >
          {activeOption?.label}
        </span>

        {interactive ? (
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
        ) : null}
      </button>

      {interactive ? (
        <div
          role="menu"
          aria-hidden={!open}
          style={{
            position: 'absolute',
            top: `calc(100% + ${brand.controls.dropdown.menuOffset}px)`,
            left: 0,
            right: 0,
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
                  minHeight: 34,
                  padding: '0 10px',
                  borderRadius: brand.radius.sm,
                  border: 'none',
                  background: isActive ? brand.colors.goldWash : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? brand.colors.ink : brand.colors.muted,
                    opacity: isActive ? 1 : 0.76,
                  }}
                >
                  {option.label}
                </span>

                {isActive ? (
                  <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                    <path d="M1 5.5L4.25 8.75L12 1" stroke={brand.colors.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function CompactViewToggle({
  activeView,
  onChange,
}: {
  activeView: View
  onChange: (view: View) => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.md,
        background: brand.colors.bg,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {[
        {
          id: 'watchbox' as const,
          label: 'Watchbox',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ),
        },
        {
          id: 'cards' as const,
          label: 'Cards',
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
            </svg>
          ),
        },
      ].map((tab, index) => {
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
            style={{
              width: 44,
              height: 40,
              border: 'none',
              borderLeft: index > 0 ? `1px solid ${brand.colors.borderMid}` : 'none',
              background: isActive ? brand.colors.ink : 'transparent',
              color: isActive ? brand.colors.bg : brand.colors.ink,
              opacity: isActive ? 1 : 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: `background ${brand.transition.fast}, color ${brand.transition.fast}, opacity ${brand.transition.fast}`,
            }}
          >
            {tab.icon}
          </button>
        )
      })}
    </div>
  )
}

function HeaderOverflowMenu({
  items,
}: {
  items: HeaderMenuItem[]
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
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen(current => !current)}
        style={{
          width: 40,
          height: 40,
          borderRadius: brand.radius.md,
          border: `1px solid ${open ? brand.colors.goldLine : brand.colors.borderLight}`,
          background: brand.colors.white,
          color: brand.colors.ink,
          boxShadow: open ? brand.shadow.md : brand.shadow.sm,
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
          minWidth: 176,
          padding: 4,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.borderMid}`,
          background: brand.colors.white,
          boxShadow: brand.shadow.md,
          zIndex: brand.zIndex.dropdown,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.985)',
          transformOrigin: 'top right',
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
        }}
      >
        {items.map(item => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              item.onSelect()
              setOpen(false)
            }}
            style={{
              width: '100%',
              minHeight: 34,
              padding: '0 10px',
              borderRadius: brand.radius.sm,
              border: 'none',
              background: 'transparent',
              color: item.destructive ? brand.colors.gold : brand.colors.ink,
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.03em',
              textAlign: 'left',
              opacity: item.destructive ? 1 : 0.82,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
