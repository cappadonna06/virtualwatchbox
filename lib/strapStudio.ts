// Strap Studio model layer: a single unified "StudioStrap" shape over BOTH the
// curated template catalog (data/strap-templates.json) and the user's own drawer
// (user_straps), plus category derivation and watch-fit logic. The Studio UI
// renders from this so the composite, picker, and footer share one source.

import bandDemoRaw from '@/data/strap-band-demo.json'
import type { StrapTemplate } from '@/lib/strapTemplates'
import { findTemplate, getStrapTemplates, findTemplatePhoto } from '@/lib/strapTemplates'
import { withVersion } from '@/lib/watchImages/cacheBust'
import { effectiveCompatibility, type FitState } from '@/lib/strapCompatibility'
import type { BraceletType, StrapMaterial, StrapWatchOverride, UserStrap } from '@/types/watch'

export type StrapCategory = 'Leather' | 'Rubber' | 'NATO' | 'Sailcloth' | 'Canvas' | 'Metal' | 'Exotic' | 'Other'
export type StrapSource = 'template' | 'drawer'

/**
 * One half of an "as worn" strap render (Delugs-style). pinY is the spring-bar
 * row; bodyLeft/Right are the strap edges at that row (pins excluded). The
 * composite anchors the pin row into the watch's lug channel and scales the
 * body width to the channel width — that's what makes the strap sit snugly
 * between the lugs.
 */
export interface BandHalf {
  url: string
  w: number
  h: number
  pinY: number
  bodyLeft: number
  bodyRight: number
  /** Center of the photographed end. The alpha silhouette already includes the sleeve. */
  endY?: number
}

export interface StudioStrap {
  /** Stable unique key across sources. */
  key: string
  source: StrapSource
  id: string
  label: string
  sublabel?: string
  material: StrapMaterial
  category: StrapCategory
  colorHex?: string
  /** Vertical master image; '' when none (UI falls back to a CSS swatch). */
  imageUrl: string
  availableLugWidths: number[]
  affiliateUrl?: string | null
  purchaseUrl?: string | null
  /** Present for drawer straps — enables override-aware fit + price. */
  userStrap?: UserStrap
  templateId?: string
  /** Worn-render halves; only band-equipped straps appear in composite mode. */
  band?: { top: BandHalf; bottom: BandHalf }
}

export interface StudioCompatTarget {
  id: string
  lugWidthMm?: number | null
  braceletType?: BraceletType | null
}

const MATERIAL_CATEGORY: Record<StrapMaterial, StrapCategory> = {
  leather: 'Leather',
  rubber: 'Rubber',
  silicone: 'Rubber',
  nylon: 'NATO',
  canvas: 'Canvas',
  fabric: 'Sailcloth',
  metal: 'Metal',
  ceramic: 'Metal',
  exotic: 'Exotic',
  other: 'Other',
}

const CATEGORY_ORDER: StrapCategory[] = ['Leather', 'Rubber', 'NATO', 'Sailcloth', 'Canvas', 'Metal', 'Exotic', 'Other']

export function categoryOf(material: StrapMaterial): StrapCategory {
  return MATERIAL_CATEGORY[material] ?? 'Other'
}

function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s
}

function templateToStudio(t: StrapTemplate): StudioStrap {
  return {
    key: `tpl:${t.id}`,
    source: 'template',
    id: t.id,
    label: `${t.subMaterial} ${t.color}`.trim(),
    sublabel: titleCase(t.material),
    material: t.material,
    category: categoryOf(t.material),
    colorHex: t.colorHex,
    imageUrl: t.imageUrl || '',
    availableLugWidths: t.availableLugWidths,
    affiliateUrl: t.affiliateUrl,
  }
}

