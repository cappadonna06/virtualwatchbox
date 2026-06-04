// lib/strapDrawer/constants.ts
// Display constants + swatch derivation for the Strap Drawer (Feature 7).
// Ported from the design prototype (strap-data.jsx, StrapModal.jsx).

import type { StrapMaterial, StrapStyle } from '@/types/watch'

export const MATERIALS: StrapMaterial[] = [
  'leather', 'rubber', 'nylon', 'canvas', 'fabric',
  'metal', 'silicone', 'ceramic', 'exotic', 'other',
]

export const SUB_MATERIALS: Record<StrapMaterial, string[]> = {
  leather: ['Smooth', 'Alligator', 'Suede', 'Pebbled', 'Shell Cordovan'],
  rubber: ['Smooth', 'Tropic', 'Tread', 'FKM'],
  nylon: ['NATO', 'Seatbelt', 'Perlon', 'Single-pass'],
  canvas: ['Cordura', 'Sailcloth', 'Waxed'],
  fabric: ['Sailcloth', 'Tweed', 'Denim'],
  metal: ['Oyster', 'Jubilee', 'President', 'H-Link', 'Milanese', 'Beads of Rice', 'Mesh'],
  silicone: ['Smooth', 'Textured'],
  ceramic: ['Brushed', 'Polished'],
  exotic: ['Ostrich', 'Lizard', 'Shark', 'Stingray'],
  other: [],
}

// [name, hex] — quick color chips in the add/edit modal.
export const COMMON_COLORS: Array<[string, string]> = [
  ['Black', '#1A1410'], ['Dark Brown', '#3A2418'], ['Brown', '#6A4426'],
  ['Cognac', '#8A4B24'], ['Tan', '#B08552'], ['Navy', '#2A3550'],
  ['Olive', '#44523B'], ['Grey', '#6E6A63'], ['Burgundy', '#5A2A2E'], ['Steel', '#9A9A9A'],
]

export const COMMON_WIDTHS = [18, 19, 20, 21, 22, 24]

export const STYLES: StrapStyle[] = ['dressy', 'sporty', 'casual', 'rugged', 'vintage']

export const materialLabel = (m: string): string => m.charAt(0).toUpperCase() + m.slice(1)

// Best-guess CSS-swatch recipe id from material + sub-material + color name.
// Mirrors deriveSwatchId() in StrapModal.jsx.
export function deriveSwatchId(material: string, sub: string | undefined, colorName: string | undefined): string {
  const c = (colorName || '').toLowerCase()
  const colorKey =
    c.includes('black') ? 'black'
    : c.includes('cognac') ? 'cognac'
    : c.includes('tan') ? 'tan'
    : c.includes('navy') || c.includes('blue') ? 'navy'
    : c.includes('olive') || c.includes('green') || c.includes('sage') ? 'olive'
    : c.includes('grey') || c.includes('gray') ? 'grey'
    : c.includes('burgundy') || c.includes('mahogany') || c.includes('oxblood') ? 'brown'
    : c.includes('brown') || c.includes('chestnut') ? 'brown'
    : c.includes('orange') ? 'orange'
    : 'brown'

  const s = (sub || '').toLowerCase()

  if (material === 'metal') {
    const k = s.includes('jubilee') ? 'jubilee'
      : s.includes('milanese') ? 'milanese'
      : s.includes('mesh') ? 'mesh'
      : 'oyster'
    return `metal-${k}-steel`
  }
  if (material === 'rubber' || material === 'silicone') {
    const rc = ['black', 'navy', 'grey', 'orange'].includes(colorKey) ? colorKey : 'black'
    return `rubber-${rc}`
  }
  if (material === 'nylon') {
    const nc = ['black', 'grey', 'olive', 'navy'].includes(colorKey) ? colorKey : 'navy'
    return `nato-${nc}`
  }
  if (material === 'fabric' || material === 'canvas') {
    const fc = ['black', 'navy', 'grey'].includes(colorKey) ? colorKey : 'grey'
    return `sailcloth-${fc}`
  }
  // leather + exotic + other
  if (s.includes('alligator') || s.includes('croc') || material === 'exotic') {
    const ac = ['black', 'brown', 'navy'].includes(colorKey) ? colorKey : 'black'
    return `leather-alligator-${ac}`
  }
  if (s.includes('suede')) return colorKey === 'brown' ? 'suede-brown' : 'suede-grey'
  const lc = ['black', 'brown', 'cognac', 'tan', 'navy'].includes(colorKey) ? colorKey : 'brown'
  return `leather-smooth-${lc}`
}
