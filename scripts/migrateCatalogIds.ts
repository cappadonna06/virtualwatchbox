/**
 * Migrate every existing catalog id to the canonical {brand-slug}-{ref-slug}
 * shape defined in lib/catalogId.ts. Idempotent: re-running on an already-
 * migrated tree is a no-op.
 *
 * What it touches:
 *   - lib/watches.ts                              — rewrites each `id: 'OLD',` to `id: 'NEW',`
 *   - lib/playgroundData.ts                       — rewrites watchId string literals in entries
 *   - public/watch-assets/raw/<old>.<ext>         — renamed to <new>.<ext>
 *   - public/watch-assets/processed/<old>.png     — renamed to <new>.png
 *   - public/watch-assets/processed/webp/<old>.webp — renamed to <new>.webp
 *   - public/watch-assets/processed/manifest.json — regenerated with new ids and filenames
 *   - data/catalog-id-migration.json              — written so the rename map is committed
 *
 * Usage:
 *   npm run catalog:migrate-ids                   # dry-run, prints the plan
 *   APPLY=1 npm run catalog:migrate-ids           # write changes
 *
 * Safety:
 *   - Detects collisions (two old ids that mint to the same new id) and
 *     aborts with a list. None expected for the 87-watch seed but the check
 *     stays in case future entries collide.
 *   - Refuses to overwrite an existing image file with the new name unless
 *     it's already that file (idempotency).
 *   - Image files whose source name doesn't match any known catalog id are
 *     left alone and reported.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { watches } from '../lib/watches'
import { isValidCatalogId, mintCatalogId, mintCatalogSlug } from '../lib/catalogId'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true'

const WATCHES_TS = path.join(repoRoot, 'lib', 'watches.ts')
const PLAYGROUND_TS = path.join(repoRoot, 'lib', 'playgroundData.ts')
// Any other file that hard-codes catalog ids as string literals. The list
// is opt-in (vs scanning the whole tree) so the rewrite stays predictable.
const ID_LITERAL_FILES = [
  path.join(repoRoot, 'lib', 'discoverUpgradePaths.ts'),
  path.join(repoRoot, 'docs', 'DISCOVER_UPGRADE_PATHS.ts'),
]
const MANIFEST_JSON = path.join(repoRoot, 'public', 'watch-assets', 'processed', 'manifest.json')
const RAW_DIR = path.join(repoRoot, 'public', 'watch-assets', 'raw')
const PROCESSED_DIR = path.join(repoRoot, 'public', 'watch-assets', 'processed')
const WEBP_DIR = path.join(PROCESSED_DIR, 'webp')
const MIGRATION_MAP_OUT = path.join(repoRoot, 'data', 'catalog-id-migration.json')

type RenameEntry = {
  oldId: string
  newId: string
  brand: string
  model: string
  reference: string
  newSlug: string
  changed: boolean
}

function buildRenameMap(): { entries: RenameEntry[]; collisions: Array<{ id: string; first: string; second: string }> } {
  const seen = new Map<string, string>()
  const collisions: Array<{ id: string; first: string; second: string }> = []
  const entries: RenameEntry[] = []

  for (const w of watches) {
    const newId = mintCatalogId({
      brand: w.brand,
      reference: w.reference,
      model: w.model,
      dialColor: w.dialColor,
    })
    const newSlug = mintCatalogSlug({
      brand: w.brand,
      model: w.model,
      reference: w.reference,
    })

    if (!isValidCatalogId(newId)) {
      throw new Error(`Invalid minted id "${newId}" for ${w.id} (brand="${w.brand}", ref="${w.reference}")`)
    }

    if (seen.has(newId)) {
      collisions.push({ id: newId, first: seen.get(newId)!, second: w.id })
    } else {
      seen.set(newId, w.id)
    }

    entries.push({
      oldId: w.id,
      newId,
      brand: w.brand,
      model: w.model,
      reference: w.reference,
      newSlug,
      changed: w.id !== newId,
    })
  }

  return { entries, collisions }
}

function rewriteFileContents(filePath: string, map: Map<string, string>): { changes: number } {
  const original = fs.readFileSync(filePath, 'utf8')
  let updated = original
  let changes = 0

  for (const [oldId, newId] of map.entries()) {
    if (oldId === newId) continue
    // Only replace inside string literals: 'OLD' and "OLD". This avoids
    // accidentally rewriting a comment or unrelated word that happens to
    // share the slug spelling.
    const single = `'${oldId}'`
    const double = `"${oldId}"`
    let before = updated
    updated = updated.split(single).join(`'${newId}'`)
    if (updated !== before) changes++
    before = updated
    updated = updated.split(double).join(`"${newId}"`)
    if (updated !== before) changes++
  }

  if (updated !== original) {
    if (APPLY) fs.writeFileSync(filePath, updated)
  }
  return { changes }
}

type ManifestEntry = {
  watchId: string
  rawFilename: string
  pngPath: string
  webpPath: string
  sourceWidth?: number
  sourceHeight?: number
  processedWidth?: number
  processedHeight?: number
  backgroundRemovalApplied?: boolean
}

function planAndExecuteImageRenames(map: Map<string, string>): {
  renamedRaw: number
  renamedProcessed: number
  renamedWebp: number
  manifestUpdated: boolean
  unmatchedRaw: string[]
} {
  const renamedRaw: string[] = []
  const renamedProcessed: string[] = []
  const renamedWebp: string[] = []
  const unmatchedRaw: string[] = []

  // Reverse map for image renames: if a file's basename matches an oldId,
  // rename it to newId.{ext}.
  function renameDirByBasename(dir: string, applied: string[]): void {
    if (!fs.existsSync(dir)) return
    for (const file of fs.readdirSync(dir)) {
      const fp = path.join(dir, file)
      const stat = fs.statSync(fp)
      if (!stat.isFile()) continue
      const ext = path.extname(file)
      const base = path.basename(file, ext)
      const newId = map.get(base)
      if (!newId) {
        if (dir === RAW_DIR && base !== 'manifest') unmatchedRaw.push(file)
        continue
      }
      if (newId === base) continue
      const newPath = path.join(dir, `${newId}${ext}`)
      if (fs.existsSync(newPath)) {
        if (newPath === fp) continue
        throw new Error(
          `Rename collision: ${fp} → ${newPath} (target already exists). Resolve manually.`,
        )
      }
      if (APPLY) fs.renameSync(fp, newPath)
      applied.push(`${base}${ext} → ${newId}${ext}`)
    }
  }

  renameDirByBasename(RAW_DIR, renamedRaw)
  renameDirByBasename(PROCESSED_DIR, renamedProcessed)
  renameDirByBasename(WEBP_DIR, renamedWebp)

  // Regenerate manifest.json: every entry's watchId, rawFilename, pngPath,
  // and webpPath gets remapped through the id table.
  let manifestUpdated = false
  if (fs.existsSync(MANIFEST_JSON)) {
    const raw = fs.readFileSync(MANIFEST_JSON, 'utf8')
    const parsed = JSON.parse(raw) as ManifestEntry[]
    const updated = parsed.map(entry => {
      const newId = map.get(entry.watchId) ?? entry.watchId
      if (newId === entry.watchId) return entry

      const rawExt = path.extname(entry.rawFilename)
      const newRawFilename = `${newId}${rawExt}`
      const newPngPath = entry.pngPath.replace(`/${entry.watchId}.png`, `/${newId}.png`)
      const newWebpPath = entry.webpPath.replace(`/${entry.watchId}.webp`, `/${newId}.webp`)
      return {
        ...entry,
        watchId: newId,
        rawFilename: newRawFilename,
        pngPath: newPngPath,
        webpPath: newWebpPath,
      }
    })
    if (JSON.stringify(updated) !== JSON.stringify(parsed)) {
      manifestUpdated = true
      if (APPLY) fs.writeFileSync(MANIFEST_JSON, JSON.stringify(updated, null, 2))
    }
  }

  return {
    renamedRaw: renamedRaw.length,
    renamedProcessed: renamedProcessed.length,
    renamedWebp: renamedWebp.length,
    manifestUpdated,
    unmatchedRaw,
  }
}

function main() {
  console.log(APPLY ? '[migrate-catalog-ids] APPLY mode' : '[migrate-catalog-ids] DRY-RUN (set APPLY=1 to write)')

  const { entries, collisions } = buildRenameMap()

  if (collisions.length) {
    console.error('[migrate-catalog-ids] COLLISIONS detected; aborting.')
    for (const c of collisions) console.error(`  ${c.id}: ${c.first}  +  ${c.second}`)
    process.exit(1)
  }

  const changing = entries.filter(e => e.changed)
  console.log(`[migrate-catalog-ids] ${entries.length} watches; ${changing.length} ids will change`)

  // Print a human-readable plan
  for (const e of changing) {
    console.log(`  ${e.oldId.padEnd(50)} -> ${e.newId.padEnd(40)} (slug=${e.newSlug})`)
  }

  // Emit the rename map to data/catalog-id-migration.json (committed for
  // historical reference and as input to a future user-data remap).
  const mapObj: Record<string, { newId: string; newSlug: string; brand: string; model: string; reference: string }> = {}
  for (const e of entries) {
    mapObj[e.oldId] = { newId: e.newId, newSlug: e.newSlug, brand: e.brand, model: e.model, reference: e.reference }
  }
  if (APPLY) {
    fs.mkdirSync(path.dirname(MIGRATION_MAP_OUT), { recursive: true })
    fs.writeFileSync(MIGRATION_MAP_OUT, JSON.stringify(mapObj, null, 2))
    console.log(`[migrate-catalog-ids] wrote ${path.relative(repoRoot, MIGRATION_MAP_OUT)}`)
  }

  const idMap = new Map<string, string>()
  for (const e of entries) idMap.set(e.oldId, e.newId)

  // Rewrite TS files
  const watchesResult = rewriteFileContents(WATCHES_TS, idMap)
  console.log(`[migrate-catalog-ids] lib/watches.ts: ${watchesResult.changes} replacements`)
  const playgroundResult = rewriteFileContents(PLAYGROUND_TS, idMap)
  console.log(`[migrate-catalog-ids] lib/playgroundData.ts: ${playgroundResult.changes} replacements`)
  for (const fp of ID_LITERAL_FILES) {
    if (!fs.existsSync(fp)) continue
    const r = rewriteFileContents(fp, idMap)
    console.log(`[migrate-catalog-ids] ${path.relative(repoRoot, fp)}: ${r.changes} replacements`)
  }

  // Rename image files + manifest
  const imgResult = planAndExecuteImageRenames(idMap)
  console.log(
    `[migrate-catalog-ids] images renamed: raw=${imgResult.renamedRaw}, processed=${imgResult.renamedProcessed}, webp=${imgResult.renamedWebp}`,
  )
  console.log(`[migrate-catalog-ids] manifest.json updated: ${imgResult.manifestUpdated}`)
  if (imgResult.unmatchedRaw.length) {
    console.warn(
      `[migrate-catalog-ids] ${imgResult.unmatchedRaw.length} raw files did not match any catalog id (left alone):`,
    )
    for (const f of imgResult.unmatchedRaw) console.warn(`    ${f}`)
  }

  if (!APPLY) console.log('\n[migrate-catalog-ids] dry-run complete. Re-run with APPLY=1 to write.')
}

main()
