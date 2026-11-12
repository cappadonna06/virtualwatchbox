import { getCaseOnly, type CaseOnlyEntry } from '@/lib/caseOnlyImages'
import { compatibleStraps } from '@/lib/strapCompatibility'
import {
  buildBandDemoStraps, buildTemplateStraps, categoryOf, studioFit, type StudioStrap,
} from '@/lib/strapStudio'
import type { CatalogWatch, ResolvedOwnedWatch, StrapWatchOverride, UserStrap } from '@/types/watch'

const mountedStraps = buildBandDemoStraps()
const comparisonStraps = buildTemplateStraps()
const featured = ['fabric-sailcloth-charcoal', 'leather-suede-sand', 'rubber-tropical-oxblood',
  'leather-smooth-dark-brown', 'rubber-waffle-navy', 'canvas-herringbone-olive']

export type StrapSuggestion = {
  watch: {
    catalogId: string
    brand: string
    model: string
    lugWidthMm: number
    imageUrl?: string
    transparentUrl?: string
  }
  caseOnly?: CaseOnlyEntry
  strap: StudioStrap
  fillsMaterialGap: boolean
}

function normalized(value?: string) {
  return value?.trim().toLowerCase().replace(/\bgrey\b/g, 'gray') ?? ''
}

export function suggestStraps(
  watches: ResolvedOwnedWatch[],
  drawer: UserStrap[],
  overrides: StrapWatchOverride[],
  getCatalogWatch: (id: string) => CatalogWatch | undefined,
): StrapSuggestion[] {
  const seen = new Set<string>()
  const watchOptions = watches.flatMap(watch => {
    if (seen.has(watch.watchId)) return []
    seen.add(watch.watchId)
    const catalog = getCatalogWatch(watch.watchId)
    if (catalog?.braceletType === 'integrated') return []
    const caseOnly = getCaseOnly(watch.watchId)
    const lugWidthMm = caseOnly?.lugWidthMm ?? catalog?.lugWidthMm ?? watch.lugWidthMm
    const imageUrl = catalog?.imageUrl ?? watch.imageUrl
    const transparentUrl = catalog?.imageTransparentUrl ?? watch.imageTransparentUrl
    if (lugWidthMm == null || (!caseOnly && !imageUrl && !transparentUrl)) return []

    const target = { id: watch.id, lugWidthMm, braceletType: catalog?.braceletType }
    const fittingDrawer = compatibleStraps(target, drawer, overrides)
    const ownedMaterials = new Set(fittingDrawer.map(strap => categoryOf(strap.material)))
    const options = (caseOnly ? mountedStraps : comparisonStraps)
      .filter(strap => strap.imageUrl && studioFit(strap, target, []) === 'fits')
      .filter(strap => !fittingDrawer.some(owned =>
        categoryOf(owned.material) === strap.category &&
        normalized(owned.color) === normalized(strap.color) &&
        (!owned.subMaterial || normalized(owned.subMaterial) === normalized(strap.design)),
      ))
      .map(strap => {
        const fillsMaterialGap = !ownedMaterials.has(strap.category)
        const preferred = watch.watchType === 'Dress' ? 'Leather'
          : watch.watchType === 'Diver' ? 'Rubber' : 'Sailcloth'
        const editorial = featured.indexOf(strap.id)
        return {
          watch: { catalogId: watch.watchId, brand: watch.brand, model: watch.model, lugWidthMm, imageUrl, transparentUrl },
          caseOnly, strap, fillsMaterialGap,
          score: (fillsMaterialGap ? 20 : 0) + (strap.category === preferred ? 8 : 0) +
            (editorial < 0 ? 0 : featured.length - editorial),
        }
      })
      .sort((a, b) => b.score - a.score)
    return options.length ? [options] : []
  }).sort((a, b) => Number(Boolean(b[0].caseOnly)) - Number(Boolean(a[0].caseOnly)))

  const picks: StrapSuggestion[] = []
  const used = new Set<string>()
  for (let round = 0; round < 3 && picks.length < 3; round += 1) {
    for (const options of watchOptions) {
      const available = options.filter(option => !used.has(option.strap.id))
      const best = available[0]
      if (!best) continue
      const pick = available.find(option =>
        option.fillsMaterialGap === best.fillsMaterialGap &&
        !picks.some(selected => selected.strap.category === option.strap.category),
      ) ?? best
      picks.push(pick)
      used.add(pick.strap.id)
      if (picks.length === 3) break
    }
  }
  return picks
}

export const sampleStrapSuggestions: StrapSuggestion[] = [
  ['omega-310-32-42-50-04-001', 'fabric-sailcloth-charcoal', 'Omega', 'Speedmaster Moonwatch'],
  ['tudor-m79950-0003', 'leather-suede-sand', 'Tudor', 'Ranger'],
  ['oris-01-733-7707-4354-07-5-20-45', 'rubber-tropical-oxblood', 'Oris', 'Divers Sixty-Five'],
].flatMap(([catalogId, strapId, brand, model]) => {
  const caseOnly = getCaseOnly(catalogId)
  const strap = mountedStraps.find(item => item.id === strapId)
  if (!caseOnly?.lugWidthMm || !strap || !strap.availableLugWidths.includes(caseOnly.lugWidthMm)) return []
  return [{ watch: { catalogId, brand, model, lugWidthMm: caseOnly.lugWidthMm }, caseOnly, strap, fillsMaterialGap: false }]
})
