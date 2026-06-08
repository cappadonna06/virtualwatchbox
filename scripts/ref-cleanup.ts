/**
 * Stage 2: reference cleanup on on-site (photo) survivors.
 *
 *   - comma refs (Lange / Sinn, digits+commas only): strip non-digits, insert
 *     dot before last 3 digits → 101,026→101.026 ; 1,010,010→1010.010
 *   - nickname-in-ref (007, James Bond, Pepsi, …): strip from reference, fold
 *     the alias into the search-only `nickname` column
 *   - SKIPS rows whose reference still has a "(aka:" tail — those are the
 *     held REVIEW dup rows; cleaning them would recreate an exact-ref dupe.
 *   - Flags (never auto-applies) any change that would collide with an
 *     existing (brand, reference) row.
 *
 * DRY_RUN=1 → preview only.
 * Usage: DRY_RUN=1 npx tsx scripts/ref-cleanup.ts   |   npx tsx scripts/ref-cleanup.ts
 */
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Letters-only — never numeric tokens like "007" (legit Omega ref segment).
// Only matched as a TRAILING space-separated word (e.g. "16710 Coke").
const NICKNAMES = [
  'James Bond', 'Spectre', 'No Time To Die', 'Pepsi', 'Coke', 'Batman',
  'Hulk', 'Kermit', 'Sprite', 'Root Beer', 'Smurf', 'Panda', 'Pan-Am',
]

type Row = { id: string; brand: string; reference: string; nickname: string | null }

function dotBefore3(ref: string): string {
  const digits = ref.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  return `${digits.slice(0, -3)}.${digits.slice(-3)}`
}

async function pageAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(f, f + 999)
    if (error) throw error
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

async function main() {
  const imgs = await pageAll<{ catalog_watch_id: string }>('watch_images', 'catalog_watch_id')
  const photo = new Set(imgs.map((r) => r.catalog_watch_id))
  const all = await pageAll<Row>('catalog_watches', 'id,brand,reference,nickname')
  const byBrandRef = new Set(all.map((r) => `${r.brand.toLowerCase()}|${r.reference.toUpperCase()}`))
  const onsite = all.filter((r) => photo.has(r.id))

  const changes: { id: string; brand: string; from: string; to: string; nick?: string; kind: string }[] = []
  const collisions: typeof changes = []

  for (const r of onsite) {
    if (/\(aka:/i.test(r.reference)) continue // held REVIEW dup rows
    let newRef = r.reference
    let newNick = r.nickname ?? ''
    let kind = ''

    // nickname-in-ref: only a trailing, space-separated, letters-only alias
    const trailing = newRef.match(/^(.*\S)\s+([A-Za-z][A-Za-z -]+)$/)
    if (trailing) {
      const alias = NICKNAMES.find((n) => n.toLowerCase() === trailing[2].trim().toLowerCase())
      if (alias) {
        newRef = trailing[1].trim()
        const merged = new Set([...newNick.split(',').map((s) => s.trim()).filter(Boolean), alias])
        newNick = [...merged].join(', ')
        kind = 'nickname-in-ref'
      }
    }

    // comma refs (Lange / Sinn): digits+commas only, plausible 6-7 digit ref length
    if (/,/.test(newRef) && /^[\d,]+$/.test(newRef) && /lange|sinn/i.test(r.brand)) {
      const digits = newRef.replace(/\D/g, '')
      if (digits.length === 6 || digits.length === 7) {
        newRef = dotBefore3(newRef)
        kind = kind ? `${kind}+comma` : 'comma-ref'
      } else {
        kind = 'comma-ref-ODDLEN-HELD'
      }
    }
    if (kind === 'comma-ref-ODDLEN-HELD') continue

    if (newRef === r.reference && newNick === (r.nickname ?? '')) continue

    const collidesWith = newRef !== r.reference && byBrandRef.has(`${r.brand.toLowerCase()}|${newRef.toUpperCase()}`)
    const rec = { id: r.id, brand: r.brand, from: r.reference, to: newRef, nick: newNick || undefined, kind }
    ;(collidesWith ? collisions : changes).push(rec)
  }

  console.log(`${DRY ? '🔍 DRY RUN' : '⚙️  APPLYING'} — ${changes.length} ref edits (+${collisions.length} collisions held)\n`)
  const byKind: Record<string, number> = {}
  for (const c of changes) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1
  console.log('by kind:', byKind, '\n')
  for (const c of changes.slice(0, 40))
    console.log(`  [${c.kind}] ${c.brand}  "${c.from}" → "${c.to}"${c.nick ? `  nick="${c.nick}"` : ''}`)
  if (collisions.length) {
    console.log(`\n⚠️  COLLISIONS (held — cleaned ref already exists, route to dedupe):`)
    for (const c of collisions) console.log(`  ${c.brand}  "${c.from}" → "${c.to}"  (id=${c.id})`)
  }

  if (!DRY) {
    let ok = 0
    for (const c of changes) {
      const patch: Record<string, unknown> = { reference: c.to }
      if (c.nick !== undefined) patch.nickname = c.nick
      const { error } = await sb.from('catalog_watches').update(patch).eq('id', c.id)
      if (error) console.log(`  ✗ ${c.id}: ${error.message}`)
      else ok++
    }
    console.log(`\nApplied ${ok}/${changes.length} ref edits.`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
