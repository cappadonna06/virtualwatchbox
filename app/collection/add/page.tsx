'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CatalogWatch, PlaygroundBox } from '@/types/watch'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { normalizePlaygroundBoxes } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'
import { useCollectionSession } from '../CollectionSessionProvider'

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

  const dest = searchParams.get('dest')
  const boxId = searchParams.get('boxId')
  const isPlaygroundContext = dest === 'playground'
  const isExploreContext = dest === 'explore'

  const [searchTerm, setSearchTerm] = useState('')
  const [materialFilter, setMaterialFilter] = useState<string | null>(null)
  const [colorFilter, setColorFilter] = useState<string | null>(null)
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>(null)
  const [playgroundBoxName, setPlaygroundBoxName] = useState<string | null>(null)

  useEffect(() => {
    if (!isPlaygroundContext || !boxId) return
    const boxes = loadPlaygroundBoxes()
    const box = boxes.find((item: PlaygroundBox) => item.id === boxId)
    if (box) setPlaygroundBoxName(box.name)
  }, [isPlaygroundContext, boxId])

  const baseResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []
    return catalogWatches.filter(w => [w.brand, w.model, w.reference].some(v => v.toLowerCase().includes(term)))
  }, [searchTerm])

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

  function renderChip(option: string, active: boolean, count: number, onClick: () => void) {
    return (
      <button
        key={option}
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 20,
          fontFamily: 'var(--font-dm-sans)', fontSize: 10,
          cursor: count === 0 ? 'default' : 'pointer',
          border: active ? '1px solid #1A1410' : '1px solid #E0DAD0',
          transition: 'all 0.15s',
          color: active ? '#FAF8F4' : '#A89880',
          background: active ? '#1A1410' : 'transparent',
          opacity: count === 0 ? 0.38 : 1,
          pointerEvents: count === 0 ? 'none' : 'auto',
        }}
      >
        <span>{option}</span>
        <span
          style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 10,
            background: active ? 'rgba(255,255,255,0.2)' : '#F0EBE3',
            color: active ? '#FAF8F4' : '#A89880',
          }}
        >
          {count}
        </span>
      </button>
    )
  }

  const backLabel = isPlaygroundContext ? '← Back to Playground' : isExploreContext ? '← Back' : '← My Collection'
  const backHref = isPlaygroundContext ? '/playground' : isExploreContext ? '/' : '/collection'
  const pageTitle = isPlaygroundContext
    ? (playgroundBoxName ? `Add to ${playgroundBoxName}` : 'Add to Playground')
    : isExploreContext
    ? 'Explore Watches'
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
          <div style={{ marginBottom: 10, fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880' }}>Case Material</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {MATERIAL_OPTIONS.map(option =>
              renderChip(option, materialFilter === option, counts.materialCounts[option] ?? 0, () => setMaterialFilter(prev => (prev === option ? null : option))),
            )}
          </div>

          <div style={{ marginBottom: 10, fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880' }}>Dial Color</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {COLOR_OPTIONS.map(option =>
              renderChip(option, colorFilter === option, counts.colorCounts[option] ?? 0, () => setColorFilter(prev => (prev === option ? null : option))),
            )}
          </div>

          <div style={{ marginBottom: 10, fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880' }}>Case Size</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {SIZE_OPTIONS.map(option =>
              renderChip(option, sizeFilter === option, counts.sizeCounts[option] ?? 0, () => setSizeFilter(prev => (prev === option ? null : option))),
            )}
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
            {filteredResults.map(watch => {
              const inCollection = isInCollection(watch.id)

              return (
                <div
                  key={watch.id}
                  onClick={() => router.push(buildDetailHref(watch.id, { dest, boxId }))}
                  style={{
                    position: 'relative',
                    background: '#FFFFFF',
                    border: '1px solid #EAE5DC',
                    borderRadius: 10, padding: '10px 11px',
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                >
                  <WatchStateControl
                    catalogWatchId={watch.id}
                    source="add_flow"
                    size="sm"
                    placement="top-right"
                  />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 46, height: 46, flexShrink: 0, position: 'relative' }}>
                      <WatchImageOrDial
                        watch={watch}
                        fill
                        sizes="46px"
                        dialSize={46}
                        imageStyle={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A84C', fontFamily: 'var(--font-dm-sans)' }}>{watch.brand}</div>
                      <div style={{ fontSize: 16, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 1, lineHeight: 1.05 }}>{watch.model}</div>
                      <div style={{ fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Ref. {watch.reference}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 6 }}>
                    {watch.caseMaterial} · {watch.dialColor} · {watch.caseSizeMm}mm
                  </div>
                  <div style={{ fontSize: 14, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 4 }}>{fmt(watch.estimatedValue)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#1A1410', color: '#FAF8F4', fontFamily: 'var(--font-dm-sans)' }}>
                      {watch.watchType}
                    </span>
                    {inCollection && (
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#E8F0E8', color: '#3A6A2D', fontFamily: 'var(--font-dm-sans)' }}>
                        In Collection
                      </span>
                    )}
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
