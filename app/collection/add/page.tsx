'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CatalogWatch, PlaygroundBox } from '@/types/watch'
import { useCatalog, type CatalogSearchParams } from '@/lib/catalog/CatalogProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { normalizePlaygroundBoxes } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import { brand } from '@/lib/brand'
import AddSearchWatchCard from '@/components/collection/AddSearchWatchCard'
import PhotoSearch, { type PhotoSearchHandle } from '@/components/PhotoSearch'
import SortDropdown from '@/components/collection/SortDropdown'

type SortMode = 'heat' | 'price_desc' | 'price_asc' | 'brand'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'heat',       label: 'Popularity' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'brand',      label: 'Brand (A–Z)' },
]

const MATERIAL_OPTIONS = ['Stainless Steel', 'Yellow Gold', 'Rose Gold', 'White Gold', 'Titanium', 'Ceramic', 'Bronze']
const COLOR_OPTIONS = ['Black', 'White', 'Blue', 'Green', 'Grey', 'Silver', 'Champagne', 'Brown', 'Red', 'Salmon']
const SIZE_OPTIONS = ['≤38mm', '39–41mm', '≥42mm'] as const

type SizeFilter = (typeof SIZE_OPTIONS)[number] | null

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

// ─── Filter UI primitives ─────────────────────────────────────────────────────

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

function CameraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.75" y="6.5" width="18.5" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 6.5l1.2-2.2c.2-.4.6-.6 1-.6h2.6c.4 0 .8.2 1 .6l1.2 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  // Brand picker — only rendered inside the sheet on mobile; desktop uses the
  // separate chip strip above the filter row.
  showBrandInBody?: boolean
  brandFilter?: string | null
  setBrandFilter?: (next: string | null) => void
  brandOptions?: string[]
  brandCounts?: Record<string, number>
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
  showBrandInBody,
  brandFilter,
  setBrandFilter,
  brandOptions,
  brandCounts,
}: FilterBodyProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <PhotosToggleRow checked={hasPhotos} onChange={onTogglePhotos} bordered />
      {showBrandInBody && brandOptions && brandOptions.length > 0 && setBrandFilter ? (
        <FacetGroup
          label="Brand"
          facetKey="brand"
          options={brandOptions}
          selected={brandFilter ?? null}
          onSelect={value => setBrandFilter(brandFilter === value ? null : value)}
          countsByOption={brandCounts ?? {}}
          showAllZeros={showAllZeros}
          setShowAllZeros={setShowAllZeros}
        />
      ) : null}
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

// Server-side page size for the catalog grid. Default state, search, and
// brand-filter all fetch in pages of this size sorted by heat. Additional
// pages are fetched on demand via the "Load more" control.
const PAGE_SIZE = 24
const BRAND_CHIP_INITIAL = 20
const SEARCH_DEBOUNCE_MS = 220

function AddWatchSearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { allWatches: catalogWatches, searchCatalog, brandIndex, fetchBrandCounts } = useCatalog()
  const { getImageUrl } = useWatchImages()

  const dest = searchParams.get('dest')
  const boxId = searchParams.get('boxId')
  const fromHome = searchParams.get('from') === 'home'
  const isPlaygroundContext = dest === 'playground'
  const isExploreContext = dest === 'explore'

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '')
  const [photoActive, setPhotoActive] = useState(false)
  const photoSearchRef = useRef<PhotoSearchHandle>(null)
  const [brandFilter, setBrandFilter] = useState<string | null>(null)
  const [materialFilter, setMaterialFilter] = useState<string | null>(null)
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>(null)
  const [playgroundBoxName, setPlaygroundBoxName] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showAllZeros, setShowAllZeros] = useState(false)
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [sortBy, setSortBy] = useState<SortMode>('heat')
  const [screenWidth, setScreenWidth] = useState(0)

  // ── Server-side search state ─────────────────────────────────────────
  // We can't filter the entire 35k catalog client-side anymore — only the
  // top 2000 by heat sit in memory. The grid always fetches from Supabase:
  // default state (no query) shows the top PAGE_SIZE by heat; typing or
  // brand-clicking re-runs the query; "Load more" appends the next page.
  const [serverResults, setServerResults] = useState<CatalogWatch[]>([])
  const [serverTotal, setServerTotal] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const searchAbortRef = useRef<number>(0)
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

  // Server-side search: re-fetch when search term, brand, or photos-only
  // toggle changes. Debounced so typing doesn't hammer Supabase. With no
  // term and no brand we still fetch a page — the top PAGE_SIZE by heat —
  // so the page has browse-fodder instead of a blank canvas.
  // When photos-only is on we restrict the query to imaged refs server-side
  // — otherwise the response window fills with vintage refs that don't
  // pass the client photo filter and we'd show 1 result out of thousands.
  useEffect(() => {
    const term = searchTerm.trim()
    const myToken = ++searchAbortRef.current
    setSearchLoading(true)
    const handle = window.setTimeout(async () => {
      try {
        // Note: when sortBy='price_asc', ~138 refs have estimated_value=0
        // (no market data yet). They'll pile at the top of price_asc. If it
        // looks bad in QA, gate the server query with gt('estimated_value', 0).
        const params: CatalogSearchParams = {
          q: term || undefined,
          brand: brandFilter || undefined,
          onlyWithImages: !showAll,
          limit: PAGE_SIZE,
          offset: 0,
          sortBy,
        }
        const { rows, total } = await searchCatalog(params)
        if (myToken !== searchAbortRef.current) return
        setServerResults(rows)
        setServerTotal(total)
      } catch (err) {
        console.warn('[Add Watch] searchCatalog failed', err)
        if (myToken === searchAbortRef.current) {
          setServerResults([])
          setServerTotal(0)
        }
      } finally {
        if (myToken === searchAbortRef.current) setSearchLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [searchTerm, brandFilter, showAll, sortBy, searchCatalog])

  const loadMore = useCallback(async () => {
    const term = searchTerm.trim()
    const myToken = ++searchAbortRef.current
    setLoadingMore(true)
    try {
      const { rows, total } = await searchCatalog({
        q: term || undefined,
        brand: brandFilter || undefined,
        onlyWithImages: !showAll,
        limit: PAGE_SIZE,
        offset: serverResults.length,
        sortBy,
      })
      if (myToken !== searchAbortRef.current) return
      setServerResults(prev => [...prev, ...rows])
      setServerTotal(total)
    } catch (err) {
      console.warn('[Add Watch] loadMore failed', err)
    } finally {
      if (myToken === searchAbortRef.current) setLoadingMore(false)
    }
  }, [searchTerm, brandFilter, showAll, sortBy, serverResults.length, searchCatalog])

  // Term/brand matches regardless of photo status. Always reflects the
  // current server page — in default state this is the top heat slice.
  const allTermResults = serverResults

  void catalogWatches // satisfy linter — kept for fallback parity in other flows

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

  // ── Brand filter options ─────────────────────────────────────────────
  // Two modes:
  //   • search active (and no brand filter yet) → derive chips from the
  //     current serverResults so the user sees the brands that actually
  //     match their query and can narrow with one click.
  //   • otherwise (default state, or brand already locked in) → fall back
  //     to the global popularity list so the user can switch brands.
  const ALL_BRAND_OPTIONS = useMemo(() => brandIndex.map(b => b.brand), [brandIndex])
  const baselineBrandCounts: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {}
    for (const b of brandIndex) out[b.brand] = b.count
    return out
  }, [brandIndex])

  // Filter-aware brand chip counts. Re-fetched whenever a filter that
  // affects the result set changes. Falls back to baselineBrandCounts
  // (the static top-2000-by-heat) before the first fetch completes.
  const [filterAwareBrandCounts, setFilterAwareBrandCounts] = useState<Record<string, number> | null>(null)
  const brandCountAbortRef = useRef<number>(0)
  useEffect(() => {
    if (ALL_BRAND_OPTIONS.length === 0) return
    const myToken = ++brandCountAbortRef.current
    const term = searchTerm.trim()
    // 220ms matches the debounce on the main search so the chip update
    // doesn't race ahead of the result list.
    const handle = window.setTimeout(async () => {
      try {
        const counts = await fetchBrandCounts(
          {
            q: term || undefined,
            onlyWithImages: !showAll,
            caseMaterial: materialFilter || undefined,
            dialColor: colorFilter || undefined,
            caseSizeBucket:
              sizeFilter === '≤38mm' ? '<=38'
              : sizeFilter === '39–41mm' ? '39-41'
              : sizeFilter === '≥42mm' ? '>=42'
              : null,
          },
          ALL_BRAND_OPTIONS,
        )
        if (myToken !== brandCountAbortRef.current) return
        const obj: Record<string, number> = {}
        for (const [k, v] of counts) obj[k] = v
        setFilterAwareBrandCounts(obj)
      } catch (err) {
        if (myToken === brandCountAbortRef.current) {
          console.warn('[Add Watch] fetchBrandCounts failed', err)
        }
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [ALL_BRAND_OPTIONS, searchTerm, showAll, materialFilter, colorFilter, sizeFilter, fetchBrandCounts])

  // Use the dynamic counts once available, else the baseline.
  const globalBrandCounts: Record<string, number> = filterAwareBrandCounts ?? baselineBrandCounts

  const useResultBrands = !!searchTerm.trim() && !brandFilter
  const resultBrandEntries = useMemo(() => {
    if (!useResultBrands) return []
    const counts = new Map<string, number>()
    for (const w of serverResults) {
      if (w.brand && w.brand.trim()) counts.set(w.brand, (counts.get(w.brand) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
  }, [useResultBrands, serverResults])

  const BRAND_OPTIONS = useMemo(() => {
    if (useResultBrands) return resultBrandEntries.map(e => e.brand)
    return showAllBrands ? ALL_BRAND_OPTIONS : ALL_BRAND_OPTIONS.slice(0, BRAND_CHIP_INITIAL)
  }, [useResultBrands, resultBrandEntries, ALL_BRAND_OPTIONS, showAllBrands])

  const brandCounts: Record<string, number> = useMemo(() => {
    if (!useResultBrands) return globalBrandCounts
    const out: Record<string, number> = {}
    for (const e of resultBrandEntries) out[e.brand] = e.count
    return out
  }, [useResultBrands, resultBrandEntries, globalBrandCounts])

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
    ? 'Browse thousands of watches from the world\'s finest makers'
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

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search brand, model, or reference..."
          style={{
            width: '100%', padding: '12px 52px 12px 16px',
            border: '1px solid #E0DAD0', borderRadius: 8,
            // 16px is the iOS Safari focus-zoom threshold — anything smaller
            // triggers an auto-zoom that persists and breaks the layout.
            fontFamily: 'var(--font-dm-sans)', fontSize: 16, color: '#1A1410',
            background: '#FFFFFF', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => photoSearchRef.current?.open()}
          aria-label="Identify a watch from a photo"
          title="Identify a watch from a photo"
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: brand.radius.md,
            background: 'transparent',
            border: 'none',
            color: brand.colors.ink,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = brand.colors.slot }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <CameraIcon size={20} />
        </button>
      </div>

      <PhotoSearch
        ref={photoSearchRef}
        dest={dest}
        boxId={boxId}
        onSwitchToSearch={(prefill) => {
          if (prefill) setSearchTerm(prefill)
        }}
        onActiveChange={setPhotoActive}
      />

      {/* Brand chips — visible whenever the page is active (no search needed). */}
      {!photoActive && !isMobile && BRAND_OPTIONS.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: `1px solid ${brand.colors.borderLight}`,
          }}
        >
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              alignSelf: 'center',
              marginRight: 6,
            }}
          >
            Brand
          </div>
          {BRAND_OPTIONS.map(b => (
            <FacetChip
              key={`brand-${b}`}
              label={b}
              count={brandCounts[b] ?? 0}
              active={brandFilter === b}
              onClick={() => setBrandFilter(brandFilter === b ? null : b)}
              size="sm"
            />
          ))}
          {!useResultBrands && ALL_BRAND_OPTIONS.length > BRAND_CHIP_INITIAL && (
            <button
              type="button"
              onClick={() => setShowAllBrands(v => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                padding: '4px 6px',
                whiteSpace: 'nowrap',
              }}
            >
              {showAllBrands
                ? 'Show fewer'
                : `+ ${ALL_BRAND_OPTIONS.length - BRAND_CHIP_INITIAL} more`}
            </button>
          )}
        </div>
      )}

      {!photoActive && (
        <>
          {(() => {
            const activeCount =
              (brandFilter ? 1 : 0) +
              (materialFilter ? 1 : 0) +
              (colorFilter ? 1 : 0) +
              (sizeFilter ? 1 : 0) +
              (hasPhotos === false ? 1 : 0)
            const facetChips: Array<{ key: string; label: string; clear: () => void }> = []
            if (brandFilter) facetChips.push({ key: 'brand', label: brandFilter, clear: () => setBrandFilter(null) })
            if (materialFilter) facetChips.push({ key: 'material', label: materialFilter, clear: () => setMaterialFilter(null) })
            if (colorFilter) facetChips.push({ key: 'color', label: colorFilter, clear: () => setColorFilter(null) })
            if (sizeFilter) facetChips.push({ key: 'size', label: sizeFilter, clear: () => setSizeFilter(null) })
            const showResetLink = facetChips.length > 0 || hasPhotos === false
            const resetAll = () => {
              setBrandFilter(null)
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

                  <div style={{ flexShrink: 0 }}>
                    <SortDropdown
                      label="Sort"
                      value={sortBy}
                      options={SORT_OPTIONS}
                      onChange={v => setSortBy(v as SortMode)}
                      compact={isMobile}
                    />
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
                    showBrandInBody
                    brandFilter={brandFilter}
                    setBrandFilter={setBrandFilter}
                    brandOptions={ALL_BRAND_OPTIONS}
                    brandCounts={globalBrandCounts}
                  />
                ) : null}
              </div>
            )
          })()}

          {filteredResults.length === 0 && !searchLoading && (
            <div style={{ textAlign: 'center', color: '#A89880', fontFamily: 'var(--font-dm-sans)', fontSize: 12, padding: '28px 12px' }}>
              No watches found. Try a different search or adjust filters.
            </div>
          )}

          {(filteredResults.length > 0 || searchLoading) && (() => {
            const isDefaultState = !searchTerm.trim() && !brandFilter
            const noun = isDefaultState ? 'watches' : 'matches'
            const singular = isDefaultState ? 'watch' : 'match'
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 12,
                  color: '#1A1410',
                  marginBottom: 12,
                }}
              >
                <span>
                  {searchLoading && filteredResults.length === 0
                    ? 'Searching…'
                    : serverTotal > filteredResults.length
                    ? `Showing ${filteredResults.length.toLocaleString()} of ${serverTotal.toLocaleString()} ${noun}`
                    : `Showing ${filteredResults.length.toLocaleString()} ${filteredResults.length === 1 ? singular : noun}`}
                </span>
                {isDefaultState && filteredResults.length > 0 ? (
                  <span style={{ color: brand.colors.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Trending
                  </span>
                ) : null}
              </div>
            )
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))', gap: 16, justifyContent: 'start' }}>
            {filteredResults.map(watch => (
              <AddSearchWatchCard key={watch.id} watch={watch} dest={dest} boxId={boxId} />
            ))}
          </div>

          {serverResults.length < serverTotal && !searchLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '12px 24px',
                  borderRadius: brand.radius.md,
                  background: brand.colors.ink,
                  color: brand.colors.bg,
                  border: 'none',
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: loadingMore ? 'wait' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loadingMore
                  ? 'Loading…'
                  : `Load more (${(serverTotal - serverResults.length).toLocaleString()} more)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
