import fs from 'node:fs/promises'
import path from 'node:path'
import { watches } from '../lib/watches'
import { ensureWatchAssetDirs, rawDir } from './watch-image-pipeline'

type SearchResult = {
  title: string
  imageinfo?: Array<{ url?: string }>
}

type WikimediaQueryResponse = {
  query?: {
    pages?: Record<string, SearchResult>
  }
}

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function sanitizeExtFromUrl(url: string) {
  const pathname = new URL(url).pathname.toLowerCase()
  const ext = path.extname(pathname)
  if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) return ext
  return '.jpg'
}

async function searchWikimedia(query: string, limit = 8): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: '6', // File namespace
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  })

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json() as WikimediaQueryResponse
  const pages = Object.values(data.query?.pages ?? {})

  return pages
    .map(page => page.imageinfo?.[0]?.url)
    .filter((url): url is string => Boolean(url))
}

async function download(url: string, destPath: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  await fs.writeFile(destPath, Buffer.from(arrayBuffer))
}

function buildQueries(brand: string, model: string, reference: string) {
  const quoted = `\"${brand}\" \"${reference}\" watch`
  return [
    `${quoted} ${model}`,
    `${quoted} front view`,
    `intitle:${brand} ${reference} watch`,
  ]
}

async function main() {
  ensureWatchAssetDirs()

  const dryRun = hasFlag('--dry-run')
  const overwrite = hasFlag('--overwrite')
  const limitArg = Number(getArgValue('--limit') ?? '0')
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : undefined

  const candidates = (limit ? watches.slice(0, limit) : watches)

  let downloaded = 0
  let skipped = 0

  for (const watch of candidates) {
    const queries = buildQueries(watch.brand, watch.model, watch.reference)
    const targetBase = path.join(rawDir, watch.id)

    let existing = false
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.avif']) {
      try {
        await fs.access(`${targetBase}${ext}`)
        existing = true
        break
      } catch {}
    }

    if (existing && !overwrite) {
      skipped += 1
      console.log(`SKIP ${watch.id} (already exists)`)
      continue
    }

    let selectedUrl: string | undefined
    for (const query of queries) {
      const urls = await searchWikimedia(query)
      selectedUrl = urls[0]
      if (selectedUrl) break
    }

    if (!selectedUrl) {
      skipped += 1
      console.log(`MISS ${watch.id} (${watch.brand} ${watch.reference})`)
      continue
    }

    const ext = sanitizeExtFromUrl(selectedUrl)
    const outputPath = `${targetBase}${ext}`

    if (dryRun) {
      console.log(`DRY  ${watch.id} <= ${selectedUrl}`)
      downloaded += 1
      continue
    }

    try {
      await download(selectedUrl, outputPath)
      downloaded += 1
      console.log(`OK   ${watch.id} -> ${path.relative(process.cwd(), outputPath)}`)
    } catch (error) {
      skipped += 1
      console.log(`ERR  ${watch.id} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`Done. Downloaded: ${downloaded}, skipped/missed: ${skipped}, total: ${candidates.length}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
