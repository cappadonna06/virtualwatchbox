import { renderableWatches } from './renderableWatches'
import { withVersion } from './watchImages/cacheBust'

// Iconic, grail-leaning ghosts for the empty-state "sample box" preview. Static
// design assets — never persisted, counted, or routed through watchBySlot. Sized
// to 9 so a 10-slot box (slots 1–9) is fully covered; smaller boxes use a prefix.
const SAMPLE_IDS = [
  'omega-310-30-42-50-01-001',
  'rolex-116500ln',
  'rolex-126710blro',
  'patek-philippe-5711-1a-010',
  'rolex-124270',
  'rolex-126610ln',
  'rolex-126334',
  'audemars-piguet-15500st-oo-1220st-01',
  'rolex-126710blnr',
]

export const SAMPLE_BOX_GHOSTS: Array<{ id: string; img: string }> = (() => {
  const byId = new Map(renderableWatches.map(w => [w.id, w]))
  const picked: typeof renderableWatches = []
  const seen = new Set<string>()
  for (const id of SAMPLE_IDS) {
    const w = byId.get(id)
    if (w && w.imageUrl && !seen.has(id)) { picked.push(w); seen.add(id) }
  }
  // Top up to 9 from the heat-ranked imaged catalog if any curated id is missing.
  for (const w of renderableWatches) {
    if (picked.length >= 9) break
    if (!seen.has(w.id) && w.imageUrl) { picked.push(w); seen.add(w.id) }
  }
  return picked.slice(0, 9).map(w => ({ id: w.id, img: withVersion(w.imageUrl) ?? '' }))
})()
