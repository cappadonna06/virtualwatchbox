// Client-side loader for the case-only image bridge (data/case-only-images.json).
//
// The Strap Studio's true-composite mode layers a strap BEHIND a case-only render
// of the watch head. The segmentation pipeline (scripts/segment-watch-cases.ts)
// writes the authoritative columns to Supabase AND this committed static bridge,
// so the Studio resolves case-only assets + lug geometry at module-load with zero
// round-trips. Studio only uses approved cutouts for the exact reference.

import raw from '@/data/case-only-images.json'
import type { BandHalf } from '@/lib/strapStudio'
import { withVersion } from '@/lib/watchImages/cacheBust'

export interface LugPoint {
  x: number
  y: number
}

export interface LugGeometry {
  /** y = outer tip row. x = channel edges at the widest-gap row. */
  topLugLeft: LugPoint
  topLugRight: LugPoint
  bottomLugLeft: LugPoint
  bottomLugRight: LugPoint
  /** Spring-bar centerline in image pixels when measured from a reference photo. */
  topSpringBarY?: number
  bottomSpringBarY?: number
  /** Center of the visible case edge inside each lug channel. */
  topCaseEdgeY?: number
  bottomCaseEdgeY?: number
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
  sourceCatalogId?: string
  sourcePhotoUrl?: string
  confidence: number
  catalogReferenceVerified?: boolean
  status: 'pending' | 'approved' | 'needs_review' | 'rejected'
}

const MAP = new Map<string, CaseOnlyEntry>(
  Object.entries(raw as Record<string, CaseOnlyEntry>)
    .filter(([, e]) => e.status === 'approved' && e.catalogReferenceVerified && Boolean(e.caseOnlyUrl))
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

/** Exact catalog references available in the Studio watch picker. */
export function caseOnlyIds(): string[] {
  return Array.from(MAP.keys())
}

export function channelMetrics(g: LugGeometry, end: 'top' | 'bottom', sleeveToWidth: number) {
  const left = end === 'top' ? g.topLugLeft : g.bottomLugLeft
  const right = end === 'top' ? g.topLugRight : g.bottomLugRight
  const width = right.x - left.x
  const tipY = (left.y + right.y) / 2
  const measuredY = end === 'top' ? g.topSpringBarY : g.bottomSpringBarY
  const caseEdgeY = end === 'top' ? g.topCaseEdgeY : g.bottomCaseEdgeY
  const direction = end === 'top' ? 1 : -1
  const setback = caseEdgeY === undefined
    ? width * 0.09
    : Math.max(0, (caseEdgeY - tipY) * direction - width * (sleeveToWidth + 0.009))
  const springBarY = measuredY ?? tipY + direction * setback
  return {
    centerXRatio: (left.x + right.x) / 2 / g.imageWidth,
    widthRatio: width / g.imageWidth,
    springBarYRatio: springBarY / g.imageHeight,
  }
}

export function strapCaseFrame(g: LugGeometry, stageHeight: number) {
  const height = Math.floor(stageHeight / 2.05)
  const width = height * (g.imageWidth / g.imageHeight)
  const stageWidth = Math.round(width * 1.2)
  return { stageWidth, frame: { left: (stageWidth - width) / 2, top: (stageHeight - height) / 2, width, height } }
}

export function strapBandPlacement(
  g: LugGeometry,
  half: BandHalf,
  end: 'top' | 'bottom',
  frame: { left: number; top: number; width: number; height: number },
) {
  const bandWidth = half.bodyRight - half.bodyLeft
  const sleeve = half.endY === undefined ? bandWidth * 0.07 : Math.abs(half.endY - half.pinY)
  const channel = channelMetrics(g, end, sleeve / bandWidth)
  const scale = channel.widthRatio * frame.width / bandWidth
  const cropTop = end === 'bottom' ? Math.max(0, half.pinY - sleeve) : 0
  const cropBottom = end === 'top' ? Math.max(0, half.h - half.pinY - sleeve) : 0
  return {
    left: frame.left + channel.centerXRatio * frame.width - (half.bodyLeft + half.bodyRight) / 2 * scale,
    top: frame.top + channel.springBarYRatio * frame.height - half.pinY * scale,
    width: half.w * scale,
    height: half.h * scale,
    clipPath: half.endY !== undefined
      ? undefined
      : `inset(${cropTop * scale}px 0 ${cropBottom * scale}px round ${bandWidth * scale * 0.018}px)`,
  }
}
