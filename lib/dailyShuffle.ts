/**
 * Date-seeded shuffle utilities. Used to surface a different-but-stable
 * subset of items each day on rotating views (e.g. the homepage hero
 * carousel). All RNG is deterministic given the seed — same date string
 * produces the same shuffle every time, on any device, so picks stay put
 * across reloads within a single UTC calendar day.
 */

/** YYYY-MM-DD in UTC. Stable across timezones, advances at UTC midnight. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** FNV-1a 32-bit. Cheap, sufficient as a PRNG seed source. */
export function seedFromString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Mulberry32 — fast, deterministic 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Pick `count` items from `pool` using a deterministic shuffle seeded by
 * `seed`. Runs Fisher-Yates against a copy of the input (does not mutate).
 * If pool.length <= count, returns the pool unchanged in original order.
 */
export function pickSeeded<T>(pool: readonly T[], seed: string, count: number): T[] {
  if (pool.length <= count) return [...pool]
  const rand = mulberry32(seedFromString(seed))
  const arr = pool.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
}

/** Convenience: today's UTC pick. */
export function pickDaily<T>(pool: readonly T[], count: number): T[] {
  return pickSeeded(pool, todayUTC(), count)
}
