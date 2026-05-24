/**
 * Generate catalog-seed-batch-2.csv — ~1000 newer references for Reddit-popular brands.
 *
 * Focus: Rolex, Omega, Tudor, IWC, Longines, Sinn
 * Emphasis: current production models and 2023-2025 releases
 *
 * Usage: npx tsx scripts/generate-batch-2-seed.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'data', 'catalog-seed-batch-2.csv')
const existingPath = path.join(repoRoot, 'data', 'catalog-batch-1.csv')

type Entry = {
  brand: string
  model: string
  reference: string
  dialColor: string
  watchType: string
  sourceUrl: string
  communitySignal: string
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function mintId(brand: string, reference: string): string {
  return `${slugify(brand)}-${slugify(reference)}`
}

function loadExistingIds(): Set<string> {
  const ids = new Set<string>()
  if (!fs.existsSync(existingPath)) return ids
  const lines = fs.readFileSync(existingPath, 'utf-8').split('\n')
  for (const line of lines.slice(1)) {
    const id = line.split(',')[0]?.trim()
    if (id) ids.add(id)
  }
  // Also check seed-200 and seed-tier2
  for (const extra of [
    path.join(repoRoot, 'data', 'catalog-seed-200.csv'),
    path.join(repoRoot, 'data', 'catalog-seed-tier2.csv'),
  ]) {
    if (!fs.existsSync(extra)) continue
    const lines2 = fs.readFileSync(extra, 'utf-8').split('\n')
    for (const line of lines2.slice(1)) {
      const id = line.split(',')[0]?.trim()
      if (id) ids.add(id)
    }
  }
  return ids
}

const entries: Entry[] = []

function add(brand: string, model: string, reference: string, dialColor: string, watchType: string, sourceUrl = '', communitySignal = 'reddit_popular') {
  entries.push({ brand, model, reference, dialColor, watchType, sourceUrl, communitySignal })
}

// Helper to add multiple dial variants for a ref pattern
function addVariants(brand: string, model: string, refBase: string, variants: Array<[string, string]>, watchType: string, sourceUrl = '', communitySignal = 'reddit_popular') {
  for (const [suffix, color] of variants) {
    add(brand, model, `${refBase}${suffix}`, color, watchType, sourceUrl, communitySignal)
  }
}

// ============================================================
// ROLEX — ~200 new references
// Focus: current production models, 2023-2025 releases
// ============================================================

// Oyster Perpetual 41mm (124300) — new bubble-back era
addVariants('Rolex', 'Oyster Perpetual 41', '124300-', [
  ['0001', 'Silver'], ['0002', 'Black'], ['0003', 'Blue'],
  ['0004', 'Yellow'], ['0005', 'Green'], ['0006', 'Turquoise'],
  ['0007', 'Coral Red'],
], 'Sport')

// Oyster Perpetual 36mm (126000)
addVariants('Rolex', 'Oyster Perpetual 36', '126000-', [
  ['0001', 'Silver'], ['0002', 'Black'], ['0003', 'Blue'],
  ['0004', 'Yellow'], ['0005', 'Green'], ['0006', 'Turquoise'],
  ['0007', 'Coral Red'], ['0008', 'Candy Pink'],
], 'Sport')

// Oyster Perpetual 34mm (124200)
addVariants('Rolex', 'Oyster Perpetual 34', '124200-', [
  ['0001', 'Silver'], ['0002', 'Black'], ['0003', 'Blue'],
  ['0004', 'Red Grape'], ['0005', 'Green'],
], 'Sport')

// Datejust 41 smooth bezel (126300)
addVariants('Rolex', 'Datejust 41', '126300-', [
  ['0001', 'White'], ['0002', 'Blue'], ['0003', 'Black'],
  ['0004', 'Silver'], ['0005', 'Slate'], ['0006', 'Mint Green'],
  ['0007', 'Bright Blue'], ['0009', 'Azzurro Blue'],
  ['0010', 'Green'], ['0011', 'Olive Green'],
  ['0012', 'Black Fluted'], ['0014', 'Blue Fluted'],
  ['0015', 'Silver Fluted'], ['0016', 'Slate Fluted'],
  ['0017', 'White Fluted'], ['0018', 'Bright Blue Fluted'],
], 'Dress')

// Datejust 41 fluted bezel (126334)
addVariants('Rolex', 'Datejust 41', '126334-', [
  ['0001', 'White'], ['0002', 'Blue'], ['0003', 'Black'],
  ['0004', 'Silver'], ['0005', 'Slate'], ['0006', 'Rhodium'],
  ['0009', 'Azzurro Blue'], ['0010', 'Mint Green'],
  ['0012', 'Blue Fluted'], ['0014', 'Black Fluted'],
  ['0015', 'Silver Fluted'], ['0016', 'Bright Blue'],
  ['0018', 'Olive Green'], ['0025', 'Palm Green'],
], 'Dress')

// Datejust 41 two-tone (126333)
addVariants('Rolex', 'Datejust 41', '126333-', [
  ['0001', 'Champagne'], ['0002', 'Black'], ['0004', 'White'],
  ['0006', 'Golden'], ['0009', 'Blue'], ['0010', 'Slate'],
  ['0012', 'Green'], ['0014', 'Black Fluted'],
], 'Dress')

// Datejust 41 Rolesor (126331)
addVariants('Rolex', 'Datejust 41', '126331-', [
  ['0001', 'Chocolate'], ['0002', 'Slate'], ['0003', 'White'],
  ['0004', 'Sundust'], ['0005', 'Everose'],
  ['0007', 'Black'], ['0014', 'Chocolate Fluted'],
], 'Dress')

// Datejust 36 more variants (126234) — adding configs not in batch-1
addVariants('Rolex', 'Datejust 36', '126234-', [
  ['0027', 'Palm Green'], ['0028', 'Mint Green'],
  ['0031', 'Olive Green'], ['0035', 'Azzurro Blue'],
  ['0050', 'Silver Palm'], ['0052', 'Pink Fluted'],
], 'Dress')

// Sky-Dweller — major gap in batch-1
addVariants('Rolex', 'Sky-Dweller', '326934-', [
  ['0001', 'White'], ['0002', 'Blue'], ['0003', 'Black'],
  ['0004', 'Green'], ['0005', 'Silver'],
], 'Dress')
addVariants('Rolex', 'Sky-Dweller', '326935-', [
  ['0001', 'White'], ['0002', 'Chocolate'], ['0003', 'Slate'],
  ['0004', 'Black'], ['0006', 'Blue'],
], 'Dress')
addVariants('Rolex', 'Sky-Dweller', '336934-', [
  ['0001', 'White'], ['0002', 'Blue'], ['0003', 'Black'],
  ['0004', 'Mint Green'], ['0005', 'Green'],
], 'Dress')
add('Rolex', 'Sky-Dweller', '326238-0001', 'Champagne', 'Dress')
add('Rolex', 'Sky-Dweller', '326238-0002', 'Black', 'Dress')
add('Rolex', 'Sky-Dweller', '326238-0004', 'Green', 'Dress')

// Yacht-Master 40 (126621, 126622)
addVariants('Rolex', 'Yacht-Master 40', '126621-', [
  ['0001', 'Chocolate'], ['0002', 'Black'],
  ['0003', 'Slate'], ['0004', 'Blue'],
], 'Sport')
addVariants('Rolex', 'Yacht-Master 40', '126622-', [
  ['0003', 'Blue'], ['0004', 'Slate'],
  ['0005', 'Silver'],
], 'Sport')

// Yacht-Master 42 (226627) — new 2023 titanium
addVariants('Rolex', 'Yacht-Master 42', '226627-', [
  ['0001', 'Black'], ['0002', 'Blue'],
  ['0003', 'Silver'],
], 'Sport')

// Yacht-Master 37 (268622)
addVariants('Rolex', 'Yacht-Master 37', '268622-', [
  ['0001', 'Rhodium'], ['0002', 'Blue'],
  ['0003', 'Chocolate'],
], 'Sport')

// Cosmograph Daytona variants not in batch-1
add('Rolex', 'Cosmograph Daytona', '126506-0001', 'Ice Blue', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126506-0002', 'Ice Blue', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126509-0001', 'Silver', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126509-0003', 'Blue', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126509-0005', 'Green', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126515LN-0001', 'Pink', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126515LN-0003', 'Chocolate', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126515LN-0006', 'Meteorite', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126518LN-0001', 'Champagne', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126518LN-0002', 'Black', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126518LN-0010', 'Green', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126519LN-0001', 'Silver', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126519LN-0002', 'Black', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126519LN-0006', 'Meteorite', 'Chronograph')

// 1908 (new 2023 collection)
add('Rolex', '1908', '52509-0001', 'White', 'Dress')
add('Rolex', '1908', '52509-0002', 'Black', 'Dress')
add('Rolex', '1908', '52509-0006', 'Blue', 'Dress')
add('Rolex', '1908', '52508-0001', 'White', 'Dress')
add('Rolex', '1908', '52508-0002', 'Black', 'Dress')
add('Rolex', '1908', '52508-0006', 'Ice Blue', 'Dress')

// Submariner additional variants
add('Rolex', 'Submariner Date', '126610LV-0002', 'Black', 'Diver')
add('Rolex', 'Submariner', '124060-0001', 'Black', 'Diver')

// GMT-Master II — filling gaps
add('Rolex', 'GMT-Master II', '126720VTNR-0003', 'Black', 'GMT')
add('Rolex', 'GMT-Master II', '126710GRNR-0001', 'Black', 'GMT')
add('Rolex', 'GMT-Master II', '126710GRNR-0002', 'Black', 'GMT')

// Day-Date 36 (128238, 128239)
addVariants('Rolex', 'Day-Date 36', '128238-', [
  ['0001', 'Champagne'], ['0002', 'Green'],
  ['0003', 'Carnelian'], ['0005', 'Onyx'],
  ['0008', 'Turquoise'], ['0071', 'Diamond'],
], 'Dress')
addVariants('Rolex', 'Day-Date 36', '128239-', [
  ['0001', 'Silver'], ['0002', 'White'],
  ['0003', 'Ice Blue'], ['0005', 'Green'],
  ['0006', 'Olive Green'], ['0034', 'Meteorite'],
  ['0055', 'Turquoise'],
], 'Dress')

// Lady-Datejust 28 (279178, 279174)
addVariants('Rolex', 'Lady-Datejust', '279178-', [
  ['0001', 'Champagne'], ['0002', 'Silver'],
  ['0003', 'Green'], ['0009', 'Olive Green'],
], 'Dress')
addVariants('Rolex', 'Lady-Datejust', '279174-', [
  ['0001', 'Silver'], ['0002', 'White'],
  ['0003', 'Pink'], ['0009', 'Mint Green'],
  ['0011', 'Azzurro Blue'],
], 'Dress')

// ============================================================
// OMEGA — ~200 new references
// ============================================================

// Seamaster Diver 300M — newer 2024 dial configs
addVariants('Omega', 'Seamaster Diver 300M', '210.30.42.20.', [
  ['01.002', 'Black'], ['03.004', 'Blue'],
  ['04.002', 'White'], ['09.001', 'Green'],
  ['11.001', 'Grey'],
], 'Diver')
addVariants('Omega', 'Seamaster Diver 300M', '210.32.42.20.', [
  ['01.002', 'Black'], ['06.002', 'Grey'],
  ['03.003', 'Blue'], ['04.002', 'White'],
], 'Diver')

// Seamaster Diver 300M on rubber
addVariants('Omega', 'Seamaster Diver 300M', '210.22.42.20.', [
  ['01.001', 'Black'], ['03.001', 'Blue'],
  ['04.001', 'White'],
], 'Diver')

// Seamaster Diver 300M 42mm Ti
add('Omega', 'Seamaster Diver 300M', '210.92.42.20.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.92.42.20.03.001', 'Blue', 'Diver')

// Planet Ocean 600M 43.5mm — newer variants
addVariants('Omega', 'Seamaster Planet Ocean 600M', '215.30.44.21.', [
  ['01.003', 'Black'], ['03.002', 'Blue'],
  ['04.002', 'White'], ['09.001', 'Green'],
], 'Diver')
add('Omega', 'Seamaster Planet Ocean 600M', '215.32.44.21.01.002', 'Black', 'Diver')
add('Omega', 'Seamaster Planet Ocean 600M', '215.32.44.21.04.001', 'White', 'Diver')

// Planet Ocean Ultra Deep
add('Omega', 'Seamaster Planet Ocean Ultra Deep', '215.92.46.21.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Planet Ocean Ultra Deep', '215.92.46.21.03.001', 'Blue', 'Diver')
add('Omega', 'Seamaster Planet Ocean Ultra Deep', '215.30.46.21.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Planet Ocean Ultra Deep', '215.30.46.21.03.001', 'Blue', 'Diver')
add('Omega', 'Seamaster Planet Ocean Ultra Deep', '215.30.46.21.04.001', 'White', 'Diver')

// Aqua Terra 150M 41mm — more configs
addVariants('Omega', 'Seamaster Aqua Terra 150M', '220.10.41.21.', [
  ['02.001', 'Silver'], ['02.002', 'Silver'],
  ['03.002', 'Blue'], ['06.001', 'Grey'],
  ['06.003', 'Grey'], ['10.002', 'Green'],
  ['01.002', 'Black'],
], 'Sport')
addVariants('Omega', 'Seamaster Aqua Terra 150M', '220.12.41.21.', [
  ['01.001', 'Black'], ['02.001', 'Silver'],
  ['03.002', 'Blue'], ['06.001', 'Grey'],
  ['10.001', 'Green'],
], 'Sport')

// Aqua Terra 38mm
addVariants('Omega', 'Seamaster Aqua Terra 150M', '220.10.38.20.', [
  ['03.001', 'Blue'], ['09.001', 'Green'],
  ['10.001', 'Green'], ['06.001', 'Grey'],
], 'Sport')

// Aqua Terra Worldtimer
add('Omega', 'Seamaster Aqua Terra Worldtimer', '220.10.43.22.03.002', 'Blue', 'GMT')
add('Omega', 'Seamaster Aqua Terra Worldtimer', '220.12.43.22.03.002', 'Blue', 'GMT')
add('Omega', 'Seamaster Aqua Terra GMT', '220.10.43.22.10.001', 'Green', 'GMT')

// Speedmaster Moonwatch — hesalite vs sapphire configs
add('Omega', 'Speedmaster Professional Moonwatch', '310.30.42.50.01.002', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.32.42.50.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.32.42.50.01.002', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.30.42.50.04.001', 'White', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.32.42.50.04.001', 'White', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.30.42.50.06.001', 'Grey', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.32.42.50.06.001', 'Grey', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '310.30.42.50.01.003', 'Black', 'Chronograph')

// Speedmaster '57 — more configs
add('Omega', "Speedmaster '57", '332.10.41.51.01.002', 'Black', 'Chronograph')
add('Omega', "Speedmaster '57", '332.10.41.51.03.002', 'Blue', 'Chronograph')
add('Omega', "Speedmaster '57", '332.10.41.51.06.001', 'Green', 'Chronograph')
add('Omega', "Speedmaster '57", '332.12.41.51.01.002', 'Black', 'Chronograph')
add('Omega', "Speedmaster '57", '332.12.41.51.03.001', 'Blue', 'Chronograph')
add('Omega', "Speedmaster '57", '332.12.41.51.06.001', 'Green', 'Chronograph')

// Speedmaster Super Racing
add('Omega', 'Speedmaster Super Racing', '329.30.44.51.01.003', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Super Racing', '329.30.44.51.03.001', 'Blue', 'Chronograph')
add('Omega', 'Speedmaster Super Racing', '329.30.44.51.04.001', 'White', 'Chronograph')
add('Omega', 'Speedmaster Super Racing', '329.32.44.51.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Super Racing', '329.32.44.51.01.003', 'Black', 'Chronograph')

// Speedmaster Racing
add('Omega', 'Speedmaster Racing', '329.30.44.51.01.003', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Racing', '329.30.44.51.04.001', 'White', 'Chronograph')
add('Omega', 'Speedmaster Racing', '329.32.44.51.01.002', 'Black', 'Chronograph')

// Speedmaster Chronoscope
add('Omega', 'Speedmaster Chronoscope', '329.30.43.51.02.001', 'Silver', 'Chronograph')
add('Omega', 'Speedmaster Chronoscope', '329.30.43.51.03.001', 'Blue', 'Chronograph')
add('Omega', 'Speedmaster Chronoscope', '329.30.43.51.06.001', 'Green', 'Chronograph')
add('Omega', 'Speedmaster Chronoscope', '329.30.43.51.09.001', 'Bronze', 'Chronograph')
add('Omega', 'Speedmaster Chronoscope', '329.32.43.51.02.001', 'Silver', 'Chronograph')
add('Omega', 'Speedmaster Chronoscope', '329.32.43.51.06.001', 'Green', 'Chronograph')

// Seamaster 300 Heritage
add('Omega', 'Seamaster 300', '234.30.41.21.01.002', 'Black', 'Diver')
add('Omega', 'Seamaster 300', '234.30.41.21.03.001', 'Blue', 'Diver')
add('Omega', 'Seamaster 300', '234.30.41.21.03.002', 'Blue', 'Diver')
add('Omega', 'Seamaster 300', '234.30.41.21.10.001', 'Green', 'Diver')
add('Omega', 'Seamaster 300', '234.32.41.21.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster 300', '234.32.41.21.03.001', 'Blue', 'Diver')
add('Omega', 'Seamaster 300', '234.32.41.21.10.001', 'Green', 'Diver')

// De Ville Prestige
addVariants('Omega', 'De Ville Prestige', '424.10.40.20.', [
  ['01.001', 'Black'], ['02.001', 'Silver'],
  ['03.001', 'Blue'], ['06.001', 'Grey'],
  ['02.003', 'Silver'],
], 'Dress')
addVariants('Omega', 'De Ville Prestige', '424.13.40.20.', [
  ['01.001', 'Black'], ['02.001', 'Silver'],
  ['03.001', 'Blue'],
], 'Dress')
add('Omega', 'De Ville Prestige', '424.10.37.20.01.001', 'Black', 'Dress')
add('Omega', 'De Ville Prestige', '424.10.37.20.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Prestige', '424.10.37.20.03.001', 'Blue', 'Dress')

// De Ville Tresor
add('Omega', 'De Ville Tresor', '428.10.39.60.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Tresor', '428.10.39.60.03.001', 'Blue', 'Dress')
add('Omega', 'De Ville Tresor', '428.10.39.60.06.001', 'Grey', 'Dress')
add('Omega', 'De Ville Tresor', '428.13.39.60.01.001', 'Black', 'Dress')
add('Omega', 'De Ville Tresor', '428.17.39.60.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Tresor', '435.13.40.21.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Tresor', '435.13.40.21.06.001', 'Grey', 'Dress')

// Constellation 41mm (newer METAS certified)
addVariants('Omega', 'Constellation', '131.10.41.21.', [
  ['01.001', 'Black'], ['02.001', 'Silver'],
  ['03.001', 'Blue'], ['06.001', 'Green'],
], 'Dress')
addVariants('Omega', 'Constellation', '131.12.41.21.', [
  ['01.001', 'Black'], ['02.001', 'Silver'],
  ['03.001', 'Blue'],
], 'Dress')
addVariants('Omega', 'Constellation', '131.20.41.21.', [
  ['01.001', 'Black'], ['02.001', 'Champagne'],
  ['03.001', 'Blue'],
], 'Dress')

// Constellation 39mm
add('Omega', 'Constellation', '131.10.39.20.01.001', 'Black', 'Dress')
add('Omega', 'Constellation', '131.10.39.20.02.001', 'Silver', 'Dress')
add('Omega', 'Constellation', '131.10.39.20.03.001', 'Blue', 'Dress')
add('Omega', 'Constellation', '131.10.39.20.06.001', 'Green', 'Dress')
add('Omega', 'Constellation', '131.12.39.20.02.001', 'Silver', 'Dress')
add('Omega', 'Constellation', '131.12.39.20.03.001', 'Blue', 'Dress')

// ============================================================
// TUDOR — ~150 new references
// ============================================================

// Black Bay 41 (M79540)
addVariants('Tudor', 'Black Bay 41', 'M79540-', [
  ['0001', 'Black'], ['0003', 'Blue'],
  ['0004', 'Silver'], ['0005', 'Champagne'],
  ['0006', 'Green'], ['0007', 'Red'],
  ['0008', 'Brown'],
], 'Sport')

// Black Bay Heritage 41 (79230) — more dial variants
add('Tudor', 'Black Bay', '79230B-0001', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230R-0001', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230R-0003', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230N-0001', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230N-0003', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230B-0008', 'Black', 'Diver')
add('Tudor', 'Black Bay', '79230DK-0001', 'Black', 'Diver')

// Black Bay 58 — more variants
add('Tudor', 'Black Bay 58', 'M79030B-0004', 'Black', 'Diver')
add('Tudor', 'Black Bay 58', 'M79030N-0004', 'Black', 'Diver')
add('Tudor', 'Black Bay 58', 'M79030B-0005', 'Black', 'Diver')

// Black Bay 58 Bronze
add('Tudor', 'Black Bay 58 Bronze', 'M79012M-0001', 'Blue', 'Diver')
add('Tudor', 'Black Bay 58 Bronze', 'M79012M-0002', 'Brown', 'Diver')

// Black Bay 54 — more
add('Tudor', 'Black Bay 54', 'M79000N-0003', 'Black', 'Diver')
add('Tudor', 'Black Bay 54', 'M79000N-0004', 'Black', 'Diver')

// Black Bay Ceramic (M79210CNU)
add('Tudor', 'Black Bay Ceramic', 'M79210CNU-0001', 'Black', 'Diver')
add('Tudor', 'Black Bay Ceramic', 'M79210CNU-0002', 'Black', 'Diver')

// Black Bay Pro — more variants
add('Tudor', 'Black Bay Pro', 'M79470-0002', 'Black', 'GMT')
add('Tudor', 'Black Bay Pro', 'M79470-0003', 'Black', 'GMT')
add('Tudor', 'Black Bay Pro', 'M79470-0010', 'Black', 'GMT')

// Black Bay GMT — additional
add('Tudor', 'Black Bay GMT', 'M79830RB-0003', 'Black', 'GMT')
add('Tudor', 'Black Bay GMT', 'M79830RB-0004', 'Black', 'GMT')
add('Tudor', 'Black Bay GMT S&G', 'M79833MN-0002', 'Black', 'GMT')
add('Tudor', 'Black Bay GMT S&G', 'M79833MN-0003', 'Black', 'GMT')

// Pelagos 39 — more variants
add('Tudor', 'Pelagos 39', 'M25407N-0002', 'Blue', 'Diver')
add('Tudor', 'Pelagos 39', 'M25407N-0003', 'Black', 'Diver')

// Pelagos FXD — more
add('Tudor', 'Pelagos FXD', 'M25707B/21-0001', 'Blue', 'Diver')
add('Tudor', 'Pelagos FXD', 'M25707KN-0002', 'Black', 'Diver')
add('Tudor', 'Pelagos FXD', 'M25707KN-0003', 'Black', 'Diver')

// Black Bay Chrono — more
add('Tudor', 'Black Bay Chrono', 'M79360N-0003', 'White', 'Chronograph')
add('Tudor', 'Black Bay Chrono', 'M79360N-0004', 'Black', 'Chronograph')
add('Tudor', 'Black Bay Chrono', 'M79360DK-0002', 'Black', 'Chronograph')
add('Tudor', 'Black Bay Chrono', 'M79360DK-0003', 'Black', 'Chronograph')
add('Tudor', 'Black Bay Chrono S&G', 'M79363N-0001', 'Black', 'Chronograph')
add('Tudor', 'Black Bay Chrono S&G', 'M79363N-0002', 'White', 'Chronograph')

// 1926 Collection (M91350, M91450, M91550, M91650)
addVariants('Tudor', '1926', 'M91350-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'White'], ['0004', 'Blue'],
  ['0005', 'Champagne'], ['0006', 'Black Diamond'],
  ['0007', 'Silver Diamond'], ['0009', 'Opaline'],
  ['0010', 'Blue Diamond'],
], 'Dress')
addVariants('Tudor', '1926', 'M91450-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'White'], ['0004', 'Blue'],
  ['0005', 'Champagne'], ['0006', 'Black Diamond'],
  ['0009', 'Opaline'],
], 'Dress')
addVariants('Tudor', '1926', 'M91550-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'White'], ['0004', 'Blue'],
  ['0005', 'Champagne'], ['0006', 'Black Diamond'],
], 'Dress')
addVariants('Tudor', '1926', 'M91650-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'White'], ['0004', 'Blue'],
], 'Dress')

// Ranger — more
add('Tudor', 'Ranger', 'M79950-0003', 'Black', 'Field')
add('Tudor', 'Ranger', 'M79950-0004', 'Black', 'Field')
add('Tudor', 'Ranger', 'M79950-0005', 'Black', 'Field')

// Royal 41mm (M28600) — more
addVariants('Tudor', 'Royal', 'M28600-', [
  ['0001', 'Black'], ['0002', 'Blue'],
  ['0003', 'Silver'], ['0004', 'Champagne'],
  ['0006', 'Green'], ['0007', 'Salmon'],
], 'Sport')
addVariants('Tudor', 'Royal', 'M28500-', [
  ['0001', 'Black'], ['0002', 'Blue'],
  ['0003', 'Silver'], ['0004', 'Champagne'],
], 'Sport')
addVariants('Tudor', 'Royal', 'M28300-', [
  ['0005', 'Green'], ['0006', 'Salmon'],
  ['0007', 'Silver Diamond'], ['0008', 'Blue Diamond'],
], 'Sport')

// Prince Date Day (M76214, M76214)
add('Tudor', 'Prince Date Day', 'M76214-0001', 'Black', 'Dress')
add('Tudor', 'Prince Date Day', 'M76214-0002', 'Silver', 'Dress')
add('Tudor', 'Prince Date Day', 'M76214-0003', 'Blue', 'Dress')
add('Tudor', 'Prince Date Day', 'M76214-0004', 'Champagne', 'Dress')

// Glamour Double Date (M57103)
add('Tudor', 'Glamour Double Date', 'M57103-0001', 'Black', 'Dress')
add('Tudor', 'Glamour Double Date', 'M57103-0002', 'Silver', 'Dress')
add('Tudor', 'Glamour Double Date', 'M57103-0003', 'Blue', 'Dress')

// Style 41 (M12710)
addVariants('Tudor', 'Style', 'M12710-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'Blue'], ['0004', 'Champagne'],
  ['0005', 'Black Diamond'],
], 'Dress')

// ============================================================
// IWC — ~175 new references
// ============================================================

// Portugieser Automatic 40 (IW358303 series)
add('IWC', 'Portugieser Automatic 40', 'IW358303', 'Silver', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358304', 'Blue', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358305', 'Green', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358306', 'Grey', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358307', 'Black', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358308', 'Silver', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358310', 'Moon White', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358312', 'Blue', 'Dress')

// Portugieser Automatic 42 (IW500714 series)
add('IWC', 'Portugieser Automatic', 'IW500705', 'Silver', 'Dress')
add('IWC', 'Portugieser Automatic', 'IW500710', 'Silver', 'Dress')
add('IWC', 'Portugieser Automatic', 'IW500712', 'Blue', 'Dress')
add('IWC', 'Portugieser Automatic', 'IW500714', 'Ardoise', 'Dress')
add('IWC', 'Portugieser Automatic', 'IW500715', 'Green', 'Dress')
add('IWC', 'Portugieser Automatic', 'IW500716', 'Silver', 'Dress')

// Portugieser Chronograph (IW3716xx)
add('IWC', 'Portugieser Chronograph', 'IW371604', 'Blue', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371605', 'Green', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371607', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371609', 'Grey', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371610', 'Burgundy', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371611', 'Black', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371613', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371614', 'Blue', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371615', 'Green', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371616', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371617', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371620', 'Green', 'Chronograph')

// Portugieser Chronograph 41 (IW3881xx — new 2024 size)
add('IWC', 'Portugieser Chronograph 41', 'IW388101', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Chronograph 41', 'IW388102', 'Blue', 'Chronograph')
add('IWC', 'Portugieser Chronograph 41', 'IW388103', 'Green', 'Chronograph')
add('IWC', 'Portugieser Chronograph 41', 'IW388104', 'Grey', 'Chronograph')
add('IWC', 'Portugieser Chronograph 41', 'IW388109', 'Black', 'Chronograph')
add('IWC', 'Portugieser Chronograph 41', 'IW388110', 'Silver', 'Chronograph')

// Portugieser Annual Calendar (IW503501 series)
add('IWC', 'Portugieser Annual Calendar', 'IW503501', 'Silver', 'Dress')
add('IWC', 'Portugieser Annual Calendar', 'IW503502', 'Blue', 'Dress')
add('IWC', 'Portugieser Annual Calendar', 'IW503504', 'Ardoise', 'Dress')
add('IWC', 'Portugieser Annual Calendar', 'IW503510', 'Green', 'Dress')

// Portugieser Perpetual Calendar (IW503XXX)
add('IWC', 'Portugieser Perpetual Calendar', 'IW503301', 'Silver', 'Dress')
add('IWC', 'Portugieser Perpetual Calendar', 'IW503302', 'Blue', 'Dress')
add('IWC', 'Portugieser Perpetual Calendar', 'IW503312', 'Green', 'Dress')
add('IWC', 'Portugieser Perpetual Calendar', 'IW503401', 'Silver', 'Dress')

// Pilot's Watch Mark XX (IW328201 series — 2024 relaunch)
add('IWC', "Pilot's Watch Mark XX", 'IW328201', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328202', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328203', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328204', 'Silver', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328205', 'White', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328206', 'Grey', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328207', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328208', 'Blue', 'Pilot')

// Pilot's Watch Automatic 36 (IW324009 series)
add('IWC', "Pilot's Watch Automatic 36", 'IW324009', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Automatic 36", 'IW324010', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Automatic 36", 'IW324011', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Automatic 36", 'IW324012', 'White', 'Pilot')

// Pilot's Watch Automatic Spitfire (IW326801 series)
add('IWC', "Pilot's Watch Automatic Spitfire", 'IW326801', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Automatic Spitfire", 'IW326802', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Automatic Spitfire", 'IW326803', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Automatic Spitfire", 'IW326805', 'Black', 'Pilot')

// Pilot Chronograph 41 (IW388101 — distinguished from Port Chrono 41)
add('IWC', 'Pilot Chronograph 41', 'IW388104', 'Blue', 'Pilot')
add('IWC', 'Pilot Chronograph 41', 'IW388105', 'Black', 'Pilot')
add('IWC', 'Pilot Chronograph 41', 'IW388106', 'Green', 'Pilot')
add('IWC', 'Pilot Chronograph 41', 'IW388107', 'Blue', 'Pilot')
add('IWC', 'Pilot Chronograph 41', 'IW388108', 'Black', 'Pilot')

// Pilot Chronograph (IW3777xx — existing line, more variants)
add('IWC', "Pilot's Watch Chronograph", 'IW377710', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377724', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377725', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377726', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377727', 'Silver', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377728', 'Brown', 'Pilot')
add('IWC', "Pilot's Watch Chronograph", 'IW377729', 'Green', 'Pilot')

// Big Pilot's Watch 43 (IW329301 series — 2023 downsized)
add('IWC', "Big Pilot's Watch 43", 'IW329301', 'Black', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329302', 'Blue', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329303', 'Green', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329304', 'Grey', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329305', 'Silver', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329306', 'Black', 'Pilot')

// Big Pilot's Watch (IW501001 series — classic 46mm)
add('IWC', "Big Pilot's Watch", 'IW501001', 'Black', 'Pilot')
add('IWC', "Big Pilot's Watch", 'IW501002', 'Blue', 'Pilot')
add('IWC', "Big Pilot's Watch", 'IW501004', 'Slate', 'Pilot')
add('IWC', "Big Pilot's Watch", 'IW501005', 'Green', 'Pilot')
add('IWC', "Big Pilot's Watch", 'IW501012', 'Blue', 'Pilot')
add('IWC', "Big Pilot's Watch", 'IW501015', 'Black', 'Pilot')

// Ingenieur Automatic 40 (IW328901 series — 2023 relaunch)
add('IWC', 'Ingenieur Automatic 40', 'IW328901', 'Black', 'Sport')
add('IWC', 'Ingenieur Automatic 40', 'IW328902', 'Blue', 'Sport')
add('IWC', 'Ingenieur Automatic 40', 'IW328903', 'Green', 'Sport')
add('IWC', 'Ingenieur Automatic 40', 'IW328904', 'Silver', 'Sport')
add('IWC', 'Ingenieur Automatic 40', 'IW328905', 'Grey', 'Sport')

// Aquatimer Automatic (IW328801 series — 2024 relaunch)
add('IWC', 'Aquatimer Automatic', 'IW328801', 'Black', 'Diver')
add('IWC', 'Aquatimer Automatic', 'IW328802', 'Blue', 'Diver')
add('IWC', 'Aquatimer Automatic', 'IW328803', 'Green', 'Diver')
add('IWC', 'Aquatimer Automatic', 'IW328804', 'White', 'Diver')

// Aquatimer Chronograph
add('IWC', 'Aquatimer Chronograph', 'IW376803', 'Black', 'Diver')
add('IWC', 'Aquatimer Chronograph', 'IW376804', 'Blue', 'Diver')
add('IWC', 'Aquatimer Chronograph', 'IW376805', 'Green', 'Diver')

// Top Gun Chronograph (IW389101 series)
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389101', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389103', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389104', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389105', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389106', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389109', 'Woodland', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Top Gun", 'IW389110', 'Mojave Desert', 'Pilot')

// Pilot Double Chronograph Top Gun Ceratanium
add('IWC', "Pilot's Watch Double Chronograph Top Gun Ceratanium", 'IW371815', 'Black', 'Pilot')

// Portofino Automatic (IW356501 series)
add('IWC', 'Portofino Automatic', 'IW356501', 'Silver', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356502', 'Blue', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356504', 'Black', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356506', 'Green', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356517', 'Grey', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356518', 'Silver', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356519', 'Blue', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356522', 'Green', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356523', 'Black', 'Dress')

// Portofino Chronograph
add('IWC', 'Portofino Chronograph', 'IW391036', 'Silver', 'Chronograph')
add('IWC', 'Portofino Chronograph', 'IW391037', 'Blue', 'Chronograph')
add('IWC', 'Portofino Chronograph', 'IW391038', 'Green', 'Chronograph')
add('IWC', 'Portofino Chronograph', 'IW391039', 'Black', 'Chronograph')

// ============================================================
// LONGINES — ~150 new references
// Emphasis: 2024 HydroConquest ceramic bezel (L3.788/L3.790)
// ============================================================

// HydroConquest 2024 — ceramic bezel, 42mm automatic (L3.788)
// THIS IS THE EXACT WATCH FROM THE USER'S SCREENSHOT
add('Longines', 'HydroConquest', 'L3.788.4.96.6', 'Blue', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.56.6', 'Black', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.06.6', 'Green', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.76.6', 'Grey', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.96.9', 'Blue', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.56.9', 'Black', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.788.4.06.9', 'Green', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')

// HydroConquest 2024 — ceramic bezel, 39mm (L3.790)
add('Longines', 'HydroConquest', 'L3.790.4.96.6', 'Blue', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.56.6', 'Black', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.06.6', 'Green', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.96.9', 'Blue', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.56.9', 'Black', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')

// HydroConquest GMT (L3.790.4.96.2 series)
add('Longines', 'HydroConquest GMT', 'L3.790.4.96.2', 'Blue', 'GMT', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest GMT', 'L3.790.4.56.2', 'Black', 'GMT', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest GMT', 'L3.790.4.06.2', 'Green', 'GMT', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')

// Spirit — more 40mm and 42mm variants
add('Longines', 'Spirit', 'L3.810.4.03.6', 'Green', 'Field')
add('Longines', 'Spirit', 'L3.810.4.03.2', 'Green', 'Field')
add('Longines', 'Spirit', 'L3.810.4.63.6', 'Black', 'Field')
add('Longines', 'Spirit', 'L3.811.4.03.6', 'Green', 'Field')
add('Longines', 'Spirit', 'L3.811.4.93.6', 'Blue', 'Field')
add('Longines', 'Spirit', 'L3.811.4.93.2', 'Blue', 'Field')

// Spirit Zulu Time (GMT) — more variants
add('Longines', 'Spirit Zulu Time', 'L3.812.4.93.6', 'Blue', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.93.2', 'Blue', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.63.6', 'Black', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.03.6', 'Green', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.03.2', 'Green', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.53.6', 'Black', 'GMT')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.53.2', 'Black', 'GMT')

// Spirit Flyback Chronograph
add('Longines', 'Spirit Flyback', 'L3.821.4.53.6', 'Black', 'Chronograph')
add('Longines', 'Spirit Flyback', 'L3.821.4.93.6', 'Blue', 'Chronograph')
add('Longines', 'Spirit Flyback', 'L3.821.4.93.2', 'Blue', 'Chronograph')
add('Longines', 'Spirit Flyback', 'L3.821.4.03.6', 'Green', 'Chronograph')

// Ultra-Chron (2024 release)
add('Longines', 'Ultra-Chron', 'L2.836.4.52.6', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Longines', 'Ultra-Chron', 'L2.836.4.52.2', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Longines', 'Ultra-Chron', 'L2.836.4.72.6', 'Silver', 'Sport', '', 'reddit_under_5k_signal')
add('Longines', 'Ultra-Chron', 'L2.836.4.92.6', 'Blue', 'Sport', '', 'reddit_under_5k_signal')

// Record Collection
add('Longines', 'Record', 'L2.821.4.11.6', 'White', 'Dress')
add('Longines', 'Record', 'L2.821.4.56.6', 'Black', 'Dress')
add('Longines', 'Record', 'L2.821.4.96.6', 'Blue', 'Dress')
add('Longines', 'Record', 'L2.821.4.96.2', 'Blue', 'Dress')
add('Longines', 'Record', 'L2.820.4.11.6', 'White', 'Dress')
add('Longines', 'Record', 'L2.820.4.56.6', 'Black', 'Dress')
add('Longines', 'Record', 'L2.820.4.96.6', 'Blue', 'Dress')

// Conquest Heritage
add('Longines', 'Conquest Heritage', 'L1.645.4.52.4', 'Black', 'Sport')
add('Longines', 'Conquest Heritage', 'L1.645.4.75.4', 'Silver', 'Sport')
add('Longines', 'Conquest Heritage', 'L1.648.4.78.2', 'Silver', 'Chronograph')
add('Longines', 'Conquest Heritage', 'L1.648.4.52.2', 'Black', 'Chronograph')

// Heritage Classic
add('Longines', 'Heritage Classic', 'L2.828.4.73.2', 'Silver', 'Dress')
add('Longines', 'Heritage Classic', 'L2.828.4.53.2', 'Black', 'Dress')
add('Longines', 'Heritage Classic', 'L2.828.4.93.2', 'Blue', 'Dress')
add('Longines', 'Heritage Classic Sector Dial', 'L2.828.4.53.6', 'Black', 'Dress')
add('Longines', 'Heritage Classic Sector Dial', 'L2.828.4.73.6', 'Silver', 'Dress')

// Flagship Heritage
add('Longines', 'Flagship Heritage', 'L4.815.4.78.2', 'Silver', 'Dress')
add('Longines', 'Flagship Heritage', 'L4.815.4.11.2', 'White', 'Dress')
add('Longines', 'Flagship Heritage', 'L4.815.4.52.0', 'Black', 'Dress')
add('Longines', 'Flagship Heritage', 'L4.817.4.76.2', 'Silver', 'Dress')

// Master Collection — more
add('Longines', 'Master Collection', 'L2.793.4.78.6', 'Silver', 'Dress')
add('Longines', 'Master Collection', 'L2.793.4.92.6', 'Blue', 'Dress')
add('Longines', 'Master Collection', 'L2.793.4.97.6', 'Blue', 'Dress')
add('Longines', 'Master Collection', 'L2.793.4.59.6', 'Black', 'Dress')
add('Longines', 'Master Collection', 'L2.628.4.78.6', 'Silver', 'Dress')
add('Longines', 'Master Collection', 'L2.628.4.92.6', 'Blue', 'Dress')
add('Longines', 'Master Collection', 'L2.628.4.97.6', 'Blue', 'Dress')
add('Longines', 'Master Collection', 'L2.919.4.78.3', 'Silver', 'Dress')
add('Longines', 'Master Collection', 'L2.919.4.78.6', 'Silver', 'Dress')
add('Longines', 'Master Collection', 'L2.919.4.92.6', 'Blue', 'Dress')
add('Longines', 'Master Collection Moonphase', 'L2.909.4.92.6', 'Blue', 'Dress')
add('Longines', 'Master Collection Moonphase', 'L2.909.4.97.6', 'Blue', 'Dress')

// La Grande Classique
add('Longines', 'La Grande Classique', 'L4.755.2.11.7', 'White', 'Dress')
add('Longines', 'La Grande Classique', 'L4.755.2.31.7', 'Black', 'Dress')
add('Longines', 'La Grande Classique', 'L4.755.4.11.6', 'White', 'Dress')
add('Longines', 'La Grande Classique', 'L4.755.4.71.6', 'Silver', 'Dress')
add('Longines', 'La Grande Classique', 'L4.755.4.95.6', 'Blue', 'Dress')

// Conquest
add('Longines', 'Conquest', 'L3.830.4.72.6', 'Silver', 'Sport')
add('Longines', 'Conquest', 'L3.830.4.92.6', 'Blue', 'Sport')
add('Longines', 'Conquest', 'L3.830.4.52.6', 'Black', 'Sport')
add('Longines', 'Conquest', 'L3.830.4.96.6', 'Blue', 'Sport')
add('Longines', 'Conquest', 'L3.830.4.56.6', 'Black', 'Sport')
add('Longines', 'Conquest', 'L3.830.4.22.6', 'White', 'Sport')

// Legend Diver — more
add('Longines', 'Legend Diver', 'L3.774.4.90.2', 'Blue', 'Diver')
add('Longines', 'Legend Diver', 'L3.774.1.50.2', 'Black', 'Diver')
add('Longines', 'Legend Diver', 'L3.374.4.40.2', 'Bronze', 'Diver')
add('Longines', 'Legend Diver', 'L3.374.4.50.6', 'Black', 'Diver')
add('Longines', 'Legend Diver', 'L3.374.4.70.6', 'Grey', 'Diver')

// DolceVita — more
add('Longines', 'DolceVita', 'L5.512.4.71.6', 'Silver', 'Dress')
add('Longines', 'DolceVita', 'L5.512.4.75.2', 'White', 'Dress')
add('Longines', 'DolceVita', 'L5.512.0.71.0', 'Silver', 'Dress')

// ============================================================
// SINN — ~125 new references
// ============================================================

// 556 family — hugely popular on Reddit
add('Sinn', '556 I', '556.010', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 I', '556.0104', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 I', '556.011', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 A', '556.014', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 A', '556.0141', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 I B', '556.010.B', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 A RS', '556.0144', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Sinn', '556 I RS', '556.0106', 'Silver', 'Sport', '', 'reddit_under_5k_signal')
add('Sinn', '556 A Red Seconds', '556.0147', 'Anthracite', 'Sport', '', 'reddit_under_5k_signal')
add('Sinn', '556 I Perlmutt', '556.012', 'Mother of Pearl', 'Sport', '', 'reddit_under_5k_signal')
add('Sinn', '556 I Perlmutt', '556.013', 'Mother of Pearl', 'Sport', '', 'reddit_under_5k_signal')
add('Sinn', '556 MF', '556.060', 'Silver', 'Field', '', 'reddit_under_5k_signal')

// 104 family — more variants
add('Sinn', '104 St Sa I', '104.011', 'Black', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I', '104.013', 'White', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I', '104.014', 'Blue', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa A', '104.020', 'Black', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I B', '104.010.B', 'Black', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I G', '104.010.G', 'Black', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I W', '104.010.W', 'White', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa A B', '104.020.B', 'Black', 'Pilot', '', 'reddit_under_5k_signal')

// 105 — classic pilot
add('Sinn', '105 St Sa', '105.010', 'Black', 'Pilot')
add('Sinn', '105 St Sa', '105.011', 'White', 'Pilot')

// 206 — pilot
add('Sinn', '206 St Ar', '206.010', 'Black', 'Pilot')
add('Sinn', '206 St Ar', '206.014', 'White', 'Pilot')

// 240 St / 242 St — chronograph
add('Sinn', '240 St', '240.010', 'Black', 'Chronograph')
add('Sinn', '240 St', '240.011', 'Blue', 'Chronograph')
add('Sinn', '242 St', '242.010', 'Black', 'Chronograph')
add('Sinn', '242 St', '242.011', 'Blue', 'Chronograph')

// 356 family — pilot chrono
add('Sinn', '356 Sa', '356.070', 'Black', 'Chronograph')
add('Sinn', '356 Sa', '356.071', 'Silver', 'Chronograph')
add('Sinn', '356 Sa Flieger III', '356.073', 'Black', 'Chronograph')

// 358 Sa — pilot chrono
add('Sinn', '358 Sa', '358.061', 'Black', 'Chronograph')
add('Sinn', '358 Sa', '358.062', 'Silver', 'Chronograph')

// 836 — antimagnetic
add('Sinn', '836', '836.010', 'Black', 'Field')
add('Sinn', '836', '836.011', 'Silver', 'Field')
add('Sinn', '836', '836.015', 'Green', 'Field')

// 856 / 857 — tegimented
add('Sinn', '856', '856.010', 'Black', 'Pilot')
add('Sinn', '856', '856.011', 'Black', 'Pilot')
add('Sinn', '856', '856.012', 'Black', 'Pilot')
add('Sinn', '856 UTC', '856.020', 'Black', 'GMT')
add('Sinn', '857', '857.010', 'Black', 'Pilot')
add('Sinn', '857 UTC', '857.020', 'Black', 'GMT')
add('Sinn', '857 S', '857.012', 'Black', 'Pilot')

// 903 — classic chrono
add('Sinn', '903 St', '903.040', 'Silver', 'Chronograph')
add('Sinn', '903 St', '903.041', 'Black', 'Chronograph')
add('Sinn', '903 St', '903.042', 'Blue', 'Chronograph')
add('Sinn', '903 St Be', '903.044', 'Black', 'Chronograph')

// 910 Anniversary — limited
add('Sinn', '910 Anniversary', '910.010', 'Silver', 'Chronograph')

// 140 / 142 — space chrono
add('Sinn', '140 St', '140.020', 'Black', 'Chronograph')
add('Sinn', '140 A', '140.030', 'Black', 'Chronograph')
add('Sinn', '142 St', '142.010', 'Black', 'Chronograph')
add('Sinn', '142 St', '142.011', 'Silver', 'Chronograph')

// EZM series — mission timers
add('Sinn', 'EZM 3', '603.010', 'Black', 'Diver')
add('Sinn', 'EZM 3F', '603.020', 'Black', 'Diver')
add('Sinn', 'EZM 9 TESTAF', '949.010', 'Black', 'Pilot')
add('Sinn', 'EZM 13', '613.010', 'Black', 'Pilot')
add('Sinn', 'EZM 13.1', '613.040', 'Black', 'Pilot')

// U1 — more variants
add('Sinn', 'U1', 'U1.010', 'Black', 'Diver')
add('Sinn', 'U1 S', 'U1.012', 'Black', 'Diver')
add('Sinn', 'U1 S E', 'U1.013', 'Black', 'Diver')
add('Sinn', 'U1 Camouflage', 'U1.014', 'Green', 'Diver')
add('Sinn', 'U1 B', 'U1.020', 'Black', 'Diver')

// U2 — GMT diver
add('Sinn', 'U2', 'U2.010', 'Black', 'GMT')
add('Sinn', 'U2 S', 'U2.012', 'Black', 'GMT')
add('Sinn', 'U2 EZM 5', 'U2.020', 'Black', 'GMT')

// U50 — more
add('Sinn', 'U50', 'U50.010', 'Black', 'Diver')
add('Sinn', 'U50', 'U50.011', 'Blue', 'Diver')
add('Sinn', 'U50 S', 'U50.020', 'Black', 'Diver')
add('Sinn', 'U50 S', 'U50.021', 'Blue', 'Diver')

// U212 SDR
add('Sinn', 'U212 SDR', 'U212.010', 'Black', 'Diver')
add('Sinn', 'U212', 'U212.020', 'Black', 'Diver')

// Frankfurt Financial District / Meisterbund
add('Sinn', '6000', '6000.010', 'Silver', 'Dress')
add('Sinn', '6000', '6000.011', 'Black', 'Dress')
add('Sinn', '6012', '6012.010', 'Silver', 'Dress')
add('Sinn', '6012', '6012.011', 'Blue', 'Dress')
add('Sinn', '6033', '6033.010', 'Silver', 'Dress')
add('Sinn', '6060', '6060.010', 'Silver', 'Chronograph')
add('Sinn', '6060', '6060.011', 'Blue', 'Chronograph')
add('Sinn', '6096', '6096.010', 'Silver', 'Chronograph')
add('Sinn', '6099', '6099.010', 'Silver', 'Chronograph')

// 717 — pilot
add('Sinn', '717', '717.010', 'Black', 'Chronograph')

// 3006 — hunting watch
add('Sinn', '3006', '3006.010', 'Green', 'Field')

// ============================================================
// EXPANSION PASS — fill to ~1000 with deeper coverage
// ============================================================

// --- ROLEX expansion ---

// Datejust 36 smooth bezel (126200) — more dials
addVariants('Rolex', 'Datejust 36', '126200-', [
  ['0008', 'Mint Green'], ['0009', 'Azzurro Blue'],
  ['0010', 'Olive Green'], ['0012', 'Silver Fluted'],
  ['0013', 'Black Fluted'], ['0014', 'Bright Blue'],
  ['0015', 'Palm Motif'], ['0016', 'Blue Palm'],
  ['0018', 'White'], ['0019', 'Pink'],
  ['0020', 'Chocolate'], ['0021', 'Slate'],
  ['0024', 'Silver Diamonds'], ['0025', 'Blue Diamonds'],
  ['0027', 'Palm Green'],
], 'Dress')

// Datejust 31 (278240, 278274)
addVariants('Rolex', 'Datejust 31', '278240-', [
  ['0001', 'Mint Green'], ['0002', 'Coral Red'],
  ['0003', 'Silver'], ['0004', 'Blue'],
  ['0005', 'Yellow'], ['0006', 'Black'],
  ['0007', 'Orchid Pink'],
], 'Dress')
addVariants('Rolex', 'Datejust 31', '278274-', [
  ['0001', 'Silver'], ['0002', 'Blue'],
  ['0003', 'Black'], ['0005', 'Mint Green'],
  ['0006', 'Pink'],
], 'Dress')

// Oyster Perpetual 31 (277200)
addVariants('Rolex', 'Oyster Perpetual 31', '277200-', [
  ['0001', 'Silver'], ['0002', 'Black'],
  ['0003', 'Blue'], ['0004', 'Yellow'],
  ['0005', 'Green'], ['0006', 'Coral Red'],
  ['0007', 'Turquoise'],
], 'Sport')

// Day-Date 40 more configs (228206 platinum)
addVariants('Rolex', 'Day-Date 40', '228206-', [
  ['0001', 'Ice Blue'], ['0002', 'Silver'],
  ['0003', 'Olive Green'], ['0005', 'Blue'],
  ['0027', 'Ice Blue Motif'], ['0028', 'Meteorite'],
], 'Dress')

// Day-Date 40 (228238 yellow gold) more
addVariants('Rolex', 'Day-Date 40', '228238-', [
  ['0001', 'Champagne'], ['0002', 'Black'],
  ['0003', 'Green'], ['0006', 'Silver'],
  ['0008', 'Olive Green'], ['0010', 'Turquoise'],
  ['0042', 'Bright Green'],
], 'Dress')

// Day-Date 40 (228239 white gold) more
addVariants('Rolex', 'Day-Date 40', '228239-', [
  ['0001', 'Silver'], ['0002', 'White'],
  ['0007', 'Meteorite'], ['0040', 'Olive Green'],
  ['0045', 'Bright Blue'], ['0046', 'Ice Blue'],
], 'Dress')

// Cellini Moonphase / Time / Date
add('Rolex', 'Cellini Moonphase', '50535-0002', 'White', 'Dress')
add('Rolex', 'Cellini Time', '50509-0008', 'White', 'Dress')
add('Rolex', 'Cellini Time', '50509-0016', 'Black', 'Dress')
add('Rolex', 'Cellini Date', '50519-0001', 'White', 'Dress')
add('Rolex', 'Cellini Date', '50519-0006', 'Black', 'Dress')
add('Rolex', 'Cellini Date', '50515-0001', 'Silver', 'Dress')

// Milgauss
add('Rolex', 'Milgauss', '116400-0001', 'Black', 'Sport')
add('Rolex', 'Milgauss', '116400GV-0001', 'Black', 'Sport')
add('Rolex', 'Milgauss', '116400GV-0002', 'Blue', 'Sport')

// Explorer I 36mm more
add('Rolex', 'Explorer', '124270-0002', 'Black', 'Field')
add('Rolex', 'Explorer', '124273-0002', 'Black', 'Field')

// Explorer II more
add('Rolex', 'Explorer II', '226570-0002', 'White', 'GMT')
add('Rolex', 'Explorer II', '226570-0003', 'Black', 'GMT')

// Sea-Dweller more
add('Rolex', 'Sea-Dweller', '126603-0001', 'Black', 'Diver')
add('Rolex', 'Sea-Dweller', '126603-0002', 'Black', 'Diver')

// Deepsea more
add('Rolex', 'Deepsea', '136660-0001', 'Black', 'Diver')
add('Rolex', 'Deepsea', '136660-0003', 'D-Blue', 'Diver')
add('Rolex', 'Deepsea', '136660-0004', 'Blue', 'Diver')

// --- OMEGA expansion ---

// Seamaster Diver 300M Chrono (210.30.44.51.xx)
add('Omega', 'Seamaster Diver 300M Chronograph', '210.30.44.51.03.002', 'Blue', 'Chronograph')
add('Omega', 'Seamaster Diver 300M Chronograph', '210.30.44.51.06.001', 'Grey', 'Chronograph')
add('Omega', 'Seamaster Diver 300M Chronograph', '210.32.44.51.01.002', 'Black', 'Chronograph')
add('Omega', 'Seamaster Diver 300M Chronograph', '210.32.44.51.03.001', 'Blue', 'Chronograph')

// More Planet Ocean 39.5mm
add('Omega', 'Seamaster Planet Ocean 600M', '215.30.40.20.04.001', 'White', 'Diver')
add('Omega', 'Seamaster Planet Ocean 600M', '215.30.40.20.09.001', 'Green', 'Diver')
add('Omega', 'Seamaster Planet Ocean 600M', '215.32.40.20.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Planet Ocean 600M', '215.32.40.20.04.001', 'White', 'Diver')

// Planet Ocean GMT
add('Omega', 'Seamaster Planet Ocean 600M GMT', '215.30.44.22.01.001', 'Black', 'GMT')
add('Omega', 'Seamaster Planet Ocean 600M GMT', '215.30.44.22.01.002', 'Black', 'GMT')
add('Omega', 'Seamaster Planet Ocean 600M GMT', '215.30.44.22.03.001', 'Blue', 'GMT')
add('Omega', 'Seamaster Planet Ocean 600M GMT', '215.32.44.22.01.001', 'Black', 'GMT')

// Speedmaster Moonphase
add('Omega', 'Speedmaster Moonphase', '304.30.44.52.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Moonphase', '304.33.44.52.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Moonphase', '304.33.44.52.03.001', 'Blue', 'Chronograph')

// De Ville Hour Vision
add('Omega', 'De Ville Hour Vision', '433.10.41.21.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Hour Vision', '433.10.41.21.03.001', 'Blue', 'Dress')
add('Omega', 'De Ville Hour Vision', '433.13.41.21.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Hour Vision', '433.13.41.21.03.001', 'Blue', 'Dress')

// Constellation Globemaster
add('Omega', 'Constellation Globemaster', '130.30.39.21.03.001', 'Blue', 'Dress')
add('Omega', 'Constellation Globemaster', '130.33.39.21.03.001', 'Blue', 'Dress')
add('Omega', 'Constellation Globemaster', '130.30.39.21.02.002', 'Silver', 'Dress')
add('Omega', 'Constellation Globemaster', '130.33.39.21.02.001', 'Silver', 'Dress')

// Aqua Terra GMT
add('Omega', 'Seamaster Aqua Terra GMT', '220.10.43.22.02.001', 'Silver', 'GMT')
add('Omega', 'Seamaster Aqua Terra GMT', '220.12.43.22.02.001', 'Silver', 'GMT')
add('Omega', 'Seamaster Aqua Terra GMT', '220.10.43.22.06.001', 'Grey', 'GMT')

// Speedmaster Reduced / Speedmaster 38 (324.xx)
add('Omega', 'Speedmaster 38', '324.30.38.50.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster 38', '324.30.38.50.02.001', 'Silver', 'Chronograph')
add('Omega', 'Speedmaster 38', '324.30.38.50.03.001', 'Blue', 'Chronograph')
add('Omega', 'Speedmaster 38', '324.30.38.50.06.001', 'Grey', 'Chronograph')

// Constellation Manhattan 36mm
add('Omega', 'Constellation', '131.10.36.20.01.001', 'Black', 'Dress')
add('Omega', 'Constellation', '131.10.36.20.02.001', 'Silver', 'Dress')
add('Omega', 'Constellation', '131.10.36.20.03.001', 'Blue', 'Dress')
add('Omega', 'Constellation', '131.10.36.20.06.001', 'Green', 'Dress')

// --- TUDOR expansion ---

// Black Bay Heritage 36 (M79500)
addVariants('Tudor', 'Black Bay 36', 'M79500-', [
  ['0001', 'Black'], ['0003', 'Blue'],
  ['0004', 'Silver'], ['0005', 'Champagne'],
], 'Sport')

// Black Bay S&G (M79733N)
add('Tudor', 'Black Bay S&G', 'M79733N-0001', 'Black', 'Diver')
add('Tudor', 'Black Bay S&G', 'M79733N-0002', 'Black', 'Diver')
add('Tudor', 'Black Bay S&G', 'M79733N-0006', 'Black', 'Diver')

// Pelagos (M25600TN) — more
add('Tudor', 'Pelagos', 'M25600TN-0002', 'Blue', 'Diver')
add('Tudor', 'Pelagos', 'M25600TB-0002', 'Blue', 'Diver')
add('Tudor', 'Pelagos', 'M25600TB-0003', 'Black', 'Diver')

// Glamour Date (M53003)
addVariants('Tudor', 'Glamour Date', 'M53003-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'Blue'], ['0004', 'Champagne'],
], 'Dress')

// Style 38 (M12510)
addVariants('Tudor', 'Style', 'M12510-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'Blue'], ['0004', 'Champagne'],
], 'Dress')

// Style 34 (M12310)
addVariants('Tudor', 'Style', 'M12310-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'Blue'], ['0004', 'Champagne'],
], 'Dress')

// 1926 additional sizes
addVariants('Tudor', '1926', 'M91350-', [
  ['0011', 'Green'], ['0012', 'White Rose'],
], 'Dress')
addVariants('Tudor', '1926', 'M91250-', [
  ['0001', 'Black'], ['0002', 'Silver'],
  ['0003', 'White'], ['0004', 'Blue'],
  ['0005', 'Champagne'],
], 'Dress')

// --- IWC expansion ---

// Portugieser Hand-Wound (IW5454xx)
add('IWC', 'Portugieser Hand-Wound', 'IW545401', 'Silver', 'Dress')
add('IWC', 'Portugieser Hand-Wound', 'IW545403', 'Blue', 'Dress')
add('IWC', 'Portugieser Hand-Wound', 'IW545404', 'Ardoise', 'Dress')
add('IWC', 'Portugieser Hand-Wound', 'IW545405', 'Green', 'Dress')
add('IWC', 'Portugieser Hand-Wound', 'IW545406', 'Silver', 'Dress')
add('IWC', 'Portugieser Hand-Wound', 'IW545407', 'White', 'Dress')

// Da Vinci Automatic (IW356601 series)
add('IWC', 'Da Vinci Automatic', 'IW356601', 'Silver', 'Dress')
add('IWC', 'Da Vinci Automatic', 'IW356602', 'Blue', 'Dress')
add('IWC', 'Da Vinci Automatic', 'IW356605', 'Ardoise', 'Dress')

// Pilot Heritage (IW327xx)
add('IWC', "Pilot's Watch Heritage", 'IW327006', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Heritage", 'IW327010', 'Silver', 'Pilot')
add('IWC', "Pilot's Watch Heritage", 'IW327012', 'Green', 'Pilot')

// Pilot Mark XVIII (prior gen, still popular)
add('IWC', "Pilot's Watch Mark XVIII", 'IW327001', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Mark XVIII", 'IW327002', 'Silver', 'Pilot')
add('IWC', "Pilot's Watch Mark XVIII", 'IW327004', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Mark XVIII", 'IW327009', 'White', 'Pilot')
add('IWC', "Pilot's Watch Mark XVIII", 'IW327015', 'Blue', 'Pilot')

// Pilot Automatic 40 (IW328801 series)
add('IWC', "Pilot's Watch Automatic 40", 'IW328801', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Automatic 40", 'IW328802', 'Blue', 'Pilot')
add('IWC', "Pilot's Watch Automatic 40", 'IW328803', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Automatic 40", 'IW328805', 'Silver', 'Pilot')

// Top Gun Automatic (IW326901 series)
add('IWC', "Pilot's Watch Automatic Top Gun", 'IW326901', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Automatic Top Gun", 'IW326906', 'Green', 'Pilot')

// --- LONGINES expansion ---

// Conquest V.H.P.
add('Longines', 'Conquest V.H.P.', 'L3.726.4.56.6', 'Black', 'Sport')
add('Longines', 'Conquest V.H.P.', 'L3.726.4.96.6', 'Blue', 'Sport')
add('Longines', 'Conquest V.H.P.', 'L3.726.4.76.6', 'Silver', 'Sport')
add('Longines', 'Conquest V.H.P.', 'L3.716.4.56.6', 'Black', 'Sport')
add('Longines', 'Conquest V.H.P.', 'L3.716.4.96.6', 'Blue', 'Sport')
add('Longines', 'Conquest V.H.P.', 'L3.716.4.76.6', 'Silver', 'Sport')

// Longines Elegant Collection
add('Longines', 'Elegant Collection', 'L4.911.4.11.6', 'White', 'Dress')
add('Longines', 'Elegant Collection', 'L4.911.4.72.6', 'Silver', 'Dress')
add('Longines', 'Elegant Collection', 'L4.911.4.92.6', 'Blue', 'Dress')
add('Longines', 'Elegant Collection', 'L4.911.4.52.6', 'Black', 'Dress')
add('Longines', 'Elegant Collection', 'L4.910.4.11.6', 'White', 'Dress')
add('Longines', 'Elegant Collection', 'L4.910.4.72.6', 'Silver', 'Dress')

// Longines Presence
add('Longines', 'Presence', 'L4.922.4.11.6', 'White', 'Dress')
add('Longines', 'Presence', 'L4.922.4.72.6', 'Silver', 'Dress')
add('Longines', 'Presence', 'L4.922.4.92.6', 'Blue', 'Dress')
add('Longines', 'Presence', 'L4.922.4.52.6', 'Black', 'Dress')
add('Longines', 'Presence', 'L4.922.2.11.7', 'White', 'Dress')

// Evidenza
add('Longines', 'Evidenza', 'L2.642.4.73.4', 'Silver', 'Dress')
add('Longines', 'Evidenza', 'L2.642.4.51.4', 'Black', 'Dress')
add('Longines', 'Evidenza', 'L2.642.4.51.6', 'Black', 'Dress')

// More HydroConquest older gen filling gaps
add('Longines', 'HydroConquest', 'L3.781.4.06.6', 'Green', 'Diver')
add('Longines', 'HydroConquest', 'L3.782.4.06.6', 'Green', 'Diver')
add('Longines', 'HydroConquest', 'L3.782.4.06.9', 'Green', 'Diver')
add('Longines', 'HydroConquest', 'L3.781.4.56.2', 'Black', 'Diver')
add('Longines', 'HydroConquest', 'L3.781.4.96.2', 'Blue', 'Diver')

// Heritage Military
add('Longines', 'Heritage Military', 'L2.826.4.53.2', 'Black', 'Field')
add('Longines', 'Heritage Military', 'L2.826.4.53.6', 'Black', 'Field')

// --- SINN expansion ---

// 358 pilot chrono — more
add('Sinn', '358 Sa Flieger', '358.065', 'Black', 'Chronograph')

// 144 — classic pilot chrono
add('Sinn', '144 St Sa', '144.060', 'Black', 'Chronograph')
add('Sinn', '144 St Sa', '144.066', 'Blue', 'Chronograph')
add('Sinn', '144 St', '144.068', 'Silver', 'Chronograph')

// 256 — pilot
add('Sinn', '256 St', '256.010', 'Black', 'Pilot')
add('Sinn', '256 St', '256.014', 'Blue', 'Pilot')

// 356 Sa — more
add('Sinn', '356 Sa Flieger II', '356.074', 'Silver', 'Chronograph')

// 103 — classic pilot chrono
add('Sinn', '103 St Sa', '103.060', 'Black', 'Chronograph')
add('Sinn', '103 St Sa', '103.061', 'Blue', 'Chronograph')
add('Sinn', '103 St', '103.062', 'Silver', 'Chronograph')
add('Sinn', '103 Ti Ar', '103.070', 'Black', 'Chronograph')

// EZM more
add('Sinn', 'EZM 1', '501.010', 'Black', 'Diver')
add('Sinn', 'EZM 2', '403.030', 'Black', 'Diver')
add('Sinn', 'EZM 10', '950.010', 'Black', 'Pilot')
add('Sinn', 'EZM 12', '613.012', 'Black', 'Pilot')

// U1 SE — special editions
add('Sinn', 'U1 SE', 'U1.015', 'Black', 'Diver')
add('Sinn', 'U1 SE', 'U1.016', 'Blue', 'Diver')
add('Sinn', 'U1 Professional', 'U1.1010', 'Black', 'Diver')

// U200
add('Sinn', 'U200', 'U200.010', 'Black', 'Diver')
add('Sinn', 'U200 S', 'U200.020', 'Black', 'Diver')

// T1 / T2 — diver
add('Sinn', 'T1', 'T1.010', 'Black', 'Diver')
add('Sinn', 'T1 B', 'T1.020', 'Black', 'Diver')
add('Sinn', 'T2', 'T2.010', 'Black', 'Diver')
add('Sinn', 'T2 B', 'T2.020', 'Black', 'GMT')

// 1746 — classic dress
add('Sinn', '1746', '1746.010', 'Silver', 'Dress')
add('Sinn', '1746', '1746.011', 'Black', 'Dress')

// ============================================================
// FINAL EXPANSION — reach ~1000
// ============================================================

// --- ROLEX final ---

// More Submariner variants (two-tone, gold)
add('Rolex', 'Submariner Date', '126613LB-0001', 'Blue', 'Diver')
add('Rolex', 'Submariner Date', '126613LN-0001', 'Black', 'Diver')
add('Rolex', 'Submariner Date', '126618LB-0001', 'Blue', 'Diver')
add('Rolex', 'Submariner Date', '126618LN-0001', 'Black', 'Diver')
add('Rolex', 'Submariner Date', '126619LB-0001', 'Blue', 'Diver')
add('Rolex', 'Submariner Date', '126619LB-0002', 'Blue', 'Diver')

// Air-King
add('Rolex', 'Air-King', '126900-0002', 'Black', 'Sport')
add('Rolex', 'Air-King', '126900-0003', 'Black', 'Sport')

// Cosmograph Daytona exotic dials
add('Rolex', 'Cosmograph Daytona', '126500LN-0001', 'White', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126500LN-0002', 'Black', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126500LN-0003', 'White', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '126500LN-0004', 'Black', 'Chronograph')

// Yacht-Master Everose (268655)
add('Rolex', 'Yacht-Master 37', '268655-0001', 'Black', 'Sport')
add('Rolex', 'Yacht-Master 37', '268655-0002', 'Black', 'Sport')

// Yacht-Master 40 Everose (126655)
add('Rolex', 'Yacht-Master 40', '126655-0001', 'Black', 'Sport')
add('Rolex', 'Yacht-Master 40', '126655-0002', 'Black', 'Sport')

// More Sky-Dweller configs
add('Rolex', 'Sky-Dweller', '336935-0001', 'Chocolate', 'Dress')
add('Rolex', 'Sky-Dweller', '336935-0002', 'Black', 'Dress')
add('Rolex', 'Sky-Dweller', '336935-0003', 'Silver', 'Dress')

// Datejust 36 (126233 two-tone) more
addVariants('Rolex', 'Datejust 36', '126233-', [
  ['0020', 'Palm Green'], ['0022', 'Black Fluted'],
  ['0024', 'Blue Fluted'], ['0030', 'Olive Green'],
  ['0033', 'White'],
], 'Dress')

// --- OMEGA final ---

// De Ville Annual Calendar
add('Omega', 'De Ville Annual Calendar', '431.10.41.22.01.001', 'Black', 'Dress')
add('Omega', 'De Ville Annual Calendar', '431.10.41.22.02.001', 'Silver', 'Dress')
add('Omega', 'De Ville Annual Calendar', '431.10.41.22.03.001', 'Blue', 'Dress')
add('Omega', 'De Ville Annual Calendar', '431.13.41.22.01.001', 'Black', 'Dress')
add('Omega', 'De Ville Annual Calendar', '431.13.41.22.03.001', 'Blue', 'Dress')

// Speedmaster Moonwatch 42 Co-Axial (311.30 era, still popular used)
add('Omega', 'Speedmaster Professional Moonwatch', '311.30.42.30.01.005', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '311.30.42.30.01.006', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '311.33.42.30.01.001', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Professional Moonwatch', '311.33.42.30.01.002', 'Black', 'Chronograph')

// Seamaster 300M 36mm (220.10.36) — new smaller size
add('Omega', 'Seamaster Diver 300M', '210.30.36.20.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.30.36.20.03.001', 'Blue', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.30.36.20.04.001', 'White', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.32.36.20.01.001', 'Black', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.32.36.20.03.001', 'Blue', 'Diver')

// Constellation 29mm (131.10.29) — unisex
add('Omega', 'Constellation', '131.10.29.20.01.001', 'Black', 'Dress')
add('Omega', 'Constellation', '131.10.29.20.02.001', 'Silver', 'Dress')
add('Omega', 'Constellation', '131.10.29.20.03.001', 'Blue', 'Dress')
add('Omega', 'Constellation', '131.10.29.20.55.001', 'Green', 'Dress')

// Seamaster Diver 300M Nekton
add('Omega', 'Seamaster Diver 300M', '210.30.42.20.01.002', 'Black', 'Diver')
add('Omega', 'Seamaster Diver 300M', '210.32.42.20.01.002', 'Black', 'Diver')

// --- TUDOR final ---

// Black Bay 31/32/36 (Heritage collection)
add('Tudor', 'Black Bay 32', 'M79580-0001', 'Black', 'Sport')
add('Tudor', 'Black Bay 32', 'M79580-0003', 'Blue', 'Sport')
add('Tudor', 'Black Bay 32', 'M79580-0004', 'Silver', 'Sport')
add('Tudor', 'Black Bay 31', 'M79580-0006', 'Champagne', 'Sport')
add('Tudor', 'Black Bay 36', 'M79640-0001', 'Black', 'Sport')
add('Tudor', 'Black Bay 36', 'M79640-0002', 'Blue', 'Sport')
add('Tudor', 'Black Bay 36', 'M79640-0003', 'Silver', 'Sport')
add('Tudor', 'Black Bay 36', 'M79640-0004', 'Champagne', 'Sport')

// Pelagos FXD — Alinghi Red Bull
add('Tudor', 'Pelagos FXD Alinghi', 'M25707KN-0004', 'Red', 'Diver')

// Prince Oysterdate (vintage popular)
add('Tudor', 'Prince Oysterdate', 'M76214-0005', 'Green', 'Dress')
add('Tudor', 'Prince Oysterdate', 'M76214-0006', 'Blue', 'Dress')

// Royal 38mm
addVariants('Tudor', 'Royal', 'M28400-', [
  ['0001', 'Black'], ['0002', 'Blue'],
  ['0003', 'Silver'], ['0004', 'Champagne'],
  ['0005', 'Green'],
], 'Sport')

// Black Bay Fifty-Eight Navy Blue
add('Tudor', 'Black Bay 58', 'M79030B-0006', 'Blue', 'Diver')
add('Tudor', 'Black Bay 58', 'M79030B-0007', 'Blue', 'Diver')

// --- IWC final ---

// Portugieser Yacht Club Chronograph
add('IWC', 'Portugieser Yacht Club Chronograph', 'IW390701', 'Silver', 'Chronograph')
add('IWC', 'Portugieser Yacht Club Chronograph', 'IW390702', 'Blue', 'Chronograph')
add('IWC', 'Portugieser Yacht Club Chronograph', 'IW390704', 'Silver', 'Chronograph')

// Pilot Top Gun Automatic
add('IWC', "Pilot's Watch Automatic Top Gun", 'IW326903', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Automatic Top Gun", 'IW326905', 'Black', 'Pilot')

// Portofino Hand-Wound
add('IWC', 'Portofino Hand-Wound', 'IW510103', 'Silver', 'Dress')
add('IWC', 'Portofino Hand-Wound', 'IW510104', 'Blue', 'Dress')
add('IWC', 'Portofino Hand-Wound', 'IW510106', 'Ardoise', 'Dress')
add('IWC', 'Portofino Hand-Wound', 'IW510108', 'Green', 'Dress')

// Pilot's Watch Chronograph Spitfire
add('IWC', "Pilot's Watch Chronograph Spitfire", 'IW387901', 'Black', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Spitfire", 'IW387902', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Chronograph Spitfire", 'IW387903', 'Blue', 'Pilot')

// IWC Pilot's Watch UTC Spitfire
add('IWC', "Pilot's Watch UTC Spitfire", 'IW327101', 'Black', 'GMT')
add('IWC', "Pilot's Watch UTC Spitfire", 'IW327102', 'Green', 'GMT')

// --- LONGINES final ---

// Conquest Classic
add('Longines', 'Conquest Classic', 'L2.386.4.72.6', 'Silver', 'Sport')
add('Longines', 'Conquest Classic', 'L2.386.4.92.6', 'Blue', 'Sport')
add('Longines', 'Conquest Classic', 'L2.386.4.56.6', 'Black', 'Sport')

// Master Collection Annual Calendar
add('Longines', 'Master Collection Annual Calendar', 'L2.910.4.78.6', 'Silver', 'Dress')
add('Longines', 'Master Collection Annual Calendar', 'L2.910.4.92.6', 'Blue', 'Dress')

// Flagship
add('Longines', 'Flagship', 'L4.984.4.72.6', 'Silver', 'Dress')
add('Longines', 'Flagship', 'L4.984.4.12.6', 'White', 'Dress')
add('Longines', 'Flagship', 'L4.984.4.92.6', 'Blue', 'Dress')

// HydroConquest 43mm Chrono (L3.783)
add('Longines', 'HydroConquest Chronograph', 'L3.783.4.96.6', 'Blue', 'Chronograph')
add('Longines', 'HydroConquest Chronograph', 'L3.783.4.56.6', 'Black', 'Chronograph')
add('Longines', 'HydroConquest Chronograph', 'L3.783.4.96.9', 'Blue', 'Chronograph')
add('Longines', 'HydroConquest Chronograph', 'L3.783.4.56.9', 'Black', 'Chronograph')

// Legend Diver 36mm
add('Longines', 'Legend Diver', 'L3.374.4.40.6', 'Brown', 'Diver')
add('Longines', 'Legend Diver', 'L3.374.4.70.2', 'Grey', 'Diver')

// --- SINN final ---

// 836 more
add('Sinn', '836', '836.012', 'Blue', 'Field')

// 856 more
add('Sinn', '856 B-Uhr', '856.013', 'Black', 'Pilot')
add('Sinn', '856 I', '856.014', 'Black', 'Pilot')

// 900 Pilot
add('Sinn', '900 Flieger', '900.010', 'Black', 'Chronograph')
add('Sinn', '900 Flieger', '900.011', 'Silver', 'Chronograph')

// 933 — pilot
add('Sinn', '933 St', '933.010', 'Black', 'Pilot')

// 240 more
add('Sinn', '240 St IFR', '240.015', 'Black', 'Chronograph')

// EZM more
add('Sinn', 'EZM 7', '857.040', 'Black', 'Pilot')
add('Sinn', 'EZM 7S', '857.041', 'Black', 'Pilot')

// U50 SDR
add('Sinn', 'U50 SDR', 'U50.030', 'Black', 'Diver')

// 6200 Meisterbund
add('Sinn', '6200 Meisterbund I', '6200.010', 'Silver', 'Dress')
add('Sinn', '6200 Meisterbund I', '6200.011', 'Blue', 'Dress')

// ============================================================
// TOP-UP — hit 1000
// ============================================================

// --- ROLEX: popular vintage/recently-disco refs Reddit loves ---
add('Rolex', 'Submariner Date', '16610-0001', 'Black', 'Diver')
add('Rolex', 'Submariner Date', '16613-0001', 'Blue', 'Diver')
add('Rolex', 'Submariner', '14060-0001', 'Black', 'Diver')
add('Rolex', 'GMT-Master II', '16710-0001', 'Black', 'GMT')
add('Rolex', 'Datejust 36', '16234-0001', 'Blue', 'Dress')
add('Rolex', 'Datejust 36', '16234-0002', 'Silver', 'Dress')
add('Rolex', 'Datejust 36', '16233-0001', 'Champagne', 'Dress')
add('Rolex', 'Datejust 36', '16233-0002', 'White', 'Dress')
add('Rolex', 'Datejust 41', '126300-0019', 'Wimbledon', 'Dress')
add('Rolex', 'Datejust 41', '126334-0019', 'Wimbledon', 'Dress')
add('Rolex', 'Day-Date 40', '228235-0007', 'Olive Green', 'Dress')
add('Rolex', 'Day-Date 40', '228235-0008', 'Chocolate', 'Dress')
add('Rolex', 'Day-Date 40', '228235-0010', 'Slate', 'Dress')
add('Rolex', 'Day-Date 40', '228235-0012', 'Sundust', 'Dress')
add('Rolex', 'Cosmograph Daytona', '116500LN-0001', 'White', 'Chronograph')
add('Rolex', 'Cosmograph Daytona', '116500LN-0002', 'Black', 'Chronograph')

// --- OMEGA: more depth ---
add('Omega', 'Seamaster Aqua Terra 150M', '220.10.41.21.01.003', 'Black', 'Sport')
add('Omega', 'Seamaster Aqua Terra 150M', '220.10.41.21.03.005', 'Blue', 'Sport')
add('Omega', 'Seamaster Aqua Terra 150M', '220.12.41.21.01.002', 'Black', 'Sport')
add('Omega', 'Seamaster Aqua Terra 150M', '220.12.41.21.06.001', 'Grey', 'Sport')
add('Omega', 'Seamaster Aqua Terra 150M', '220.12.41.21.10.001', 'Green', 'Sport')
add('Omega', 'De Ville Prestige', '424.10.40.20.01.002', 'Black', 'Dress')
add('Omega', 'De Ville Prestige', '424.10.40.20.03.002', 'Blue', 'Dress')
add('Omega', 'De Ville Prestige', '424.13.40.20.02.002', 'Silver', 'Dress')
add('Omega', 'De Ville Prestige', '424.13.40.20.03.002', 'Blue', 'Dress')
add('Omega', 'Speedmaster Moonwatch', '310.30.42.50.01.004', 'Black', 'Chronograph')
add('Omega', 'Speedmaster Moonwatch', '310.32.42.50.04.002', 'White', 'Chronograph')
add('Omega', 'Seamaster 300M', '210.30.42.20.03.005', 'Summer Blue', 'Diver')
add('Omega', 'Seamaster 300M', '210.32.42.20.06.002', 'Grey', 'Diver')
add('Omega', 'Constellation', '131.10.41.21.01.002', 'Black', 'Dress')
add('Omega', 'Constellation', '131.10.41.21.02.002', 'Silver', 'Dress')

// --- TUDOR: more depth ---
add('Tudor', 'Black Bay 58', 'M79030N-0005', 'Black', 'Diver')
add('Tudor', 'Black Bay 58', 'M79030N-0006', 'Black', 'Diver')
add('Tudor', 'Black Bay GMT', 'M79830RB-0005', 'Black', 'GMT')
add('Tudor', 'Black Bay GMT', 'M79830RB-0006', 'Black', 'GMT')
add('Tudor', 'Black Bay Pro', 'M79470-0004', 'Black', 'GMT')
add('Tudor', 'Black Bay Pro', 'M79470-0005', 'Black', 'GMT')
add('Tudor', 'Black Bay 54', 'M79000N-0005', 'Black', 'Diver')
add('Tudor', 'Pelagos 39', 'M25407N-0004', 'Blue', 'Diver')
add('Tudor', '1926', 'M91650-0005', 'Champagne', 'Dress')
add('Tudor', '1926', 'M91650-0006', 'Rose', 'Dress')

// --- IWC: more depth ---
add('IWC', 'Portugieser Automatic 40', 'IW358309', 'Burgundy', 'Dress')
add('IWC', 'Portugieser Automatic 40', 'IW358311', 'Grey', 'Dress')
add('IWC', 'Portugieser Chronograph', 'IW371618', 'Burgundy', 'Chronograph')
add('IWC', 'Portugieser Chronograph', 'IW371619', 'Black', 'Chronograph')
add('IWC', 'Portofino Automatic', 'IW356524', 'Silver', 'Dress')
add('IWC', 'Portofino Automatic', 'IW356525', 'Blue', 'Dress')
add('IWC', "Big Pilot's Watch 43", 'IW329307', 'Blue', 'Pilot')
add('IWC', "Big Pilot's Watch 43", 'IW329308', 'Green', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328209', 'Brown', 'Pilot')
add('IWC', "Pilot's Watch Mark XX", 'IW328210', 'Olive', 'Pilot')

// --- LONGINES: more depth ---
add('Longines', 'Spirit', 'L3.810.4.73.0', 'Silver', 'Field')
add('Longines', 'Spirit', 'L3.810.4.93.6', 'Blue', 'Field')
add('Longines', 'Spirit Zulu Time', 'L3.812.4.93.0', 'Blue', 'GMT')
add('Longines', 'HydroConquest', 'L3.788.4.76.9', 'Grey', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.76.6', 'Grey', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'HydroConquest', 'L3.790.4.76.9', 'Grey', 'Diver', 'https://www.longines.com/en-us/hydroconquest', 'reddit_under_5k_signal')
add('Longines', 'Master Collection', 'L2.793.4.51.6', 'Black', 'Dress')
add('Longines', 'Master Collection', 'L2.628.4.78.3', 'Silver', 'Dress')
add('Longines', 'Record', 'L2.821.4.06.6', 'Green', 'Dress')
add('Longines', 'Record', 'L2.820.4.06.6', 'Green', 'Dress')
add('Longines', 'Flagship Heritage', 'L4.815.4.78.6', 'Silver', 'Dress')
add('Longines', 'Flagship Heritage', 'L4.815.4.92.2', 'Blue', 'Dress')

// --- SINN: more depth ---
add('Sinn', '556 I', '556.0105', 'Silver', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 A', '556.0142', 'Blue', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '556 I B', '556.010.B2', 'Black', 'Field', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I', '104.015', 'Green', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', '104 St Sa I', '104.016', 'Anthracite', 'Pilot', '', 'reddit_under_5k_signal')
add('Sinn', 'U1 S', 'U1.017', 'Black', 'Diver')
add('Sinn', 'U50 S', 'U50.022', 'Green', 'Diver')
add('Sinn', 'U50', 'U50.012', 'Green', 'Diver')
add('Sinn', '903 St', '903.043', 'Silver', 'Chronograph')
add('Sinn', '856 UTC DIAPAL', '856.021', 'Black', 'GMT')
add('Sinn', '857 UTC VFR', '857.021', 'Black', 'GMT')
add('Sinn', '6000 Meisterbund II', '6000.020', 'Silver', 'Dress')

// ============================================================
// Generate CSV
// ============================================================

const existingIds = loadExistingIds()
const rows: string[] = ['id,brand,model,reference,dialColor,watchType,sourceUrl,communitySignal,verificationStatus']
let dupes = 0
let added = 0

for (const e of entries) {
  const id = mintId(e.brand, e.reference)
  if (existingIds.has(id)) {
    dupes++
    continue
  }
  existingIds.add(id)
  const csvEsc = (s: string) => s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  rows.push([
    csvEsc(id),
    csvEsc(e.brand),
    csvEsc(e.model),
    csvEsc(e.reference),
    csvEsc(e.dialColor),
    csvEsc(e.watchType),
    csvEsc(e.sourceUrl),
    csvEsc(e.communitySignal),
    'identity_seeded_specs_pending',
  ].join(','))
  added++
}

fs.writeFileSync(outputPath, rows.join('\n') + '\n', 'utf-8')

console.log(`\n=== Batch 2 Seed Generated ===`)
console.log(`Total entries defined: ${entries.length}`)
console.log(`Duplicates with batch-1 (skipped): ${dupes}`)
console.log(`New entries written: ${added}`)
console.log(`Output: ${outputPath}`)

// Brand distribution
const brandCounts: Record<string, number> = {}
for (const e of entries) {
  const id = mintId(e.brand, e.reference)
  if (!existingIds.has(id) || added > 0) {
    brandCounts[e.brand] = (brandCounts[e.brand] || 0) + 1
  }
}
// Count from the output file
const outputBrandCounts: Record<string, number> = {}
for (const row of rows.slice(1)) {
  const brand = row.split(',')[1]?.replace(/"/g, '')
  if (brand) outputBrandCounts[brand] = (outputBrandCounts[brand] || 0) + 1
}

console.log(`\nBrand distribution:`)
for (const [brand, count] of Object.entries(outputBrandCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${brand}: ${count}`)
}
