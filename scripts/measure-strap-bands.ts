/**
 * Measure spring-bar anchor geometry for the Strap Studio demo band halves
 * (public/demo-strap-swap-bands). Each half is a Delugs-style "as worn" render
 * with the spring-bar pin tips visible at the lug-attachment edge — the Studio
 * anchors that pin row into the watch's lug channel, so we need, per image:
 *
 *   pinY       — row of the spring bar (y px)
 *   bodyLeft/Right — strap body edges at the pin row, pins excluded
 *
 * Detection: the pin tips protrude a few px beyond the strap edge on BOTH
 * sides for only a handful of rows. We scan per-row alpha extents and score
 * rows where left extends past l(y±6) AND right past r(y±6). Top candidates
 * are printed and drawn (gold lines + magenta body ticks) onto overlay PNGs in
 * /tmp/strap-bands/ for eyeball verification. The verified numbers are
 * hand-written into data/strap-band-demo.json — this script does not write it.
 *
 * Usage: npx tsx scripts/measure-strap-bands.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.join(process.cwd(), 'public', 'demo-strap-swap-bands')
const OUT = '/tmp/strap-bands'

type Extent = { l: number; r: number }

async function measure(file: string): Promise<void> {
  const { data, info } = await sharp(path.join(DIR, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height

  const ext: Extent[] = []
  for (let y = 0; y < H; y += 1) {
    let l = -1
    let r = -1
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > 30) {
        if (l < 0) l = x
        r = x
      }
    }
    ext.push({ l, r })
  }

  // Pin signature: both edges protrude past the rows ±6 above/below.
  type Cand = { y: number; score: number; l: number; r: number }
  const cands: Cand[] = []
  for (let y = 10; y < H - 10; y += 1) {
    const e = ext[y]
    if (e.l < 0) continue
    const up = ext[y - 6]
    const dn = ext[y + 6]
    if (up.l < 0 || dn.l < 0) continue
    const leftOut = Math.min(up.l - e.l, dn.l - e.l)
    const rightOut = Math.min(e.r - up.r, e.r - dn.r)
    if (leftOut >= 2 && rightOut >= 2) {
      cands.push({ y, score: leftOut + rightOut, l: e.l, r: e.r })
    }
  }
  // Collapse adjacent rows into the best row per cluster.
  cands.sort((a, b) => a.y - b.y)
  const clusters: Cand[] = []
  for (const c of cands) {
    const last = clusters[clusters.length - 1]
    if (last && c.y - last.y <= 8) {
      if (c.score > last.score) clusters[clusters.length - 1] = c
    } else {
      clusters.push(c)
    }
  }
  clusters.sort((a, b) => b.score - a.score)
  const top = clusters.slice(0, 4).sort((a, b) => a.y - b.y)

  console.log(`\n${file}  (${W}x${H})`)
  const lines: string[] = []
  for (const c of top) {
    // Body edges just inside the pins: sample 6px toward the strap body on
    // whichever side has wider content (works for top and bottom halves).
    const inA = ext[c.y - 6]
    const inB = ext[c.y + 6]
    const body = (inA.r - inA.l) > (inB.r - inB.l) ? inA : inB
    console.log(`  candidate y=${c.y} (${(c.y / H).toFixed(3)})  pins ${c.l}..${c.r}  body ${body.l}..${body.r} (${body.r - body.l}px)  score=${c.score}`)
    lines.push(
      `<line x1="0" y1="${c.y}" x2="${W}" y2="${c.y}" stroke="#C9A84C" stroke-width="2"/>` +
      `<text x="6" y="${c.y - 4}" font-size="18" fill="#C9A84C">${c.y}</text>` +
      `<line x1="${body.l}" y1="${c.y - 12}" x2="${body.l}" y2="${c.y + 12}" stroke="#FF00FF" stroke-width="2"/>` +
      `<line x1="${body.r}" y1="${c.y - 12}" x2="${body.r}" y2="${c.y + 12}" stroke="#FF00FF" stroke-width="2"/>`,
    )
  }

  const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`)
  await sharp(path.join(DIR, file))
    .flatten({ background: '#FAF8F4' })
    .composite([{ input: svg }])
    .png()
    .toFile(path.join(OUT, file.replace(/\.webp$/i, '.png')))
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true })
  const files = fs.readdirSync(DIR).filter(f => /\.webp$/i.test(f)).sort()
  for (const f of files) await measure(f)
  console.log(`\nOverlays → ${OUT}`)
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
