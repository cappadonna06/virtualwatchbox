/**
 * Emit a static HTML at public/image-review-preview.html that puts the raw
 * original, the live processed image (Storage WebP), and the new preview
 * processed image side by side for every watch in the preview manifest.
 *
 * Open at http://localhost:3000/image-review-preview.html to spot-check.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'

loadLocalEnv()

const previewDir = path.join(repoRoot, 'public', 'watch-assets', 'processed-preview')
const previewManifestPath = path.join(previewDir, 'manifest.json')
const liveManifestPath = path.join(repoRoot, 'public', 'watch-assets', 'processed', 'manifest.json')
const outPath = path.join(repoRoot, 'public', 'image-review-preview.html')

type ManifestEntry = { watchId: string; rawFilename: string; pngPath: string; webpPath: string; processedWidth: number; processedHeight: number }

async function main() {
  const preview: ManifestEntry[] = JSON.parse(await fs.readFile(previewManifestPath, 'utf8'))
  const liveByIdRaw: ManifestEntry[] = await fs.readFile(liveManifestPath, 'utf8').then(s => JSON.parse(s)).catch(() => [] as ManifestEntry[])
  const liveById = new Map(liveByIdRaw.map(e => [e.watchId, e]))

  // Pull notes + tags + brand/model for context.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing Supabase env')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const watchIds = preview.map(p => p.watchId)
  const reviewsQ = await supabase
    .from('watch_image_reviews')
    .select('catalog_watch_id, status, notes, tags, created_at')
    .in('catalog_watch_id', watchIds)
    .order('created_at', { ascending: false })
  const catalogQ = await supabase
    .from('catalog_watches')
    .select('id, brand, model, reference')
    .in('id', watchIds)
  type Latest = { notes: string | null; tags: string[] }
  const latest = new Map<string, Latest>()
  for (const r of reviewsQ.data ?? []) {
    if (!latest.has(r.catalog_watch_id)) {
      latest.set(r.catalog_watch_id, { notes: r.notes, tags: r.tags ?? [] })
    }
  }
  const catalog = new Map<string, { brand: string; model: string; reference: string }>()
  for (const c of catalogQ.data ?? []) catalog.set(c.id, { brand: c.brand, model: c.model, reference: c.reference })

  const rows = preview.map(p => {
    const live = liveById.get(p.watchId)
    const review = latest.get(p.watchId)
    const meta = catalog.get(p.watchId)
    const rawUrl = `/watch-assets/raw/${p.rawFilename}`
    const liveUrl = live ? live.pngPath : `/watch-assets/processed/${p.watchId}.png`
    const newUrl = p.pngPath
    const title = meta ? `${meta.brand} ${meta.model}` : p.watchId
    const tagPills = (review?.tags ?? []).map(t => `<span class="pill">${t}</span>`).join('')
    const note = review?.notes ? `<p class="note">${escapeHtml(review.notes)}</p>` : ''
    return `
    <section class="row">
      <header>
        <h2>${escapeHtml(title)}</h2>
        <code>${p.watchId}</code>
        <div class="tags">${tagPills}</div>
        ${note}
      </header>
      <div class="grid">
        <figure><figcaption>Raw original</figcaption><img loading="lazy" src="${rawUrl}"></figure>
        <figure><figcaption>Live (old)</figcaption><img loading="lazy" src="${liveUrl}"></figure>
        <figure class="new"><figcaption>New preview</figcaption><img loading="lazy" src="${newUrl}"></figure>
      </div>
    </section>
    `
  }).join('\n')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Image review — old vs new</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #f7f6f2; margin: 0; padding: 40px 28px; color: #1a1410; }
    h1 { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 32px; margin: 0 0 8px; }
    .lede { color: #6b6358; max-width: 720px; margin-bottom: 32px; font-size: 13px; }
    .row { background: white; border: 1px solid #e6e2d8; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
    .row header { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
    .row h2 { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; margin: 0; }
    .row code { font-size: 11px; color: #6b6358; }
    .pill { display: inline-block; padding: 2px 8px; background: #fff4e6; color: #9a5b14; border: 1px solid #e9c99b; border-radius: 20px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    .note { width: 100%; margin: 6px 0 0; font-size: 12px; color: #6b6358; font-style: italic; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #efece5; }
    figure { margin: 0; background: #fafaf8; padding: 8px 8px 4px; display: flex; flex-direction: column; align-items: center; }
    figure.new { background: #f5fbf5; box-shadow: inset 0 0 0 1px #bfd9c2; }
    figcaption { font-size: 10px; color: #6b6358; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    img { max-width: 100%; max-height: 420px; object-fit: contain; }
  </style>
</head>
<body>
  <h1>Image review — old vs new</h1>
  <p class="lede">${preview.length} watches, processed with the tuned pipeline. Compare the new preview column (green) against the live old one. If you approve, the same pipeline runs on every non-approved watch (~945) and uploads to Storage.</p>
  ${rows}
</body>
</html>
`
  await fs.writeFile(outPath, html, 'utf8')
  console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${preview.length} watches).`)
  console.log('Open: http://localhost:3000/image-review-preview.html')
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

main().catch(err => { console.error(err); process.exit(1) })
