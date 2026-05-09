import { createPlaygroundEntry } from '@/lib/playground'
import type { PlaygroundBox } from '@/types/watch'

export const SEEDED_PLAYGROUND_BOXES: PlaygroundBox[] = [
  {
    id: 'pg-dream-1',
    name: 'Dream Collection',
    tags: ['Dream Box'],
    entries: [
      createPlaygroundEntry('patek-philippe-5711-1a-010', undefined, 'pge-dream-1'),
      createPlaygroundEntry('rolex-116500ln', undefined, 'pge-dream-2'),
      createPlaygroundEntry('a-lange-and-sohne-191-032', undefined, 'pge-dream-3'),
      createPlaygroundEntry('grand-seiko-sbga211', undefined, 'pge-dream-4'),
      createPlaygroundEntry('a-lange-and-sohne-363-179', undefined, 'pge-dream-5'),
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
      createPlaygroundEntry('tudor-m79030n-0001', undefined, 'pge-budget-1'),
      createPlaygroundEntry('omega-310-30-42-50-01-001', undefined, 'pge-budget-2'),
      createPlaygroundEntry('tag-heuer-cbn2011-ba0642', undefined, 'pge-budget-3'),
      createPlaygroundEntry('grand-seiko-sbga211', undefined, 'pge-budget-4'),
    ],
    frame: 'light-oak',
    lining: 'cream',
    slotCount: 6,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
]
