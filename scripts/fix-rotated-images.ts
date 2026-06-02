/**
 * Auto-straighten rotated / diagonal catalog images.
 *
 * For every watch whose latest review is needs_reprocess with a
 * 'wrong_orientation' or 'aspect_ratio_off' tag, this:
 *   1. downloads the processed image from Storage,
 *   2. measures the silhouette's principal-axis tilt (image moments),
 *   3. rotates it so the band runs vertical, re-trims the transparent border,
 *      and resizes back to the canonical 900px height,
 *   4. re-screens the result to CONFIRM the tilt is gone,
 *   5. (--apply) overwrites the Storage object(s) and writes an 'approved'
 *      review so the watch drops off the flagged list.
 *
 * It tries both verticalizing rotations and keeps whichever the re-screen
 * likes best, so it's robust to rotation sign conventions.
 *
 * The principal axis is symmetric top/bottom, so straightening alone can leave
 * a watch upside-down. Pass --llm to add a gpt-4o-mini up/down check: it
 * confirms each straightened image is right-side-up, flips it 180° if not, and
 * only the confirmed-upright ones get applied (the rest stay flagged for a
 * human). ~$0.001-0.002 per image.
 *
 * Run:
 *   set -a && . ./.env.local && set +a
 *   npx tsx scripts/fix-rotated-images.ts                  # DRY-RUN + previews (rules only)
 *   npx tsx scripts/fix-rotated-images.ts --llm            # DRY-RUN + LLM up/down verdicts
 *   npx tsx scripts/fix-rotated-images.ts --llm --apply    # apply confirmed-upright only
 *
 * Dry-run writes before/after to public/watch-assets/rotate-preview/ (scratch,
 * viewable at http://localhost:3000/watch-assets/rotate-preview/<id>.after.png).
 *
 * After --apply, bump IMAGE_VERSION in lib/watchImages/cacheBust.ts so browsers
 * refetch (the Storage URLs are stable, so the ?v= param is what busts cache).
 */
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { screenProcessedImage } from '../lib/imageProcessing/screener'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const APPLY = process.argv.includes('--apply')
// LLM up/down verification. The principal axis can't tell upright from
// upside-down; gpt-4o-mini can. With --llm we confirm each straightened image
// is right-side-up (flipping 180° if not), and only apply confirmed ones.
const USE_LLM = process.argv.includes('--llm')
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''
const PAGE = 1000
const ROTATE_TAGS = new Set(['wrong_orientation', 'aspect_ratio_off'])
const PREVIEW_DIR = path.join(process.cwd(), 'public', 'watch-assets', 'rotate-preview')

type Orientation = 'upright' | 'upside_down' | 'sideways' | 'unsure'
async function llmCheckUpright(buf: Buffer): Promise<{ orientation: Orientation; reason: string }> {
  if (!OPENAI_API_KEY) return { orientation: 'unsure', reason: 'no OPENAI_API_KEY' }
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_SCREENER_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You verify the orientation of a wristwatch product photo. "upright" = dial vertical and readable, 12 o'clock at top, crown on the right, strap/bracelet running top-to-bottom. "upside_down" = rotated 180° (12 at bottom). "sideways" = lying on its side. Respond JSON only: {"orientation":"upright"|"upside_down"|"sideways","reason":"<=60 chars"}.` },
        { role: 'user', content: [{ type: 'text', text: 'Orientation?' }, { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } }] },
      ],
      response_format: { type: 'json_object' }, max_tokens: 60, temperature: 0,
    }),
  })
  if (!res.ok) return { orientation: 'unsure', reason: `http ${res.status}` }
  try {
    const j = await res.json() as { choices: Array<{ message: { content: string } }> }
    const p = JSON.parse(j.choices[0]?.message?.content ?? '{}')
    return { orientation: (p.orientation ?? 'unsure') as Orientation, reason: String(p.reason ?? '').slice(0, 80) }
  } catch { return { orientation: 'unsure', reason: 'parse error' } }
}

// Major-axis angle (degrees from the x-axis, in (-90, 90]) of the opaque mask.
async function majorAxisAngleDeg(buf: Buffer): Promise<number> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 12) continue
      n += 1; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
    }
  }
  if (!n) return 90
  const cx = sx / n, cy = sy / n
  const mu20 = sxx / n - cx * cx, mu02 = syy / n - cy * cy, mu11 = sxy / n - cx * cy
  return 0.5 * Math.atan2(2 * mu11, mu20 - mu02) * (180 / Math.PI)
}

