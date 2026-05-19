import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

const envPath = '/Users/marcsells/Developer/virtualwatchbox/.env.local'
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(url, key, { auth: { persistSession: false }})

// Top 30 by heat
const { data: top } = await supabase
  .from('catalog_watch_market')
  .select('catalog_watch_id, heat_score, popularity_rank, market_value_usd, catalog_watches!inner(brand, model, reference)')
  .order('popularity_rank', { ascending: true, nullsFirst: false })
  .limit(30)

console.log('\nTOP 30 BY HEAT (post-recompute):\n')
for (const r of top) {
  const w = r.catalog_watches
  const price = r.market_value_usd ? `$${r.market_value_usd.toLocaleString()}` : '—'
  console.log(`  #${String(r.popularity_rank).padStart(3)}  heat=${String(r.heat_score).padStart(4)}  ${price.padStart(12)}  ${w.brand} ${w.model} (${w.reference})`)
}

// Bottom 10 (highest popularity_rank)
const { data: bottom, count } = await supabase
  .from('catalog_watch_market')
  .select('catalog_watch_id, heat_score, popularity_rank, market_value_usd, catalog_watches!inner(brand, model, reference)', { count: 'exact', head: false })
  .order('popularity_rank', { ascending: false, nullsFirst: false })
  .limit(10)

console.log(`\nBOTTOM 10 BY HEAT (out of ${count} total):\n`)
for (const r of bottom) {
  const w = r.catalog_watches
  const price = r.market_value_usd ? `$${r.market_value_usd.toLocaleString()}` : '—'
  console.log(`  #${String(r.popularity_rank).padStart(5)}  heat=${String(r.heat_score).padStart(4)}  ${price.padStart(12)}  ${w.brand} ${w.model} (${w.reference})`)
}

// Distribution buckets
const buckets = [[900,1000],[800,899],[700,799],[600,699],[500,599],[400,499],[300,399],[200,299],[100,199],[0,99]]
console.log('\nHEAT DISTRIBUTION:\n')
for (const [lo, hi] of buckets) {
  const { count: n } = await supabase
    .from('catalog_watch_market')
    .select('catalog_watch_id', { count: 'exact', head: true })
    .gte('heat_score', lo)
    .lte('heat_score', hi)
  console.log(`  ${String(lo).padStart(4)}-${String(hi).padStart(4)}: ${n}`)
}
