// lib/strapCompatibility.ts
// Strap ↔ watch compatibility engine (Feature 7 / Strap Drawer). Ported from
// the design prototype's strap-data.jsx. All fit state is computed client-side
// from three sources: straps, owned watches, and override records — no
// separate "fits" table beyond the overrides.

import type { BraceletType, StrapWatchOverride, UserStrap } from '@/types/watch'

export type FitState = 'fits' | 'excluded' | 'unknown'

// Minimal watch shape the engine needs. The Strap Drawer builds these by
// merging each ResolvedOwnedWatch (carries lugWidthMm) with its catalog row
// (carries braceletType, via the provider's getCatalogWatch).
export interface CompatWatch {
  id: string
  lugWidthMm?: number | null
  braceletType?: BraceletType | null
}

export function findOverride(
  overrides: StrapWatchOverride[],
  strapId: string,
  watchId: string,
): StrapWatchOverride | undefined {
  return overrides.find(o => o.strapId === strapId && o.watchId === watchId)
}

// Evaluated in order: explicit override → integrated bracelet → missing width
// → width match → mismatch.
export function effectiveCompatibility(
  strap: UserStrap,
  watch: CompatWatch,
  overrides: StrapWatchOverride[],
): FitState {
  const ov = findOverride(overrides, strap.id, watch.id)
  if (ov) return ov.override
  if (watch.braceletType === 'integrated') return 'excluded'
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'unknown'
  if (strap.lugWidthMm === watch.lugWidthMm) return 'fits'
  return 'excluded'
}

export function compatibleWatches(
  strap: UserStrap,
  watches: CompatWatch[],
  overrides: StrapWatchOverride[],
): CompatWatch[] {
  return watches.filter(w => effectiveCompatibility(strap, w, overrides) === 'fits')
}

export function compatibleStraps(
  watch: CompatWatch,
  straps: UserStrap[],
  overrides: StrapWatchOverride[],
): UserStrap[] {
  return straps.filter(s => effectiveCompatibility(s, watch, overrides) === 'fits')
}

// Sum of fitting straps across all watches — the headline "combinations" stat.
export function totalCombos(
  watches: CompatWatch[],
  straps: UserStrap[],
  overrides: StrapWatchOverride[],
): number {
  return watches.reduce(
    (sum, w) => sum + compatibleStraps(w, straps, overrides).length,
    0,
  )
}

// Count of owned watches at a given lug width — powers the "20mm (4)" affordances.
export function watchesAtWidth(watches: CompatWatch[], mm: number): number {
  return watches.filter(w => w.lugWidthMm === mm).length
}

// Short reason string for a card footer / sidebar row in Fit Finder mode.
export function fitBasis(
  strap: UserStrap,
  watch: CompatWatch,
  overrides: StrapWatchOverride[],
): string {
  const ov = findOverride(overrides, strap.id, watch.id)
  if (ov) return ov.override === 'fits' ? 'Marked as fits' : 'Marked excluded'
  if (watch.braceletType === 'integrated') return 'Integrated bracelet'
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'Width unknown'
  if (strap.lugWidthMm === watch.lugWidthMm) return `${strap.lugWidthMm} mm — lug match`
  return `Needs ${watch.lugWidthMm} mm`
}
