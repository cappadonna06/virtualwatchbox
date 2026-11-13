'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import { caseOnlyIds, getCaseOnly, type CaseOnlyEntry } from '@/lib/caseOnlyImages'
import {
  buildBandDemoStraps,
  buildDrawerStraps,
  buildTemplateStraps,
  deriveCategories,
  emptyStudioStrapFilters,
  filterByCategory,
  filterCompatible,
  filterStudioStraps,
  findStudioStrap,
  groupStudioStraps,
  strapColorFamily,
  strapDesign,
  strapFilterOptions,
  type StudioCategoryFilter,
  type StudioCompatTarget,
  type StudioStrap,
  type StudioStrapFilters,
} from '@/lib/strapStudio'
import type { BraceletType, CatalogWatch } from '@/types/watch'
import { useStrapPreloader } from './useStrapPreloader'

export type StudioSourceMode = 'all' | 'drawer'

export interface StudioWatch {
  catalogId: string
  ownedId?: string
  brand: string
  model: string
  reference?: string
  lugWidthMm?: number
  braceletType?: BraceletType
  imageUrl?: string
  transparentUrl?: string
  isOwned: boolean
}

// Legacy shared links may carry source=compatible (removed mode — every source
// is compatibility-filtered now); treat it as 'all'.
function parseSourceMode(v: string | null): StudioSourceMode | null {
  if (v === 'all' || v === 'compatible') return 'all'
  if (v === 'drawer') return 'drawer'
  return null
}

