import type { CatalogWatch } from '@/types/watch'

export type CatalogMatchMethod = 'reference' | 'brand_model' | 'brand_only' | 'none'

export type AiIdentity = {
  brand: string
  model: string
  references: string[]
}

export type CatalogMatchResult = {
  matches: CatalogWatch[]
  method: CatalogMatchMethod
}

const REF_STRIP = /[\s\-./]/g

function normalizeRef(value: string): string {
  return value.toLowerCase().replace(REF_STRIP, '')
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2)
}

function fuzzyModelMatch(catalogModel: string, aiModel: string): boolean {
  if (!catalogModel || !aiModel) return false
  const a = catalogModel.toLowerCase()
  const b = aiModel.toLowerCase()
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const aTokens = new Set(tokens(catalogModel))
  const bTokens = tokens(aiModel)
  return bTokens.some(t => aTokens.has(t))
}

type ScoredWatch = { watch: CatalogWatch; score: number; tier: CatalogMatchMethod }

function scoreOne(watch: CatalogWatch, ai: AiIdentity): ScoredWatch {
  const aiBrand = ai.brand.trim().toLowerCase()
  const watchBrand = watch.brand.trim().toLowerCase()
  const catRefNorm = normalizeRef(watch.reference)

  let bestRefScore = 0
  if (catRefNorm) {
    for (const ref of ai.references) {
      const aiRefNorm = normalizeRef(ref)
      if (!aiRefNorm) continue
      if (aiRefNorm === catRefNorm) {
        bestRefScore = Math.max(bestRefScore, 1.0)
      } else if (aiRefNorm.includes(catRefNorm) || catRefNorm.includes(aiRefNorm)) {
        bestRefScore = Math.max(bestRefScore, 0.85)
      }
    }
  }
  if (bestRefScore > 0) {
    return { watch, score: bestRefScore, tier: 'reference' }
  }

  if (aiBrand && watchBrand && aiBrand === watchBrand) {
    if (fuzzyModelMatch(watch.model, ai.model)) {
      return { watch, score: 0.7, tier: 'brand_model' }
    }
    return { watch, score: 0.4, tier: 'brand_only' }
  }

  return { watch, score: 0, tier: 'none' }
}

export function matchCatalog(ai: AiIdentity, catalog: CatalogWatch[]): CatalogMatchResult {
  const scored = catalog
    .map(w => scoreOne(w, ai))
    .filter(s => s.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (scored.length === 0) {
    return { matches: [], method: 'none' }
  }

  return {
    matches: scored.map(s => s.watch),
    method: scored[0].tier,
  }
}
