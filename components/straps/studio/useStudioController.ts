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
  filterByCategory,
  filterCompatible,
  isCompatible,
  type StrapCategory,
  type StudioCompatTarget,
  type StudioStrap,
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
  const [activeCategory, setActiveCategory] = useState<'All' | StrapCategory>('All')
  const [isSwapping, setIsSwapping] = useState(false)
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

  const renderMode: 'composite' | 'side-by-side' = caseOnly ? 'composite' : 'side-by-side'

  const compatTarget: StudioCompatTarget | null = useMemo(
    () => (studioWatch ? { id: studioWatch.catalogId, lugWidthMm: studioWatch.lugWidthMm, braceletType: studioWatch.braceletType } : null),
    [studioWatch],
  )

  // ── Strap source / category / current selection ───────────────────────────
  // Composite mode shows ONLY band-equipped straps: every one renders correctly
  // worn on the watch. Flat template photos would read as "behind the case",
  // so they stay exclusive to side-by-side watches (where they present well).
  // Both side-by-side sources are ALWAYS compatibility-filtered — incompatible
  // straps never show; compatibility is a rule, not a mode.
  const sourceStraps = useMemo(() => {
    if (caseOnly) return bandStraps
    return filterCompatible(source === 'drawer' ? drawerStraps : templateStraps, compatTarget, strapOverrides)
  }, [caseOnly, bandStraps, source, drawerStraps, templateStraps, compatTarget, strapOverrides])

  const categories = useMemo(() => deriveCategories(sourceStraps), [sourceStraps])
  const effectiveCategory: 'All' | StrapCategory = categories.includes(activeCategory) ? activeCategory : 'All'
  const categoryStraps = useMemo(() => filterByCategory(sourceStraps, effectiveCategory), [sourceStraps, effectiveCategory])

  const currentStrap: StudioStrap | undefined = useMemo(
    () => categoryStraps.find(s => s.id === strapId) ?? categoryStraps[0],
    [categoryStraps, strapId],
  )

  // Keep strapId valid as source/category change (auto-jump to first in list).
  useEffect(() => {
    if (!categoryStraps.length) return
    if (!categoryStraps.some(s => s.id === strapId)) setStrapId(categoryStraps[0].id)
  }, [categoryStraps, strapId])

  const triggerSwap = useCallback(() => {
    if (reducedMotion) return
    setIsSwapping(true)
    if (typeof window !== 'undefined') {
      window.clearTimeout(swapTimer.current)
      swapTimer.current = window.setTimeout(() => setIsSwapping(false), 280)
    }
  }, [reducedMotion])

  const selectStrap = useCallback((id: string) => {
    setStrapId(prev => {
      if (prev !== id) triggerSwap()
      return id
    })
  }, [triggerSwap])

  const idx = categoryStraps.findIndex(s => s.id === currentStrap?.id)
  const cycle = useCallback((delta: number) => {
    const n = categoryStraps.length
    if (!n) return
    const next = categoryStraps[((idx + delta) % n + n) % n]
    if (next) selectStrap(next.id)
  }, [categoryStraps, idx, selectStrap])
  const nextStrap = useCallback(() => cycle(1), [cycle])
  const prevStrap = useCallback(() => cycle(-1), [cycle])

  /** Ghosted carousel neighbor at the given offset from the active strap (wraps). */
  const ghostAt = useCallback((offset: number): StudioStrap | undefined => {
    const n = categoryStraps.length
    if (n < 2 || idx < 0) return undefined
    return categoryStraps[((idx + offset) % n + n) % n]
  }, [categoryStraps, idx])

  const changeSource = useCallback((s: StudioSourceMode) => {
    setSource(s)
    setActiveCategory('All')
  }, [])

  const changeCategory = useCallback((c: 'All' | StrapCategory) => {
    setActiveCategory(c)
  }, [])

  // ── Watch switching + incompatible-strap auto-swap ────────────────────────
  const setWatch = useCallback((catalogId: string, watch?: CatalogWatch) => {
    if (watch) setFetched(prev => new Map(prev).set(catalogId, watch))
    setWatchId(catalogId)
  }, [])

  useEffect(() => {
    if (!currentStrap || !compatTarget) return
    if (!isCompatible(currentStrap, compatTarget, strapOverrides)) {
      const fallback = categoryStraps.find(s => isCompatible(s, compatTarget, strapOverrides))
        ?? sourceStraps.find(s => isCompatible(s, compatTarget, strapOverrides))
      if (fallback && fallback.id !== currentStrap.id) {
        setStrapId(fallback.id)
        triggerSwap()
      }
    }
    // Only re-check when the watch (compat target) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compatTarget?.id, compatTarget?.lugWidthMm])

  // ── URL sync (shareable state) ────────────────────────────────────────────
  useEffect(() => {
    if (!watchId) return
    const params = new URLSearchParams()
    params.set('watchId', watchId)
    if (currentStrap) params.set('strapId', currentStrap.id)
    params.set('source', source)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId, currentStrap?.id, source])

  // ── Keyboard ← / → cycles straps (ignored while typing) ───────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); nextStrap() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStrap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextStrap, prevStrap])

  // ── Aggressive preloading (no spinner, ever) ──────────────────────────────
  const preloadUrls = useMemo(() => {
    const urls: Array<string | undefined> = []
    for (const s of categoryStraps) {
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
  }, [categoryStraps, caseOnly, studioWatch, collectionWatches, watchId, getImageUrl])
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
    renderMode,
    reducedMotion,
    isSwapping,
    // strap browsing
    source,
    setSource: changeSource,
    showSourceToggle: !caseOnly && drawerStraps.length > 0,
    categories,
    activeCategory: effectiveCategory,
    setCategory: changeCategory,
    sourceStraps,
    categoryStraps,
    currentStrap,
    strapIndex: idx,
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
    compatTarget,
    strapOverrides,
    hasOwned: collectionWatches.length > 0,
    hasDrawerStraps: drawerStraps.length > 0,
  }
}

export type StudioController = ReturnType<typeof useStudioController>
