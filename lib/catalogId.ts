/**
 * Canonical catalog id + slug + URL minting.
 *
 * The single source of truth for how a watch becomes a database id, a URL
 * slug, and a Storage path. Used by:
 *   - the static seed (lib/watches.ts)
 *   - the seed script (scripts/seedCatalog.ts)
 *   - all ingestion pipelines (scripts/ingestCatalog.ts, admin import API)
 *   - URL routing for /watches/:slug
 *   - storage paths for catalog images
 *
 * Rule (hard-coded, do not change without a migration plan):
 *
 *   id = {brand-slug}-{reference-slug}                  // 95% of watches
 *      = {brand-slug}-{reference-slug}-{dial-slug}      // same ref, multiple dials (rare)
 *      = {brand-slug}-{model-slug}-{disambiguator}      // ref-less (microbrand, vintage)
 *
 * Examples:
 *   Rolex Submariner Date 126610LN              -> rolex-126610ln
 *   Patek Philippe Nautilus 5711/1A-010         -> patek-philippe-5711-1a-010
 *   Omega Speedmaster 310.30.42.50.01.001       -> omega-310-30-42-50-01-001
 *   A. Lange & Söhne Lange 1 191.032            -> a-lange-and-sohne-191-032
 *   Vintage Rolex Submariner 6204 (gilt dial)   -> rolex-6204-gilt
 *   Lorier Falcon Series III (no ref)           -> lorier-falcon-iii  (community-tagged)
 */

const NON_ALNUM = /[^a-z0-9]+/g
const MULTI_HYPHEN = /-+/g
const TRIM_HYPHEN = /^-+|-+$/g

// Strip combining diacritical marks ("söhne" -> "sohne", "café" -> "cafe").
// ̀-ͯ is the Combining Diacritical Marks block.
function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function baseSlugify(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(NON_ALNUM, '-')
    .replace(MULTI_HYPHEN, '-')
    .replace(TRIM_HYPHEN, '')
}

export function normalizeBrandSlug(brand: string): string {
  if (!brand?.trim()) throw new Error('brand is required')
  return baseSlugify(brand)
}

export function normalizeReferenceSlug(reference: string): string {
  if (!reference?.trim()) throw new Error('reference is required')
  return baseSlugify(reference)
}

export function normalizeModelSlug(model: string): string {
  if (!model?.trim()) throw new Error('model is required')
  return baseSlugify(model)
}

export function normalizeDialSlug(dialColor: string): string {
  return baseSlugify(dialColor)
}

export type MintCatalogIdInput = {
  brand: string
  reference?: string | null
  model?: string
  dialColor?: string
  /**
   * Used only when reference is missing (community-verified microbrand /
   * vintage). Combined with brand + model to form a stable id. Caller is
   * responsible for picking something distinguishing (year, dial, "v2", …).
   */
  disambiguator?: string
  /**
   * If set, the dial slug is appended even when reference is present. Use
   * for the rare same-ref-multiple-dials case (e.g. Rolex Daytona 116500LN
   * is sold with both white AND black dial under the same reference).
   */
  forceDialDisambiguator?: boolean
}

export function mintCatalogId(input: MintCatalogIdInput): string {
  const brandSlug = normalizeBrandSlug(input.brand)

  if (input.reference?.trim()) {
    const refSlug = normalizeReferenceSlug(input.reference)
    if (input.forceDialDisambiguator && input.dialColor?.trim()) {
      const dialSlug = normalizeDialSlug(input.dialColor)
      return `${brandSlug}-${refSlug}-${dialSlug}`
    }
    return `${brandSlug}-${refSlug}`
  }

  // Reference-less fallback path
  if (!input.model?.trim()) {
    throw new Error(
      `mintCatalogId: cannot mint id without reference AND without model (brand=${input.brand})`,
    )
  }
  if (!input.disambiguator?.trim()) {
    throw new Error(
      `mintCatalogId: ref-less watch needs an explicit disambiguator (brand=${input.brand}, model=${input.model}). ` +
        'Pass disambiguator (e.g. dial color, year, version).',
    )
  }
  const modelSlug = normalizeModelSlug(input.model)
  const disambiguatorSlug = baseSlugify(input.disambiguator)
  return `${brandSlug}-${modelSlug}-${disambiguatorSlug}`
}

/**
 * Long-form, human-readable URL slug. Used for /watches/:slug routes and
 * for SEO. Distinct from the id, which is the immutable PK. Multiple slugs
 * can resolve to the same id over time (slug aliases) but at any moment
 * each watch has exactly one canonical slug.
 */
export type MintCatalogSlugInput = {
  brand: string
  model: string
  reference?: string | null
  dialColor?: string
  forceDialDisambiguator?: boolean
}

export function mintCatalogSlug(input: MintCatalogSlugInput): string {
  const brand = normalizeBrandSlug(input.brand)
  const model = normalizeModelSlug(input.model)
  const parts: string[] = [brand, model]
  if (input.reference?.trim()) parts.push(normalizeReferenceSlug(input.reference))
  if (input.forceDialDisambiguator && input.dialColor?.trim()) {
    parts.push(normalizeDialSlug(input.dialColor))
  }
  return parts.filter(Boolean).join('-')
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)+$/

/**
 * Sanity-check: the id is well-formed lowercase-hyphen-alphanumeric and
 * contains at least two segments (brand-something).
 */
export function isValidCatalogId(id: string): boolean {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

/**
 * Storage path inside the watch-images bucket for a given catalog id +
 * variant. Hard-coded so admin upload, ingestion, and the resolver agree.
 *
 *   watch-images/{catalogId}/{variant}.{ext}
 */
export type CatalogImageVariant =
  | 'primary'
  | 'dial'
  | 'case_back'
  | 'bracelet'
  | 'lume'
  | 'lifestyle'
  | 'macro'

export function catalogImageStoragePath(
  catalogId: string,
  variant: CatalogImageVariant,
  ext: 'webp' | 'png' | 'jpg' = 'webp',
): string {
  if (!isValidCatalogId(catalogId)) {
    throw new Error(`catalogImageStoragePath: invalid catalog id "${catalogId}"`)
  }
  return `${catalogId}/${variant}.${ext}`
}

/**
 * Per-user gallery photo storage path.
 *
 *   watch-photos/user-uploads/{userId}/{ownedWatchId}/{photoId}.{ext}
 *
 * The owned-watch-id segment groups photos for one watch in one folder so
 * bulk delete on watch removal is one prefix scan instead of N row lookups.
 */
export function userPhotoStoragePath(
  userId: string,
  ownedWatchId: string,
  photoId: string,
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): string {
  return `user-uploads/${userId}/${ownedWatchId}/${photoId}.${ext}`
}
