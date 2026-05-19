/**
 * Re-parse all cached WatchBase HTML files using the current parser logic.
 *
 * No network. Reads every data/external/watchbase-cache/<brand>/<refkey>.html,
 * runs the updated parser, and overwrites the .parsed.json sidecar.
 *
 * Use this whenever you change scrape-watchbase.ts's LABEL_ALIASES or
 * parseSpecs() — it lets you re-derive all the structured specs without
 * hitting WatchBase again.
 *
 * Usage:
 *   npm run catalog:reparse-watchbase
 *
 * Runs in seconds even for 1500+ files (it's pure CPU, no network).
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { repoRoot } from './watch-image-pipeline'

const cacheDir = path.join(repoRoot, 'data', 'external', 'watchbase-cache')

// Re-export the parser from scrape-watchbase.ts. Easiest way: spawn tsx and
// have it import + run. Cleanest: refactor parseSpecs into a shared module.
// For now we inline a thin wrapper that calls the parser via dynamic import.

async function main() {
  if (!fs.existsSync(cacheDir)) {
    console.error(`No WatchBase cache at ${cacheDir}`)
    process.exit(1)
  }

  // Dynamic import to pick up the latest LABEL_ALIASES / parseSpecs.
  const mod = await import('./scrape-watchbase-parser')
  const parseSpecs = mod.parseSpecs

  let scanned = 0
  let rewritten = 0
  let unchanged = 0
  let errors = 0

  const brandDirs = fs.readdirSync(cacheDir).filter(b => {
    const p = path.join(cacheDir, b)
    return fs.statSync(p).isDirectory()
  })

  for (const brand of brandDirs) {
    const brandDir = path.join(cacheDir, brand)
    const files = fs.readdirSync(brandDir).filter(f => f.endsWith('.html'))
    for (const file of files) {
      scanned += 1
      const htmlPath = path.join(brandDir, file)
      const parsedPath = htmlPath.replace(/\.html$/, '.parsed.json')
      try {
        const html = fs.readFileSync(htmlPath, 'utf8')
        const specs = parseSpecs(html)
        const filledCount = Object.values(specs).filter(
          v => v != null && v !== '' && !(Array.isArray(v) && v.length === 0),
        ).length

        let url = ''
        if (fs.existsSync(parsedPath)) {
          try {
            const old = JSON.parse(fs.readFileSync(parsedPath, 'utf8'))
            url = old.url ?? ''
          } catch {
            /* ignore */
          }
        }

        const payload = {
          scraped_at: new Date().toISOString(),
          url,
          reparsed: true,
          specs,
          filledCount,
        }
        fs.writeFileSync(parsedPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
        rewritten += 1
        if (rewritten <= 10 || rewritten % 200 === 0) {
          console.log(
            `[reparse] ${brand}/${file.replace('.html', '').padEnd(28)}  ${filledCount}/29 fields`,
          )
        }
      } catch (err) {
        errors += 1
        console.warn(`[reparse] ${brand}/${file}: ${(err as Error).message}`)
      }
    }
  }

  console.log()
  console.log(`[reparse] scanned ${scanned} HTML files`)
  console.log(`[reparse] rewrote ${rewritten} parsed.json`)
  console.log(`[reparse] errors:  ${errors}`)
  console.log()
  console.log('Next: re-enrich to pick up the better extractions:')
  console.log(
    '  SEED_CSV=data/catalog-seed-full.csv OUTPUT_JSON=data/catalog-enriched-full.json npm run catalog:enrich',
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
