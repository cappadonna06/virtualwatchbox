// Client-side loader for the case-only image bridge (data/case-only-images.json).
//
// The Strap Studio's true-composite mode layers a strap BEHIND a case-only render
// of the watch head. The segmentation pipeline (scripts/segment-watch-cases.ts)
// writes the authoritative columns to Supabase AND this committed static bridge,
// so the Studio resolves case-only assets + lug geometry at module-load with zero
// round-trips (no spinner, ever). Only `approved` entries are exposed.

import raw from '@/data/case-only-images.json'
import { withVersion } from '@/lib/watchImages/cacheBust'

export interface LugPoint {
  x: number
  y: number
}

export interface LugGeometry {
  topLugLeft: LugPoint
  topLugRight: LugPoint
  bottomLugLeft: LugPoint
  bottomLugRight: LugPoint
  /** Strap channel width between the lug pair, in image pixels. */
  lugWidthPx: number
  /** Pixel dimensions of the case-only image these coords live in. */
  imageWidth: number
  imageHeight: number
}

export interface CaseOnlyEntry {
  caseOnlyUrl: string
  caseOnlyPngUrl: string
  lugGeometry: LugGeometry
  /** Depicted watch's real lug width — preferred over catalog when present. */
  lugWidthMm?: number
  brand?: string
  model?: string
  reference?: string
  confidence: number
  status: 'pending' | 'approved' | 'needs_review' | 'rejected'
}

const MAP = new Map<string, CaseOnlyEntry>(
  Object.entries(raw as Record<string, CaseOnlyEntry>)
    .filter(([, e]) => e.status === 'approved' && Boolean(e.caseOnlyUrl))
    .map(([id, e]) => [
      id,
      {
        ...e,
        caseOnlyUrl: withVersion(e.caseOnlyUrl) ?? e.caseOnlyUrl,
        caseOnlyPngUrl: withVersion(e.caseOnlyPngUrl) ?? e.caseOnlyPngUrl,
      },
    ]),
)

/** Approved case-only asset for a catalog watch id, or undefined → Studio uses side-by-side. */
export function getCaseOnly(catalogWatchId: string | undefined | null): CaseOnlyEntry | undefined {
  if (!catalogWatchId) return undefined
  return MAP.get(catalogWatchId)
}

export function hasCaseOnly(catalogWatchId: string | undefined | null): boolean {
  return Boolean(catalogWatchId) && MAP.has(catalogWatchId!)
}

/** Catalog ids that have an approved case-only asset (Studio composite-ready). */
export function caseOnlyIds(): string[] {
  return Array.from(MAP.keys())
}

/** Strap channel centre + width as fractions of the case-only image, for CSS placement. */
export function channelMetrics(g: LugGeometry): { centerXRatio: number; widthRatio: number } {
  const cx = (g.topLugLeft.x + g.topLugRight.x + g.bottomLugLeft.x + g.bottomLugRight.x) / 4
  return {
    centerXRatio: cx / g.imageWidth,
    widthRatio: g.lugWidthPx / g.imageWidth,
  }
}
