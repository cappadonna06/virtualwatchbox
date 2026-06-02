import type { PlaygroundBox } from '@/types/watch'

// The seed "Dream Collection" box. Each call mints a fresh UUID so the box id
// is valid for the `uuid` primary key on `public.playground_boxes` (a constant
// id would collide across users on upsert). Used as the lazy initial state for
// a fresh session and as the hydration fallback when no boxes exist locally or
// in Supabase.
export function createSeededPlaygroundBoxes(): PlaygroundBox[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Dream Collection',
      tags: ['Dream Box'],
      entries: [],
      frame: 'light-oak',
      lining: 'cream',
      slotCount: 6,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ]
}
