// Maps a free-text dial color name (as returned by the AI vision call)
// to a hex value for the SVG dial fallback in WatchImageOrDial.
// Keep entries lowercased; lookup normalizes whitespace + drops finishing
// modifiers ("sunburst blue" → "blue", "matte black" → "black").

const DIRECT: Record<string, string> = {
  black: '#0F0B08',
  white: '#F4EFE6',
  cream: '#EEE6D0',
  ivory: '#F0E8D6',
  silver: '#D8D4CC',
  grey: '#7A7570',
  gray: '#7A7570',
  charcoal: '#3A332C',
  anthracite: '#332E28',
  slate: '#4A5258',
  blue: '#1F4FA8',
  'navy blue': '#142F6B',
  navy: '#142F6B',
  'royal blue': '#1F4FA8',
  'sky blue': '#5A87BF',
  teal: '#1F5566',
  green: '#2E7D4F',
  'forest green': '#1A5E34',
  'olive': '#5C5A3A',
  'olive green': '#5C5A3A',
  khaki: '#998760',
  red: '#9A2E2E',
  burgundy: '#5C1F22',
  maroon: '#5C1F22',
  brown: '#5A3E2A',
  'chocolate brown': '#3E2A1C',
  bronze: '#7A5A36',
  'tropical brown': '#6E4A2E',
  champagne: '#D4B97A',
  gold: '#C9A84C',
  'rose gold': '#C9836C',
  copper: '#B97447',
  yellow: '#D6B73A',
  orange: '#C97A3A',
  salmon: '#E69684',
  pink: '#D38FA0',
  purple: '#5C3A6E',
  'mother of pearl': '#F0E6D6',
  mop: '#F0E6D6',
}

const FINISH_WORDS = new Set([
  'sunburst', 'matte', 'satin', 'glossy', 'gloss', 'lacquered', 'lacquer',
  'enamel', 'metallic', 'pearlescent', 'rayonnant', 'guilloche', 'guilloché',
  'soleil', 'gradient', 'fume', 'fumé', 'smoked', 'meteorite', 'mosaic',
  'opaline', 'sand', 'sandblasted', 'brushed', 'engraved', 'striped',
  'panda', 'reverse',
])

function stripFinishes(name: string): string {
  return name
    .split(/\s+/)
    .filter(token => !FINISH_WORDS.has(token))
    .join(' ')
    .trim()
}

export function dialColorToHex(name: string | null | undefined): string {
  if (!name) return '#1A1410'
  const cleaned = name.toLowerCase().trim().replace(/[^a-z\s]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return '#1A1410'

  if (DIRECT[cleaned]) return DIRECT[cleaned]
  const stripped = stripFinishes(cleaned)
  if (stripped && DIRECT[stripped]) return DIRECT[stripped]

  // Try the last token (most likely the actual color word)
  const tokens = stripped.split(' ').filter(Boolean)
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (DIRECT[tokens[i]]) return DIRECT[tokens[i]]
  }
  // Try compound (last two tokens, e.g. "navy blue")
  if (tokens.length >= 2) {
    const tail = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`
    if (DIRECT[tail]) return DIRECT[tail]
  }
  return '#1A1410'
}

export function dialMarkerHex(dialHex: string): string {
  // Light marker on dark dials, dark marker on light dials.
  return isLight(dialHex) ? '#1A1410' : '#C8BCAF'
}

export function dialHandHex(dialHex: string): string {
  return isLight(dialHex) ? '#1A1410' : '#FFFFFF'
}

function isLight(hex: string): boolean {
  const m = hex.replace('#', '')
  if (m.length !== 6) return false
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  // Perceived luminance (Rec. 601)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160
}
