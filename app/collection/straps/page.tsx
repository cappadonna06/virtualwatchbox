'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useCollectionSession, type StrapInput } from '@/app/collection/CollectionSessionProvider'
import type { UserStrap } from '@/types/watch'
import { compatibleStraps, totalCombos } from '@/lib/strapCompatibility'
import { StrapDrawerHeader } from '@/components/straps/StrapDrawerHeader'
import { WatchFocusBar, FocusBanner } from '@/components/straps/StrapFitFinder'
import { FilterBar, applyFilters, applySort, type StrapFilterState, type StrapSortKey } from '@/components/straps/StrapFilters'
import { StrapGrid, EmptyDrawer } from '@/components/straps/StrapCard'
import { StrapSidebar } from '@/components/straps/StrapSidebar'
import { StrapModal } from '@/components/straps/StrapModal'
import { useStrapDrawerWatches } from '@/components/straps/useStrapDrawerWatches'

type ModalState = null | { mode: 'add'; suggestLug: number | null } | { mode: 'edit'; strap: UserStrap }

function StrapDrawerPage() {
  const router = useRouter()
  const params = useSearchParams()
  const {
    straps,
    strapOverrides,
    createStrap,
    updateStrap,
    deleteStrap,
    setStrapWatchOverride,
    removeStrapWatchOverride,
    uploadStrapPhoto,
    showToast,
  } = useCollectionSession()

  const [filters, setFilters] = useState<StrapFilterState>({ material: [], width: [], style: null })
  const [sort, setSort] = useState<StrapSortKey>('recent')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)

  // Owned watches normalized for the compatibility engine.
  const watches = useStrapDrawerWatches()

  // Apply incoming query params once on mount.
  useEffect(() => {
    const watchId = params.get('watchId')
    if (watchId) setFocusId(watchId)
    const strapParam = params.get('strap')
    if (strapParam) setSelectedId(strapParam)
    if (params.get('addStrap') === '1') {
      const lug = params.get('suggestLug')
      setModal({ mode: 'add', suggestLug: lug ? parseInt(lug, 10) : null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusWatch = focusId ? watches.find(w => w.id === focusId) ?? null : null

  const stats = useMemo(() => ({
    strapCount: straps.length,
    compatibleWatchCount: watches.filter(w => compatibleStraps(w, straps, strapOverrides).length > 0).length,
    comboCount: totalCombos(watches, straps, strapOverrides),
  }), [watches, straps, strapOverrides])

  const baseStraps = focusWatch ? compatibleStraps(focusWatch, straps, strapOverrides) : straps
  const visible = applySort(applyFilters(baseStraps, filters), sort, watches, strapOverrides)

  const selected = selectedId ? straps.find(s => s.id === selectedId) ?? null : null

  const clearWatchIdParam = () => {
    if (params.get('watchId')) router.replace('/collection/straps')
  }

  const handleSave = async (data: StrapInput, photoFile: File | null) => {
    try {
      if (modal?.mode === 'edit') {
        await updateStrap(modal.strap.id, data)
        if (photoFile) await uploadStrapPhoto(modal.strap.id, photoFile)
        showToast('Strap updated')
      } else {
        const created = await createStrap(data)
        if (photoFile) await uploadStrapPhoto(created.id, photoFile)
        showToast('Strap added to your drawer')
      }
      setModal(null)
    } catch (err) {
      console.error('[strap-drawer] save failed', err)
      showToast('Could not save strap')
    }
  }

  const handleDelete = async (strap: UserStrap) => {
    setSelectedId(null)
    try {
      await deleteStrap(strap.id)
      showToast('Strap deleted')
    } catch (err) {
      console.error('[strap-drawer] delete failed', err)
      showToast('Could not delete strap')
    }
  }

  const handleSetOverride = async (watchId: string, override: 'fits' | 'excluded') => {
    if (!selected) return
    try {
      await setStrapWatchOverride(selected.id, watchId, override)
      showToast('Override saved')
    } catch { showToast('Could not save override') }
  }

  const handleRemoveOverride = async (watchId: string) => {
    if (!selected) return
    try {
      await removeStrapWatchOverride(selected.id, watchId)
      showToast('Reset to automatic')
    } catch { showToast('Could not reset override') }
  }

  return (
    <div className="sd-page" style={{ maxWidth: 1280, margin: '0 auto' }}>
      <StrapDrawerHeader
        strapCount={stats.strapCount}
        compatibleWatchCount={stats.compatibleWatchCount}
        comboCount={stats.comboCount}
        onAdd={() => setModal({ mode: 'add', suggestLug: focusWatch?.lugWidthMm ?? null })}
      />

      {straps.length === 0 ? (
        <div style={{ marginTop: 40 }}>
          <EmptyDrawer onAdd={() => setModal({ mode: 'add', suggestLug: null })} />
        </div>
      ) : (
        <div style={{ marginTop: 28 }}>
          {watches.length > 0 && (
            <WatchFocusBar watches={watches} straps={straps} overrides={strapOverrides} focusId={focusId} setFocus={(id) => { setFocusId(id); if (!id) clearWatchIdParam() }} />
          )}

          {focusWatch && (
            <FocusBanner
              watch={focusWatch}
              count={compatibleStraps(focusWatch, straps, strapOverrides).length}
              onClear={() => { setFocusId(null); clearWatchIdParam() }}
            />
          )}

          <FilterBar straps={baseStraps} filters={filters} setFilters={setFilters} watches={watches} sort={sort} setSort={setSort} total={baseStraps.length} shown={visible.length} />

          {focusWatch && visible.length === 0 ? (
            <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 16, color: brand.colors.muted, padding: '24px 0' }}>
              No straps in your drawer fit the {focusWatch.model} yet — add a {focusWatch.lugWidthMm} mm strap and it shows up here.
            </div>
          ) : (
            <StrapGrid straps={visible} watches={watches} overrides={strapOverrides} focusWatch={focusWatch} activeId={selectedId} onSelect={(s) => setSelectedId(s.id)} />
          )}
        </div>
      )}

      {selected && (
        <StrapSidebar
          strap={selected}
          watches={watches}
          overrides={strapOverrides}
          onClose={() => setSelectedId(null)}
          onSetOverride={handleSetOverride}
          onRemoveOverride={handleRemoveOverride}
          onEdit={(s) => { setSelectedId(null); setModal({ mode: 'edit', strap: s }) }}
          onDelete={handleDelete}
          onOpenWatch={(w) => router.push(`/collection/watch/${w.id}`)}
        />
      )}

      {modal && (
        <StrapModal
          initial={modal.mode === 'edit' ? modal.strap : null}
          watches={watches}
          suggestLug={modal.mode === 'add' ? modal.suggestLug : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default function StrapDrawerRoute() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px' }} />}>
      <StrapDrawerPage />
    </Suspense>
  )
}
