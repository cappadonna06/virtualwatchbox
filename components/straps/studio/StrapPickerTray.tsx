'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import { categoryAbbrev, type StudioStrap } from '@/lib/strapStudio'
import { useIsMobile, usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import type { StudioController } from './useStudioController'
import type { StudioSourceMode } from './useStudioController'

export default function StrapPickerTray({ c }: { c: StudioController }) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)

  if (isMobile) {
    return (
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={(_, info) => {
          if (info.offset.y < -40) setExpanded(true)
          else if (info.offset.y > 40) setExpanded(false)
        }}
        animate={{ height: expanded ? '78vh' : '27vh' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: brand.zIndex.sidebar,
          background: brand.studio.panel,
          borderTop: `1px solid ${brand.studio.hairlineSoft}`,
          borderRadius: `${brand.radius.xl}px ${brand.radius.xl}px 0 0`,
          boxShadow: '0 -12px 32px rgba(26,20,16,0.12)',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 16px 24px',
        }}
      >
        <button
          aria-label={expanded ? 'Collapse straps' : 'Expand straps'}
          onClick={() => setExpanded(v => !v)}
          style={{
            alignSelf: 'center', width: 40, height: 5, borderRadius: 3, border: 'none',
            background: brand.colors.borderLight, margin: '4px 0 12px', cursor: 'pointer', flexShrink: 0,
          }}
        />
        {c.showSourceToggle && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
            <SourceToggle c={c} />
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, flexShrink: 0, background: brand.studio.panel }}>
          <CategoryTabs c={c} />
        </div>
        <div style={{ overflowY: 'auto', marginTop: 14, flex: 1 }}>
          <SwatchGrid c={c} columns={expanded ? 4 : 0} />
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {c.showSourceToggle && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SourceToggle c={c} />
        </div>
      )}
      <CategoryTabs c={c} />
      <SwatchGrid c={c} columns={0} />
    </div>
  )
}

// ── Source toggle (All Straps / My Drawer) — side-by-side mode, drawer owners
// only. Every source is compatibility-filtered upstream.
function SourceToggle({ c }: { c: StudioController }) {
  const options: Array<{ key: StudioSourceMode; label: string }> = [
    { key: 'all', label: 'All Straps' },
    { key: 'drawer', label: 'My Drawer' },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        borderRadius: brand.radius.pill,
        background: brand.colors.bg,
        border: `1px solid ${brand.studio.hairlineSoft}`,
      }}
    >
      {options.map(o => {
        const active = c.source === o.key
        return (
          <button
            key={o.key}
            onClick={() => c.setSource(o.key)}
            style={{
              position: 'relative',
              padding: '7px 16px',
              borderRadius: brand.radius.pill,
              border: 'none',
              cursor: 'pointer',
              font: `500 12px ${brand.font.sans}`,
              letterSpacing: '0.04em',
              color: active ? brand.colors.slot : brand.studio.textMid,
              background: active ? brand.colors.ink : 'transparent',
              transition: brand.transition.base,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Category tabs with animated gold underline ───────────────────────────────
function CategoryTabs({ c }: { c: StudioController }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap',
        borderBottom: `1px solid ${brand.studio.hairlineSoft}`,
      }}
    >
      {c.categories.map(cat => {
        const active = c.activeCategory === cat
        return (
          <button
            key={cat}
            onClick={() => c.setCategory(cat)}
            style={{
              position: 'relative',
              padding: '6px 14px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              font: `500 13px ${brand.font.sans}`,
              letterSpacing: '0.03em',
              color: active ? brand.colors.goldDeep : brand.studio.textLow,
              transition: brand.transition.base,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = brand.studio.textHi }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = brand.studio.textLow }}
          >
            {cat}
            {active && (
              <motion.div
                layoutId="studioCategoryUnderline"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  position: 'absolute',
                  left: 8, right: 8, bottom: -1, height: 2,
                  borderRadius: 2, background: brand.colors.gold,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Swatch strip (columns=0) or grid (columns>0, mobile expanded) ─────────────
function SwatchGrid({ c, columns }: { c: StudioController; columns: number }) {
  const reduced = usePrefersReducedMotion()
  const activeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const grid = columns > 0

  useEffect(() => {
    const el = activeRef.current
    const box = containerRef.current
    if (!el || !box) return
    if (grid) {
      el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    } else {
      // Horizontal-only — scroll the strip, never the page (avoids scroll jank).
      const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
      box.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [c.currentStrap?.key, reduced, grid])

  return (
    <div
      ref={containerRef}
      style={grid
        ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, paddingBottom: 8 }
        : { display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '2px 2px 6px', justifyContent: 'safe center' }}
    >
      {c.categoryStraps.map(s => (
        <Swatch
          key={s.key}
          strap={s}
          active={s.key === c.currentStrap?.key}
          fullWidth={grid}
          innerRef={s.key === c.currentStrap?.key ? activeRef : undefined}
          onSelect={() => c.selectStrap(s.id)}
        />
      ))}
      {c.categoryStraps.length === 0 && (
        <div style={{ color: brand.studio.textLow, font: `400 13px ${brand.font.sans}`, padding: '12px 0' }}>
          No straps here yet.
        </div>
      )}
    </div>
  )
}

function Swatch({
  strap, active, fullWidth, innerRef, onSelect,
}: {
  strap: StudioStrap
  active: boolean
  fullWidth: boolean
  innerRef?: React.Ref<HTMLButtonElement>
  onSelect: () => void
}) {
  return (
    <button
      ref={innerRef}
      onClick={onSelect}
      title={strap.label}
      style={{
        flex: fullWidth ? undefined : '0 0 auto',
        scrollSnapAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      <motion.div
        animate={active ? { scale: 1.05 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{
          width: fullWidth ? '100%' : 84,
          height: fullWidth ? 112 : 106,
          borderRadius: brand.radius.md,
          overflow: 'hidden',
          background: strap.imageUrl ? brand.colors.white : strap.colorHex ?? brand.colors.paperWarm,
          border: active ? `2px solid ${brand.colors.gold}` : `1px solid ${brand.studio.hairlineSoft}`,
          boxShadow: active ? brand.shadow.gold : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {strap.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={strap.imageUrl} alt={strap.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
      </motion.div>
      <span
        style={{
          font: `500 9px ${brand.font.sans}`,
          letterSpacing: '0.08em',
          color: active ? brand.colors.goldDeep : brand.studio.textLow,
        }}
      >
        {categoryAbbrev(strap.category)}
      </span>
    </button>
  )
}
