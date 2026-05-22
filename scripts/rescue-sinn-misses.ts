/*
 * Sinn-specific rescue. Two failure modes hit Sinn refs hard:
 *
 *   1. Hand-curated batch entries where model == reference (e.g. row
 *      "Sinn / 556.010 / 556.010"). The acquire URL builder produced
 *      watchbase.com/sinn/556-010/556-010 which 404s. The real WatchBase
 *      URL is watchbase.com/sinn/frankfurt-financial-district/556-010.
 *
 *   2. kaggle:watch_db Sinn rows where the reference was corrupted at CSV
 *      import (e.g. "1,010,010"). The real refs look like 1010.010 →
 *      WatchBase slug 1010-010.
 *
 * Fix: brute-force candidates per (ref_format × family) and write to the
 * cache keyed by the catalog ref's slug so acquire-watch-images.ts picks it
 * up on the next run.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
function hasFlag(name: string) {
  return ARGV.includes(name)
}

const BATCH_CSV = arg('--batch') ?? path.join(ROOT, 'data', 'catalog-batch-1.csv')
const CACHE_DIR = path.join(ROOT, 'data', 'external', 'watchbase-cache', 'sinn')
const DELAY_MS = Number(arg('--delay') ?? 2500)
const DRY_RUN = hasFlag('--dry-run')

// WatchBase family slugs Sinn uses. Tried in this order per ref.
const SINN_FAMILIES = [
  'instrument-watches',
  'instrument-chronographs',
  'frankfurt-financial-district',
  'diving-watches',
  'classic-timepieces',
  'ladies-watches',
  'special-edition',
]

function refKey(reference: string): string {
  return reference.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Multiple plausible URL-slug formats for a Sinn ref. WatchBase uses dashes
// between segments, dots become dashes, commas (from corrupted CSV) get
// re-interpreted.
function refUrlCandidates(reference: string): string[] {
  const cleaned = reference.replace(/\s*\(aka:[^)]*\)/i, '').trim()
  const out = new Set<string>()
  const lower = cleaned.toLowerCase()

  // Standard slugification: any run of non-alphanumerics → single dash.
  out.add(lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))

  // Commas removed entirely (handles "1,010,010" → "1010010" — then
  // re-introduce a dash before the last 3 digits).
  const noPunct = lower.replace(/[^a-z0-9]/g, '')
  out.add(noPunct)
  if (noPunct.length > 3) {
    out.add(`${noPunct.slice(0, -3)}-${noPunct.slice(-3)}`)
  }
  if (noPunct.length > 4) {
    out.add(`${noPunct.slice(0, -4)}-${noPunct.slice(-4)}`) // -0001 style
  }

  // Just last 3 digits as suffix, first chunk before any punct
  const first = lower.match(/^([a-z0-9]+)/)?.[1] ?? lower
  const last = lower.match(/([a-z0-9]+)$/)?.[1] ?? ''
  if (first && last && first !== last) {
    out.add(`${first}-${last}`)
  }

  return Array.from(out).filter(Boolean)
}

async function fetchHtml(url: string): Promise<{ html: string | null; status: number; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'VirtualWatchboxBot/0.1 (Sinn rescue; contact: msells.caltech@gmail.com)',
      },
    })
    const html = res.status === 200 ? await res.text() : null
    return { html, status: res.status, finalUrl: res.url }
  } catch {
    return null
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function jitter(base: number) { return base + Math.floor((Math.random() - 0.5) * 800) }

type BatchRow = { id: string; brand: string; model: string; reference: string }

function parseBatchCsv(text: string): BatchRow[] {
  const lines = text.split('\n').filter(Boolean)
  const out: BatchRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j]
      if (c === '"') {
        if (inQ && lines[i][j + 1] === '"') { cur += '"'; j++ }
        else inQ = !inQ
      } else if (c === ',' && !inQ) { cols.push(cur); cur = '' }
      else { cur += c }
    }
    cols.push(cur)
    if (cols.length < 4) continue
    out.push({ id: cols[0], brand: cols[1], model: cols[2], reference: cols[3] })
  }
  return out
}

async function main() {
  if (!fs.existsSync(BATCH_CSV)) {
    console.error(`batch CSV not found at ${BATCH_CSV}`)
    process.exit(1)
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true })

  const batch = parseBatchCsv(fs.readFileSync(BATCH_CSV, 'utf8'))
  const sinns = batch.filter(r => r.brand === 'Sinn')
  console.log(`[sinn-rescue] ${sinns.length} Sinn refs in batch`)

  // Only attempt refs that don't already have a parsed.json keyed by their
  // catalog refKey.
  const todo = sinns.filter(r => {
    const parsed = path.join(CACHE_DIR, `${refKey(r.reference)}.parsed.json`)
    return !fs.existsSync(parsed)
  })
  console.log(`[sinn-rescue] ${todo.length} need rescue (no parsed.json yet)`)

  if (DRY_RUN) {
    console.log('[sinn-rescue] DRY RUN — first 10 candidate URL sets:')
    for (const r of todo.slice(0, 10)) {
      const cands = refUrlCandidates(r.reference)
      console.log(`  ${r.id}  ref="${r.reference}"  → refSlugs=[${cands.join(', ')}]`)
      for (const fam of SINN_FAMILIES.slice(0, 2)) {
        for (const rs of cands.slice(0, 2)) {
          console.log(`      https://watchbase.com/sinn/${fam}/${rs}`)
        }
      }
    }
    return
  }

  let hits = 0
  let stillMissing = 0
  let requests = 0
  const startTime = Date.now()

  for (let i = 0; i < todo.length; i++) {
    const r = todo[i]
    const catalogKey = refKey(r.reference)
    const htmlPath = path.join(CACHE_DIR, `${catalogKey}.html`)
    const parsedPath = path.join(CACHE_DIR, `${catalogKey}.parsed.json`)
    const missPath = path.join(CACHE_DIR, `${catalogKey}.miss`)

    const candidates = refUrlCandidates(r.reference)
    let rescued = false

    outer: for (const fam of SINN_FAMILIES) {
      for (const refSlug of candidates) {
        const url = `https://watchbase.com/sinn/${fam}/${refSlug}`
        requests++
        const res = await fetchHtml(url)
        await sleep(jitter(DELAY_MS))
        if (!res || res.status !== 200 || !res.html) continue
        if (res.html.includes('Page not found') || res.html.length < 2000) continue
        const og = res.html.match(/property="og:image"\s+content="([^"]+)"/)
        if (!og || !og[1] || !/watchbase\.com.*watch\//.test(og[1])) continue

        fs.writeFileSync(htmlPath, res.html, 'utf8')
        fs.writeFileSync(
          parsedPath,
          JSON.stringify(
            {
              scraped_at: new Date().toISOString(),
              url: res.finalUrl,
              specs: {},
              rescued_via: 'sinn-family-rescue',
              original_catalog_ref: r.reference,
              tried_family: fam,
              tried_ref_slug: refSlug,
            },
            null,
            2,
          ),
          'utf8',
        )
        if (fs.existsSync(missPath)) fs.unlinkSync(missPath)
        hits++
        rescued = true
        console.log(`[sinn-rescue] HIT ${i + 1}/${todo.length}  ${r.reference}  → ${fam}/${refSlug}  (hits=${hits} req=${requests})`)
        break outer
      }
    }

    if (!rescued) {
      stillMissing++
      if (i < 5 || (i + 1) % 5 === 0) {
        console.log(`[sinn-rescue] miss ${i + 1}/${todo.length}  ${r.reference}  (tried ${SINN_FAMILIES.length * candidates.length} urls)`)
      }
    }

    if ((i + 1) % 5 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (i + 1) / elapsed
      const eta = (todo.length - i - 1) / rate
      console.log(`[sinn-rescue] progress ${i + 1}/${todo.length}  hits=${hits}  miss=${stillMissing}  ${rate.toFixed(2)}/s  ETA ${(eta / 60).toFixed(1)}min`)
    }
  }

  console.log('')
  console.log(`[sinn-rescue] done. hits=${hits}  still_missing=${stillMissing}  total_requests=${requests}`)
  console.log('Next: rerun npm run images:acquire -- --ref-list=data/catalog-batch-1.csv --top=1500')
}

main()
