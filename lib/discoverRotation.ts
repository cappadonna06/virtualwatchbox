// Daily-rotated index helper for /discover.
//
// Each "slot" on /discover (an upgrade card for a given owned watch, a
// missing-type lead pick, a next-slot card per type) carries a ranked top-N
// pool. To keep the surface alive without burning user trust on volatile
// recommendations, we bucket time by UTC day and pick a stable index inside
// the pool for that day. Per-section "Refresh" buttons add an offset that
// advances the index by N without changing the underlying pool.
//
// All math is deterministic so SSR and hydration agree.

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

function fnv1a(s: string): number {
  let h = FNV_OFFSET
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, FNV_PRIME)
  }
  return h >>> 0
}

export function currentEpochDay(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000)
}

export function dailyIndex(
  seedKey: string,
  poolSize: number,
  refreshOffset: number = 0,
  now: number = Date.now(),
): number {
  if (poolSize <= 0) return 0
  const day = currentEpochDay(now)
  const hash = fnv1a(`${seedKey}::${day}`)
  return ((hash + Math.max(0, refreshOffset)) >>> 0) % poolSize
}

export function pickFromPool<T>(
  pool: T[],
  seedKey: string,
  refreshOffset: number = 0,
  now: number = Date.now(),
): T | null {
  if (pool.length === 0) return null
  return pool[dailyIndex(seedKey, pool.length, refreshOffset, now)]
}
