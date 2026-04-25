export interface FrameConfig {
  id: string
  label: string
  swatchColor: string
  css: string
  shadow: string
}

export interface LiningConfig {
  id: string
  label: string
  color: string
  slotBg: string
  emptyColor: string
}

export interface SlotCount {
  n: number
  cols: number
  label: string
}

export const FRAMES: FrameConfig[] = [
  {
    id: 'light-oak',
    label: 'Light Oak',
    swatchColor: '#c4944a',
    css: [
      'repeating-linear-gradient(91deg,transparent 0px,transparent 6px,rgba(70,38,8,0.06) 6px,rgba(70,38,8,0.06) 7px,transparent 7px,transparent 15px,rgba(50,25,4,0.04) 15px,rgba(50,25,4,0.04) 16px,transparent 16px,transparent 28px,rgba(90,48,10,0.05) 28px,rgba(90,48,10,0.05) 29px)',
      'repeating-linear-gradient(89.5deg,transparent 0px,transparent 40px,rgba(60,30,5,0.04) 40px,rgba(60,30,5,0.04) 55px,transparent 55px,transparent 100px)',
      'linear-gradient(170deg,#d4a96a 0%,#b88840 12%,#c99848 28%,#a57530 44%,#bc8e42 58%,#9e6e28 72%,#c49248 86%,#b07e38 100%)',
    ].join(','),
    shadow:
      'inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -2px 0 rgba(0,0,0,0.25),inset 2px 0 0 rgba(0,0,0,0.1),inset -2px 0 0 rgba(255,255,255,0.12),0 24px 64px rgba(26,16,4,0.28),0 6px 20px rgba(26,16,4,0.15)',
  },
  {
    id: 'dark-walnut',
    label: 'Dark Walnut',
    swatchColor: '#4a2e14',
    css: [
      'repeating-linear-gradient(91deg,transparent 0px,transparent 8px,rgba(20,8,0,0.08) 8px,rgba(20,8,0,0.08) 9px,transparent 9px,transparent 22px)',
      'linear-gradient(170deg,#4a2e14 0%,#3a2010 18%,#5a3820 35%,#2e1808 52%,#4e3018 68%,#3a2410 82%,#4a3018 100%)',
    ].join(','),
    shadow:
      'inset 0 1px 0 rgba(255,255,255,0.15),inset 0 -2px 0 rgba(0,0,0,0.4),0 24px 64px rgba(10,4,0,0.4),0 6px 20px rgba(10,4,0,0.2)',
  },
  {
    id: 'ebony',
    label: 'Ebony',
    swatchColor: '#242018',
    css: [
      'repeating-linear-gradient(91deg,transparent 0px,transparent 10px,rgba(255,255,255,0.03) 10px,rgba(255,255,255,0.03) 11px)',
      'linear-gradient(170deg,#2a2420 0%,#1e1a16 25%,#242018 50%,#1a1612 75%,#221e1a 100%)',
    ].join(','),
    shadow:
      'inset 0 1px 0 rgba(255,255,255,0.1),inset 0 -2px 0 rgba(0,0,0,0.5),0 24px 64px rgba(0,0,0,0.45)',
  },
  {
    id: 'cognac',
    label: 'Cognac',
    swatchColor: '#9c5828',
    css: 'linear-gradient(145deg,#9c5828 0%,#b06030 20%,#944e20 45%,#a85c2a 70%,#905020 100%)',
    shadow:
      'inset 0 1px 0 rgba(255,255,255,0.2),inset 0 -2px 0 rgba(0,0,0,0.3),0 24px 64px rgba(80,30,10,0.35)',
  },
  {
    id: 'carbon',
    label: 'Carbon',
    swatchColor: '#222222',
    css: [
      'repeating-linear-gradient(45deg,#1a1a1a 0px,#1a1a1a 6px,#222 6px,#222 12px)',
      'linear-gradient(135deg,#2a2a2a,#181818)',
    ].join(','),
    shadow:
      'inset 0 1px 0 rgba(255,255,255,0.06),inset 0 -2px 0 rgba(0,0,0,0.6),0 24px 64px rgba(0,0,0,0.5)',
  },
]

export const LININGS: LiningConfig[] = [
  { id: 'cream',    label: 'Cream',    color: '#e0d8c8', slotBg: '#F8F4EE', emptyColor: '#8a7a68' },
  { id: 'taupe',    label: 'Taupe',    color: '#6a5a4c', slotBg: '#8a7a6c', emptyColor: '#c8b8a8' },
  { id: 'navy',     label: 'Navy',     color: '#1a2438', slotBg: '#2a3448', emptyColor: '#8a9ab8' },
  { id: 'noir',     label: 'Noir',     color: '#111111', slotBg: '#222222', emptyColor: '#666666' },
  { id: 'bordeaux', label: 'Bordeaux', color: '#2a1018', slotBg: '#3a2028', emptyColor: '#a87888' },
]

export const SLOT_COUNTS: SlotCount[] = [
  { n: 4,  cols: 2, label: '4' },
  { n: 6,  cols: 3, label: '6' },
  { n: 8,  cols: 4, label: '8' },
  { n: 10, cols: 5, label: '10' },
]