async function rotateToUpright(buf: Buffer, deg: number): Promise<Buffer> {
  const rotated = await sharp(buf)
    .ensureAlpha()
    .rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim()                                   // drop the transparent border the rotation adds
    .resize({ height: 900, withoutEnlargement: false })
    .png()
    .toBuffer()
  return rotated
}

function storageRef(url: string): { bucket: string; objectPath: string } | null {
  const marker = '/object/public/'
  const i = url.indexOf(marker)
  if (i < 0) return null
  const rest = url.slice(i + marker.length)
  const slash = rest.indexOf('/')
  if (slash < 0) return null
  return { bucket: rest.slice(0, slash), objectPath: decodeURIComponent(rest.slice(slash + 1)) }
}

async function main() {
  // latest review per watch
  const reviews: Array<{ catalog_watch_id: string; status: string; tags: string[] }> = []
  for (let o = 0; ; o += PAGE) {
    const { data, error } = await sb.from('watch_image_reviews')
      .select('catalog_watch_id, status, tags, created_at')
      .order('created_at', { ascending: false }).range(o, o + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    reviews.push(...(data as any)); if (data.length < PAGE) break
  }
  const latest = new Map<string, { status: string; tags: string[] }>()
  for (const r of reviews) if (!latest.has(r.catalog_watch_id)) latest.set(r.catalog_watch_id, { status: r.status, tags: r.tags ?? [] })

  const targetIds = [...latest].filter(([, v]) =>
    v.status === 'needs_reprocess' && v.tags.some(t => ROTATE_TAGS.has(t))
  ).map(([id]) => id)

  console.log(`[rotate] ${APPLY ? 'APPLY' : 'DRY-RUN'}${USE_LLM ? ' · LLM up/down check ON' : ''} · ${targetIds.length} rotated/diagonal candidates`)
  if (USE_LLM && !OPENAI_API_KEY) { console.error('[rotate] --llm needs OPENAI_API_KEY in env'); process.exit(1) }
  if (!APPLY) { fs.mkdirSync(PREVIEW_DIR, { recursive: true }) }
  console.log('')

  let fixed = 0, unfixable = 0, needsManual = 0, errored = 0
  const sheet: Array<{ id: string; before: number; after: number; deg: number; big: boolean; verdict: string; confirmed: boolean }> = []
  for (const id of targetIds) {
    const { data } = await sb.from('watch_images')
      .select('png_url, webp_url').eq('catalog_watch_id', id).eq('variant', 'primary').limit(1)
    const row = data?.[0] as { png_url?: string; webp_url?: string } | undefined
    const url = row?.png_url || row?.webp_url
    if (!url) { console.log(`  ${id.padEnd(30)} no image`); errored++; continue }

    try {
      const orig = Buffer.from(await (await fetch(url)).arrayBuffer())
      const before = await screenProcessedImage(orig)
      const theta = await majorAxisAngleDeg(orig)

      // Two rotations verticalize the major axis (one upright, one upside-down).
      // Both pass the orientation re-screen, so among the clean ones we pick the
      // SMALLEST rotation — that's the one that preserves the original up/down
      // lean for a diagonal shot (the big alternative would flip it 180°).
      const candidates = [90 - theta, -90 - theta]
      const scored: Array<{ deg: number; buf: Buffer; tilt: number; clean: boolean }> = []
      for (const deg of candidates) {
        const buf = await rotateToUpright(orig, deg)
        const res = await screenProcessedImage(buf)
        const clean = !res.tags.includes('wrong_orientation') && !res.tags.includes('aspect_ratio_off')
        scored.push({ deg, buf, tilt: res.metrics.majorAxisTiltDeg, clean })
      }
      const cleanOnes = scored.filter(s => s.clean)
      const pool = cleanOnes.length ? cleanOnes : scored
      const best = pool.sort((a, b) => Math.abs(a.deg) - Math.abs(b.deg))[0]!
      const straightened = best.clean

      // The straightened buffer may still be upside-down (PCA can't tell). With
      // --llm, ask the model; flip 180° if it says so, then re-confirm. finalBuf
      // is what we preview/apply. confirmed gates whether we actually apply.
      let finalBuf = best.buf
      let verdict = 'upright (assumed)'
      let confirmed = straightened
      if (straightened && USE_LLM) {
        let v = await llmCheckUpright(best.buf)
        if (v.orientation === 'upside_down') {
          finalBuf = await sharp(best.buf).rotate(180, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
          const v2 = await llmCheckUpright(finalBuf)
          verdict = `flipped 180° → ${v2.orientation}`
          confirmed = v2.orientation === 'upright'
        } else {
          verdict = v.orientation
          confirmed = v.orientation === 'upright'
        }
      }

      const status = !straightened ? '✗ still off' : confirmed ? '✓ upright' : `⚠ ${verdict} — needs manual`
      console.log(`  ${id.padEnd(30)} tilt ${before.metrics.majorAxisTiltDeg.toFixed(0)}° → ${best.tilt.toFixed(0)}° (rot ${best.deg.toFixed(0)}°)  ${status}`)

      if (!APPLY) {
        await sharp(orig).png().toFile(path.join(PREVIEW_DIR, `${id}.before.png`))
        fs.writeFileSync(path.join(PREVIEW_DIR, `${id}.after.png`), finalBuf)
        sheet.push({ id, before: before.metrics.majorAxisTiltDeg, after: best.tilt, deg: best.deg, big: Math.abs(best.deg) >= 60, verdict, confirmed })
      }

      if (!straightened) { unfixable++; continue }
      if (!confirmed) { needsManual++; continue }
      fixed++

      if (APPLY) {
        const webp = await sharp(finalBuf).webp({ quality: 88 }).toBuffer()
        for (const [u, body, ct] of [
          [row?.png_url, finalBuf, 'image/png'] as const,
          [row?.webp_url, webp, 'image/webp'] as const,
        ]) {
          if (!u) continue
          const ref = storageRef(u)
          if (!ref) continue
          const { error } = await sb.storage.from(ref.bucket).upload(ref.objectPath, body, { contentType: ct, upsert: true })
          if (error) console.warn(`    upload ${ref.objectPath} failed: ${error.message}`)
        }
        const { error: revErr } = await sb.from('watch_image_reviews').insert({
          catalog_watch_id: id, variant: 'primary', status: 'approved',
          tags: [], notes: `[auto-rotate] straightened ${before.metrics.majorAxisTiltDeg.toFixed(0)}° → ${best.tilt.toFixed(0)}°${USE_LLM ? ` · LLM ${verdict}` : ''}`,
          reviewer_id: null,
        })
        if (revErr) console.warn(`    review insert failed: ${revErr.message}`)
      }
    } catch (e) {
      console.log(`  ${id.padEnd(30)} error: ${(e as Error).message}`)
      errored++
    }
  }

  console.log('')
  console.log(`[rotate] upright ${fixed}, needs-manual ${needsManual}, still-off ${unfixable}, errors ${errored}`)
  if (!APPLY) {
    // Contact sheet: before/after side by side. Cards not confirmed upright are
    // tinted amber (and labeled with the LLM verdict) so they stand out.
    const cards = sheet.map(s => `
      <div class="c ${s.confirmed ? '' : 'warn'}">
        <div class="h">${s.id}<br><small>${s.before.toFixed(0)}° → ${s.after.toFixed(0)}° (rot ${s.deg.toFixed(0)}°) · ${s.verdict}${s.confirmed ? '' : ' · NEEDS MANUAL'}</small></div>
        <div class="row"><img src="${s.id}.before.png"><img src="${s.id}.after.png"></div>
      </div>`).join('')
    fs.writeFileSync(path.join(PREVIEW_DIR, 'index.html'), `<!doctype html><meta charset="utf8">
      <style>body{font:13px system-ui;background:#f5f3ee;margin:24px}.c{display:inline-block;width:430px;margin:8px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px;vertical-align:top}.c.warn{border-color:#d08a2a;background:#fffaf0}.h{color:#555;margin-bottom:6px}.row{display:flex;gap:6px}.row img{width:50%;background:#f7f6f2;border-radius:4px;object-fit:contain}small{color:#999}</style>
      <h2>Auto-rotate preview — left: before, right: straightened${USE_LLM ? ' (LLM-verified upright)' : ''}. Amber = not confirmed upright.</h2>${cards}`)
    console.log(`[rotate] previews → public/watch-assets/rotate-preview/`)
    console.log(`[rotate] CONTACT SHEET → http://localhost:3000/watch-assets/rotate-preview/index.html`)
    console.log(`[rotate] re-run with${USE_LLM ? '' : ' --llm'} --apply to overwrite Storage + clear flags for the confirmed-upright ones, then bump IMAGE_VERSION.`)
  } else if (fixed > 0) {
    console.log(`[rotate] NEXT: bump IMAGE_VERSION in lib/watchImages/cacheBust.ts so browsers refetch the straightened images.`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
