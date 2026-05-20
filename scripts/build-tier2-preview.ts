/**
 * Static HTML inspector for the tier-2 batch — image cutout + card metadata
 * side by side, sampled to make the long tail spot-checkable.
 *
 * Output: public/tier2-preview.html
 * Open at http://localhost:3000/tier2-preview.html after `npm run dev`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot } from './watch-image-pipeline'

const tier2EnrichedPath = path.join(repoRoot, 'data', 'catalog-enriched-tier2.json')
const manifestPath = path.join(repoRoot, 'public', 'watch-assets', 'processed', 'manifest.json')
const outPath = path.join(repoRoot, 'public', 'tier2-preview.html')

type Manifest = Array<{ watchId: string; pngPath: string; webpPath: string }>

type EnrichedRecord = {
  id: string
  brand: string
  model: string
  reference: string
  modelFamily: string | null
  watchType: string | null
  nickname: string | null
  dialColor: string | null
  caseMaterial: string | null
  caseSizeMm: number | null
  thicknessMm: number | null
  waterResistanceM: number | null
  bezelMaterial: string | null
  bezelType: string | null
  caseFinish: string | null
  crystalMaterial: string | null
  caliber: string | null
  movementType: string | null
  powerReserveHours: number | null
  braceletType: string | null
  yearIntroduced: number | null
  productionStatus: string | null
  countryOfOrigin: string | null
  estimatedValue: number | null
  estimatedValueLow: number | null
  estimatedValueHigh: number | null
  valueLayer: string | null
  valueConfidence: string | null
  heatScore: number
  popularityRank: number
  provenance: Record<string, string>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCurrency(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatMm(n: number | null): string {
  if (n == null) return '—'
  return `${n}mm`
}

function formatM(n: number | null): string {
  if (n == null) return '—'
  return `${n}m WR`
}

type Sample = { section: string; records: EnrichedRecord[] }

function sample(records: EnrichedRecord[], imagedIds: Set<string>): Sample[] {
  const imaged = records.filter(r => imagedIds.has(r.id))
  const byHeat = [...imaged].sort((a, b) => b.heatScore - a.heatScore)

  const result: Sample[] = []

  result.push({ section: 'Top 30 by heat (the showcase set)', records: byHeat.slice(0, 30) })

  const byBrand = new Map<string, EnrichedRecord[]>()
  for (const r of byHeat) {
    if (!byBrand.has(r.brand)) byBrand.set(r.brand, [])
    byBrand.get(r.brand)!.push(r)
  }

  for (const brand of ['Tudor', 'Grand Seiko', 'Oris', 'Longines', 'Omega']) {
    const inBrand = byBrand.get(brand) ?? []
    if (inBrand.length === 0) continue
    // Top 5 by heat + 5 spread across the brand's heat range
    const top5 = inBrand.slice(0, 5)
    const spread: EnrichedRecord[] = []
    const stride = Math.max(1, Math.floor(inBrand.length / 5))
    for (let i = 5; i < inBrand.length && spread.length < 5; i += stride) {
      spread.push(inBrand[i])
    }
    result.push({ section: `${brand} — top 5 + 5 across heat range (${inBrand.length} imaged)`, records: [...top5, ...spread] })
  }

  // 20 random from the long tail
  const tail = byHeat.slice(50)
  const random: EnrichedRecord[] = []
  const seen = new Set<number>()
  while (random.length < Math.min(20, tail.length)) {
    const idx = Math.floor(Math.random() * tail.length)
    if (seen.has(idx)) continue
    seen.add(idx)
    random.push(tail[idx])
  }
  result.push({ section: 'Random 20 from the long tail', records: random })

  return result
}

function renderCard(r: EnrichedRecord, imageUrl: string): string {
  const specs: Array<[string, string, string?]> = [
    ['Brand', r.brand, 'seed'],
    ['Model', r.model, r.provenance.model],
    ['Family', r.modelFamily ?? '—', r.provenance.modelFamily],
    ['Reference', r.reference, 'seed'],
    ['Nickname', r.nickname ?? '—', r.provenance.nickname],
    ['Type', r.watchType ?? '—', r.provenance.watchType],
    ['Dial', r.dialColor ?? '—', r.provenance.dialColor],
    ['Case', `${r.caseMaterial ?? '—'} · ${formatMm(r.caseSizeMm)}${r.thicknessMm ? ` · ${r.thicknessMm}mm thick` : ''}`, r.provenance.caseMaterial],
    ['Case finish', r.caseFinish ?? '—', r.provenance.caseFinish],
    ['Bezel', `${r.bezelMaterial ?? '—'}${r.bezelType ? ` · ${r.bezelType}` : ''}`, r.provenance.bezelMaterial],
    ['Crystal', r.crystalMaterial ?? '—', r.provenance.crystalMaterial],
    ['Bracelet', r.braceletType ?? '—', r.provenance.braceletType],
    ['Water resist.', formatM(r.waterResistanceM), r.provenance.waterResistanceM],
    ['Caliber', r.caliber ?? '—', r.provenance.caliber],
    ['Movement', r.movementType ?? '—', r.provenance.movementType],
    ['Power reserve', r.powerReserveHours ? `${r.powerReserveHours}h` : '—', r.provenance.powerReserveHours],
    ['Year', r.yearIntroduced?.toString() ?? '—', r.provenance.yearIntroduced],
    ['Production', r.productionStatus ?? '—', r.provenance.productionStatus],
    ['Origin', r.countryOfOrigin ?? '—', r.provenance.countryOfOrigin],
  ]

  const specRows = specs
    .map(([k, v, src]) => {
      const provBadge = src ? `<span class="prov">${escapeHtml(src)}</span>` : ''
      return `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}${provBadge}</dd>`
    })
    .join('')

  const valueBand =
    r.estimatedValueLow != null && r.estimatedValueHigh != null
      ? ` <span class="band">${formatCurrency(r.estimatedValueLow)} – ${formatCurrency(r.estimatedValueHigh)}</span>`
      : ''
  const valueChip = `<span class="layer layer-${r.valueLayer ?? 'unknown'}">${escapeHtml(r.valueLayer ?? 'unknown')} · ${escapeHtml(r.valueConfidence ?? 'n/a')}</span>`

  return `
    <article class="card">
      <div class="img">
        <img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(r.brand + ' ' + r.model)}">
      </div>
      <div class="body">
        <div class="title">
          <h3>${escapeHtml(r.brand)} <span class="model">${escapeHtml(r.model)}</span></h3>
          <code>${escapeHtml(r.id)}</code>
        </div>
        <div class="topline">
          <span class="heat">heat ${r.heatScore} · rank ${r.popularityRank}</span>
          <span class="value">${formatCurrency(r.estimatedValue)}${valueBand}</span>
          ${valueChip}
        </div>
        <dl class="specs">${specRows}</dl>
      </div>
    </article>
  `
}

async function main() {
  const enriched = JSON.parse(fs.readFileSync(tier2EnrichedPath, 'utf8'))
  const records: EnrichedRecord[] = enriched.records
  const manifestRaw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const manifest: Manifest = Array.isArray(manifestRaw) ? manifestRaw : manifestRaw.entries
  const imagedIds = new Set(manifest.map(m => m.watchId))
  const pathById = new Map(manifest.map(m => [m.watchId, m.webpPath || m.pngPath]))

  const samples = sample(records, imagedIds)

  const sectionsHtml = samples
    .map(s => {
      const cards = s.records
        .map(r => renderCard(r, pathById.get(r.id) ?? '/missing.png'))
        .join('')
      return `<section><h2>${escapeHtml(s.section)}</h2><div class="grid">${cards}</div></section>`
    })
    .join('\n')

  const totalImaged = records.filter(r => imagedIds.has(r.id)).length
  const totalRecords = records.length
  const brandCounts = new Map<string, number>()
  for (const r of records) {
    if (!imagedIds.has(r.id)) continue
    brandCounts.set(r.brand, (brandCounts.get(r.brand) ?? 0) + 1)
  }
  const brandChips = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([b, n]) => `<span class="chip">${escapeHtml(b)}: ${n}</span>`)
    .join('')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tier-2 preview — Virtual Watchbox</title>
  <style>
    :root {
      --bg: #f5f2ec;
      --ink: #1f1a14;
      --muted: #6b6f76;
      --gold: #a18250;
      --border: #d8d0c0;
      --slot: #e9e3d4;
    }
    body { margin: 0; padding: 32px; background: var(--bg); color: var(--ink); font: 14px/1.5 -apple-system, "DM Sans", sans-serif; }
    header.page { max-width: 1280px; margin: 0 auto 32px; }
    h1 { font-family: "Cormorant Garamond", Georgia, serif; font-size: 36px; font-weight: 500; margin: 0 0 8px; }
    .summary { color: var(--muted); margin: 0 0 16px; }
    .brand-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; }
    .chip { background: var(--slot); padding: 4px 10px; border-radius: 20px; font-size: 12px; }
    section { max-width: 1280px; margin: 0 auto 48px; }
    section h2 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: 24px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin: 0 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
    .card { background: white; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
    .card .img { background: var(--slot); aspect-ratio: 4 / 5; display: flex; align-items: center; justify-content: center; }
    .card .img img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .card .body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .title h3 { margin: 0; font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; font-size: 20px; }
    .title .model { color: var(--muted); font-weight: 400; }
    .title code { display: block; font-family: "SF Mono", Menlo, monospace; font-size: 11px; color: var(--muted); margin-top: 4px; word-break: break-all; }
    .topline { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 12px; }
    .heat { background: var(--slot); padding: 2px 8px; border-radius: 12px; }
    .value { font-weight: 600; color: var(--gold); }
    .band { color: var(--muted); font-weight: 400; font-size: 11px; }
    .layer { padding: 2px 8px; border-radius: 12px; font-size: 11px; }
    .layer-direct { background: #d4edda; color: #155724; }
    .layer-family_median { background: #fff3cd; color: #856404; }
    .layer-catboost { background: #f8d7da; color: #721c24; }
    .layer-unknown { background: #e9ecef; color: #495057; }
    dl.specs { display: grid; grid-template-columns: 110px 1fr; gap: 4px 12px; margin: 0; font-size: 12px; }
    dl.specs dt { color: var(--muted); }
    dl.specs dd { margin: 0; word-break: break-word; }
    .prov { display: inline-block; margin-left: 6px; padding: 1px 6px; background: var(--slot); border-radius: 8px; font-size: 10px; color: var(--muted); font-family: "SF Mono", Menlo, monospace; }
  </style>
</head>
<body>
  <header class="page">
    <h1>Tier-2 preview</h1>
    <p class="summary">${totalImaged} of ${totalRecords} tier-2 watches imaged. Sampled below: 30 by heat, top 5 + 5-across-range per brand, 20 random from the long tail. Each card shows the cutout image + spec fields tagged with their <code>provenance</code> source (hover for tooltip in your head — see docs/runbook.md §5 for source quality tiers).</p>
    <div class="brand-chips">${brandChips}</div>
  </header>
  ${sectionsHtml}
</body>
</html>`

  fs.writeFileSync(outPath, html, 'utf8')
  console.log(`[preview] wrote ${path.relative(repoRoot, outPath)}`)
  console.log(`[preview] samples: ${samples.reduce((a, s) => a + s.records.length, 0)} cards across ${samples.length} sections`)
  console.log(`[preview] open at: http://localhost:3000/tier2-preview.html`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
