'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CatalogWatch, PlaygroundBox } from '@/types/watch'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { normalizePlaygroundBoxes } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'
import { useCollectionSession } from '../CollectionSessionProvider'
import { brand } from '@/lib/brand'

const MATERIAL_OPTIONS = ['Stainless Steel', 'Yellow Gold', 'Rose Gold', 'White Gold', 'Titanium', 'Ceramic', 'Bronze']
const COLOR_OPTIONS = ['Black', 'White', 'Blue', 'Green', 'Grey', 'Silver', 'Champagne', 'Brown', 'Red', 'Salmon']
const SIZE_OPTIONS = ['≤38mm', '39–41mm', '≥42mm'] as const

type SizeFilter = (typeof SIZE_OPTIONS)[number] | null

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function matchesColor(watch: CatalogWatch, color: string) {
  return watch.dialColor.toLowerCase().includes(color.toLowerCase())
}

function matchesSize(watch: CatalogWatch, size: SizeFilter) {
  if (!size) return true
  if (size === '≤38mm') return watch.caseSizeMm <= 38
  if (size === '39–41mm') return watch.caseSizeMm >= 39 && watch.caseSizeMm <= 41
  return watch.caseSizeMm >= 42
}

function loadPlaygroundBoxes() {
  try {
    const stored = localStorage.getItem('playgroundBoxes')
    return normalizePlaygroundBoxes(stored ? JSON.parse(stored) : null, SEEDED_PLAYGROUND_BOXES)
  } catch {
    return SEEDED_PLAYGROUND_BOXES
  }
}

function buildDetailHref(watchId: string, options: { duplicate?: boolean; dest?: string | null; boxId?: string | null }) {
  const params = new URLSearchParams()
  if (options.duplicate) params.set('duplicate', 'true')
  if (options.dest) params.set('dest', options.dest)
  if (options.boxId) params.set('boxId', options.boxId)
  const query = params.toString()
  return `/collection/add/${watchId}${query ? `?${query}` : ''}`
}

// ─── Filter UI primitives ─────────────────────────────────────────────────────

const PHOTOS_WARN_BG = '#FFF8E6'
const PHOTOS_WARN_BORDER = '#E8D9B0'
const PHOTOS_WARN_TEXT = '#8A6A10'
const CHIP_FILL = '#F0EBE3'

function SlidersIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h7M11 4h3M2 8h3M7 8h7M2 12h9M13 12h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" fill={brand.colors.bg} />
      <circle cx="6" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" fill={brand.colors.bg} />
      <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" fill={brand.colors.bg} />
    </svg>
  )
}

function CrossIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function PhotoIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="11" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="7.25" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 3V2.2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7V3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function FacetChip({
  label,
  count,
  active,
  disabled,
  onClick,
  size = 'md',
}: {
  label: string
  count?: number
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
}) {
  const padY = size === 'sm' ? 4 : 6
  const padX = size === 'sm' ? 10 : 12
  const fs = size === 'sm' ? 10.5 : 11.5
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `${padY}px ${padX}px`,
        borderRadius: brand.radius.pill,
        fontFamily: brand.font.sans,
        fontSize: fs,
        fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        border: active ? `1px solid ${brand.colors.ink}` : `1px solid ${brand.colors.border}`,
        background: active ? brand.colors.ink : 'transparent',
        color: active ? brand.colors.bg : disabled ? brand.colors.muted : brand.colors.ink,
        opacity: disabled ? 0.42 : 1,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        transition: 'all 0.15s',
      }}
    >
      <span>{label}</span>
      {count != null && (
        <span
          style={{
            fontSize: fs - 2.5,
            padding: '1px 6px',
            borderRadius: brand.radius.pill,
            fontWeight: 600,
            background: active ? 'rgba(255,255,255,0.18)' : CHIP_FILL,
            color: active ? brand.colors.bg : brand.colors.muted,
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

type FilterCounts = {
  materialCounts: Record<string, number>
  colorCounts: Record<string, number>
  sizeCounts: Record<string, number>
}

interface FilterBodyProps {
  hasPhotos: boolean
  onTogglePhotos: () => void
  materialFilter: string | null
  colorFilter: string | null
  sizeFilter: SizeFilter
  setMaterialFilter: (next: string | null) => void
  setColorFilter: (next: string | null) => void
  setSizeFilter: (next: SizeFilter) => void
  counts: FilterCounts
  showAllZeros: boolean
  setShowAllZeros: (next: boolean) => void
}

interface MobileFilterSheetProps extends FilterBodyProps {
  open: boolean
  onClose: () => void
  onReset: () => void
  resultsCount: number
}

interface FiltersPopoverProps extends FilterBodyProps {
  onClose: () => void
}

function PhotosToggleRow({
  checked,
  onChange,
  bordered,
}: {
  checked: boolean
  onChange: () => void
  bordered: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        padding: bordered ? '14px 16px' : '0 0 18px',
        marginBottom: bordered ? 0 : 18,
        borderRadius: bordered ? brand.radius.xl : 0,
        background: bordered ? brand.colors.slot : 'transparent',
        border: bordered ? `1px solid ${brand.colors.borderMid}` : 'none',
        borderBottom: bordered ? `1px solid ${brand.colors.borderMid}` : `1px solid ${brand.colors.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: brand.radius.md,
            background: brand.colors.bg,
            color: brand.colors.ink,
            flexShrink: 0,
          }}
        >
          <PhotoIcon size={16} />
        </div>
        <div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 13, fontWeight: 600, color: brand.colors.ink, marginBottom: 2 }}>
            Show only watches with photos
          </div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 11.5, color: brand.colors.muted, lineHeight: 1.45 }}>
            We&apos;re still adding photos. Turn off to see the full catalog.
          </div>
        </div>
      </div>
      <FilterSwitch checked={checked} onChange={onChange} />
    </div>
  )
}

function FacetGroup({
  label,
  facetKey,
  options,
  selected,
  onSelect,
  countsByOption,
  showAllZeros,
  setShowAllZeros,
  chipSize = 'md',
}: {
  label: string
  facetKey: string
  options: string[]
  selected: string | null
  onSelect: (value: string) => void
  countsByOption: Record<string, number>
  showAllZeros: boolean
  setShowAllZeros: (next: boolean) => void
  chipSize?: 'sm' | 'md'
}) {
  const visible = showAllZeros
    ? options
    : options.filter(o => (countsByOption[o] ?? 0) > 0 || selected === o)
  const hidden = options.length - visible.length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
          }}
        >
          {label}
        </div>
        {selected ? (
          <span style={{ fontFamily: brand.font.sans, fontSize: 10.5, color: brand.colors.gold, fontWeight: 500 }}>
            {selected}
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {visible.map(option => {
          const count = countsByOption[option] ?? 0
          const active = selected === option
          return (
            <FacetChip
              key={`${facetKey}-${option}`}
              label={option}
              count={count}
              active={active}
              disabled={count === 0 && !active}
              onClick={() => onSelect(option)}
              size={chipSize}
            />
          )
        })}
        {hidden > 0 && !showAllZeros ? (
          <button
            type="button"
            onClick={() => setShowAllZeros(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.muted,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              padding: '6px 4px',
            }}
          >
            + {hidden} more
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FilterSheetBody({
  hasPhotos,
  onTogglePhotos,
  materialFilter,
  colorFilter,
  sizeFilter,
  setMaterialFilter,
  setColorFilter,
  setSizeFilter,
  counts,
  showAllZeros,
  setShowAllZeros,
}: FilterBodyProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <PhotosToggleRow checked={hasPhotos} onChange={onTogglePhotos} bordered />
      <FacetGroup
        label="Case Material"
        facetKey="material"
        options={[...MATERIAL_OPTIONS]}
        selected={materialFilter}
        onSelect={value => setMaterialFilter(materialFilter === value ? null : value)}
        countsByOption={counts.materialCounts}
        showAllZeros={showAllZeros}
        setShowAllZeros={setShowAllZeros}
      />
      <FacetGroup
        label="Dial Color"
        facetKey="color"
        options={[...COLOR_OPTIONS]}
        selected={colorFilter}
        onSelect={value => setColorFilter(colorFilter === value ? null : value)}
        countsByOption={counts.colorCounts}
        showAllZeros={showAllZeros}
        setShowAllZeros={setShowAllZeros}
      />
      <FacetGroup
        label="Case Size"
        facetKey="size"
        options={[...SIZE_OPTIONS]}
        selected={sizeFilter}
        onSelect={value => setSizeFilter(sizeFilter === value ? null : (value as SizeFilter))}
        countsByOption={counts.sizeCounts}
        showAllZeros={showAllZeros}
        setShowAllZeros={setShowAllZeros}
      />
    </div>
  )
}

function MobileFilterSheet({
  open,
  onClose,
  onReset,
  resultsCount,
  ...body
}: MobileFilterSheetProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: brand.colors.bg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 201,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(26,20,16,0.16)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px 14px',
            borderBottom: `1px solid ${brand.colors.border}`,
          }}
        >
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 400, margin: 0, color: brand.colors.ink }}>
            Filters
          </h3>
          <button
            type="button"
            onClick={onReset}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.muted,
              fontWeight: 500,
              letterSpacing: '0.04em',
            }}
          >
            Reset
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
          <FilterSheetBody {...body} />
        </div>
        <div
          style={{
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
            borderTop: `1px solid ${brand.colors.border}`,
            background: brand.colors.slot,
            display: 'flex',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: '0 0 auto',
              padding: '12px 18px',
              borderRadius: brand.radius.md,
              background: 'transparent',
              border: `1px solid ${brand.colors.borderLight}`,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              color: brand.colors.ink,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: brand.radius.md,
              background: brand.colors.ink,
              border: 'none',
              color: brand.colors.bg,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            Show {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
          </button>
        </div>
      </div>
    </>
  )
}

function FiltersPopover({ onClose, ...body }: FiltersPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null
      if (ref.current?.contains(target)) return
      // Ignore clicks on the Filters trigger — the trigger's onClick handles toggling.
      if (target?.closest('[data-filter-trigger="true"]')) return
      onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        left: 0,
        width: 'min(680px, 100%)',
        zIndex: 110,
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.xl,
        boxShadow: '0 12px 32px rgba(26,20,16,0.12)',
        padding: '20px 22px',
      }}
    >
      <PhotosToggleRow checked={body.hasPhotos} onChange={body.onTogglePhotos} bordered={false} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
        <FacetGroup
          label="Case Material"
          facetKey="material"
          options={[...MATERIAL_OPTIONS]}
          selected={body.materialFilter}
          onSelect={value => body.setMaterialFilter(body.materialFilter === value ? null : value)}
          countsByOption={body.counts.materialCounts}
          showAllZeros={body.showAllZeros}
          setShowAllZeros={body.setShowAllZeros}
          chipSize="sm"
        />
        <FacetGroup
          label="Dial Color"
          facetKey="color"
          options={[...COLOR_OPTIONS]}
          selected={body.colorFilter}
          onSelect={value => body.setColorFilter(body.colorFilter === value ? null : value)}
          countsByOption={body.counts.colorCounts}
          showAllZeros={body.showAllZeros}
          setShowAllZeros={body.setShowAllZeros}
          chipSize="sm"
        />
        <FacetGroup
          label="Case Size"
          facetKey="size"
          options={[...SIZE_OPTIONS]}
          selected={body.sizeFilter}
          onSelect={value => body.setSizeFilter(body.sizeFilter === value ? null : (value as SizeFilter))}
          countsByOption={body.counts.sizeCounts}
          showAllZeros={body.showAllZeros}
          setShowAllZeros={body.setShowAllZeros}
          chipSize="sm"
        />
      </div>
    </div>
  )
}

function FilterSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        position: 'relative',
        width: 44,
        height: 26,
        borderRadius: brand.radius.pill,
        background: checked ? brand.colors.ink : brand.colors.borderLight,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
        transition: 'background 0.18s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: brand.radius.circle,
          background: brand.colors.white,
          transition: 'left 0.18s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

export default function AddWatchSearchPage() {
  return (
    <Suspense>
      <AddWatchSearchInner />
    </Suspense>
  )
}

function AddWatchSearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isInCollection } = useCollectionSession()
  const { allWatches: catalogWatches } = useCatalog()
  const { getImageUrl } = useWatchImages()

  const dest = searchParams.get('dest')
  const boxId = searchParams.get('boxId')
  const fromHome = searchParams.get('from') === 'home'
  const isPlaygroundContext = dest === 'playground'
  const isExploreContext = dest === 'explore'

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '')
  const [materialFilter, setMaterialFilter] = useState<string | null>(null)
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>(null)
  const [playgroundBoxName, setPlaygroundBoxName] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showAllZeros, setShowAllZeros] = useState(false)
  const [screenWidth, setScreenWidth] = useState(0)
  const hasPhotos = !showAll
  const isMobile = screenWidth > 0 && screenWidth < 768

  useEffect(() => {
    const update = () => setScreenWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!filtersOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  function watchHasImage(w: CatalogWatch) {
    return !!(getImageUrl(w.id) || w.imageUrl)
  }

  useEffect(() => {
    if (!isPlaygroundContext || !boxId) return
    const boxes = loadPlaygroundBoxes()
    const box = boxes.find((item: PlaygroundBox) => item.id === boxId)
    if (box) setPlaygroundBoxName(box.name)
  }, [isPlaygroundContext, boxId])

  // All term matches regardless of photo status — used for toggle count + "All" mode
  const allTermResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []
    return catalogWatches.filter(w => [w.brand, w.model, w.reference].some(v => v.toLowerCase().includes(term)))
  }, [searchTerm, catalogWatches])

  // Filtered by photo availability based on toggle
  const baseResults = useMemo(() => {
    if (showAll) return allTermResults
    return allTermResults.filter(w => watchHasImage(w))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTermResults, showAll, getImageUrl])

  const filteredResults = useMemo(() => {
    return baseResults.filter(watch => {
      const materialMatch = !materialFilter || watch.caseMaterial.toLowerCase().includes(materialFilter.toLowerCase())
      const colorMatch = !colorFilter || matchesColor(watch, colorFilter)
      const sizeMatch = matchesSize(watch, sizeFilter)
      return materialMatch && colorMatch && sizeMatch
    })
  }, [baseResults, colorFilter, materialFilter, sizeFilter])

  const counts = useMemo(() => {
    const materialCounts: Record<string, number> = {}
    const colorCounts: Record<string, number> = {}
    const sizeCounts: Record<string, number> = {}

    MATERIAL_OPTIONS.forEach(option => {
      materialCounts[option] = baseResults.filter(w => {
        const colorMatch = !colorFilter || matchesColor(w, colorFilter)
        const sizeMatch = matchesSize(w, sizeFilter)
        return colorMatch && sizeMatch && w.caseMaterial.toLowerCase().includes(option.toLowerCase())
      }).length
    })

    COLOR_OPTIONS.forEach(option => {
      colorCounts[option] = baseResults.filter(w => {
        const materialMatch = !materialFilter || w.caseMaterial.toLowerCase().includes(materialFilter.toLowerCase())
        const sizeMatch = matchesSize(w, sizeFilter)
        return materialMatch && sizeMatch && matchesColor(w, option)
      }).length
    })

    SIZE_OPTIONS.forEach(option => {
      sizeCounts[option] = baseResults.filter(w => {
        const materialMatch = !materialFilter || w.caseMaterial.toLowerCase().includes(materialFilter.toLowerCase())
        const colorMatch = !colorFilter || matchesColor(w, colorFilter)
        return materialMatch && colorMatch && matchesSize(w, option)
      }).length
    })

    return { materialCounts, colorCounts, sizeCounts }
  }, [baseResults, colorFilter, materialFilter, sizeFilter])

  const backLabel = isPlaygroundContext
    ? '← Back to Playground'
    : isExploreContext
    ? '← Back'
    : fromHome
    ? '← Home'
    : '← My Collection'
  const backHref = isPlaygroundContext
    ? '/playground'
    : isExploreContext
    ? '/'
    : fromHome
    ? '/'
    : '/collection'
  const pageTitle = isPlaygroundContext
    ? (playgroundBoxName ? `Add to ${playgroundBoxName}` : 'Add to Playground')
    : isExploreContext
    ? 'Explore Watches'
    : fromHome
    ? 'Search Watches'
    : 'Find a Watch'
  const pageSubtitle = isPlaygroundContext
    ? 'Search the catalog, then choose Collection or Playground on the watch detail page'
    : isExploreContext
    ? 'Browse over 200 watches from the world\'s finest makers'
    : 'Search by brand, model, or reference number'

  return (
    <div style={{ padding: '56px 56px 120px', borderTop: '1px solid #EAE5DC' }}>
      <button
        onClick={() => router.push(backHref)}
        style={{
          background: 'none', border: 'none', padding: 0, marginBottom: 14,
          cursor: 'pointer', color: '#A89880',
          fontFamily: 'var(--font-dm-sans)', fontSize: 11,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        {backLabel}
      </button>

      <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, fontWeight: 400, color: '#1A1410', margin: '0 0 6px' }}>
        {pageTitle}
      </h1>
      <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880' }}>
        {pageSubtitle}
      </p>

      <input
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search brand, model, or reference..."
        style={{
          width: '100%', padding: '12px 16px',
          border: '1px solid #E0DAD0', borderRadius: 8,
          fontFamily: 'var(--font-dm-sans)', fontSize: 15, color: '#1A1410',
          background: '#FFFFFF', outline: 'none', marginBottom: 16,
        }}
      />

      {searchTerm.length > 0 && (
        <>
          {(() => {
            const activeCount =
              (materialFilter ? 1 : 0) +
              (colorFilter ? 1 : 0) +
              (sizeFilter ? 1 : 0) +
              (hasPhotos === false ? 1 : 0)
            const facetChips: Array<{ key: string; label: string; clear: () => void }> = []
            if (materialFilter) facetChips.push({ key: 'material', label: materialFilter, clear: () => setMaterialFilter(null) })
            if (colorFilter) facetChips.push({ key: 'color', label: colorFilter, clear: () => setColorFilter(null) })
            if (sizeFilter) facetChips.push({ key: 'size', label: sizeFilter, clear: () => setSizeFilter(null) })
            const showResetLink = facetChips.length > 0 || hasPhotos === false
            const resetAll = () => {
              setMaterialFilter(null)
              setColorFilter(null)
              setSizeFilter(null)
              setShowAll(false)
              setShowAllZeros(false)
            }
            return (
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(o => !o)}
                    aria-expanded={filtersOpen}
                    data-filter-trigger="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: brand.radius.pill,
                      background: activeCount > 0 ? brand.colors.ink : 'transparent',
                      border: `1px solid ${activeCount > 0 ? brand.colors.ink : brand.colors.borderLight}`,
                      color: activeCount > 0 ? brand.colors.bg : brand.colors.ink,
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <SlidersIcon />
                    <span>Filters</span>
                    {activeCount > 0 ? (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        background: brand.colors.gold,
                        color: brand.colors.ink,
                        padding: '1px 7px',
                        borderRadius: brand.radius.pill,
                        minWidth: 18,
                        textAlign: 'center',
                      }}>
                        {activeCount}
                      </span>
                    ) : null}
                  </button>

                  <div
                    className="filter-summary-scroll"
                    style={{
                      display: 'flex',
                      gap: 6,
                      overflowX: 'auto',
                      flex: 1,
                      alignItems: 'center',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                    }}
                  >
                    {hasPhotos ? (
                      <button
                        type="button"
                        onClick={() => setShowAll(v => !v)}
                        title="Click to include watches without photos"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px 5px 11px',
                          borderRadius: brand.radius.pill,
                          background: 'transparent',
                          border: `1px solid ${brand.colors.border}`,
                          fontFamily: brand.font.sans,
                          fontSize: 11,
                          fontWeight: 500,
                          color: brand.colors.muted,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <PhotoIcon size={11} />
                        <span>Photos only</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 14,
                          height: 14,
                          borderRadius: brand.radius.pill,
                          background: CHIP_FILL,
                          color: brand.colors.muted,
                        }}>
                          <CrossIcon size={8} />
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAll(v => !v)}
                        title="Click to show only watches with photos"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 6px 5px 11px',
                          borderRadius: brand.radius.pill,
                          background: PHOTOS_WARN_BG,
                          border: `1px solid ${PHOTOS_WARN_BORDER}`,
                          fontFamily: brand.font.sans,
                          fontSize: 11,
                          fontWeight: 500,
                          color: PHOTOS_WARN_TEXT,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <span>Showing all watches</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: brand.radius.pill,
                          background: 'rgba(138,106,16,0.12)',
                          color: PHOTOS_WARN_TEXT,
                        }}>
                          <CrossIcon size={9} />
                        </span>
                      </button>
                    )}

                    {facetChips.map(chip => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={chip.clear}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 6px 5px 11px',
                          borderRadius: brand.radius.pill,
                          background: CHIP_FILL,
                          border: `1px solid ${brand.colors.border}`,
                          fontFamily: brand.font.sans,
                          fontSize: 11.5,
                          fontWeight: 500,
                          color: brand.colors.ink,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <span>{chip.label}</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: brand.radius.pill,
                          background: 'rgba(26,20,16,0.08)',
                          color: brand.colors.ink,
                        }}>
                          <CrossIcon size={9} />
                        </span>
                      </button>
                    ))}

                    {showResetLink ? (
                      <button
                        type="button"
                        onClick={resetAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: brand.font.sans,
                          fontSize: 11,
                          color: brand.colors.muted,
                          textDecoration: 'underline',
                          textUnderlineOffset: 2,
                          padding: '0 6px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Desktop popover */}
                {!isMobile && filtersOpen ? (
                  <FiltersPopover
                    onClose={() => setFiltersOpen(false)}
                    hasPhotos={hasPhotos}
                    onTogglePhotos={() => setShowAll(v => !v)}
                    materialFilter={materialFilter}
                    colorFilter={colorFilter}
                    sizeFilter={sizeFilter}
                    setMaterialFilter={setMaterialFilter}
                    setColorFilter={setColorFilter}
                    setSizeFilter={setSizeFilter}
                    counts={counts}
                    showAllZeros={showAllZeros}
                    setShowAllZeros={setShowAllZeros}
                  />
                ) : null}

                {/* Mobile bottom sheet */}
                {isMobile ? (
                  <MobileFilterSheet
                    open={filtersOpen}
                    onClose={() => setFiltersOpen(false)}
                    onReset={resetAll}
                    resultsCount={filteredResults.length}
                    hasPhotos={hasPhotos}
                    onTogglePhotos={() => setShowAll(v => !v)}
                    materialFilter={materialFilter}
                    colorFilter={colorFilter}
                    sizeFilter={sizeFilter}
                    setMaterialFilter={setMaterialFilter}
                    setColorFilter={setColorFilter}
                    setSizeFilter={setSizeFilter}
                    counts={counts}
                    showAllZeros={showAllZeros}
                    setShowAllZeros={setShowAllZeros}
                  />
                ) : null}
              </div>
            )
          })()}

          {filteredResults.length === 0 && (
            <div style={{ textAlign: 'center', color: '#A89880', fontFamily: 'var(--font-dm-sans)', fontSize: 12, padding: '28px 12px' }}>
              No watches found. Try a different search or adjust filters.
            </div>
          )}

          {filteredResults.length > 0 && (
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#1A1410', marginBottom: 12 }}>
              {filteredResults.length} results
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))', gap: 16, justifyContent: 'start' }}>
            {filteredResults.map(watch => {
              const inCollection = isInCollection(watch.id)

              return (
                <div
                  key={watch.id}
                  onClick={() => router.push(buildDetailHref(watch.id, { dest, boxId }))}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = brand.colors.goldLine }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = brand.colors.border }}
                  style={{
                    position: 'relative',
                    background: brand.colors.white,
                    border: `1px solid ${brand.colors.border}`,
                    borderRadius: brand.radius.xl,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <WatchStateControl
                    catalogWatchId={watch.id}
                    source="add_flow"
                    size="sm"
                    placement="top-right"
                  />
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '4 / 3',
                      background: brand.colors.bg,
                      borderBottom: `1px solid ${brand.colors.border}`,
                    }}
                  >
                    <WatchImageOrDial
                      watch={watch}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      dialSize={140}
                      imageStyle={{ objectFit: 'contain', padding: 14 }}
                    />
                  </div>
                  <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
                      {watch.brand}
                    </div>
                    <div style={{ fontFamily: brand.font.serif, fontSize: 20, fontWeight: 400, lineHeight: 1.1, color: brand.colors.ink }}>
                      {watch.model}
                    </div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Ref. {watch.reference}
                    </div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginTop: 2 }}>
                      {watch.caseSizeMm}mm · {watch.caseMaterial} · {watch.dialColor}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: brand.font.sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink }}>
                        {fmt(watch.estimatedValue)}
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {!watchHasImage(watch) && (
                          <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 7px', borderRadius: brand.radius.pill, border: `1px solid ${brand.colors.border}`, color: brand.colors.muted, fontStyle: 'italic' }}>
                            no photo
                          </span>
                        )}
                        {inCollection ? (
                          <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 8px', borderRadius: brand.radius.pill, background: '#E8F4E8', color: '#2D6A2D' }}>
                            In Collection
                          </span>
                        ) : (
                          <span style={{ fontFamily: brand.font.sans, fontSize: 9, padding: '2px 8px', borderRadius: brand.radius.pill, background: brand.colors.ink, color: brand.colors.bg }}>
                            {watch.watchType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
