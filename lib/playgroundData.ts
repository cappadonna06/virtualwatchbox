import { createPlaygroundEntry } from '@/lib/playground'
import type { PlaygroundBox } from '@/types/watch'

export const SEEDED_PLAYGROUND_BOXES: PlaygroundBox[] = [
  {
    id: 'pg-dream-1',
    name: 'Dream Collection',
    tags: ['Dream Box'],
    entries: [
      createPlaygroundEntry('patek-nautilus-blue', undefined, 'pge-dream-1'),
      createPlaygroundEntry('rolex-daytona-white', undefined, 'pge-dream-2'),
      createPlaygroundEntry('lange-lange1', undefined, 'pge-dream-3'),
      createPlaygroundEntry('grandseiko-snowflake', undefined, 'pge-dream-4'),
      createPlaygroundEntry('lange-odysseus-grey', undefined, 'pge-dream-5'),
    ],
    frame: 'light-oak',
    lining: 'cream',
    slotCount: 6,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'pg-budget-1',
    name: 'Under $10K',
    tags: ['Under $10K'],
    entries: [
      createPlaygroundEntry('tudor-black-bay-58', undefined, 'pge-budget-1'),
      createPlaygroundEntry('omega-speedmaster-moonwatch', undefined, 'pge-budget-2'),
      createPlaygroundEntry('tag-carrera-chrono', undefined, 'pge-budget-3'),
      createPlaygroundEntry('grandseiko-snowflake', undefined, 'pge-budget-4'),
    ],
    frame: 'light-oak',
    lining: 'cream',
    slotCount: 6,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
]
