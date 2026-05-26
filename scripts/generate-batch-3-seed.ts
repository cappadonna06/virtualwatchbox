/**
 * Generate catalog-seed-batch-3.csv — ~1000 mid-tier & entry-level watches.
 *
 * Focus: Reddit-popular affordable/mid-range brands, plus filling gaps in
 * existing luxury brand coverage. Emphasis on current-production models
 * that drive engagement on r/watches, r/watchexchange, r/JapaneseWatches.
 *
 * Usage: npx tsx scripts/generate-batch-3-seed.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'data', 'catalog-seed-batch-3.csv')

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
  for (const csvFile of [
    'data/catalog-batch-1.csv',
    'data/catalog-seed-batch-2.csv',
    'data/catalog-seed-200.csv',
    'data/catalog-seed-tier2.csv',
    'data/catalog-additions-batch-1.csv',
    'data/catalog-iconic-additions-batch-1.csv',
  ]) {
    const filePath = path.join(repoRoot, csvFile)
    if (!fs.existsSync(filePath)) continue
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
    for (const line of lines.slice(1)) {
      const id = line.split(',')[0]?.trim()?.replace(/"/g, '')
      if (id) ids.add(id)
    }
  }
  return ids
}

const entries: Entry[] = []

function add(brand: string, model: string, reference: string, dialColor: string, watchType: string, sourceUrl = '', communitySignal = 'reddit_popular') {
  entries.push({ brand, model, reference, dialColor, watchType, sourceUrl, communitySignal })
}

// ============================================================
// SEIKO — ~120 refs
// Reddit's most-discussed affordable brand. Filling: Turtle/PADI,
// King Seiko, more Alpinists, Presage/Cocktail, 5 Sports GMT,
// Prospex Speedtimer, newer SPB divers
// ============================================================

// Turtle / Save the Ocean / PADI
add('Seiko', 'Prospex Turtle', 'SRPE93', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle', 'SRPE95', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle', 'SRPE99', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle', 'SRP773', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle', 'SRP775', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle', 'SRP777', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle PADI', 'SRPE99K1', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Turtle PADI', 'SRPF77', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex King Turtle', 'SRPE03', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex King Turtle', 'SRPE05', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex King Turtle', 'SRPE07', 'Green', 'Diver', '', 'reddit_under_1k_signal')

// Alpinist family
add('Seiko', 'Prospex Alpinist', 'SPB117', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB119', 'Blue', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB121', 'Cream', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB157', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB159', 'Blue', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB199', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB201', 'Cream', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB209', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB211', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB213', 'Blue', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB241', 'Cream', 'Field', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Alpinist', 'SPB243', 'Green', 'Field', '', 'reddit_under_1k_signal')

// Presage / Cocktail Time
add('Seiko', 'Presage Cocktail Time', 'SRPB43', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPB77', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPE43', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPE45', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPE47', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPE49', 'Grey', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SSA346', 'Power Reserve', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SSA347', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged', 'SPB167', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged', 'SPB169', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged', 'SPB165', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged', 'SPB203', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged GMT', 'SPB221', 'White', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged GMT', 'SPB223', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Sharp Edged GMT', 'SPB225', 'Green', 'GMT', '', 'reddit_under_1k_signal')

// King Seiko
add('Seiko', 'King Seiko', 'SPB279', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB281', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB283', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB285', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB287', 'Brown', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB289', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SPB291', 'Champagne', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SDKS001', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SDKS003', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SDKS005', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'King Seiko', 'SDKS007', 'Green', 'Dress', '', 'reddit_under_1k_signal')

// Prospex 1965 Diver reissues (SPB series — Reddit favorites)
add('Seiko', 'Prospex 1965 Diver', 'SPB143J1', 'White', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB145', 'Grey', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB147', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB149', 'Green', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB239', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB313', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1965 Diver', 'SPB315', 'Cream', 'Diver', '', 'reddit_under_1k_signal')

// Prospex Captain Willard
add('Seiko', 'Prospex Captain Willard', 'SPB151J1', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Captain Willard', 'SPB153', 'Green', 'Diver', '', 'reddit_under_1k_signal')

// 5 Sports GMT (SSK series — hot on Reddit)
add('Seiko', '5 Sports GMT', 'SSK003', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK005', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK007', 'Red', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK009', 'Green', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK011', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK013', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK015', 'Red', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK017', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', '5 Sports GMT', 'SSK037', 'Cream', 'GMT', '', 'reddit_under_1k_signal')

// Prospex Speedtimer (Solar chrono — Reddit darling)
add('Seiko', 'Prospex Speedtimer', 'SSC813P1', 'White', 'Chronograph', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Speedtimer', 'SSC815', 'Black', 'Chronograph', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Speedtimer', 'SSC817', 'Blue', 'Chronograph', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Speedtimer', 'SSC819', 'Green', 'Chronograph', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Speedtimer Mechanical', 'SRQ035', 'White', 'Chronograph', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex Speedtimer Mechanical', 'SRQ037', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')

// More 5 Sports (field/sport variants)
add('Seiko', '5 Sports', 'SRPD63', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD65', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD67', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD69', 'Gold', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD71', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD73', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPD76', 'Grey', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports Field', 'SRPH29', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports Field', 'SRPH31', 'Green', 'Field', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports Field', 'SRPH33', 'Khaki', 'Field', '', 'reddit_under_500_signal')

// Prospex Sumo
add('Seiko', 'Prospex Sumo', 'SPB101', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Sumo', 'SPB103', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Sumo GMT', 'SPB367', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Sumo GMT', 'SPB369', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Sumo GMT', 'SPB371', 'Green', 'GMT', '', 'reddit_under_1k_signal')

// Prospex LX / Heritage
add('Seiko', 'Prospex LX', 'SNR029', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex', 'SLA037', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex', 'SLA039', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex', 'SLA049', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex', 'SLA051', 'Green', 'Diver', '', 'reddit_under_5k_signal')

// ============================================================
// CASIO / G-SHOCK — ~100 refs
// Only have DW-6900 variants. Missing EVERYTHING else.
// ============================================================

// GA-2100 CasiOak (single most discussed Casio on Reddit)
add('Casio', 'G-Shock CasiOak', 'GA-2100-1A1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-2100-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-2100-4A', 'Red', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-2100-7A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-2110SU-3A', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-B2100-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-B2100-1A1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-B2100-3A', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GAE-2100GC-7A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak Metal', 'GM-2100-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak Metal', 'GM-2100B-3A', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak Metal', 'GM-2100B-4A', 'Red', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak Full Metal', 'GM-B2100D-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak Full Metal', 'GM-B2100GD-5A', 'Rose Gold', 'Sport', '', 'reddit_under_500_signal')

// DW-5600 Square (the original, Reddit classic)
add('Casio', 'G-Shock Square', 'DW-5600E-1V', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square', 'DW-5600BB-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square', 'DW-5600SKE-7', 'Clear', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square', 'DW-5610SU-8', 'Grey', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square Solar', 'GW-M5610-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square Solar', 'GW-M5610U-1B', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square Positive Display', 'GW-M5610U-1', 'Black', 'Sport', '', 'reddit_under_500_signal')

// Full Metal (Reddit's premium G-Shock pick)
add('Casio', 'G-Shock Full Metal', 'GMW-B5000D-1', 'Silver', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Full Metal', 'GMW-B5000GD-1', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Full Metal', 'GMW-B5000GD-9', 'Gold', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Full Metal', 'GMW-B5000TVA-1', 'Black Titanium', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Full Metal', 'GMW-B5000TB-1', 'Black Titanium', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Full Metal', 'GMW-B5000CS-1', 'Laser Etched', 'Sport', '', 'reddit_under_1k_signal')

// GA-110 (classic big G-Shock)
add('Casio', 'G-Shock', 'GA-110-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-110-1B', 'Black/Blue', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-110GB-1A', 'Black/Gold', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-100-1A1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-100-1A4', 'Black/Red', 'Sport', '', 'reddit_under_500_signal')

// Mudmaster / Rangeman / Frogman
add('Casio', 'G-Shock Mudmaster', 'GWG-2000-1A1', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Mudmaster', 'GWG-2000-1A3', 'Green', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Rangeman', 'GW-9400-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Rangeman', 'GPR-H1000-1', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Frogman', 'GWF-A1000-1A', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Casio', 'G-Shock Frogman', 'GWF-A1000-1A4', 'Red', 'Diver', '', 'reddit_under_1k_signal')

// Gravitymaster
add('Casio', 'G-Shock Gravitymaster', 'GR-B200-1A', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Gravitymaster', 'GR-B300-1A', 'Black', 'Pilot', '', 'reddit_under_500_signal')

// Non-G-Shock Casio (huge Reddit nostalgia + everyday picks)
add('Casio', 'Classic', 'A158WA-1', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'A168WA-1', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'F-91W-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'AE-1200WH-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'CA-53W-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Duro', 'MDV-106-1A', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Casio', 'Duro', 'MDV-107-1A1', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Casio', 'Duro', 'MDV-107-1A3', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Casio', 'Edifice', 'EFR-S108D-1A', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Casio', 'Edifice', 'EFB-108D-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')

// Oceanus (premium Casio — Reddit niche but beloved)
add('Casio', 'Oceanus', 'OCW-T200S-1A', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'Oceanus', 'OCW-T200S-2A', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Casio', 'Oceanus Manta', 'OCW-S5000-1A', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Casio', 'Oceanus Manta', 'OCW-S6000-1A', 'Black', 'Sport', '', 'reddit_under_5k_signal')

// ============================================================
// ORIENT — ~50 refs (currently only 6!)
// ============================================================

// Bambino (Reddit's #1 dress watch recommendation under $200)
add('Orient', 'Bambino Version 1', 'RA-AC0M03S', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 1', 'RA-AC0M04Y', 'Champagne', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 2', 'FAC00004B0', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 2', 'FAC00005W0', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 2', 'FAC00009N0', 'Cream', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 2', 'RA-AC0M01S', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 3', 'FAC0000CA0', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 3', 'FAC0000DB0', 'Grey', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 4', 'FAC08001T0', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 4', 'FAC08002F0', 'Burgundy', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 5', 'RA-AC0018E', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 5', 'RA-AC0021L', 'Blue', 'Dress', '', 'reddit_under_500_signal')

// Ray / Mako (Reddit's budget diver picks)
add('Orient', 'Ray II', 'FAA02004B9', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Ray II', 'FAA02005D9', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Mako III', 'RA-AA0814R', 'Red', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Mako III', 'RA-AA0815L', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Mako III', 'RA-AA0810N', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Kamasu', 'RA-AA0003R19B', 'Red', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Kamasu', 'RA-AA0004E19A', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Kamasu', 'RA-AA0006L19B', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Triton', 'RA-EL0001B00B', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Triton', 'RA-EL0002L00B', 'Blue', 'Diver', '', 'reddit_under_500_signal')

// Defender / Field
add('Orient', 'Defender II', 'RA-AK0401L', 'Blue', 'Field', '', 'reddit_under_500_signal')
add('Orient', 'Defender II', 'RA-AK0403N', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Orient', 'Defender II', 'RA-AK0404B', 'Green', 'Field', '', 'reddit_under_500_signal')

// Orient Star
add('Orient', 'Orient Star Semi-Skeleton', 'RE-AT0002E00B', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star Semi-Skeleton', 'RE-AT0006L00B', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star Classic', 'RE-AY0107N', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star Classic', 'RE-AY0106S', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star M34 F8', 'RE-BX0002S', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star Diver', 'RE-AU0302L', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Orient', 'Orient Star Diver', 'RE-AU0302B', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// ============================================================
// CITIZEN — ~50 refs (currently only 6!)
// ============================================================

// Promaster Diver (Reddit's affordable diver champion)
add('Citizen', 'Promaster Diver', 'BN0150-28E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver', 'BN0151-17L', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver', 'BN0150-61E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver', 'BN0191-55L', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver', 'BN0227-09L', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver Titanium', 'BN0200-56E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver Mechanical', 'NB6021-17E', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Citizen', 'Promaster Diver Mechanical', 'NY0040-09E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver Mechanical', 'NY0086-16L', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver Mechanical', 'NY0100-50M', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver Mechanical', 'NY0120-01Z', 'Yellow', 'Diver', '', 'reddit_under_500_signal')

// Promaster Tough / Land
add('Citizen', 'Promaster Tough', 'BN0211-50E', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Land', 'BJ7100-23E', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Sky', 'CB5001-57E', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Skyhawk A-T', 'JY8078-01L', 'Blue', 'Pilot', '', 'reddit_under_1k_signal')

// Tsuyosa (Reddit's new affordable automatic pick)
add('Citizen', 'Tsuyosa', 'NJ0150-81Z', 'Yellow', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-81E', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-81X', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-81A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0154-80H', 'Salmon', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-56A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-56E', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa', 'NJ0150-56X', 'Green', 'Sport', '', 'reddit_under_500_signal')

// Series 8
add('Citizen', 'Series 8 870', 'NB6060-58L', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Citizen', 'Series 8 870', 'NB6060-58E', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Citizen', 'Series 8 880', 'NB6021-68E', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Citizen', 'Series 8 880', 'NB6021-68L', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Citizen', 'Series 8 GMT', 'NB6030-59L', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Citizen', 'Series 8 GMT', 'NB6030-59E', 'Black', 'GMT', '', 'reddit_under_1k_signal')

// Eco-Drive classics
add('Citizen', 'Eco-Drive Chandler', 'BM8180-03E', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Citizen', 'Eco-Drive Avion', 'AW1361-10H', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Citizen', 'Eco-Drive Corso', 'BM7330-67L', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Citizen', 'PCAT', 'CB5880-54L', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'PCAT', 'CB5880-54E', 'Black', 'Sport', '', 'reddit_under_500_signal')

// ============================================================
// HAMILTON — ~60 refs (have 52, filling gaps)
// ============================================================

// Khaki Field Mechanical (Reddit GOAT field watch)
add('Hamilton', 'Khaki Field Mechanical', 'H69439933', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Mechanical', 'H69439411', 'White', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Mechanical', 'H69409930', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Mechanical', 'H69529933', 'Black', 'Field', '', 'reddit_under_1k_signal')

// Khaki Field Auto (missing 38mm and 42mm variants)
add('Hamilton', 'Khaki Field Auto 38mm', 'H70455133', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Auto 38mm', 'H70455533', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Auto 38mm', 'H70455733', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Auto 38mm', 'H70455553', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Auto 42mm', 'H70605731', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Auto 42mm', 'H70605163', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Titanium Auto', 'H70545540', 'Green', 'Field', '', 'reddit_under_1k_signal')

// Khaki Aviation Converter
add('Hamilton', 'Khaki Aviation Converter', 'H76615130', 'Black', 'Pilot', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Aviation Converter', 'H76615530', 'Black', 'Pilot', '', 'reddit_under_1k_signal')

// Ventura (the Elvis watch — huge Reddit conversations)
add('Hamilton', 'Ventura', 'H24411232', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Ventura', 'H24401731', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Ventura Elvis80', 'H24585731', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Ventura XXL', 'H24615331', 'Black', 'Dress', '', 'reddit_under_1k_signal')

// Jazzmaster Open Heart
add('Hamilton', 'Jazzmaster Open Heart', 'H32215890', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Open Heart', 'H32705151', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Open Heart', 'H32705731', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Viewmatic', 'H32515555', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Viewmatic', 'H32515735', 'Blue', 'Dress', '', 'reddit_under_1k_signal')

// Intra-Matic Chrono (Panda — Reddit loves it)
add('Hamilton', 'Intra-Matic Auto Chrono', 'H38416711', 'White', 'Chronograph', '', 'reddit_under_5k_signal')
add('Hamilton', 'Intra-Matic Auto Chrono', 'H38416741', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')

// American Classic
add('Hamilton', 'American Classic PSR', 'H52414130', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Hamilton', 'American Classic PSR', 'H52434130', 'Gold', 'Sport', '', 'reddit_under_1k_signal')
add('Hamilton', 'Boulton', 'H13431553', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Boulton', 'H13431733', 'Black', 'Dress', '', 'reddit_under_1k_signal')

// Khaki Navy Scuba
add('Hamilton', 'Khaki Navy Scuba', 'H82505140', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Navy Scuba', 'H82505160', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Navy Scuba', 'H82515130', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// ============================================================
// TISSOT — ~60 refs (have 39, filling PRX auto + new lines)
// ============================================================

// PRX Powermatic 80 (the hot one)
add('Tissot', 'PRX Powermatic 80', 'T137.407.11.041.00', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'PRX Powermatic 80', 'T137.407.11.051.00', 'Green', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'PRX Powermatic 80', 'T137.407.11.091.01', 'Silver', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'PRX Powermatic 80', 'T137.407.11.091.00', 'Ice Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'PRX Powermatic 80', 'T137.407.16.041.00', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'PRX Powermatic 80', 'T137.407.36.041.00', 'Blue', 'Sport', '', 'reddit_under_1k_signal')

// PRX 35mm
add('Tissot', 'PRX 35mm', 'T137.210.11.041.00', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX 35mm', 'T137.210.11.091.00', 'Ice Blue', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX 35mm', 'T137.210.11.051.00', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX 35mm', 'T137.210.11.331.00', 'Black', 'Sport', '', 'reddit_under_500_signal')

// PRX Chronograph
add('Tissot', 'PRX Automatic Chronograph', 'T137.427.11.011.00', 'White', 'Chronograph', '', 'reddit_under_5k_signal')
add('Tissot', 'PRX Automatic Chronograph', 'T137.427.11.041.00', 'Blue', 'Chronograph', '', 'reddit_under_5k_signal')
add('Tissot', 'PRX Automatic Chronograph', 'T137.427.11.051.00', 'Green', 'Chronograph', '', 'reddit_under_5k_signal')
add('Tissot', 'PRX Automatic Chronograph', 'T137.427.11.091.00', 'Silver', 'Chronograph', '', 'reddit_under_5k_signal')

// Gentleman more
add('Tissot', 'Gentleman Powermatic 80 Silicium', 'T127.407.11.051.00', 'Green', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'Gentleman Powermatic 80 Silicium', 'T127.407.11.061.01', 'Grey', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'Gentleman Powermatic 80 Silicium', 'T127.407.16.031.01', 'Silver', 'Sport', '', 'reddit_under_1k_signal')
add('Tissot', 'Gentleman Powermatic 80 Silicium', 'T127.407.16.041.01', 'Blue', 'Sport', '', 'reddit_under_1k_signal')

// Seastar 2000
add('Tissot', 'Seastar 2000 Professional', 'T120.607.11.041.01', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Tissot', 'Seastar 2000 Professional', 'T120.607.17.441.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Tissot', 'Seastar 2000 Professional', 'T120.607.11.041.02', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// Visodate (Reddit dress watch classic)
add('Tissot', 'Visodate Powermatic 80', 'T118.430.11.271.00', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Tissot', 'Visodate Powermatic 80', 'T118.430.11.041.00', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Tissot', 'Visodate Powermatic 80', 'T118.430.16.271.00', 'Silver', 'Dress', '', 'reddit_under_1k_signal')

// Chemin des Tourelles
add('Tissot', 'Chemin des Tourelles', 'T099.407.11.048.00', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Tissot', 'Chemin des Tourelles', 'T099.407.11.058.00', 'Green', 'Dress', '', 'reddit_under_1k_signal')

// Super Sport Chrono
add('Tissot', 'Supersport Chrono', 'T125.617.11.031.00', 'White', 'Chronograph', '', 'reddit_under_500_signal')
add('Tissot', 'Supersport Chrono', 'T125.617.11.051.00', 'Green', 'Chronograph', '', 'reddit_under_500_signal')

// ============================================================
// TIMEX — ~45 refs (currently only 5!)
// ============================================================

// Q Timex (Reddit's favorite retro reissue)
add('Timex', 'Q Timex Reissue', 'TW2U61000', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex Reissue', 'TW2U61200', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex Reissue', 'TW2U61300', 'Black/Orange', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex Reissue', 'TW2V18500', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex GMT', 'TW2V38200', 'Black', 'GMT', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex Chronograph', 'TW2W51600', 'White', 'Chronograph', '', 'reddit_under_500_signal')
add('Timex', 'Q Timex Diver', 'TW2W42000', 'Black', 'Diver', '', 'reddit_under_500_signal')

// Marlin (Reddit dress pick under $300)
add('Timex', 'Marlin Automatic', 'TW2T22700', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Automatic', 'TW2T22900', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Automatic', 'TW2T23100', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Automatic', 'TW2U11800', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Automatic 40mm', 'TW2T23000', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Hand-Wound', 'TW2T22800', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Jet Automatic', 'TW2W49000', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Marlin Moon Phase', 'TW2W51200', 'White', 'Dress', '', 'reddit_under_500_signal')

// Waterbury
add('Timex', 'Waterbury Traditional', 'TW2R25100', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Traditional', 'TW2R25500', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Traditional Chronograph', 'TW2R38400', 'White', 'Chronograph', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Dive', 'TW2V49700', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Dive', 'TW2V49900', 'Blue', 'Diver', '', 'reddit_under_500_signal')

// Expedition
add('Timex', 'Expedition North Field Post Mechanical', 'TW2V41600', 'Green', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'Expedition North Field Solar', 'TW2V03600', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'Expedition North Field Solar', 'TW2V03800', 'Green', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'Expedition North Sierra', 'TW2V22800', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'Expedition Scout', 'TW4B04700', 'Black', 'Field', '', 'reddit_under_500_signal')

// Standard / Weekender / MK1
add('Timex', 'Standard', 'TW2T20100', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Timex', 'Standard', 'TW2T20200', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Timex', 'Weekender', 'TW2P97700', 'White', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'MK1', 'TW2R68000', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Timex', 'MK1 Mechanical', 'TW2W92400', 'Black', 'Field', '', 'reddit_under_500_signal')

// American Documents
add('Timex', 'American Documents', 'TW2R30500', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'American Documents', 'TW2R30600', 'Blue', 'Dress', '', 'reddit_under_500_signal')

// Giorgio Galli
add('Timex', 'Giorgio Galli S2', '?"TW2W43900', 'Blue', 'Dress', '', 'reddit_under_1k_signal')

// ============================================================
// TAG HEUER — ~40 refs (have 16, major gap on Monaco + Aquaracer)
// ============================================================

// Monaco (MASSIVE Reddit gap)
add('TAG Heuer', 'Monaco', 'CBL2111.BA0644', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco', 'CBL2111.FC6453', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco', 'CBL2113.BA0644', 'Green', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco', 'CBL2113.FC6177', 'Green', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco', 'CBL2180.FC6497', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco', 'WW2110.FT6005', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')

// Aquaracer 200 (new gen)
add('TAG Heuer', 'Aquaracer Professional 200', 'WBP1110.BA0627', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 200', 'WBP1111.BA0627', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 200', 'WBP1112.BA0627', 'Green', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 200', 'WBP1113.BA0627', 'Silver', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 300', 'WBP201A.BA0632', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 300', 'WBP201B.BA0632', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 300 GMT', 'WBP2010.BA0632', 'Black', 'GMT', '', 'reddit_under_5k_signal')

// Carrera — filling newer refs
add('TAG Heuer', 'Carrera Chronograph', 'CBS2210.BA0637', 'White', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Chronograph', 'CBS2210.FC6534', 'White', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Chronograph', 'CBS2212.BA0637', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Date', 'WBN2110.BA0639', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Carrera Date', 'WBN2112.BA0639', 'Blue', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Carrera Date', 'WBN2113.BA0639', 'Green', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Carrera Chronograph', 'CBN2A10.BA0643', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Chronograph', 'CBN2A1B.BA0643', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')

// Formula 1 (entry TAG)
add('TAG Heuer', 'Formula 1', 'WAZ1110.BA0875', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Formula 1', 'WAZ1110.FT8023', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Formula 1 Chronograph', 'CAZ1011.BA0842', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Formula 1 Chronograph', 'CAZ1014.BA0842', 'Blue', 'Chronograph', '', 'reddit_under_5k_signal')

// ============================================================
// SHINOLA — ~20 refs (currently 0!)
// ============================================================

add('Shinola', 'Runwell 41mm', 'S0120089902', 'Blue', 'Dress', '', 'reddit_popular')
add('Shinola', 'Runwell 41mm', 'S0120089903', 'White', 'Dress', '', 'reddit_popular')
add('Shinola', 'Runwell 41mm', 'S0120089904', 'Black', 'Dress', '', 'reddit_popular')
add('Shinola', 'Runwell 47mm', 'S0120089899', 'Black', 'Dress', '', 'reddit_popular')
add('Shinola', 'Runwell Automatic', 'S0120161942', 'Blue', 'Dress', '', 'reddit_popular')
add('Shinola', 'Runwell Automatic', 'S0120161944', 'Green', 'Dress', '', 'reddit_popular')
add('Shinola', 'Birdy 34mm', 'S0120089885', 'White', 'Dress', '', 'reddit_popular')
add('Shinola', 'Birdy 34mm', 'S0120089886', 'Blue', 'Dress', '', 'reddit_popular')
add('Shinola', 'Detrola 43mm', 'S0120161963', 'White', 'Sport', '', 'reddit_popular')
add('Shinola', 'Detrola 43mm', 'S0120161964', 'Black', 'Sport', '', 'reddit_popular')
add('Shinola', 'Monster 43mm', 'S0120109235', 'Black', 'Diver', '', 'reddit_popular')
add('Shinola', 'Monster 43mm', 'S0120109236', 'Blue', 'Diver', '', 'reddit_popular')
add('Shinola', 'Duck 42mm', 'S0120194487', 'Green', 'Diver', '', 'reddit_popular')
add('Shinola', 'Duck 42mm', 'S0120194488', 'Blue', 'Diver', '', 'reddit_popular')
add('Shinola', 'Canfield Sport 45mm', 'S0120141499', 'Blue', 'Chronograph', '', 'reddit_popular')
add('Shinola', 'Canfield Sport 40mm', 'S0120141501', 'Black', 'Sport', '', 'reddit_popular')
add('Shinola', 'Lake Erie Monster Automatic', 'S0120183137', 'Blue', 'Diver', '', 'reddit_popular')
add('Shinola', 'Lake Erie Monster Automatic', 'S0120183140', 'Green', 'Diver', '', 'reddit_popular')

// ============================================================
// JUNGHANS — ~15 refs (currently 0!)
// Reddit loves Max Bill for Bauhaus minimalism
// ============================================================

add('Junghans', 'Max Bill Automatic', '027/3400.04', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Max Bill Automatic', '027/3401.04', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Max Bill Automatic', '027/4002.46', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Max Bill Hand-Wound', '027/3700.04', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Max Bill Hand-Wound', '027/3701.04', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Max Bill Chronoscope', '027/4600.04', 'Silver', 'Chronograph', '', 'reddit_under_5k_signal')
add('Junghans', 'Max Bill Chronoscope', '027/4601.04', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')
add('Junghans', 'Meister Handaufzug', '027/3200.04', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Junghans', 'Meister Chronoscope', '027/4324.47', 'Silver', 'Chronograph', '', 'reddit_under_5k_signal')
add('Junghans', 'Form A', '027/4734.00', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Junghans', 'Form A', '027/4731.00', 'Black', 'Dress', '', 'reddit_under_1k_signal')

// ============================================================
// MARATHON — ~12 refs (currently 0! military Reddit favorite)
// ============================================================

add('Marathon', 'GSAR Automatic', 'WW194006', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Marathon', 'GSAR Automatic', 'WW194006-BRACE', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Marathon', 'MSAR Automatic', 'WW194013', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Marathon', 'TSAR Quartz', 'WW194007', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Marathon', 'GPM Field', 'WW194003', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Marathon', 'GPM Field', 'WW194003-SG', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Marathon', 'Navigator', 'WW194001', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Marathon', 'Navigator Date', 'WW194013NH', 'Black', 'Pilot', '', 'reddit_under_500_signal')
add('Marathon', 'General Purpose Quartz', 'WW194009', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Marathon', 'General Purpose Mechanical', 'WW194003SS', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Marathon', 'CSAR Automatic', 'WW194014', 'Black', 'Pilot', '', 'reddit_under_1k_signal')

// ============================================================
// DAN HENRY — ~10 refs (currently 0! Reddit microbrand darling)
// ============================================================

add('Dan Henry', '1962 Racing Chronograph', '1962-PANDA', 'White', 'Chronograph', '', 'reddit_under_500_signal')
add('Dan Henry', '1962 Racing Chronograph', '1962-EVIL-PANDA', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Dan Henry', '1964 Gran Turismo Chrono', '1964-BLACK', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Dan Henry', '1964 Gran Turismo Chrono', '1964-SILVER', 'Silver', 'Chronograph', '', 'reddit_under_500_signal')
add('Dan Henry', '1970 Automatic Diver', '1970-44-ORANGE', 'Orange', 'Diver', '', 'reddit_under_500_signal')
add('Dan Henry', '1970 Automatic Diver', '1970-40-BLUE', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Dan Henry', '1972 Chrono-Diver', '1972-BLUE', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Dan Henry', '1937 Dress', '1937-SILVER', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Dan Henry', '1939 Military Chrono', '1939-BLACK', 'Black', 'Chronograph', '', 'reddit_under_500_signal')

// ============================================================
// GLYCINE — ~10 refs (currently 0! Reddit r/watchexchange regular)
// ============================================================

add('Glycine', 'Combat Sub', 'GL0083', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Glycine', 'Combat Sub', 'GL0085', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Glycine', 'Combat Sub', 'GL0087', 'Green', 'Diver', '', 'reddit_under_1k_signal')
add('Glycine', 'Combat Sub Vintage', 'GL0260', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Glycine', 'Airman', 'GL0060', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Glycine', 'Airman', 'GL0062', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Glycine', 'Airman Vintage', 'GL0305', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Glycine', 'Airman 44', 'GL0067', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Glycine', 'Combat Classic', 'GL0100', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Glycine', 'Combat Classic', 'GL0102', 'Blue', 'Dress', '', 'reddit_under_1k_signal')

// ============================================================
// SQUALE — ~10 refs (currently 0! Reddit diver favorite)
// ============================================================

add('Squale', '1521', '1521-026-A', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', '1521', '1521-026-M', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', '1521 Black', '1521-026-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', '1521 Ocean', '1521-026-OCN', 'Teal', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', 'Matic 60 ATM', 'MATICXSA', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', 'Matic 60 ATM', 'MATICXSG', 'Grey', 'Diver', '', 'reddit_under_1k_signal')
add('Squale', '1545', '1545-BKG', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Squale', '1545', '1545-BLU', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Squale', 'Sub-39 GMT', 'SUB39GMT-CEL', 'Blue', 'GMT', '', 'reddit_under_1k_signal')

// ============================================================
// CHRISTOPHER WARD — ~15 refs (have 4, Reddit's favorite "affordable luxury")
// ============================================================

add('Christopher Ward', 'C60 Sealander Automatic', 'C60-40ADA3-S0KK0-RK', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C60 Sealander Automatic', 'C60-40ADA3-S0BK0-B0', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C60 Sealander GMT', 'C60-40AGM3-S0KK0-RK', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C60 Sealander GMT', 'C60-40AGM3-S0BK0-B0', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C63 Sealander Automatic', 'C63-39ADA3-S0BB1-HB', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C63 Sealander Automatic', 'C63-39ADA3-S0BK1-HB', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C63 Sealander Automatic', 'C63-39ADA3-S0WH1-HB', 'White', 'Sport', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C63 Sealander GMT', 'C63-39AGM3-S0BK1-VB', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C1 Moonglow', 'C1-42AMP1-S0KK0-1S', 'Blue', 'Dress', '', 'reddit_under_5k_signal')
add('Christopher Ward', 'C65 Aquitaine', 'C65-38ADA3-S0KK0-VK', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C65 Aquitaine', 'C65-38ADA3-S0BK0-VK', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// ============================================================
// BULOVA — ~15 refs (have 3, Lunar Pilot is Reddit famous)
// ============================================================

add('Bulova', 'Lunar Pilot', '96A225', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Bulova', 'Lunar Pilot', '96B258', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Bulova', 'Precisionist', '96B158', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Precisionist', '96B159', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Surveyor', '96B385', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Surveyor', '96B386', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Archive Series Surfboard', '98A252', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Bulova', 'Archive Series Parking Meter', '98A253', 'White', 'Chronograph', '', 'reddit_under_500_signal')
add('Bulova', 'Devil Diver', '98B320', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Bulova', 'Devil Diver', '98B322', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Bulova', 'Oceanographer', '96B405', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Bulova', 'Oceanographer', '96B406', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Bulova', 'Hack', '98A255', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Bulova', 'Hack', '98A257', 'Green', 'Field', '', 'reddit_under_500_signal')

// ============================================================
// FREDERIQUE CONSTANT — ~10 refs (currently 0!)
// ============================================================

add('Frederique Constant', 'Classics Index Automatic', 'FC-303S5B6', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Frederique Constant', 'Classics Index Automatic', 'FC-303NB5B6', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Frederique Constant', 'Classics Heart Beat', 'FC-310MS5B6', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Frederique Constant', 'Classics Heart Beat', 'FC-310NB5B6', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Frederique Constant', 'Highlife Automatic', 'FC-303S4NH6B', 'Silver', 'Sport', '', 'reddit_under_5k_signal')
add('Frederique Constant', 'Highlife Automatic', 'FC-303B4NH6B', 'Blue', 'Sport', '', 'reddit_under_5k_signal')
add('Frederique Constant', 'Highlife COSC', 'FC-303S3NH6', 'Silver', 'Sport', '', 'reddit_under_5k_signal')
add('Frederique Constant', 'Slimline Moonphase', 'FC-705S4S6', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Frederique Constant', 'Slimline Moonphase', 'FC-705N4S6', 'Blue', 'Dress', '', 'reddit_under_5k_signal')

// ============================================================
// CERTINA — ~10 refs (currently 0! Swatch Group mid-tier)
// ============================================================

add('Certina', 'DS Action Diver', 'C032.407.11.051.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS Action Diver', 'C032.407.11.041.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS Action Diver', 'C032.407.17.051.60', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS-1 Powermatic 80', 'C029.807.11.031.02', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Certina', 'DS-1 Powermatic 80', 'C029.807.11.041.02', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Certina', 'DS PH200M', 'C036.407.11.050.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS PH200M', 'C036.407.11.040.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS Action GMT', 'C032.429.11.051.00', 'Black', 'GMT', '', 'reddit_under_1k_signal')

// ============================================================
// GRAND SEIKO — ~20 refs (filling gaps in current lineup)
// ============================================================

add('Grand Seiko', 'Heritage Hi-Beat', 'SBGH271', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage Hi-Beat', 'SBGH267', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage Hi-Beat', 'SBGH269', 'White', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage Hi-Beat', 'SBGH273', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Hi-Beat', 'SLGH009', 'Green', 'Sport', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Hi-Beat', 'SLGH013', 'White', 'Sport', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive', 'SLGA007', 'Blue', 'Sport', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive', 'SLGA009', 'Green', 'Sport', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive GMT', 'SBGE275', 'Black', 'GMT', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive GMT', 'SBGE279', 'Green', 'GMT', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Spring Drive', 'SBGA403', 'Black', 'Diver', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Spring Drive', 'SBGA463', 'Blue', 'Diver', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Quartz GMT', 'SBGN003', 'Black', 'GMT', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Sport Quartz GMT', 'SBGN005', 'Blue', 'GMT', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Heritage Spring Drive', 'SBGA415', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage 9F Quartz', 'SBGX259', 'White', 'Dress', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Heritage 9F Quartz', 'SBGX263', 'Black', 'Dress', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Elegance Mechanical', 'SBGW253', 'White', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Elegance Mechanical', 'SBGW283', 'White', 'Dress', '', 'reddit_under_10k_signal')

// ============================================================
// ORIS — ~20 refs (filling Aquis Date, Big Crown Pointer Date)
// ============================================================

// Aquis Date 39.5mm (newer smaller size, Reddit approved)
add('Oris', 'Aquis Date 39.5mm', '01 733 7732 4135-07 4 21 63FC', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Date 39.5mm', '01 733 7732 4155-07 4 21 63FC', 'Green', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Date 39.5mm', '01 733 7732 4154-07 4 21 63FC', 'Black', 'Diver', '', 'reddit_under_5k_signal')

// Aquis Date 41.5mm calibre 400
add('Oris', 'Aquis Date Calibre 400', '01 400 7769 4154-07 8 22 09PEB', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Date Calibre 400', '01 400 7769 4135-07 8 22 09PEB', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Date Calibre 400', '01 400 7769 4157-07 8 22 09PEB', 'Green', 'Diver', '', 'reddit_under_5k_signal')

// Big Crown Pointer Date (classic, Reddit loves it)
add('Oris', 'Big Crown Pointer Date', '01 754 7741 4065-07 5 20 63', 'Blue', 'Field', '', 'reddit_under_5k_signal')
add('Oris', 'Big Crown Pointer Date', '01 754 7741 4065-07 8 20 22', 'Blue', 'Field', '', 'reddit_under_5k_signal')
add('Oris', 'Big Crown Pointer Date', '01 754 7741 4065-07 5 20 64', 'Blue', 'Field', '', 'reddit_under_5k_signal')

// Divers 65 12H (newer calibre 400)
add('Oris', 'Divers 65 12H Calibre 400', '01 400 7774 4084-Set', 'Bronze', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Divers 65 12H Calibre 400', '01 400 7774 4054-07 5 20 82', 'Black', 'Diver', '', 'reddit_under_5k_signal')

// Roberto Clemente (Reddit limited edition darling)
add('Oris', 'Roberto Clemente Limited Edition', '01 733 7730 4081-Set', 'Yellow', 'Diver', '', 'reddit_under_5k_signal')

// ProPilot Big Crown
add('Oris', 'ProPilot X Calibre 400', '01 400 7778 7153-07 7 20 01', 'Titanium Grey', 'Pilot', '', 'reddit_under_5k_signal')
add('Oris', 'ProPilot X Calibre 400', '01 400 7778 7153-07 8 20 01', 'Titanium Grey', 'Pilot', '', 'reddit_under_5k_signal')

// ============================================================
// BREITLING — ~15 refs (filling Navitimer 41, SuperOcean Heritage)
// ============================================================

// Navitimer 41 (smaller size, Reddit approved)
add('Breitling', 'Navitimer Automatic 41', 'A17326211C1P1', 'Blue', 'Pilot', '', 'reddit_under_10k_signal')
add('Breitling', 'Navitimer Automatic 41', 'A17326211B1P1', 'Black', 'Pilot', '', 'reddit_under_10k_signal')
add('Breitling', 'Navitimer Automatic 41', 'A17326211G1P1', 'Green', 'Pilot', '', 'reddit_under_10k_signal')
add('Breitling', 'Navitimer B01 Chronograph 43', 'AB0138211B1A1', 'Black', 'Pilot', '', 'reddit_under_10k_signal')
add('Breitling', 'Navitimer B01 Chronograph 43', 'AB0138241C1A1', 'Blue', 'Pilot', '', 'reddit_under_10k_signal')

// Superocean Heritage (Reddit dressy diver pick)
add('Breitling', 'Superocean Heritage 57', 'A10370121B1A1', 'Black', 'Diver', '', 'reddit_under_10k_signal')
add('Breitling', 'Superocean Heritage 57', 'A10370121C1A1', 'Blue', 'Diver', '', 'reddit_under_10k_signal')
add('Breitling', 'Superocean Heritage B20 42', 'AB2030161C1A1', 'Blue', 'Diver', '', 'reddit_under_10k_signal')
add('Breitling', 'Superocean Heritage B20 42', 'AB2030121B1A1', 'Black', 'Diver', '', 'reddit_under_10k_signal')

// Premier (dress line)
add('Breitling', 'Premier Automatic 40', 'A37340351B1P1', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Breitling', 'Premier Automatic 40', 'A37340351G1P1', 'Green', 'Dress', '', 'reddit_under_10k_signal')
add('Breitling', 'Premier B01 Chronograph 42', 'AB0118A11B1P1', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')

// Avenger Automatic 42
add('Breitling', 'Avenger Automatic 42', 'A17328101B1X1', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Breitling', 'Avenger Automatic 42', 'A17328101C1X1', 'Blue', 'Sport', '', 'reddit_under_5k_signal')

// ============================================================
// MISC Reddit favorites — filling remaining slots
// ============================================================

// Mondaine (Swiss Railway, Reddit minimalist pick)
add('Mondaine', 'Classic', 'A660.30360.11SBB', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Mondaine', 'Classic', 'A660.30360.16SBB', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Mondaine', 'Evo2', 'MSE.40110.LB', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Mondaine', 'Evo2', 'MSE.40110.LC', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Mondaine', 'Stop2Go', 'MST.4101B.LB', 'White', 'Dress', '', 'reddit_under_500_signal')

// Luminox (Navy SEAL, Reddit tactical pick)
add('Luminox', 'Original Navy SEAL', 'XS.3001.EVO', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Luminox', 'Original Navy SEAL', 'XS.3001.BO', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Luminox', 'Master Carbon SEAL', 'XS.3801.C', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Luminox', 'Bear Grylls Survival', 'XB.3741', 'Black', 'Field', '', 'reddit_under_500_signal')

// Alpina (Reddit affordable Swiss sport)
add('Alpina', 'Startimer Pilot Automatic', 'AL-525S4S6', 'Blue', 'Pilot', '', 'reddit_under_1k_signal')
add('Alpina', 'Startimer Pilot Automatic', 'AL-525B4S6', 'Black', 'Pilot', '', 'reddit_under_1k_signal')
add('Alpina', 'Seastrong Diver 300', 'AL-525LBN4V6', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Alpina', 'Seastrong Diver 300', 'AL-525LBN4V6B', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// Rado (Reddit HyperChrome / Captain Cook fan)
add('Rado', 'Captain Cook', 'R32504153', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Rado', 'Captain Cook', 'R32505203', 'Brown', 'Diver', '', 'reddit_under_5k_signal')
add('Rado', 'Captain Cook', 'R32105153', 'Green', 'Diver', '', 'reddit_under_5k_signal')
add('Rado', 'Captain Cook', 'R32105203', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Rado', 'Captain Cook High-Tech Ceramic', 'R32127162', 'Green', 'Diver', '', 'reddit_under_5k_signal')
add('Rado', 'True Square', 'R27073152', 'Green', 'Dress', '', 'reddit_under_5k_signal')

// Maurice Lacroix (Aikon — Reddit "affordable Gerald Genta")
add('Maurice Lacroix', 'Aikon Automatic', 'AI6008-SS002-130-1', 'Blue', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Maurice Lacroix', 'Aikon Automatic', 'AI6008-SS002-430-1', 'Green', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Maurice Lacroix', 'Aikon Automatic', 'AI6008-SS002-330-1', 'Black', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Maurice Lacroix', 'Aikon Automatic', 'AI6007-SS002-130-1', 'Blue', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Maurice Lacroix', 'Aikon Venturer', 'AI6058-SS002-430-1', 'Green', 'Integrated Bracelet', '', 'reddit_under_5k_signal')

// ============================================================
// EXPANSION PASS — fill to ~1000
// ============================================================

// --- MORE SEIKO ---

// Prospex Willard / Samurai
add('Seiko', 'Prospex Samurai', 'SRPE35', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Samurai', 'SRPE37', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Samurai', 'SRPE39', 'Blue PADI', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Samurai', 'SRPF79', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// Seiko 5 Sport (SNXS — discontinued mod platform legends)
add('Seiko', '5', 'SNXS73', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNXS75', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNXS77', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNXS79', 'Gold', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK789', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK793', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK795', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK805', 'Green', 'Field', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK807', 'Blue', 'Field', '', 'reddit_under_500_signal')
add('Seiko', '5', 'SNK809', 'Black', 'Field', '', 'reddit_under_500_signal')

// Seiko Prospex 1968 reinterpretations
add('Seiko', 'Prospex 1968 Diver', 'SPB185', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex 1968 Diver', 'SPB187', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// Seiko Prospex Solar Tuna
add('Seiko', 'Prospex Solar Tuna', 'SNE497', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Tuna', 'SNE498', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Tuna', 'SNE541', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Tuna', 'SNE577', 'Black', 'Diver', '', 'reddit_under_500_signal')

// Presage more
add('Seiko', 'Presage Cocktail Time', 'SRPB44', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPB46', 'Brown', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Cocktail Time', 'SRPD37', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage', 'SSA343', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage', 'SSA345', 'White', 'Dress', '', 'reddit_under_1k_signal')

// SARB remaining legends
add('Seiko', 'Alpinist', 'SARB017', 'Green', 'Field', '', 'reddit_under_1k_signal')

// --- MORE CASIO ---

// G-Shock GBD Move series
add('Casio', 'G-Shock Move', 'GBD-200-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Move', 'GBD-200-2', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Move', 'GBD-200-9', 'Yellow', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Move', 'GBD-100-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')

// G-Shock GST G-Steel
add('Casio', 'G-Shock G-Steel', 'GST-B400-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock G-Steel', 'GST-B400D-1A', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock G-Steel', 'GST-B300-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock G-Steel', 'GST-B300SD-1A', 'Silver', 'Sport', '', 'reddit_under_500_signal')

// GW-5000 (premium square)
add('Casio', 'G-Shock Square', 'GW-5000U-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square', 'GW-5000-1JF', 'Black', 'Sport', '', 'reddit_under_500_signal')

// GA-2100 more colors
add('Casio', 'G-Shock CasiOak', 'GA-2100-2A', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock CasiOak', 'GA-2100SU-1A', 'Black/Green', 'Sport', '', 'reddit_under_500_signal')

// Pro Trek
add('Casio', 'Pro Trek', 'PRW-6900Y-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Pro Trek', 'PRW-6900YL-5', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Pro Trek', 'PRW-61-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')

// --- MORE HAMILTON ---

// Khaki Field Expedition
add('Hamilton', 'Khaki Field Expedition Auto', 'H72515130', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Expedition Auto', 'H72515135', 'Green', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Expedition Auto', 'H72515530', 'Black', 'Field', '', 'reddit_under_1k_signal')

// Jazzmaster Performer
add('Hamilton', 'Jazzmaster Performer Auto', 'H36215140', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Performer Auto', 'H36215130', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Performer Auto', 'H36215110', 'Silver', 'Sport', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Performer Auto Chrono', 'H36616130', 'Blue', 'Chronograph', '', 'reddit_under_5k_signal')
add('Hamilton', 'Jazzmaster Performer Auto Chrono', 'H36616530', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')

// Khaki Aviation Pilot Pioneer
add('Hamilton', 'Khaki Aviation Pilot Pioneer', 'H76235131', 'Black', 'Pilot', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Aviation Pilot Pioneer', 'H76235530', 'Black', 'Pilot', '', 'reddit_under_1k_signal')

// Khaki Navy Frogman
add('Hamilton', 'Khaki Navy Frogman Auto', 'H77455330', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Navy Frogman Auto', 'H77455360', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// --- MORE TISSOT ---

// PRX Quartz 40mm (most popular entry)
add('Tissot', 'PRX Quartz', 'T137.410.11.031.00', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Quartz', 'T137.410.11.041.00', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Quartz', 'T137.410.11.051.00', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Quartz', 'T137.410.11.091.00', 'Ice Blue', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Quartz', 'T137.410.11.051.01', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Quartz', 'T137.410.33.041.00', 'Blue', 'Sport', '', 'reddit_under_500_signal')

// Seastar 1000 Powermatic 80
add('Tissot', 'Seastar 1000 Powermatic 80', 'T120.407.11.041.03', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Tissot', 'Seastar 1000 Powermatic 80', 'T120.407.11.051.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Tissot', 'Seastar 1000 Powermatic 80', 'T120.407.11.041.02', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Tissot', 'Seastar 1000 Powermatic 80', 'T120.407.17.041.01', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// Gentleman Open Heart
add('Tissot', 'Gentleman Powermatic 80 Open Heart', 'T127.407.11.031.02', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Tissot', 'Gentleman Powermatic 80 Open Heart', 'T127.407.11.041.02', 'Blue', 'Dress', '', 'reddit_under_1k_signal')

// Heritage
add('Tissot', 'Heritage Visodate Quartz', 'T118.410.11.277.00', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Tissot', 'Heritage Visodate Quartz', 'T118.410.11.047.00', 'Blue', 'Dress', '', 'reddit_under_500_signal')

// Ballade (COSC)
add('Tissot', 'Ballade Powermatic 80 COSC', 'T108.408.22.037.00', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Tissot', 'Ballade Powermatic 80 COSC', 'T108.408.16.037.00', 'Silver', 'Dress', '', 'reddit_under_1k_signal')

// --- MORE ORIENT ---

// Open Heart
add('Orient', 'Bambino Open Heart', 'RA-AG0005L', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Open Heart', 'RA-AG0004B', 'Black', 'Dress', '', 'reddit_under_500_signal')

// Sun & Moon
add('Orient', 'Sun & Moon', 'RA-AK0803Y', 'Champagne', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Sun & Moon', 'RA-AK0804Y', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Sun & Moon', 'RA-AK0010B', 'Black', 'Dress', '', 'reddit_under_500_signal')

// More Mako/Ray
add('Orient', 'Mako II', 'FAA02001B9', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Mako II', 'FAA02002D9', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Orient', 'Ray Raven', 'FAA02003B9', 'Black', 'Diver', '', 'reddit_under_500_signal')

// --- MORE CITIZEN ---

// Promaster Tough
add('Citizen', 'Promaster Tough', 'BN0211-09E', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Tough', 'BN0211-50E', 'Black', 'Field', '', 'reddit_under_500_signal')

// Eco-Drive more
add('Citizen', 'Eco-Drive Paradigm', 'AW1550-50E', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Eco-Drive One', 'AR5000-50E', 'Black', 'Dress', '', 'reddit_under_5k_signal')
add('Citizen', 'Eco-Drive Stiletto', 'AR3070-55L', 'Blue', 'Dress', '', 'reddit_under_500_signal')

// --- MORE GRAND SEIKO ---

add('Grand Seiko', 'Heritage Automatic', 'SBGR317', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Heritage Automatic', 'SBGR315', 'Black', 'Dress', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Heritage Spring Drive', 'SBGA283', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Automatic GMT', 'SBGM235', 'Black', 'GMT', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Automatic GMT', 'SBGM237', 'Green', 'GMT', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Hi-Beat Diver', 'SBGH289', 'Black', 'Diver', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Sport Hi-Beat Diver', 'SBGH291', 'Green', 'Diver', '', 'reddit_under_10k_signal')

// --- MORE ORIS ---

add('Oris', 'Aquis Date 43.5mm', '01 733 7730 4159-07 8 24 05PEB', 'Grey', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis GMT Date', '01 798 7754 4175-Set MB', 'Green', 'GMT', '', 'reddit_under_5k_signal')
add('Oris', 'Big Crown ProPilot Big Date', '01 751 7761 4065-07 3 20 03LC', 'Black', 'Pilot', '', 'reddit_under_5k_signal')
add('Oris', 'Big Crown ProPilot Big Date', '01 751 7761 4164-07 8 20 08', 'Blue', 'Pilot', '', 'reddit_under_5k_signal')
add('Oris', 'Divers 65 38mm', '01 733 7707 4354-07 5 20 45', 'Blue', 'Diver', '', 'reddit_under_5k_signal')

// --- MORE MIDO ---

add('Mido', 'Ocean Star GMT', 'M026.829.11.041.00', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star GMT', 'M026.829.11.051.00', 'Black', 'GMT', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star Decompression Timer 1961', 'M026.807.11.031.00', 'Turquoise', 'Diver', '', 'reddit_under_5k_signal')
add('Mido', 'Ocean Star 39', 'M042.430.11.041.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star 39', 'M042.430.11.051.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star 600 Chronometer', 'M026.608.11.041.01', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Mido', 'Baroncelli Heritage', 'M027.407.11.010.00', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Baroncelli Heritage', 'M027.407.16.010.00', 'White', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Baroncelli Chronometer Silicon', 'M027.408.16.018.00', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Multifort Patrimony', 'M040.407.16.040.00', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Mido', 'Multifort Patrimony', 'M040.407.16.060.00', 'Green', 'Sport', '', 'reddit_under_1k_signal')
add('Mido', 'Multifort TV Big Date', 'M049.526.11.091.00', 'Grey', 'Sport', '', 'reddit_under_1k_signal')
add('Mido', 'Multifort TV Big Date', 'M049.526.11.041.00', 'Blue', 'Sport', '', 'reddit_under_1k_signal')

// --- MORE MICROBRANDS ---

// Baltic more
add('Baltic', 'Aquascaphe Titanium', 'AQUASCAPHE-TI-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Baltic', 'Aquascaphe Dual Crown', 'AQUASCAPHE-DC-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Baltic', 'MR01 Micro-Rotor', 'MR01-SILVER', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Baltic', 'MR01 Micro-Rotor', 'MR01-BLUE', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Baltic', 'Tricompax 001', 'TRICOMPAX-001', 'Silver', 'Chronograph', '', 'reddit_under_1k_signal')
add('Baltic', 'Aquascaphe MK2', 'AQUASCAPHE-MK2-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Baltic', 'Aquascaphe MK2', 'AQUASCAPHE-MK2-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// Lorier more
add('Lorier', 'Neptune V', 'NEPTUNE-V-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Lorier', 'Neptune V', 'NEPTUNE-V-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Lorier', 'Hyperion GMT', 'HYPERION-GMT-BLU', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Lorier', 'Hydra II', 'HYDRA-II-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Lorier', 'Astra', 'ASTRA-BLK', 'Black', 'Sport', '', 'reddit_under_1k_signal')

// Traska more
add('Traska', 'Freediver IV', 'FREEDIVER-IV-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Traska', 'Freediver IV', 'FREEDIVER-IV-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Traska', 'Seafarer Gen 3', 'SEAFARER-3-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Traska', 'Commuter V3', 'COMMUTER-V3-WHT', 'White', 'Sport', '', 'reddit_under_1k_signal')
add('Traska', 'Commuter V3', 'COMMUTER-V3-BLK', 'Black', 'Sport', '', 'reddit_under_1k_signal')

// Vaer more
add('Vaer', 'A5 Automatic Field', 'A5-FIELD-BLK', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Vaer', 'A5 Automatic Field', 'A5-FIELD-WHT', 'White', 'Field', '', 'reddit_under_500_signal')
add('Vaer', 'D5 Tropic Diver', 'D5-TROPIC-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Vaer', 'D5 Tropic Diver', 'D5-TROPIC-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Vaer', 'C5 Solar Field', 'C5-SOLAR-BLK', 'Black', 'Field', '', 'reddit_under_500_signal')

// Monta more
add('Monta', 'Skyquest GMT', 'SKYQUEST-BLK', 'Black', 'GMT', '', 'reddit_under_5k_signal')
add('Monta', 'Skyquest GMT', 'SKYQUEST-BLU', 'Blue', 'GMT', '', 'reddit_under_5k_signal')
add('Monta', 'Noble V2', 'NOBLE-V2-SIL', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Monta', 'Noble V2', 'NOBLE-V2-BLU', 'Blue', 'Dress', '', 'reddit_under_5k_signal')

// Zelos more
add('Zelos', 'Nova 38', 'NOVA-38-TEAL', 'Teal', 'Sport', '', 'reddit_under_500_signal')
add('Zelos', 'Nova 38', 'NOVA-38-SALMON', 'Salmon', 'Sport', '', 'reddit_under_500_signal')
add('Zelos', 'Hammerhead II', 'HAMMERHEAD-II-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Zelos', 'Hammerhead II', 'HAMMERHEAD-II-MET', 'Meteorite', 'Diver', '', 'reddit_under_1k_signal')

// Nodus more
add('Nodus', 'Contrail Automatic', 'CONTRAIL-BLK', 'Black', 'Pilot', '', 'reddit_under_1k_signal')
add('Nodus', 'Contrail Automatic', 'CONTRAIL-BLU', 'Blue', 'Pilot', '', 'reddit_under_1k_signal')
add('Nodus', 'Sector Pilot', 'SECTOR-PILOT-BLK', 'Black', 'Pilot', '', 'reddit_under_500_signal')

// Farer more
add('Farer', 'Lander Automatic', 'LANDER-III-BLK', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Farer', 'Endeavour Automatic GMT', 'ENDEAVOUR-III-GMT', 'Blue', 'GMT', '', 'reddit_under_1k_signal')
add('Farer', 'Hopewell Automatic', 'HOPEWELL-BLU', 'Blue', 'Sport', '', 'reddit_under_1k_signal')

// Brew more
add('Brew', 'Retrograph', 'RETROGRAPH-BLK', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Brew', 'Retrograph', 'RETROGRAPH-WHT', 'White', 'Chronograph', '', 'reddit_under_500_signal')

// Unimatic more (fill gaps)
add('Unimatic', 'Modello Due', 'U2-A', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Unimatic', 'Modello Due', 'U2-BN', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Unimatic', 'Modello Tre', 'U3-A', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Unimatic', 'Modello Tre', 'U3-AN', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Unimatic', 'Modello Quattro', 'U4-A', 'Black', 'GMT', '', 'reddit_under_1k_signal')

// Doxa more (Reddit vintage diver icon)
add('Doxa', 'SUB 200', '799.10.351.10', 'Orange', 'Diver', '', 'reddit_under_1k_signal')
add('Doxa', 'SUB 200', '799.10.361.10', 'Yellow', 'Diver', '', 'reddit_under_1k_signal')
add('Doxa', 'SUB 200', '799.10.101.10', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Doxa', 'SUB 200T', '804.10.351.10', 'Orange', 'Diver', '', 'reddit_under_1k_signal')
add('Doxa', 'SUB 200T', '804.10.021.10', 'Silver', 'Diver', '', 'reddit_under_1k_signal')

// --- PANERAI (missing entirely! Reddit loves Luminor) ---

add('Panerai', 'Luminor Marina', 'PAM01312', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Marina', 'PAM01314', 'Blue', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Due', 'PAM01273', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Due', 'PAM01274', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Due', 'PAM01046', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Marina', 'PAM01392', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor', 'PAM01084', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor', 'PAM00510', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Submersible', 'PAM00973', 'Black', 'Diver', '', 'reddit_under_10k_signal')
add('Panerai', 'Submersible', 'PAM01229', 'Blue', 'Diver', '', 'reddit_under_10k_signal')
add('Panerai', 'Radiomir', 'PAM00753', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Panerai', 'Radiomir', 'PAM00620', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Marina', 'PAM00005', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Panerai', 'Luminor Chrono', 'PAM01110', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')

// --- ZENITH (Reddit loves El Primero) ---

add('Zenith', 'Chronomaster Original', '03.3200.3600/21.C901', 'Tri-Color', 'Chronograph', '', 'reddit_under_10k_signal')
add('Zenith', 'Chronomaster Original', '03.3200.3600/69.C902', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('Zenith', 'Chronomaster Sport', '03.3100.3600/69.M3100', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('Zenith', 'Chronomaster Sport', '03.3100.3600/21.M3100', 'White', 'Chronograph', '', 'reddit_under_10k_signal')
add('Zenith', 'Chronomaster Sport', '03.3100.3600/39.M3100', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('Zenith', 'Pilot Type 20 Extra Special', '11.1940.679/91.C807', 'Bronze', 'Pilot', '', 'reddit_under_10k_signal')
add('Zenith', 'Pilot Automatic', '03.2430.693/21.C723', 'Blue', 'Pilot', '', 'reddit_under_10k_signal')
add('Zenith', 'Defy Skyline', '03.9300.3620/51.I001', 'Blue', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Zenith', 'Defy Skyline', '03.9300.3620/21.I001', 'White', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Zenith', 'Defy Skyline', '03.9300.3620/78.I001', 'Green', 'Integrated Bracelet', '', 'reddit_under_10k_signal')

// --- MORE TAG HEUER ---

// Monaco Heritage
add('TAG Heuer', 'Monaco Chronograph', 'CAW211P.FC6356', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco Chronograph', 'CAW211R.FC6401', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')

// Aquaracer Professional 200 Date
add('TAG Heuer', 'Aquaracer Professional 200 Date', 'WBP2114.BA0627', 'Silver', 'Diver', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Aquaracer Professional 200 Date', 'WBP2115.BA0627', 'Green', 'Diver', '', 'reddit_under_5k_signal')

// --- BREITLING expansion ---

add('Breitling', 'Superocean Automatic 42', 'A17375E71C1S1', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Breitling', 'Superocean Automatic 42', 'A17375211B1A1', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Breitling', 'Superocean Automatic 44', 'A17376211B1S1', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Breitling', 'Chronomat Automatic 36', 'A10380101A1A1', 'White', 'Chronograph', '', 'reddit_under_5k_signal')
add('Breitling', 'Chronomat Automatic 36', 'A10380591C1A1', 'Blue', 'Chronograph', '', 'reddit_under_5k_signal')

// ============================================================
// FINAL TOP-UP — reach ~1000
// ============================================================

// --- MORE SEIKO (the Reddit well never runs dry) ---

// Presage Style60s
add('Seiko', 'Presage Style60s', 'SRPK17', 'Cream', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Style60s', 'SRPK19', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Seiko', 'Presage Style60s', 'SRPK15', 'Green', 'Dress', '', 'reddit_under_1k_signal')

// Prospex Monster
add('Seiko', 'Prospex Monster', 'SRPD25', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Monster', 'SRPD27', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Monster', 'SRPD29', 'Red', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Monster', 'SRPE27', 'Black', 'Diver', '', 'reddit_under_500_signal')

// Seiko 5 Sports 38mm (new smaller size, Reddit hype)
add('Seiko', '5 Sports 38mm', 'SRPJ81', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports 38mm', 'SRPJ83', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports 38mm', 'SRPJ85', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports 38mm', 'SRPJ87', 'White', 'Sport', '', 'reddit_under_500_signal')

// Prospex Black Series
add('Seiko', 'Prospex Black Series', 'SPB333', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Black Series', 'SPB335', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// More King Seiko sizes
add('Seiko', 'King Seiko 36.1mm', 'SJE083', 'White', 'Dress', '', 'reddit_under_5k_signal')
add('Seiko', 'King Seiko 36.1mm', 'SJE085', 'Black', 'Dress', '', 'reddit_under_5k_signal')
add('Seiko', 'King Seiko 36.1mm', 'SJE087', 'Blue', 'Dress', '', 'reddit_under_5k_signal')
add('Seiko', 'King Seiko 36.1mm', 'SJE089', 'Green', 'Dress', '', 'reddit_under_5k_signal')

// Prospex Marinemaster 300 more
add('Seiko', 'Prospex Marinemaster 300', 'SLA021', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex Marinemaster 300', 'SLA023', 'Blue', 'Diver', '', 'reddit_under_5k_signal')

// --- MORE CASIO ---

// G-Shock GA-700
add('Casio', 'G-Shock', 'GA-700-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-700-1B', 'Black/Blue', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GA-700-4A', 'Red', 'Sport', '', 'reddit_under_500_signal')

// G-Shock GW-9400 Rangeman more
add('Casio', 'G-Shock Rangeman', 'GW-9400-3', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Rangeman', 'GW-9400BJ-1JF', 'Black', 'Sport', '', 'reddit_under_500_signal')

// G-Shock DW-5600 more
add('Casio', 'G-Shock Square', 'DW-5600HR-1', 'Black/Red', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Square', 'DW-5600BBMA-1', 'Black/Rose Gold', 'Sport', '', 'reddit_under_500_signal')

// Baby-G (expanding audience)
add('Casio', 'Baby-G', 'BGA-280-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Baby-G', 'BGA-280-4A', 'Pink', 'Sport', '', 'reddit_under_500_signal')

// Casio Vintage (more classics)
add('Casio', 'Classic', 'A700W-1A', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'B640WD-1A', 'Silver', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'W-217H-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')

// Duro more
add('Casio', 'Duro', 'MDV-107-1A2', 'Blue', 'Diver', '', 'reddit_under_500_signal')

// --- MORE HAMILTON ---

// Khaki Field Murph (Interstellar watch)
add('Hamilton', 'Khaki Field Murph', 'H70405730', 'Silver', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Murph', 'H70605731', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Murph Auto', 'H70605993', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Field Murph 38mm', 'H70405530', 'Black', 'Field', '', 'reddit_under_1k_signal')

// Khaki Aviation Day Date
add('Hamilton', 'Khaki Aviation Pilot Day Date', 'H64615135', 'Black', 'Pilot', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Aviation Pilot Day Date', 'H64615545', 'Blue', 'Pilot', '', 'reddit_under_1k_signal')

// --- MORE CITIZEN ---

// Promaster more
add('Citizen', 'Promaster Diver', 'BN0158-00X', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Diver', 'BJ8050-08E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Navihawk A-T', 'JY8078-52L', 'Blue', 'Pilot', '', 'reddit_under_1k_signal')

// --- MORE ORIENT ---

add('Orient', 'Bambino Version 5', 'RA-AC0019L', 'Light Blue', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino Version 5', 'RA-AC0020G', 'Champagne', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Flight', 'RA-AC0H01L', 'Blue', 'Pilot', '', 'reddit_under_500_signal')
add('Orient', 'Flight', 'RA-AC0H03B', 'Black', 'Pilot', '', 'reddit_under_500_signal')

// --- MORE TIMEX ---

add('Timex', 'Q Falcon Eye', 'TW2W33100', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Timex', 'Q Falcon Eye', 'TW2W33200', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Traditional Day Date', 'TW2U90400', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'Waterbury Traditional Day Date', 'TW2U90200', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Timex', 'M79 Automatic', 'TW2U29500', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'M79 Automatic', 'TW2U96900', 'Pepsi', 'Diver', '', 'reddit_under_500_signal')

// --- BELL & ROSS (missing!) ---

add('Bell & Ross', 'BR 05', 'BR05A-BL-ST/SST', 'Blue', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 05', 'BR05A-BLU-ST/SRB', 'Blue', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 05', 'BR05A-BL-ST/SRB', 'Black', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 05 Skeleton', 'BR05A-BLU-SKST/SST', 'Blue', 'Integrated Bracelet', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 05 GMT', 'BR05G-BL-ST/SST', 'Blue', 'GMT', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 03-92', 'BR0392-D-BL-ST/SRB', 'Black', 'Pilot', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR 03-92 Diver', 'BR0392-D-BL-ST/SRB', 'Blue', 'Diver', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR V2-94 Chronograph', 'BRV294-BL-ST/SST', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('Bell & Ross', 'BR V2-93 GMT', 'BRV293-BL-ST/SST', 'Blue', 'GMT', '', 'reddit_under_10k_signal')

// --- HUBLOT (missing!) ---

add('Hublot', 'Big Bang', '301.SB.131.RX', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('Hublot', 'Big Bang', '301.SX.1170.RX', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('Hublot', 'Classic Fusion', '542.NX.1171.RX', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Hublot', 'Classic Fusion', '542.CM.1771.RX', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Hublot', 'Classic Fusion', '511.NX.1171.RX', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Hublot', 'Classic Fusion', '511.OX.1181.LR', 'Black', 'Dress', '', 'reddit_under_10k_signal')
add('Hublot', 'Big Bang Unico', '421.NM.1170.RX', 'Skeleton', 'Chronograph', '', 'reddit_under_10k_signal')
add('Hublot', 'Spirit of Big Bang', '641.NX.0173.LR', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')

// --- RAYMOND WEIL (missing!) ---

add('Raymond Weil', 'Freelancer', '2780-ST-20001', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Freelancer', '2780-ST-50001', 'Green', 'Sport', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Freelancer', '2780-ST-65001', 'Blue', 'Sport', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Freelancer Chronograph', '7741-ST1-30021', 'Silver', 'Chronograph', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Tango', '5560-STP-00208', 'White', 'Sport', '', 'reddit_under_1k_signal')
add('Raymond Weil', 'Maestro', '2237-ST-00208', 'White', 'Dress', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Maestro', '2237-STC-65001', 'Blue', 'Dress', '', 'reddit_under_5k_signal')
add('Raymond Weil', 'Millesime', '2927-ST-80001', 'Silver', 'Dress', '', 'reddit_under_5k_signal')

// --- BAUME & MERCIER (missing!) ---

add('Baume & Mercier', 'Riviera', 'M0A10612', 'Blue', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Riviera', 'M0A10614', 'Black', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Riviera', 'M0A10616', 'Green', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Riviera', 'M0A10620', 'Grey', 'Integrated Bracelet', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Riviera Chronograph', 'M0A10624', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('Baume & Mercier', 'Classima', 'M0A10382', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Classima', 'M0A10453', 'Blue', 'Dress', '', 'reddit_under_5k_signal')
add('Baume & Mercier', 'Clifton', 'M0A10436', 'Silver', 'Dress', '', 'reddit_under_5k_signal')

// --- MORE MIDO ---

add('Mido', 'Commander', 'M021.431.11.061.01', 'Grey', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Commander', 'M021.431.11.041.01', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star Tribute', 'M026.830.11.041.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Mido', 'Ocean Star Tribute', 'M026.830.11.051.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Mido', 'Belluna', 'M024.630.11.061.00', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Mido', 'Belluna', 'M024.630.11.041.00', 'Blue', 'Dress', '', 'reddit_under_1k_signal')

// --- MORE BREITLING ---

add('Breitling', 'Navitimer Automatic 35', 'A17395211A1A1', 'White', 'Pilot', '', 'reddit_under_5k_signal')
add('Breitling', 'Avenger GMT', 'A32397101B1X1', 'Black', 'GMT', '', 'reddit_under_5k_signal')
add('Breitling', 'Superocean Automatic 36', 'A17377211A1A1', 'White', 'Diver', '', 'reddit_under_5k_signal')
add('Breitling', 'Superocean Automatic 36', 'A17377211C1A1', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Breitling', 'Endurance Pro', 'X82310A51B1S1', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')
add('Breitling', 'Endurance Pro', 'X82310A71B1S1', 'Blue', 'Chronograph', '', 'reddit_under_5k_signal')

// --- MISC FILLS ---

// Formex more
add('Formex', 'Reef Automatic', '2200-1-6331-100', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Formex', 'Reef Automatic', '2200-1-6321-100', 'Blue', 'Diver', '', 'reddit_under_5k_signal')
add('Formex', 'Reef Automatic GMT', '2202-1-6331-100', 'Black', 'GMT', '', 'reddit_under_5k_signal')

// Tissot more
add('Tissot', 'PRX Digital', 'T137.463.11.050.00', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'PRX Digital', 'T137.463.11.040.00', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Tissot', 'T-Race', 'T115.417.27.011.00', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Tissot', 'Gentleman Open Heart', 'T127.407.11.031.03', 'Silver', 'Dress', '', 'reddit_under_1k_signal')

// Certina more
add('Certina', 'DS Action Diver 43mm', 'C032.427.11.041.00', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Certina', 'DS Action Diver 43mm', 'C032.427.17.051.00', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// Christopher Ward more
add('Christopher Ward', 'C60 Trident Bronze Pro 600', 'C60-40ABZH3-S0KK0-TK', 'Green', 'Diver', '', 'reddit_under_1k_signal')
add('Christopher Ward', 'C63 Sealander Elite', 'C63-39AEL3-S0BB1-HB', 'Blue', 'Sport', '', 'reddit_under_5k_signal')

// Frederique Constant more
add('Frederique Constant', 'Highlife Heartbeat', 'FC-310S4NH6B', 'Silver', 'Sport', '', 'reddit_under_5k_signal')
add('Frederique Constant', 'Classics Worldtimer', 'FC-718WM4H6', 'White', 'GMT', '', 'reddit_under_5k_signal')

// ============================================================
// FINAL PUSH — reach ~1000
// ============================================================

// --- SEIKO depth (more 5 Sports, more Prospex) ---

add('Seiko', '5 Sports', 'SRPH29K1', 'Black', 'Field', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPJ45', 'Grey', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPJ47', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPJ09', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPJ11', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', '5 Sports', 'SRPJ13', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Diver', 'SNE573', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Diver', 'SNE571', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Solar Diver', 'SNE569', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Mini Turtle', 'SRPC35', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Mini Turtle', 'SRPC37', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Prospex Mini Turtle', 'SRPC39', 'Blue PADI', 'Diver', '', 'reddit_under_500_signal')
add('Seiko', 'Presage Star Bar', 'SRPC43', 'Brown', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', 'Presage Star Bar', 'SRPE47J1', 'Green', 'Dress', '', 'reddit_under_500_signal')
add('Seiko', 'Presage Arita Porcelain', 'SPB093', 'White', 'Dress', '', 'reddit_under_5k_signal')
add('Seiko', 'Presage Urushi', 'SPB085', 'Red', 'Dress', '', 'reddit_under_5k_signal')
add('Seiko', 'Prospex Willard', 'SPB237', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Seiko', 'Prospex Willard', 'SPB235', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// --- MORE CASIO ---

add('Casio', 'G-Shock', 'GMA-S2100-1A', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GMA-S2100-4A', 'Pink', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'GMA-S2100-7A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock MR-G', 'MRG-B5000B-1', 'Black', 'Sport', '', 'reddit_under_10k_signal')
add('Casio', 'G-Shock MR-G', 'MRG-B5000D-1', 'Silver', 'Sport', '', 'reddit_under_10k_signal')
add('Casio', 'G-Shock Metal Covered', 'GM-5600-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Metal Covered', 'GM-5600B-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Metal Covered', 'GM-5600B-3', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock Solar', 'GW-2310-1', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'G-Shock', 'DW-6900-1V', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'W-86-1V', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Casio', 'Classic', 'MQ-24-7B2', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Casio', 'Edifice Sospensione', 'ECB-2200DD-1A', 'Black', 'Chronograph', '', 'reddit_under_500_signal')
add('Casio', 'Edifice', 'EQB-1200D-1A', 'Black', 'Chronograph', '', 'reddit_under_500_signal')

// --- MORE TISSOT ---

add('Tissot', 'Everytime', 'T143.410.11.011.00', 'White', 'Dress', '', 'reddit_under_500_signal')
add('Tissot', 'Everytime', 'T143.410.11.041.00', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Tissot', 'Everytime', 'T143.410.16.041.00', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Tissot', 'Classic Dream', 'T129.410.11.013.00', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Tissot', 'Classic Dream', 'T129.410.11.053.00', 'Black', 'Dress', '', 'reddit_under_500_signal')

// --- MORE TAG HEUER ---

add('TAG Heuer', 'Aquaracer Professional 300 Tribute to Ref. 844', 'WBP208C.BF0631', 'Black', 'Diver', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Monaco Chronograph Gulf', 'CBL2115.FC6494', 'Blue/Orange', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Skipper', 'CBS2213.FN6002', 'Blue', 'Chronograph', '', 'reddit_under_10k_signal')
add('TAG Heuer', 'Carrera Three Hands', 'WBN2110.BA0639', 'Black', 'Sport', '', 'reddit_under_5k_signal')
add('TAG Heuer', 'Carrera Three Hands', 'WBN2114.BA0639', 'Silver', 'Sport', '', 'reddit_under_5k_signal')

// --- MORE ORIENT ---

add('Orient', 'Multi-Year Calendar', 'FER2700JB0', 'Black', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino RA-AK', 'RA-AK0701S', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Bambino RA-AK', 'RA-AK0702Y', 'Champagne', 'Dress', '', 'reddit_under_500_signal')
add('Orient', 'Star Mechanical Moon Phase', 'RE-AY0116A', 'Green', 'Dress', '', 'reddit_under_1k_signal')
add('Orient', 'Star Mechanical Moon Phase', 'RE-AY0107N', 'Black', 'Dress', '', 'reddit_under_1k_signal')

// --- MORE TIMEX ---

add('Timex', 'Deepwater Reef 200', 'TW2W47500', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Deepwater Reef 200', 'TW2W47600', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Reissue 36mm', 'TW2W24500', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Q Reissue 36mm', 'TW2W24600', 'Blue', 'Diver', '', 'reddit_under_500_signal')
add('Timex', 'Legacy Tonneau', 'TW2W42200', 'Silver', 'Dress', '', 'reddit_under_500_signal')

// --- MORE HAMILTON ---

add('Hamilton', 'Khaki Aviation X-Wind', 'H77912535', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')
add('Hamilton', 'Khaki Aviation X-Wind', 'H77912135', 'Black', 'Chronograph', '', 'reddit_under_5k_signal')
add('Hamilton', 'Jazzmaster Thinline', 'H38525541', 'Silver', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Jazzmaster Thinline', 'H38525811', 'Blue', 'Dress', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Navy Pioneer Auto', 'H78205553', 'Silver', 'Field', '', 'reddit_under_1k_signal')
add('Hamilton', 'Khaki Navy Pioneer Auto', 'H78205953', 'Blue', 'Field', '', 'reddit_under_1k_signal')

// --- MORE CITIZEN ---

add('Citizen', 'Promaster Aqualand', 'BN2029-01E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Aqualand', 'BN2037-11E', 'Black', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Promaster Automatic', 'NY0100-50ME', 'Green', 'Diver', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa Small Second', 'NJ0160-87X', 'Green', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Tsuyosa Small Second', 'NJ0160-87L', 'Blue', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Record Label', 'NK5010-51A', 'White', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Record Label', 'NK5010-51E', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Citizen', 'Record Label', 'NK5010-51L', 'Blue', 'Sport', '', 'reddit_under_500_signal')

// --- MORE GRAND SEIKO ---

add('Grand Seiko', 'Heritage Spring Drive Power Reserve', 'SBGA285', 'Silver', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage Spring Drive Power Reserve', 'SBGA387', 'Blue', 'Dress', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive Chronograph', 'SLGC001', 'White', 'Chronograph', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Evolution 9 Spring Drive Chronograph', 'SLGC003', 'Black', 'Chronograph', '', 'reddit_under_10k_signal')
add('Grand Seiko', 'Heritage Quartz GMT', 'SBGN011', 'Black', 'GMT', '', 'reddit_under_5k_signal')
add('Grand Seiko', 'Heritage Quartz GMT', 'SBGN013', 'Blue', 'GMT', '', 'reddit_under_5k_signal')

// --- MORE ORIS ---

add('Oris', 'Big Crown Bronze Pointer Date', '01 754 7741 3167-07 5 20 58BR', 'Green', 'Field', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Pro 400m', '01 400 7767 7754-07 4 26 04TEBG', 'Black', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Aquis Clean Ocean Limited', '01 733 7732 4185-Set', 'Blue Recycled', 'Diver', '', 'reddit_under_5k_signal')
add('Oris', 'Big Crown ProPilot Timer GMT', '01 748 7756 4064-07 3 22 02LC', 'Black', 'GMT', '', 'reddit_under_5k_signal')

// --- MORE BULOVA ---

add('Bulova', 'Sutton', '96A235', 'Silver', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Sutton', '96A237', 'Blue', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Classic Automatic', '96A234', 'Grey', 'Dress', '', 'reddit_under_500_signal')
add('Bulova', 'Lunar Pilot', '96A299', 'White', 'Chronograph', '', 'reddit_under_500_signal')

// --- MOVADO (Reddit divisive but popular) ---

add('Movado', 'Museum Classic', '0607200', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Movado', 'Museum Classic', '0607199', 'Black', 'Dress', '', 'reddit_under_1k_signal')
add('Movado', 'Bold', '3600560', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Movado', 'Bold', '3600562', 'Navy', 'Sport', '', 'reddit_under_500_signal')
add('Movado', 'SE', '0607541', 'Black', 'Sport', '', 'reddit_under_1k_signal')
add('Movado', 'SE', '0607542', 'Blue', 'Sport', '', 'reddit_under_1k_signal')

// --- SWATCH (MoonSwatch gap fill) ---

add('Swatch', 'MoonSwatch Mission to Mars', 'SO33R100', 'Red', 'Chronograph', '', 'reddit_under_500_signal')
add('Swatch', 'MoonSwatch Mission to Neptune', 'SO33N100', 'Blue', 'Chronograph', '', 'reddit_under_500_signal')
add('Swatch', 'MoonSwatch Mission to Uranus', 'SO33L100', 'Light Blue', 'Chronograph', '', 'reddit_under_500_signal')
add('Swatch', 'MoonSwatch Mission to Venus', 'SO33P100', 'Pink', 'Chronograph', '', 'reddit_under_500_signal')
add('Swatch', 'MoonSwatch Mission to Pluto', 'SO33P100', 'Grey', 'Chronograph', '', 'reddit_under_500_signal')
add('Swatch', 'Sistem51', 'SO29B100', 'Black', 'Sport', '', 'reddit_under_500_signal')
add('Swatch', 'Sistem51 Irony', 'YIS404', 'Silver', 'Sport', '', 'reddit_under_500_signal')

// ============================================================
// Generate CSV
// ============================================================

const existingIds = loadExistingIds()
const rows: string[] = ['id,brand,model,reference,dialColor,watchType,sourceUrl,communitySignal,verificationStatus']
let dupes = 0
let added = 0
const seen = new Set<string>()

for (const e of entries) {
  const id = mintId(e.brand, e.reference)
  if (existingIds.has(id) || seen.has(id)) {
    dupes++
    continue
  }
  seen.add(id)
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

console.log(`\n=== Batch 3 Seed Generated ===`)
console.log(`Total entries defined: ${entries.length}`)
console.log(`Duplicates (skipped): ${dupes}`)
console.log(`Self-dupes removed: ${entries.length - dupes - added}`)
console.log(`New entries written: ${added}`)
console.log(`Output: ${outputPath}`)

const brandCounts: Record<string, number> = {}
for (const row of rows.slice(1)) {
  const brand = row.split(',')[1]?.replace(/"/g, '')
  if (brand) brandCounts[brand] = (brandCounts[brand] || 0) + 1
}

console.log(`\nBrand distribution:`)
for (const [brand, count] of Object.entries(brandCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${brand}: ${count}`)
}
