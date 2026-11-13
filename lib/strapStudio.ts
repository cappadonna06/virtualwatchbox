// Strap Studio model layer: a single unified "StudioStrap" shape over BOTH the
// curated template catalog (data/strap-templates.json) and the user's own drawer
// (user_straps), plus category derivation and watch-fit logic. The Studio UI
// renders from this so the composite, picker, and footer share one source.

import bandDemoRaw from '@/data/strap-band-demo.json'
import { getCaseOnly } from '@/lib/caseOnlyImages'
import type { StrapTemplate } from '@/lib/strapTemplates'
import { canonicalStrapTemplateId, findTemplate, getStrapTemplates, findTemplatePhoto, strapTemplateLabel } from '@/lib/strapTemplates'
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
  material: StrapMaterial
  category: StrapCategory
  color: string
  design: string
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

function supportsLugWidth(strap: { availableLugWidths: number[] }, width?: number | null): boolean {
  return width == null || strap.availableLugWidths.includes(width)
}

export type StudioOrigin = 'discover' | 'playground'

export function strapStudioHref(watchId: string, strapId?: string, from?: StudioOrigin) {
  const params = new URLSearchParams({ watchId, source: 'all' })
  if (strapId) params.set('strapId', strapId)
  if (from) params.set('from', from)
  return `/collection/straps/studio?${params}`
}