export function useStudioController() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const from = search.get('from')
  const origin = from === 'discover' || from === 'playground' ? from : undefined

  const session = useCollectionSession()
  const { collectionWatches, straps, strapOverrides, getCatalogWatch, showToast } = session
  const { fetchById, searchCatalog, allWatches } = useCatalog()
  const { getImageUrl, getTransparentUrl } = useWatchImages()
  const reducedMotion = usePrefersReducedMotion()

  const templateStraps = useMemo(() => buildTemplateStraps(), [])
  const drawerStraps = useMemo(() => buildDrawerStraps(straps), [straps])
  const bandStraps = useMemo(() => buildBandDemoStraps(), [])

  // ── Core state (URL-seeded) ───────────────────────────────────────────────
  const [watchId, setWatchId] = useState<string>(
    () => search.get('watchId') || collectionWatches[0]?.watchId || caseOnlyIds()[0] || allWatches[0]?.id || '',
  )
  const [source, setSource] = useState<StudioSourceMode>(
    () => parseSourceMode(search.get('source')) ?? 'all',
  )
  const [strapId, setStrapId] = useState<string>(() => search.get('strapId') || '')
  const [activeCategory, setActiveCategory] = useState<StudioCategoryFilter>('All')
  const [filters, setFilters] = useState(emptyStudioStrapFilters)
  const [isSwapping, setIsSwapping] = useState(false)
  const [failedCaseUrl, setFailedCaseUrl] = useState<string>()
  const [fetched, setFetched] = useState<Map<string, CatalogWatch>>(new Map())
  const swapTimer = useRef<number | undefined>(undefined)

  // ── Resolve the active watch from owned → catalog → case-only fallback ─────
  useEffect(() => {
    if (!watchId) return
    if (collectionWatches.some(w => w.watchId === watchId)) return
    if (getCatalogWatch(watchId) || fetched.has(watchId)) return
    let alive = true
    void fetchById(watchId).then(w => {
      if (alive && w) setFetched(prev => new Map(prev).set(watchId, w))
    }).catch(() => {})
    return () => { alive = false }
  }, [watchId, collectionWatches, getCatalogWatch, fetched, fetchById])

  const caseOnly: CaseOnlyEntry | undefined = useMemo(() => getCaseOnly(watchId), [watchId])

  const studioWatch: StudioWatch | null = useMemo(() => {
    if (!watchId) return null
    const owned = collectionWatches.find(w => w.watchId === watchId)
    const catalog = getCatalogWatch(watchId) || fetched.get(watchId)
    const co = getCaseOnly(watchId)
    return {
      catalogId: watchId,
      ownedId: owned?.id,
      brand: owned?.brand || catalog?.brand || co?.brand || 'Watch',
      model: owned?.model || catalog?.model || co?.model || '',
      reference: owned?.reference || catalog?.reference || co?.reference,
      lugWidthMm: co?.lugWidthMm ?? catalog?.lugWidthMm ?? owned?.lugWidthMm,
      braceletType: catalog?.braceletType,
      imageUrl: getImageUrl(watchId) || catalog?.imageUrl || owned?.imageUrl,
      transparentUrl: getTransparentUrl(watchId) || catalog?.imageTransparentUrl || owned?.imageTransparentUrl,
      isOwned: Boolean(owned),
    }
  }, [watchId, collectionWatches, getCatalogWatch, fetched, getImageUrl, getTransparentUrl])

  const compatTarget: StudioCompatTarget | null = useMemo(
    () => (studioWatch ? { id: studioWatch.catalogId, lugWidthMm: studioWatch.lugWidthMm, braceletType: studioWatch.braceletType } : null),
    [studioWatch],
  )

  const compatibleBands = useMemo(() => filterCompatible(bandStraps, compatTarget, strapOverrides),
    [bandStraps, compatTarget, strapOverrides])
  const renderMode = caseOnly && caseOnly.caseOnlyUrl !== failedCaseUrl && compatibleBands.length
    ? 'composite' : 'side-by-side'
  const sourceStraps = useMemo(() => {
    if (renderMode === 'composite') return compatibleBands
    return filterCompatible(source === 'drawer' ? drawerStraps : templateStraps, compatTarget, strapOverrides)
  }, [renderMode, compatibleBands, source, drawerStraps, templateStraps, compatTarget, strapOverrides])

  const categories = useMemo(() => deriveCategories(sourceStraps), [sourceStraps])
  const effectiveCategory = categories.includes(activeCategory) ? activeCategory : 'All'
  const categoryStraps = useMemo(() => filterByCategory(sourceStraps, effectiveCategory), [sourceStraps, effectiveCategory])
  const colorOptions = useMemo(() => strapFilterOptions(categoryStraps, strapColorFamily, filters.color), [categoryStraps, filters.color])
  const designOptions = useMemo(() => strapFilterOptions(categoryStraps, strapDesign, filters.design), [categoryStraps, filters.design])
  const groups = useMemo(
    () => groupStudioStraps(filterStudioStraps(categoryStraps, filters), effectiveCategory),
    [categoryStraps, filters, effectiveCategory],
  )
  const visibleStraps = useMemo(() => groups.flatMap(g => g.straps), [groups])

  const currentStrap: StudioStrap | undefined = useMemo(
    () => findStudioStrap(sourceStraps, strapId) ?? sourceStraps[0],
    [sourceStraps, strapId],
  )

  // Browsing filters must leave the current look shareable, even with zero matches.
  useEffect(() => {
    if (currentStrap && currentStrap.id !== strapId) setStrapId(currentStrap.id)
  }, [currentStrap, strapId])

  const triggerSwap = useCallback(() => {
    if (reducedMotion) return
    setIsSwapping(true)
    if (typeof window !== 'undefined') {
      window.clearTimeout(swapTimer.current)
      swapTimer.current = window.setTimeout(() => setIsSwapping(false), 280)
    }
  }, [reducedMotion])

  const selectStrap = useCallback((id: string) => {
    if (currentStrap?.id !== id) triggerSwap()
    setStrapId(id)
  }, [currentStrap?.id, triggerSwap])

  const idx = visibleStraps.findIndex(s => s.key === currentStrap?.key)
  const canCycle = visibleStraps.length > 1 || (idx < 0 && visibleStraps.length === 1)
  const ghostAt = useCallback((offset: number): StudioStrap | undefined => {
    const n = visibleStraps.length
    if (!n || (idx >= 0 && Math.abs(offset) >= n)) return
    const next = idx >= 0 ? idx + offset : offset > 0 ? offset - 1 : offset
    return visibleStraps[((next % n) + n) % n]
  }, [visibleStraps, idx])

  const cycle = useCallback((delta: number) => {
    const next = ghostAt(delta)
    if (next) selectStrap(next.id)
  }, [ghostAt, selectStrap])
  const nextStrap = useCallback(() => cycle(1), [cycle])
  const prevStrap = useCallback(() => cycle(-1), [cycle])

  const clearFilters = useCallback(() => {
    setActiveCategory('All')
    setFilters(emptyStudioStrapFilters)
  }, [])

  const changeSource = useCallback((s: StudioSourceMode) => {
    setSource(s)
    clearFilters()
  }, [clearFilters])

  const changeCategory = useCallback((c: StudioCategoryFilter) => {
    if (c === effectiveCategory) return
    setActiveCategory(c)
    setFilters(previous => previous.design ? { ...previous, design: '' } : previous)
  }, [effectiveCategory])

  const setFilter = useCallback((field: keyof StudioStrapFilters, value: string) => {
    setFilters(previous => ({ ...previous, [field]: value }))
  }, [])

  // ── Watch switching + incompatible-strap auto-swap ────────────────────────
  const setWatch = useCallback((catalogId: string, watch?: CatalogWatch) => {
    if (watch) setFetched(prev => new Map(prev).set(catalogId, watch))
    setWatchId(catalogId)
  }, [])

  // ── URL sync (shareable state) ────────────────────────────────────────────
  useEffect(() => {
    if (!watchId) return
    const params = new URLSearchParams()
    params.set('watchId', watchId)
    if (currentStrap) params.set('strapId', currentStrap.id)
    params.set('source', source)
    if (origin) params.set('from', origin)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId, currentStrap?.id, source, origin])

  // ── Keyboard ← / → cycles straps (ignored while typing) ───────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (!canCycle || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || t?.closest('input, textarea, select, [role="menu"], [contenteditable="true"]')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); nextStrap() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStrap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canCycle, nextStrap, prevStrap])

  // ── Aggressive preloading (no spinner, ever) ──────────────────────────────
  const preloadUrls = useMemo(() => {
    const urls: Array<string | undefined> = []
    for (const s of sourceStraps) {
      urls.push(s.imageUrl)
      if (s.band) urls.push(s.band.top.url, s.band.bottom.url)
    }
    if (caseOnly) urls.push(caseOnly.caseOnlyUrl)
    if (studioWatch?.imageUrl) urls.push(studioWatch.imageUrl)
    const here = collectionWatches.findIndex(w => w.watchId === watchId)
    for (const w of collectionWatches.slice(here + 1, here + 4)) {
      const co = getCaseOnly(w.watchId)
      if (co) urls.push(co.caseOnlyUrl)
      urls.push(getImageUrl(w.watchId) || w.imageUrl)
    }
    return urls
  }, [sourceStraps, caseOnly, studioWatch, collectionWatches, watchId, getImageUrl])
  useStrapPreloader(preloadUrls)

  // ── Footer actions ────────────────────────────────────────────────────────
  const shareLook = useCallback(async () => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams({ watchId, strapId: currentStrap?.id ?? '', source })
    const url = `${window.location.origin}${pathname}?${params.toString()}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied — share your look')
    } catch {
      showToast('Could not copy link')
    }
  }, [watchId, currentStrap, source, pathname, showToast])

  const buyUrl = currentStrap?.source === 'template'
    ? (currentStrap.affiliateUrl ?? undefined)
    : (currentStrap?.purchaseUrl ?? undefined)

  return {
    // data
    studioWatch,
    caseOnly,
    setFailedCaseUrl,
    renderMode,
    reducedMotion,
    isSwapping,
    // strap browsing
    source,
    setSource: changeSource,
    showSourceToggle: renderMode === 'side-by-side' && drawerStraps.length > 0,
    categories,
    activeCategory: effectiveCategory,
    setCategory: changeCategory,
    sourceStraps,
    visibleStraps,
    groups,
    filters,
    setFilter,
    clearFilters,
    colorOptions,
    designOptions,
    currentStrap,
    strapIndex: idx,
    canCycle,
    nextStrap,
    prevStrap,
    selectStrap,
    ghostAt,
    // watch picker
    collectionWatches,
    searchCatalog,
    setWatch,
    // footer
    buyUrl,
    shareLook,
    // misc
    watchId,
    origin,
    compatTarget,
    strapOverrides,
    hasOwned: collectionWatches.length > 0,
    hasDrawerStraps: drawerStraps.length > 0,
  }
}

export type StudioController = ReturnType<typeof useStudioController>
