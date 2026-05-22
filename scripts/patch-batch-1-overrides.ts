/*
 * Apply batch-1 manual overrides to the enriched catalog JSON.
 *
 * Sources (all committable):
 *   - data/catalog-msrp-overrides-batch-1.csv  (id, brand, ref, msrp_usd, source_url, note)
 *   - data/catalog-nicknames.json              (existing — dict of iconic ref → nicknames)
 *
 * What this writes to data/catalog-enriched-full.json:
 *   - estimatedValue       = msrp_usd
 *   - msrpAtLaunchUsd      = msrp_usd
 *   - estimatedValueLow    = msrp_usd * 0.80   (band placeholder)
 *   - estimatedValueHigh   = msrp_usd * 1.20
 *   - valueLayer           = 'direct'
 *   - valueConfidence      = 'curated'
 *   - provenance.estimatedValue = 'curated:msrp_overrides_batch_1'
 *   - nickname             = primary nickname from dict (when present)
 *   - provenance.nickname  = 'curated:nicknames-dict'
 *
 * Idempotent: re-running just refreshes the patched fields without touching
 * other refs. Survives a fresh catalog:enrich because the inputs (MSRP CSV +
 * nicknames JSON) are tracked.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..')
const ENRICHED = path.join(ROOT, 'data', 'catalog-enriched-full.json')
const MSRP_CSV = path.join(ROOT, 'data', 'catalog-msrp-overrides-batch-1.csv')
const NICKS_JSON = path.join(ROOT, 'data', 'catalog-nicknames.json')

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = ''
    } else { cur += c }
  }
  out.push(cur)
  return out
}

type MsrpRow = { id: string; brand: string; ref: string; msrp: number; sourceUrl: string; note: string }

function loadMsrps(): Map<string, MsrpRow> {
  const text = fs.readFileSync(MSRP_CSV, 'utf8')
  const lines = text.split('\n').filter(Boolean)
  const out = new Map<string, MsrpRow>()
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    if (cols.length < 4) continue
    const msrp = Number(cols[3])
    if (!isFinite(msrp) || msrp <= 0) continue
    out.set(cols[0], {
      id: cols[0],
      brand: cols[1],
      ref: cols[2],
      msrp,
      sourceUrl: cols[4] ?? '',
      note: cols[5] ?? '',
    })
  }
  return out
}

type NickEntry = { brand: string; reference: string; nicknames: string[] }
type NickDict = { entries: NickEntry[] }

function loadNicknames(): Map<string, string[]> {
  const dict = JSON.parse(fs.readFileSync(NICKS_JSON, 'utf8')) as NickDict
  const out = new Map<string, string[]>()
  for (const e of dict.entries) {
    const key = `${e.brand}::${(e.reference || '').toUpperCase()}`
    out.set(key, e.nicknames)
  }
  return out
}

function main() {
  const msrps = loadMsrps()
  const nicks = loadNicknames()
  console.log(`[patch] loaded ${msrps.size} MSRP overrides, ${nicks.size} nickname entries`)

  const json = JSON.parse(fs.readFileSync(ENRICHED, 'utf8'))
  const records = json.records as Array<Record<string, unknown>>

  let msrpHits = 0
  let nickHits = 0
  let nickByPrefix = 0
  let nickAllMatches = 0
  const unmatchedMsrp = new Set(msrps.keys())

  for (const r of records) {
    const id = String(r['id'] ?? '')
    const brand = String(r['brand'] ?? '')
    const ref = String(r['reference'] ?? '').toUpperCase()

    // ---- MSRP override ----
    const msrp = msrps.get(id)
    if (msrp) {
      r['estimatedValue'] = msrp.msrp
      r['msrpAtLaunchUsd'] = r['msrpAtLaunchUsd'] || msrp.msrp
      r['estimatedValueLow'] = Math.round(msrp.msrp * 0.8)
      r['estimatedValueHigh'] = Math.round(msrp.msrp * 1.2)
      r['valueLayer'] = 'direct'
      r['valueConfidence'] = 'curated'
      const prov = (r['provenance'] as Record<string, string>) || {}
      prov['estimatedValue'] = 'curated:msrp_overrides_batch_1'
      prov['msrpAtLaunchUsd'] = 'curated:msrp_overrides_batch_1'
      r['provenance'] = prov
      msrpHits++
      unmatchedMsrp.delete(id)
    }

    // ---- Nickname application ----
    // Exact match first.
    let nick: string[] | undefined = nicks.get(`${brand}::${ref}`)

    // Fuzzy match: dict often stores Tudor refs as "M79030B-0001" but catalog
    // has "79030B". Try stripping the "M" prefix from the dict key OR matching
    // by the catalog ref being a prefix of the dict ref.
    if (!nick) {
      for (const [k, v] of nicks.entries()) {
        const [dictBrand, dictRef] = k.split('::')
        if (dictBrand !== brand) continue
        const dictRefStripped = dictRef.replace(/^M/, '').replace(/-\d{4}$/, '')
        if (dictRefStripped === ref || dictRef === ref) {
          nick = v
          nickByPrefix++
          break
        }
        if (dictRef.startsWith(ref) && ref.length >= 4 && dictRef.length - ref.length <= 6) {
          nick = v
          nickByPrefix++
          break
        }
      }
    } else {
      nickAllMatches++
    }

    if (nick && nick.length) {
      r['nickname'] = nick[0]
      const prov = (r['provenance'] as Record<string, string>) || {}
      if (!prov['nickname']) prov['nickname'] = 'curated:nicknames-dict'
      r['provenance'] = prov
      nickHits++
    }
  }

  fs.writeFileSync(ENRICHED, JSON.stringify(json, null, 2))
  console.log('')
  console.log('=== Patch summary ===')
  console.log(`  MSRP overrides applied: ${msrpHits} / ${msrps.size}`)
  console.log(`  Nicknames applied:      ${nickHits}  (exact=${nickAllMatches}, fuzzy=${nickByPrefix})`)
  if (unmatchedMsrp.size) {
    console.log('')
    console.log(`  MSRP refs not found in enriched JSON (need to be added to seed first):`)
    for (const id of unmatchedMsrp) console.log(`    - ${id}`)
  }
}

main()