export function getStudioEntryPoint(watch: StudioCompatTarget, hasWatchPhoto: boolean, from?: StudioOrigin) {
  if (!watch.id || watch.braceletType === 'integrated') return null
  const caseOnly = getCaseOnly(watch.id)
  const width = caseOnly?.lugWidthMm ?? watch.lugWidthMm
  const canTryOn = Boolean(caseOnly && bandDemoRaw.straps.some(({ fullImageId }) => {
    const template = findTemplate(fullImageId)
    return Boolean(template?.imageUrl && supportsLugWidth(template, width))
  }))
  if (!canTryOn && (!hasWatchPhoto || !getStrapTemplates().some(strap => supportsLugWidth(strap, width)))) return null

  return {
    href: strapStudioHref(watch.id, undefined, from),
    label: canTryOn ? 'Try on straps' : 'Compare straps',
  }
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

function colorName(color: string): string {
  return titleCase(color.trim().replace(/\bgrey\b/gi, 'gray'))
}

function templateToStudio(t: StrapTemplate): StudioStrap {
  return {
    key: `tpl:${t.id}`,
    source: 'template',
    id: t.id,
    label: strapTemplateLabel(t),
    material: t.material,
    category: categoryOf(t.material),
    color: colorName(t.color),
    design: t.subMaterial,
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
    material: s.material,
    category: categoryOf(s.material),
    color: colorName(s.color),
    design: titleCase(s.subMaterial?.trim() || ''),
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

export function buildBandDemoStraps(): StudioStrap[] {
  return bandDemoRaw.straps.flatMap(({ id, fullImageId, bandTop, bandBottom }) => {
    const template = findTemplate(fullImageId)
    if (!template?.imageUrl) return []
    return [{
      ...templateToStudio(template),
      key: `band:${id}`,
      id,
      templateId: fullImageId,
      band: {
        top: { ...bandTop, url: withVersion(bandTop.url) ?? bandTop.url },
        bottom: { ...bandBottom, url: withVersion(bandBottom.url) ?? bandBottom.url },
      },
    }]
  })
}

export function findStudioStrap(straps: StudioStrap[], id: string): StudioStrap | undefined {
  const exact = straps.find(strap => strap.id === id)
  if (exact) return exact

  const templateId = canonicalStrapTemplateId(bandDemoRaw.straps.find(strap => strap.id === id)?.fullImageId ?? id)
  return straps.find(strap => strap.source === 'template' && (strap.templateId ?? strap.id) === templateId)
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
  return supportsLugWidth(strap, watch.lugWidthMm) ? 'fits' : 'excluded'
}

export function isCompatible(strap: StudioStrap, watch: StudioCompatTarget | null, overrides: StrapWatchOverride[]): boolean {
  return studioFit(strap, watch, overrides) !== 'excluded'
}

export type StudioCategoryFilter = 'All' | StrapCategory

export type StudioStrapFilters = { query: string; color: string; design: string }
export const emptyStudioStrapFilters: StudioStrapFilters = { query: '', color: '', design: '' }

export function filterByCategory(straps: StudioStrap[], category: StudioCategoryFilter): StudioStrap[] {
  return category === 'All' ? straps : straps.filter(s => s.category === category)
}

const COLOR_FAMILIES: Array<[string, RegExp]> = [
  ['Black', /\bblack\b/i],
  ['Gray', /\b(gray|charcoal|silver)\b/i],
  ['White & cream', /\b(white|cream|ivory)\b/i],
  ['Red & burgundy', /\b(red|burgundy|wine|maroon|oxblood)\b/i],
  ['Brown & tan', /\b(brown|tan|cognac|beige|camel|chocolate|khaki|taupe|honey|sand)\b/i],
  ['Blue', /\b(blue|navy|indigo|teal)\b/i],
  ['Green', /\b(green|olive|sage)\b/i],
]

export function strapColorFamily(strap: StudioStrap): string {
  return COLOR_FAMILIES.find(([, pattern]) => pattern.test(strap.color))?.[0] ?? strap.color
}

export function strapDesign(strap: StudioStrap): string {
  return strap.design || strap.category
}

function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' })
}

export function strapFilterOptions(straps: StudioStrap[], label: (strap: StudioStrap) => string, selected: string) {
  return [...new Set([...straps.map(label), selected].filter(Boolean))].sort(compareLabels)
}

function searchText(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/\bgrey\b/g, 'gray').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function filterStudioStraps(straps: StudioStrap[], { query, color, design }: StudioStrapFilters): StudioStrap[] {
  const terms = searchText(query).split(' ').filter(Boolean)
  return straps.filter(s => {
    if (color && strapColorFamily(s) !== color) return false
    if (design && strapDesign(s) !== design) return false
    if (!terms.length) return true
    const text = searchText([
      s.label, s.category, s.material, s.design, s.color, s.userStrap?.brand, s.userStrap?.style,
      // Group shades for common color names without replacing their specific names on the cards.
      strapColorFamily(s).split(' & ')[0],
    ].join(' '))
    return terms.every(term => text.includes(term))
  })
}

function spreadDesigns(straps: StudioStrap[]): StudioStrap[] {
  const nextColorIndex = new Map<string, number>()
  return straps.map(strap => {
    const design = strapDesign(strap)
    const colorIndex = nextColorIndex.get(design) ?? 0
    nextColorIndex.set(design, colorIndex + 1)
    return { strap, colorIndex }
  }).sort((a, b) => a.colorIndex - b.colorIndex).map(({ strap }) => strap)
}

export function groupStudioStraps(straps: StudioStrap[], category: StudioCategoryFilter) {
  const sorted = [...straps].sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    || compareLabels(strapDesign(a), strapDesign(b))
    || compareLabels(a.color, b.color)
    || compareLabels(a.label, b.label),
  )
  const groups = new Map<string, StudioStrap[]>()
  for (const strap of sorted) {
    const label = category === 'All' ? strap.category : strapDesign(strap)
    const group = groups.get(label)
    if (group) group.push(strap)
    else groups.set(label, [strap])
  }
  return Array.from(groups, ([label, straps]) => ({
    label,
    straps: category === 'All' ? spreadDesigns(straps) : straps,
  }))
}

export function filterCompatible(straps: StudioStrap[], watch: StudioCompatTarget | null, overrides: StrapWatchOverride[]): StudioStrap[] {
  return straps.filter(s => isCompatible(s, watch, overrides))
}

/** First strap whose category matches the watch's bracelet style, else first overall. */
export function pickDefaultStrap(straps: StudioStrap[]): StudioStrap | undefined {
  return straps[0]
}