function drawerToStudio(s: UserStrap): StudioStrap {
  const photo = s.photoUrl || findTemplatePhoto(s.material, s.subMaterial, s.color) || ''
  const label = s.name?.trim() || [s.color, titleCase(s.material)].filter(Boolean).join(' ')
  return {
    key: `usr:${s.id}`,
    source: 'drawer',
    id: s.id,
    label,
    sublabel: s.brand || titleCase(s.material),
    material: s.material,
    category: categoryOf(s.material),
    colorHex: s.colorHex,
    imageUrl: photo,
    availableLugWidths: [s.lugWidthMm],
    purchaseUrl: s.purchaseUrl,
    userStrap: s,
  }
}

export function buildTemplateStraps(): StudioStrap[] {
  return getStrapTemplates().map(templateToStudio)
}

type BandDemoEntry = {
  id: string
  label: string
  material: StrapMaterial
  subMaterial: string
  color: string
  colorHex: string
  availableLugWidths: number[]
  bandTop: BandHalf
  bandBottom: BandHalf
  /** Matching full-strap template master — browsing imagery (swatches/ghosts). */
  fullImageId?: string
}

export function buildBandDemoStraps(): StudioStrap[] {
  const entries = (bandDemoRaw as { straps: BandDemoEntry[] }).straps
  return entries.map(e => {
    const template = e.fullImageId ? findTemplate(e.fullImageId) : undefined
    return {
      key: `band:${e.id}`,
      source: 'template',
      id: e.id,
      templateId: e.fullImageId,
      label: e.label,
      sublabel: `${e.subMaterial} ${titleCase(e.material)}`,
      material: e.material,
      category: categoryOf(e.material),
      colorHex: e.colorHex,
      imageUrl: template?.imageUrl || e.bandTop.url,
      availableLugWidths: e.availableLugWidths,
      affiliateUrl: template?.affiliateUrl,
      band: {
        top: { ...e.bandTop, url: withVersion(e.bandTop.url) ?? e.bandTop.url },
        bottom: { ...e.bandBottom, url: withVersion(e.bandBottom.url) ?? e.bandBottom.url },
      },
    }
  })
}

export function buildDrawerStraps(straps: UserStrap[]): StudioStrap[] {
  return straps.map(drawerToStudio)
}

/** Distinct categories present in `straps`, in canonical order, prefixed by 'All'. */
export function deriveCategories(straps: StudioStrap[]): Array<'All' | StrapCategory> {
  const present = new Set(straps.map(s => s.category))
  return ['All', ...CATEGORY_ORDER.filter(c => present.has(c))]
}

/**
 * Fit of a strap on a watch. Integrated → excluded. Drawer straps defer to the
 * override-aware engine. Templates match on available lug widths, and are
 * lenient ('unknown') when the watch has no recorded lug width so trays aren't
 * needlessly empty.
 */
export function studioFit(strap: StudioStrap, watch: StudioCompatTarget | null, overrides: StrapWatchOverride[]): FitState {
  if (!watch) return 'unknown'
  if (watch.braceletType === 'integrated') return 'excluded'
  if (strap.source === 'drawer' && strap.userStrap) {
    return effectiveCompatibility(strap.userStrap, watch, overrides)
  }
  if (watch.lugWidthMm == null) return 'unknown'
  return strap.availableLugWidths.includes(watch.lugWidthMm) ? 'fits' : 'excluded'
}

export function isCompatible(strap: StudioStrap, watch: StudioCompatTarget | null, overrides: StrapWatchOverride[]): boolean {
  return studioFit(strap, watch, overrides) !== 'excluded'
}

export function filterByCategory(straps: StudioStrap[], category: 'All' | StrapCategory): StudioStrap[] {
  return category === 'All' ? straps : straps.filter(s => s.category === category)
}

export function filterCompatible(straps: StudioStrap[], watch: StudioCompatTarget | null, overrides: StrapWatchOverride[]): StudioStrap[] {
  return straps.filter(s => isCompatible(s, watch, overrides))
}

/** First strap whose category matches the watch's bracelet style, else first overall. */
export function pickDefaultStrap(straps: StudioStrap[]): StudioStrap | undefined {
  return straps[0]
}
