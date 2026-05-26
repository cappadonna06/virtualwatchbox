/**
 * Discover every WatchBase reference in a brand-model family page and
 * emit a seed-CSV slice for the ones we don't already have.
 *
 * WatchBase's family pages (e.g. /longines/hydroconquest) embed every
 * reference in a META keywords tag — including refs that aren't
 * visible in the on-page product grid. This script harvests them all,
 * dedupes against our existing seed (`data/catalog-seed-full.csv`),
 * and writes the new ones to a CSV ready to feed into the runbook
 * (`catalog:scrape-watchbase`, `catalog:enrich`, `images:acquire`, etc).
 *
 * Usage:
 *   npx tsx scripts/discover-watchbase-family.ts longines/hydroconquest
 *   npx tsx scripts/discover-watchbase-family.ts rolex/datejust-41 --watch-type=Sport --dial=Silver
 *
 * Output:
 *   data/catalog-seed-discovered-<brand>-<model>.csv
 *
 * Then merge + run the pipeline:
 *   npm run catalog:scrape-watchbase -- --seed=data/catalog-seed-discovered-<...>.csv
 *   (then enrich, acquire images, seed, etc — same as other batches)
 */
import * as fs from 'fs'
import * as path from 'path'
import { repoRoot } from './watch-image-pipeline'
import { mintCatalogId } from '../lib/catalogId'

const args = process.argv.slice(2)
function flag(name: string): string | undefined {
  const hit = args.find(a => a === name || a.startsWith(name + '='))
  if (!hit) return undefined
  if (hit === name) return args[args.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}

const POSITIONAL = args.find(a => !a.startsWith('--'))
if (!POSITIONAL) {
  console.error('Usage: npx tsx scripts/discover-watchbase-family.ts <brand>/<model> [--watch-type=...] [--dial=...]')
  console.error('Example: npx tsx scripts/discover-watchbase-family.ts longines/hydroconquest')
  process.exit(1)
}

const [BRAND_SLUG, MODEL_SLUG] = POSITIONAL.split('/')
const WATCH_TYPE = flag('--watch-type') ?? ''
const DIAL = flag('--dial') ?? ''
const HUMAN_BRAND = flag('--brand-name') ?? prettyBrand(BRAND_SLUG)
const HUMAN_MODEL = flag('--model-name') ?? prettyModel(MODEL_SLUG)
const UA = 'VirtualWatchboxBot/0.1 (catalog hydration; contact: msells.caltech@gmail.com)'

function prettyBrand(s: string): string {
  // Quick title-case from slug. User can override with --brand-name="A. Lange & Söhne"
  return s.split('-').map(t => t[0].toUpperCase() + t.slice(1)).join(' ')
}
function prettyModel(s: string): string {
  // hydroconquest -> HydroConquest. Crude camel-case for the family slug.
  // User override via --model-name=
  return s.split('-').map(t => t[0].toUpperCase() + t.slice(1)).join(' ')
}

async function main() {
  const url = `https://watchbase.com/${BRAND_SLUG}/${MODEL_SLUG}`
  console.log(`[discover] fetching ${url} …`)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) {
    console.error(`HTTP ${res.status} for ${url}`)
    process.exit(1)
  }
  const html = await res.text()
  console.log(`[discover] ${html.length} bytes`)

  // Pull refs from the META keywords tag (most comprehensive — includes refs
  // not currently in the visible product grid, which paginates).
  const kw = html.match(/<meta name="keywords" content="([^"]+)"/)
  if (!kw) {
    console.error('[discover] no <meta name="keywords"> found — page structure changed?')
    process.exit(1)
  }
  // Keywords list is comma-separated. Filter to anything that looks like a ref
  // (alphanumeric + dots / dashes / slashes, not too short). Brand/model words
  // are also in there so we need a heuristic.
  const tokens = kw[1].split(',').map(t => t.trim()).filter(Boolean)
  const refs = tokens.filter(t => /^[A-Z0-9][A-Z0-9.\/\-]{4,}$/i.test(t) && /\d/.test(t))
  const uniqueRefs = Array.from(new Set(refs))
  console.log(`[discover] ${uniqueRefs.length} refs harvested from META keywords`)

  // Also pull refs from visible anchor links — gives us a sanity-check overlap
  const hrefRefs = Array.from(html.matchAll(new RegExp(`href="https?://watchbase\\.com/${BRAND_SLUG}/${MODEL_SLUG}/([^"]+)"`, 'g')))
    .map(m => m[1])
  const hrefSet = new Set(hrefRefs)
  console.log(`[discover] ${hrefSet.size} refs visible as anchor links`)

  // Load existing seed to dedupe
  const seedPath = path.join(repoRoot, 'data', 'catalog-seed-full.csv')
  const existingIds = new Set<string>()
  if (fs.existsSync(seedPath)) {
    const lines = fs.readFileSync(seedPath, 'utf8').split('\n')
    for (let i = 1; i < lines.length; i++) {
      const id = lines[i].split(',')[0]
      if (id) existingIds.add(id)
    }
    console.log(`[discover] ${existingIds.size} existing ids in catalog-seed-full.csv`)
  }

  // Build rows for new refs
  const newRows: Array<{ id: string; ref: string; canonical: boolean }> = []
  for (const ref of uniqueRefs) {
    let id: string
    try {
      id = mintCatalogId({ brand: HUMAN_BRAND, reference: ref })
    } catch {
      continue
    }
    if (existingIds.has(id)) continue
    newRows.push({ id, ref, canonical: hrefSet.has(refToHref(ref)) })
  }
  console.log(`[discover] ${newRows.length} NEW refs not in seed (of ${uniqueRefs.length} harvested)`)

  // Write the slice CSV
  const outName = `catalog-seed-discovered-${BRAND_SLUG}-${MODEL_SLUG}.csv`
  const outPath = path.join(repoRoot, 'data', outName)
  const lines = ['id,brand,model,reference,dialColor,watchType,sourceUrl,communitySignal,verificationStatus']
  for (const row of newRows) {
    const csvRow = [
      row.id,
      HUMAN_BRAND,
      HUMAN_MODEL,
      row.ref,
      DIAL,
      WATCH_TYPE,
      `https://watchbase.com/${BRAND_SLUG}/${MODEL_SLUG}/${refToHref(row.ref)}`,
      'watchbase_discover',
      'identity_seeded_specs_pending',
    ]
    lines.push(csvRow.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v)).join(','))
  }
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8')
  console.log(`[discover] wrote ${path.relative(repoRoot, outPath)}`)
  console.log('')
  console.log('Next steps:')
  console.log(`  npm run catalog:scrape-watchbase -- --seed=data/${outName}`)
  console.log(`  npm run catalog:enrich -- --seed=data/catalog-seed-full.csv --out=data/catalog-enriched-full.json   # after merging into the main seed`)
  console.log(`  # Merge by id (dedup):`)
  console.log(`  awk -F',' 'NR==FNR{seen[$1]=1; print; next} FNR==1{next} !seen[$1]{print; seen[$1]=1}' data/catalog-seed-full.csv data/${outName} > /tmp/merged.csv && mv /tmp/merged.csv data/catalog-seed-full.csv`)
}

function refToHref(ref: string): string {
  // Mirror refToUrlSlug in scripts/scrape-watchbase.ts
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
