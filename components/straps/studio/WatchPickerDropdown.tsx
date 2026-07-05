'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import type { CatalogWatch } from '@/types/watch'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import type { StudioController } from './useStudioController'

export default function WatchPickerDropdown({ c }: { c: StudioController }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'owned' | 'catalog'>('owned')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open && !c.hasOwned) setTab('catalog')
  }, [c.hasOwned, open])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Explicit action label — the watch's identity already sits front and
          centre in the caption, and a brand-only pill is ambiguous when two
          owned watches share a brand. */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: brand.font.sans, fontSize: isMobile ? 11.5 : 12, fontWeight: 600,
          letterSpacing: '0.08em', padding: isMobile ? '7px 12px' : '7px 14px',
          borderRadius: brand.radius.btn, border: `1px solid ${brand.colors.borderLight}`,
          background: 'transparent', color: brand.colors.ink, cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {isMobile ? 'Watch' : 'Change Watch'}
        <span style={{ color: brand.colors.goldDeep, fontSize: 11 }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={isMobile ? mobilePanel : desktopPanel}
          >
            <div style={{ display: 'flex', gap: 2, padding: 6, borderBottom: `1px solid ${brand.studio.hairlineSoft}` }}>
              {(['owned', 'catalog'] as const).map(t => {
                const active = tab === t
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: brand.radius.sm, border: 'none', cursor: 'pointer',
                      font: `500 12px ${brand.font.sans}`, letterSpacing: '0.03em',
                      color: active ? brand.colors.slot : brand.studio.textMid,
                      background: active ? brand.colors.ink : 'transparent',
                    }}
                  >
                    {t === 'owned' ? 'My Watches' : 'Browse Catalog'}
                  </button>
                )
              })}
            </div>
            {tab === 'owned'
              ? <OwnedList c={c} onPick={() => setOpen(false)} />
              : <CatalogSearch c={c} onPick={() => setOpen(false)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OwnedList({ c, onPick }: { c: StudioController; onPick: () => void }) {
  // Integrated-bracelet watches are never Studio-eligible — see isIntegrated's
  // doc comment in useStudioController.
  const eligible = c.collectionWatches.filter(w => !c.isIntegrated(w.watchId))
  if (!eligible.length) {
    return (
      <div style={emptyHint}>
        {c.collectionWatches.length
          ? 'Your collection is all integrated-bracelet watches — Strap Studio doesn’t apply to those.'
          : 'No owned watches yet — try the catalog to dream.'}
      </div>
    )
  }
  return (
    <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
      {eligible.map(w => (
        <WatchRow
          key={w.id}
          active={w.watchId === c.watchId}
          imageUrl={w.imageUrl}
          brand={w.brand}
          model={w.model}
          reference={w.reference}
          lugWidthMm={w.lugWidthMm}
          onClick={() => { c.setWatch(w.watchId); onPick() }}
        />
      ))}
    </div>
  )
}

function CatalogSearch({ c, onPick }: { c: StudioController; onPick: () => void }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<CatalogWatch[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); return }
    let alive = true
    setLoading(true)
    const id = window.setTimeout(async () => {
      try {
        const res = await c.searchCatalog({ q: q.trim(), onlyWithImages: true, sortBy: 'heat', limit: 24 })
        // Integrated-bracelet watches are never Studio-eligible.
        if (alive) setRows(res.rows.filter(w => w.braceletType !== 'integrated'))
      } catch {
        if (alive) setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    }, 220)
    return () => { alive = false; window.clearTimeout(id) }
  }, [q, c])

  return (
    <div style={{ padding: 6 }}>
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search 35,000 watches…"
        style={{
          width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px',
          borderRadius: brand.radius.sm, border: `1px solid ${brand.studio.hairline}`,
          background: brand.colors.bg, color: brand.studio.textHi,
          font: `400 13px ${brand.font.sans}`, outline: 'none',
        }}
      />
      <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 6 }}>
        {loading && <div style={emptyHint}>Searching…</div>}
        {!loading && q.trim().length >= 2 && rows.length === 0 && <div style={emptyHint}>No matches.</div>}
        {rows.map(w => (
          <WatchRow
            key={w.id}
            active={w.id === c.watchId}
            imageUrl={w.imageUrl}
            brand={w.brand}
            model={w.model}
            reference={w.reference}
            lugWidthMm={w.lugWidthMm}
            onClick={() => { c.setWatch(w.id, w); onPick() }}
          />
        ))}
      </div>
    </div>
  )
}

function WatchRow({
  active, imageUrl, brand: b, model, reference, lugWidthMm, onClick,
}: {
  active: boolean
  imageUrl?: string
  brand: string
  model: string
  reference?: string
  lugWidthMm?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: 8, borderRadius: brand.radius.sm, cursor: 'pointer', border: 'none',
        background: active ? brand.colors.goldWash : 'transparent', marginBottom: 2,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = brand.colors.bg }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 42, height: 42, borderRadius: brand.radius.sm, background: brand.colors.paper, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : null}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ font: `600 12px ${brand.font.sans}`, color: brand.studio.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {b} {model}
        </div>
        <div style={{ font: `400 11px ${brand.font.sans}`, color: brand.studio.textLow, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {reference || '—'}
        </div>
      </div>
      {lugWidthMm != null && (
        <span style={{ flexShrink: 0, font: `600 10px ${brand.font.sans}`, color: brand.colors.goldDeep, border: `1px solid ${brand.colors.goldLine}`, borderRadius: brand.radius.sm, padding: '2px 6px' }}>
          {lugWidthMm}mm
        </span>
      )}
      {active && <span style={{ color: brand.colors.goldDeep, flexShrink: 0 }}>✓</span>}
    </button>
  )
}

const desktopPanel: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
  background: brand.studio.panelSolid, border: `1px solid ${brand.studio.hairlineSoft}`,
  borderRadius: brand.radius.lg, boxShadow: brand.shadow.menu, zIndex: brand.zIndex.dropdown,
  overflow: 'hidden',
}
const mobilePanel: React.CSSProperties = {
  position: 'fixed', top: 120, left: 8, right: 8,
  background: brand.studio.panelSolid, border: `1px solid ${brand.studio.hairlineSoft}`,
  borderRadius: brand.radius.lg, boxShadow: brand.shadow.menu, zIndex: brand.zIndex.dropdown,
  overflow: 'hidden',
}
const emptyHint: React.CSSProperties = {
  padding: '14px 10px', font: `400 12px ${brand.font.sans}`, color: brand.studio.textLow, textAlign: 'center',
}
