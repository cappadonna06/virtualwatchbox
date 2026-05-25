/**
 * Generate catalog-seed-batch-4.csv — gap-fill batch based on post-batch audit.
 *
 * Focus: missing major houses, thin luxury brands, 2024-2025 releases,
 * underfilled Holy Trinity/Cartier/JLC, missing microbrands.
 *
 * Usage: npx tsx scripts/generate-batch-4-seed.ts
 */

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'data', 'catalog-seed-batch-4.csv')

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
    'data/catalog-seed-batch-3.csv',
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

function add(brand: string, model: string, reference: string, dialColor: string, watchType: string, sourceUrl = '', communitySignal = 'curated') {
  entries.push({ brand, model, reference, dialColor, watchType, sourceUrl, communitySignal })
}

// ============================================================
// P1: MISSING MAJOR HOUSES
// ============================================================

// --- GLASHÜTTE ORIGINAL (~18 refs) ---

// PanoMaticLunar (signature model)
add('Glashütte Original', 'PanoMaticLunar', '1-90-02-46-32-35', 'Silver', 'Dress')
add('Glashütte Original', 'PanoMaticLunar', '1-90-02-46-32-61', 'Blue', 'Dress')
add('Glashütte Original', 'PanoMaticLunar', '1-90-02-46-32-05', 'Black', 'Dress')

// PanoReserve
add('Glashütte Original', 'PanoReserve', '1-65-01-26-12-35', 'Silver', 'Dress')
add('Glashütte Original', 'PanoReserve', '1-65-01-26-12-04', 'Black', 'Dress')

// Senator Excellence
add('Glashütte Original', 'Senator Excellence', '1-36-01-02-05-01', 'Silver', 'Dress')
add('Glashütte Original', 'Senator Excellence', '1-36-04-04-02-01', 'Blue', 'Dress')
add('Glashütte Original', 'Senator Excellence Perpetual Calendar', '1-36-02-01-02-30', 'Silver', 'Dress')

// SeaQ (diver)
add('Glashütte Original', 'SeaQ', '1-36-13-02-81-33', 'Blue', 'Diver')
add('Glashütte Original', 'SeaQ', '1-36-13-01-80-33', 'Black', 'Diver')
add('Glashütte Original', 'SeaQ', '1-36-13-02-81-70', 'Green', 'Diver')
add('Glashütte Original', 'SeaQ Panorama Date', '1-36-13-02-81-04', 'Blue', 'Diver')

// Seventies Chronograph Panorama Date
add('Glashütte Original', 'Seventies Chronograph Panorama Date', '1-37-02-09-02-35', 'Green', 'Chronograph')
add('Glashütte Original', 'Seventies Chronograph Panorama Date', '1-37-02-07-02-30', 'Blue', 'Chronograph')

// Sixties
add('Glashütte Original', 'Sixties', '1-39-52-04-02-04', 'Blue', 'Dress')
add('Glashütte Original', 'Sixties', '1-39-52-01-02-04', 'Silver', 'Dress')
add('Glashütte Original', 'Sixties Panorama Date', '1-39-47-04-02-04', 'Green', 'Dress')

// --- GIRARD-PERREGAUX (~18 refs) ---

// Laureato (the star)
add('Girard-Perregaux', 'Laureato', '81010-11-131-11A', 'Blue', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato', '81010-11-431-11A', 'Black', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato', '81010-11-631-11A', 'Green', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato', '81010-11-231-11A', 'Silver', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato 38mm', '81005-11-131-11A', 'Blue', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato 38mm', '81005-11-431-11A', 'Black', 'Integrated Bracelet')
add('Girard-Perregaux', 'Laureato Chronograph', '81020-11-131-11A', 'Blue', 'Chronograph')
add('Girard-Perregaux', 'Laureato Chronograph', '81020-11-431-11A', 'Black', 'Chronograph')
add('Girard-Perregaux', 'Laureato Skeleton', '81015-11-001-11A', 'Skeleton', 'Integrated Bracelet')

// Three Bridges
add('Girard-Perregaux', 'Neo Bridges', '84000-21-001-BB6A', 'Skeleton', 'Dress')
add('Girard-Perregaux', 'Cosmos', '86000-21-001-BB6A', 'Skeleton', 'Dress')

// 1966
add('Girard-Perregaux', '1966', '49555-11-131-BB60', 'Blue', 'Dress')
add('Girard-Perregaux', '1966', '49555-11-431-BB60', 'Black', 'Dress')
add('Girard-Perregaux', '1966 Moonphases', '49545-11-131-BB60', 'Blue', 'Dress')

// Vintage 1945
add('Girard-Perregaux', 'Vintage 1945', '25880-11-121-BB6A', 'Silver', 'Dress')
add('Girard-Perregaux', 'Vintage 1945', '25880-11-421-BB6A', 'Black', 'Dress')

// Casquette 2.0
add('Girard-Perregaux', 'Casquette 2.0', '28500-11-000-11A', 'LED', 'Sport')

// --- CHOPARD (~14 refs) ---

// Alpine Eagle
add('Chopard', 'Alpine Eagle 41', '298600-3001', 'Blue', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle 41', '298600-3002', 'Grey', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle 41', '298600-3005', 'Green', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle 41', '298600-3014', 'Black', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle 36', '298601-3001', 'Blue', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle 36', '298601-3002', 'Grey', 'Integrated Bracelet')
add('Chopard', 'Alpine Eagle XPS', '298609-3001', 'Blue', 'Dress')
add('Chopard', 'Alpine Eagle XPS', '298609-3003', 'Green', 'Dress')

// L.U.C.
add('Chopard', 'L.U.C. XPS', '168583-3001', 'Blue', 'Dress')
add('Chopard', 'L.U.C. XPS', '161920-1001', 'Silver', 'Dress')
add('Chopard', 'L.U.C. 1860', '161860-1001', 'Silver', 'Dress')

// Happy Sport
add('Chopard', 'Happy Sport', '278559-3003', 'White', 'Dress')
add('Chopard', 'Happy Sport', '278559-3008', 'Blue', 'Dress')

// Mille Miglia
add('Chopard', 'Mille Miglia GTS', '168571-3001', 'Black', 'Chronograph')

// --- ULYSSE NARDIN (~14 refs) ---

// Diver
add('Ulysse Nardin', 'Diver', '8163-175/93', 'Blue', 'Diver')
add('Ulysse Nardin', 'Diver', '8163-175/92', 'Black', 'Diver')
add('Ulysse Nardin', 'Diver 42mm', '8163-175-7M/92', 'Black', 'Diver')
add('Ulysse Nardin', 'Diver Chronometer', '1183-170LE-3/90', 'Blue', 'Diver')

// Freak
add('Ulysse Nardin', 'Freak X', '2303-270/03', 'Blue', 'Dress')
add('Ulysse Nardin', 'Freak X', '2303-270.1/03', 'Black', 'Dress')
add('Ulysse Nardin', 'Freak One', '2505-250/00', 'Blue', 'Dress')

// Marine
add('Ulysse Nardin', 'Marine Chronometer', '1183-310/43', 'Blue', 'Dress')
add('Ulysse Nardin', 'Marine Chronometer', '1183-310/40', 'Black', 'Dress')
add('Ulysse Nardin', 'Marine Torpilleur', '1183-320LE/40', 'Black', 'Dress')
add('Ulysse Nardin', 'Marine Torpilleur', '1183-310-7M/40', 'Black', 'Dress')

// Classico
add('Ulysse Nardin', 'Classico', '8150-111-2/91', 'Blue', 'Dress')
add('Ulysse Nardin', 'Classico', '8150-111-2/E3', 'White', 'Dress')

// Blast
add('Ulysse Nardin', 'Blast', '1723-400/03', 'Blue', 'Dress')

// --- RICHARD MILLE (~10 refs) ---

add('Richard Mille', 'RM 011', 'RM 011-03', 'Skeleton', 'Chronograph')
add('Richard Mille', 'RM 035', 'RM 035-02', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 055', 'RM 055', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 67-01', 'RM 67-01', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 67-02', 'RM 67-02', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 72-01', 'RM 72-01', 'Skeleton', 'Chronograph')
add('Richard Mille', 'RM 010', 'RM 010', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 030', 'RM 030', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 005', 'RM 005', 'Skeleton', 'Sport')
add('Richard Mille', 'RM 016', 'RM 016', 'Skeleton', 'Dress')

// --- F.P. JOURNE (~8 refs) ---

add('F.P. Journe', 'Chronomètre Bleu', 'CB-PT', 'Blue', 'Dress')
add('F.P. Journe', 'Chronomètre Souverain', 'CS-PT', 'Silver', 'Dress')
add('F.P. Journe', 'Chronomètre Souverain', 'CS-RG', 'Silver', 'Dress')
add('F.P. Journe', 'Octa Automatique', 'OCTA-AUTO-PT', 'Silver', 'Dress')
add('F.P. Journe', 'Octa Sport', 'OCTA-SPORT-TI', 'Blue', 'Sport')
add('F.P. Journe', 'Tourbillon Souverain', 'TS-PT', 'Silver', 'Dress')
add('F.P. Journe', 'Résonance', 'RES-PT', 'Silver', 'Dress')
add('F.P. Journe', 'Centigraphe Sport', 'CTS-AL', 'Grey', 'Chronograph')

// --- H. MOSER & CIE (~10 refs) ---

add('H. Moser & Cie', 'Streamliner Centre Seconds', '6200-1200', 'Fumé Blue', 'Integrated Bracelet')
add('H. Moser & Cie', 'Streamliner Centre Seconds', '6200-1201', 'Fumé Green', 'Integrated Bracelet')
add('H. Moser & Cie', 'Streamliner Flyback Chronograph', '6902-1200', 'Fumé Blue', 'Chronograph')
add('H. Moser & Cie', 'Pioneer Centre Seconds', '3200-1200', 'Fumé Blue', 'Sport')
add('H. Moser & Cie', 'Pioneer Centre Seconds', '3200-1207', 'Fumé Green', 'Sport')
add('H. Moser & Cie', 'Pioneer Cylindrical Tourbillon', '3804-1200', 'Fumé Blue', 'Dress')
add('H. Moser & Cie', 'Endeavour Centre Seconds', '1200-0201', 'Fumé Blue', 'Dress')
add('H. Moser & Cie', 'Endeavour Centre Seconds', '1200-0215', 'Cosmic Green', 'Dress')
add('H. Moser & Cie', 'Endeavour Perpetual Calendar', '1341-0207', 'Fumé Blue', 'Dress')
add('H. Moser & Cie', 'Swiss Alp Watch', '5324-0210', 'Vantablack', 'Dress')

// --- PIAGET (~8 refs) ---

add('Piaget', 'Polo Date', 'G0A46018', 'Blue', 'Integrated Bracelet')
add('Piaget', 'Polo Date', 'G0A46019', 'Green', 'Integrated Bracelet')
add('Piaget', 'Polo Date', 'G0A46020', 'Grey', 'Integrated Bracelet')
add('Piaget', 'Polo Skeleton', 'G0A46011', 'Skeleton', 'Integrated Bracelet')
add('Piaget', 'Altiplano', 'G0A38130', 'Silver', 'Dress')
add('Piaget', 'Altiplano', 'G0A42105', 'Blue', 'Dress')
add('Piaget', 'Altiplano Ultimate', 'G0A43120', 'Blue', 'Dress')
add('Piaget', 'Polo 79', 'G0A49028', 'Blue', 'Integrated Bracelet')

// --- FRANCK MULLER (~8 refs) ---

add('Franck Muller', 'Vanguard', 'V 45 SC DT', 'Black', 'Sport')
add('Franck Muller', 'Vanguard', 'V 45 SC DT AC BL', 'Blue', 'Sport')
add('Franck Muller', 'Vanguard Racing', 'V 45 SC DT RCG', 'Grey', 'Sport')
add('Franck Muller', 'Long Island', '1200 SC DT', 'Silver', 'Dress')
add('Franck Muller', 'Long Island', '1200 SC DT AC', 'Blue', 'Dress')
add('Franck Muller', 'Crazy Hours', '8880 CH', 'Silver', 'Dress')
add('Franck Muller', 'Master of Complications', '7002 T', 'Skeleton', 'Dress')
add('Franck Muller', 'Casablanca', '8880 C DT', 'Black', 'Sport')

// --- MB&F (~6 refs) ---

add('MB&F', 'Legacy Machine No. 1', 'LM1-PT', 'Silver', 'Dress')
add('MB&F', 'Legacy Machine No. 2', 'LM2-TI', 'Blue', 'Dress')
add('MB&F', 'Legacy Machine Perpetual', 'LMP-RG', 'Silver', 'Dress')
add('MB&F', 'HM5', 'HM5-RT', 'Grey', 'Sport')
add('MB&F', 'HM7 Aquapod', 'HM7-TI', 'Blue', 'Diver')
add('MB&F', 'LM101', 'LM101-PT', 'Silver', 'Dress')

// --- CORUM (~6 refs) ---

add('Corum', 'Admiral', 'A082/04207', 'Blue', 'Sport')
add('Corum', 'Admiral', 'A082/04209', 'Black', 'Sport')
add('Corum', 'Admiral 42', 'A395/04250', 'Blue', 'Sport')
add('Corum', 'Golden Bridge', 'B113/03855', 'Skeleton', 'Dress')
add('Corum', 'Golden Bridge Round', 'B113/03859', 'Skeleton', 'Dress')
add('Corum', 'Bubble', 'L082/03588', 'Blue', 'Sport')

// --- MEISTERSINGER (~6 refs) ---

add('MeisterSinger', 'Perigraph', 'BM1108', 'White', 'Dress')
add('MeisterSinger', 'Perigraph', 'BM1102', 'Black', 'Dress')
add('MeisterSinger', 'Pangaea', 'PM903', 'White', 'Dress')
add('MeisterSinger', 'Pangaea', 'PM908', 'Blue', 'Dress')
add('MeisterSinger', 'Neo', 'NE901', 'Silver', 'Dress')
add('MeisterSinger', 'Circularis', 'CC907', 'Blue', 'Dress')

// --- MÜHLE GLASHÜTTE (~6 refs) ---

add('Mühle Glashütte', 'Teutonia II', 'M1-30-45-MB', 'Silver', 'Dress')
add('Mühle Glashütte', 'Teutonia II', 'M1-30-22-MB', 'Blue', 'Dress')
add('Mühle Glashütte', 'Teutonia IV Moonphase', 'M1-44-05-MB', 'Silver', 'Dress')
add('Mühle Glashütte', 'S.A.R. Rescue-Timer', 'M1-41-03-KB', 'Black', 'Diver')
add('Mühle Glashütte', 'Seebataillon', 'M1-28-62-KB', 'Black', 'Diver')
add('Mühle Glashütte', 'ProMare Go', 'M1-42-33-NB', 'Blue', 'Diver')

// ============================================================
// P2: THIN LUXURY BRANDS — DEPTH FILL
// ============================================================

// --- BLANCPAIN (have 8, adding ~16) ---

// Fifty Fathoms Automatique
add('Blancpain', 'Fifty Fathoms Automatique', '5015-1130-52A', 'Black', 'Diver')
add('Blancpain', 'Fifty Fathoms Automatique', '5015-1130-71S', 'Black', 'Diver')
add('Blancpain', 'Fifty Fathoms Automatique', '5015-12B40-O52A', 'Blue', 'Diver')
add('Blancpain', 'Fifty Fathoms Automatique 42mm', '5010-1130-NABA', 'Black', 'Diver')
add('Blancpain', 'Fifty Fathoms Automatique 42mm', '5010-1130-71S', 'Blue', 'Diver')

// Fifty Fathoms Bathyscaphe
add('Blancpain', 'Fifty Fathoms Bathyscaphe', '5000-0130-B52A', 'Black', 'Diver')
add('Blancpain', 'Fifty Fathoms Bathyscaphe', '5000-0240-O52A', 'Blue', 'Diver')
add('Blancpain', 'Fifty Fathoms Bathyscaphe', '5000-0130-NABA', 'Grey', 'Diver')
add('Blancpain', 'Fifty Fathoms Bathyscaphe 38mm', '5100-1140-O52A', 'Blue', 'Diver')

// Fifty Fathoms Chronograph
add('Blancpain', 'Fifty Fathoms Chronograph Flyback', '5085F-1130-52A', 'Black', 'Chronograph')
add('Blancpain', 'Fifty Fathoms Chronograph Flyback', '5085F-1130-71S', 'Blue', 'Chronograph')

// Villeret
add('Blancpain', 'Villeret Ultraplate', '6104-1127-55A', 'White', 'Dress')
add('Blancpain', 'Villeret Quantième Complet', '6654-1127-55B', 'White', 'Dress')
add('Blancpain', 'Villeret Moonphase', '6654A-1127-55B', 'Blue', 'Dress')
add('Blancpain', 'Villeret Grande Date', '6669-1127-55B', 'White', 'Dress')
add('Blancpain', 'Villeret Quantième Perpétuel', '6656-1127-55B', 'White', 'Dress')

// --- BREGUET (have 6, adding ~14) ---

// Classique
add('Breguet', 'Classique', '5157BB/11/9V6', 'Silver', 'Dress')
add('Breguet', 'Classique', '5177BB/2Y/9V6', 'Silver', 'Dress')
add('Breguet', 'Classique', '5177BR/2Y/9V6', 'Silver', 'Dress')
add('Breguet', 'Classique', '7147BB/12/9WU', 'Silver', 'Dress')

// Type XX / XXI (2024 relaunch)
add('Breguet', 'Type XX', '2067ST/92/3WU', 'Black', 'Chronograph')
add('Breguet', 'Type XX', '2067ST/92/SG0', 'Black', 'Chronograph')
add('Breguet', 'Type XXI', '3817ST/X2/3ZU', 'Black', 'Chronograph')
add('Breguet', 'Type XXI', '3817TI/Y2/3ZU', 'Blue', 'Chronograph')

// Marine
add('Breguet', 'Marine', '5517BB/Y2/9ZU', 'Silver', 'Sport')
add('Breguet', 'Marine', '5517TI/G2/5ZU', 'Blue', 'Sport')
add('Breguet', 'Marine Chronographe', '5527BB/Y2/9WV', 'Silver', 'Chronograph')

// Tradition
add('Breguet', 'Tradition', '7097BB/GY/9WU', 'Silver', 'Dress')
add('Breguet', 'Tradition', '7097BR/GY/9WU', 'Silver', 'Dress')
add('Breguet', 'Tradition GMT', '7067BR/GY/9WU', 'Silver', 'GMT')

// --- VACHERON CONSTANTIN (have 24, adding ~12) ---

// Overseas
add('Vacheron Constantin', 'Overseas', '4500V/110A-B483', 'Blue', 'Integrated Bracelet')
add('Vacheron Constantin', 'Overseas', '4500V/110A-B126', 'Black', 'Integrated Bracelet')
add('Vacheron Constantin', 'Overseas', '4500V/110A-B128', 'Silver', 'Integrated Bracelet')
add('Vacheron Constantin', 'Overseas Chronograph', '5500V/110A-B481', 'Blue', 'Chronograph')

// 222 (reissue)
add('Vacheron Constantin', '222', '4520V/110A-B146', 'Blue', 'Integrated Bracelet')
add('Vacheron Constantin', '222', '4520V/110A-B152', 'Green', 'Integrated Bracelet')

// Traditionnelle
add('Vacheron Constantin', 'Traditionnelle', '87172/000R-9302', 'Silver', 'Dress')
add('Vacheron Constantin', 'Traditionnelle', '87172/000G-9301', 'Blue', 'Dress')
add('Vacheron Constantin', 'Traditionnelle Perpetual Calendar', '43175/000R-9687', 'Silver', 'Dress')

// Historiques
add('Vacheron Constantin', 'Historiques American 1921', '82035/000R-9359', 'Silver', 'Dress')
add('Vacheron Constantin', 'Historiques Triple Calendrier', '3110V/000A-B426', 'Silver', 'Dress')

// Fiftysix
add('Vacheron Constantin', 'Fiftysix', '4600E/000A-B487', 'Blue', 'Dress')

// ============================================================
// P3: 2024-2025 HOT RELEASES
// ============================================================

// Patek Philippe Cubitus (first new line in 25 years)
add('Patek Philippe', 'Cubitus', '5821/1A-001', 'Blue', 'Integrated Bracelet', '', 'core_icon')
add('Patek Philippe', 'Cubitus', '5821/1A-010', 'Green', 'Integrated Bracelet', '', 'core_icon')
add('Patek Philippe', 'Cubitus Chronograph', '5822P-001', 'Blue', 'Chronograph', '', 'core_icon')

// Breguet Type XX 2024 (major relaunch)
// already covered above

// Tudor Black Bay 58 GMT (2025)
add('Tudor', 'Black Bay 58 GMT', 'M7939G1A0NRU-0003', 'Black', 'GMT', '', 'core_icon')
add('Tudor', 'Black Bay 58 GMT', 'M7939G1A0NRU-0004', 'Blue', 'GMT', '', 'core_icon')

// Grand Seiko 9RB2 caliber (2024-2025)
add('Grand Seiko', 'Evolution 9 Hi-Beat', 'SLGH021', 'Blue', 'Sport', '', 'core_icon')
add('Grand Seiko', 'Evolution 9 Hi-Beat', 'SLGH023', 'White', 'Sport', '', 'core_icon')

// Cartier Tank à Guichets (W&W 2025)
add('Cartier', 'Tank à Guichets', 'CRWGTA0097', 'Silver', 'Dress', '', 'core_icon')

// ============================================================
// P4: UNDERFILLED HOLY TRINITY + CARTIER + JLC
// ============================================================

// --- PATEK PHILIPPE (have 47, adding ~15) ---

// Nautilus more
add('Patek Philippe', 'Nautilus', '5811/1G-001', 'Blue', 'Integrated Bracelet')
add('Patek Philippe', 'Nautilus', '5811/1G-010', 'Green', 'Integrated Bracelet')
add('Patek Philippe', 'Nautilus Chronograph', '5980/1A-001', 'Blue', 'Chronograph')
add('Patek Philippe', 'Nautilus Annual Calendar', '5726/1A-014', 'Blue', 'Dress')

// Calatrava
add('Patek Philippe', 'Calatrava', '5227G-010', 'White', 'Dress')
add('Patek Philippe', 'Calatrava', '5227R-001', 'Silver', 'Dress')
add('Patek Philippe', 'Calatrava Weekly Calendar', '5212A-001', 'Blue', 'Dress')
add('Patek Philippe', 'Calatrava Pilot Travel Time', '5524G-001', 'Blue', 'Pilot')

// Aquanaut
add('Patek Philippe', 'Aquanaut', '5167A-001', 'Black', 'Sport')
add('Patek Philippe', 'Aquanaut', '5168G-010', 'Blue', 'Sport')
add('Patek Philippe', 'Aquanaut Travel Time', '5164A-001', 'Black', 'GMT')

// Complications
add('Patek Philippe', 'World Time', '5231G-001', 'Blue', 'GMT')
add('Patek Philippe', 'Complications Annual Calendar', '5205R-010', 'Blue', 'Dress')
add('Patek Philippe', 'Grand Complications Perpetual Calendar', '5320G-001', 'Cream', 'Dress')

// --- AUDEMARS PIGUET (have 34, adding ~12) ---

// Royal Oak 41mm
add('Audemars Piguet', 'Royal Oak', '15510ST.OO.1320ST.01', 'Blue', 'Integrated Bracelet')
add('Audemars Piguet', 'Royal Oak', '15510ST.OO.1320ST.02', 'Black', 'Integrated Bracelet')
add('Audemars Piguet', 'Royal Oak', '15510ST.OO.1320ST.04', 'Green', 'Integrated Bracelet')
add('Audemars Piguet', 'Royal Oak', '15510ST.OO.1320ST.07', 'Grey', 'Integrated Bracelet')

// Royal Oak Chronograph
add('Audemars Piguet', 'Royal Oak Chronograph', '26240ST.OO.1320ST.01', 'Blue', 'Chronograph')
add('Audemars Piguet', 'Royal Oak Chronograph', '26240ST.OO.1320ST.02', 'Black', 'Chronograph')

// Code 11.59
add('Audemars Piguet', 'Code 11.59', '15210BC.OO.A321CR.01', 'Blue', 'Dress')
add('Audemars Piguet', 'Code 11.59', '15210OR.OO.A028CR.01', 'Grey', 'Dress')
add('Audemars Piguet', 'Code 11.59 Chronograph', '26393BC.OO.A321CR.01', 'Blue', 'Chronograph')

// Royal Oak Offshore
add('Audemars Piguet', 'Royal Oak Offshore Diver', '15720ST.OO.A009CA.01', 'Black', 'Diver')
add('Audemars Piguet', 'Royal Oak Offshore Diver', '15720ST.OO.A027CA.01', 'Blue', 'Diver')
add('Audemars Piguet', 'Royal Oak Offshore Chronograph', '26420SO.OO.A002CA.01', 'Black', 'Chronograph')

// --- CARTIER (have 38, adding ~12) ---

// Tank
add('Cartier', 'Tank Must', 'WSTA0065', 'Silver', 'Dress')
add('Cartier', 'Tank Must', 'WSTA0072', 'Blue', 'Dress')
add('Cartier', 'Tank Française', 'WSTA0074', 'Silver', 'Dress')
add('Cartier', 'Tank Louis Cartier', 'WGTA0059', 'Silver', 'Dress')

// Santos
add('Cartier', 'Santos de Cartier', 'WSSA0029', 'White', 'Sport')
add('Cartier', 'Santos de Cartier', 'WSSA0030', 'Blue', 'Sport')
add('Cartier', 'Santos de Cartier', 'WSSA0037', 'Green', 'Sport')
add('Cartier', 'Santos-Dumont', 'WSSA0046', 'Silver', 'Dress')

// Panthère
add('Cartier', 'Panthère de Cartier', 'WSPN0007', 'Silver', 'Dress')

// Ballon Bleu
add('Cartier', 'Ballon Bleu', 'WSBB0046', 'Silver', 'Dress')
add('Cartier', 'Ballon Bleu', 'WSBB0060', 'Blue', 'Dress')

// Pasha
add('Cartier', 'Pasha de Cartier', 'WSPA0013', 'Silver', 'Dress')

// --- JAEGER-LECOULTRE (have 31, adding ~14) ---

// Reverso
add('Jaeger-LeCoultre', 'Reverso Classic', 'Q2438522', 'Silver', 'Dress')
add('Jaeger-LeCoultre', 'Reverso Classic Large', 'Q3828420', 'Blue', 'Dress')
add('Jaeger-LeCoultre', 'Reverso Classic Large Duoface', 'Q3848422', 'Silver', 'Dress')
add('Jaeger-LeCoultre', 'Reverso Tribute', 'Q3978480', 'Blue', 'Dress')
add('Jaeger-LeCoultre', 'Reverso Tribute Monoface', 'Q7132420', 'Silver', 'Dress')

// Master Control
add('Jaeger-LeCoultre', 'Master Control Date', 'Q4018420', 'Silver', 'Dress')
add('Jaeger-LeCoultre', 'Master Control Date', 'Q4018480', 'Blue', 'Dress')
add('Jaeger-LeCoultre', 'Master Control Calendar', 'Q4148420', 'Silver', 'Dress')
add('Jaeger-LeCoultre', 'Master Ultra Thin Moon', 'Q1368420', 'Silver', 'Dress')

// Polaris
add('Jaeger-LeCoultre', 'Polaris Automatic', 'Q9008480', 'Blue', 'Sport')
add('Jaeger-LeCoultre', 'Polaris Automatic', 'Q9008170', 'Black', 'Sport')
add('Jaeger-LeCoultre', 'Polaris Chronograph', 'Q9028180', 'Black', 'Chronograph')
add('Jaeger-LeCoultre', 'Polaris Mariner Date', 'Q9068670', 'Blue', 'Diver')
add('Jaeger-LeCoultre', 'Polaris Mariner Date', 'Q9068180', 'Black', 'Diver')

// ============================================================
// P5: MISSING MICROBRANDS
// ============================================================

// --- HALIOS ---
add('Halios', 'Seaforth', 'SEAFORTH-III-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Halios', 'Seaforth', 'SEAFORTH-III-BLU', 'Blue', 'Diver', '', 'reddit_under_1k_signal')
add('Halios', 'Seaforth', 'SEAFORTH-III-GRN', 'Green', 'Diver', '', 'reddit_under_1k_signal')
add('Halios', 'Universa', 'UNIVERSA-BLU', 'Blue', 'Sport', '', 'reddit_under_1k_signal')
add('Halios', 'Universa', 'UNIVERSA-GRY', 'Grey', 'Sport', '', 'reddit_under_1k_signal')
add('Halios', 'Fairwind', 'FAIRWIND-BLK', 'Black', 'Diver', '', 'reddit_under_1k_signal')

// --- KURONO TOKYO ---
add('Kurono Tokyo', 'Grand Akane', 'GRAND-AKANE', 'Red', 'Dress', '', 'reddit_under_5k_signal')
add('Kurono Tokyo', 'Bunkyō', 'BUNKYOU', 'Silver', 'Dress', '', 'reddit_under_5k_signal')
add('Kurono Tokyo', 'Shinseki', 'SHINSEKI', 'Blue', 'Dress', '', 'reddit_under_5k_signal')
add('Kurono Tokyo', 'Toki', 'TOKI', 'White', 'Dress', '', 'reddit_under_5k_signal')

// --- SERICA ---
add('Serica', '5303-3', '5303-3', 'Black', 'Field', '', 'reddit_under_1k_signal')
add('Serica', '5303-2', '5303-2', 'White', 'Field', '', 'reddit_under_1k_signal')
add('Serica', '4512', '4512-1', 'Black', 'Diver', '', 'reddit_under_1k_signal')
add('Serica', '4512', '4512-2', 'Blue', 'Diver', '', 'reddit_under_1k_signal')

// --- STUDIO UNDERD0G ---
add('Studio Underd0g', 'Dessert Sky', 'DESERT-SKY', 'Orange/Blue', 'Dress', '', 'reddit_under_500_signal')
add('Studio Underd0g', 'Watermelon', 'WATERMELON', 'Green/Red', 'Dress', '', 'reddit_under_500_signal')
add('Studio Underd0g', 'Go0fy Panda', 'GO0FY-PANDA', 'White', 'Chronograph', '', 'reddit_under_500_signal')

// ============================================================
// P6: MISC DEPTH — thin brands that need a little more
// ============================================================

// Rado (have 6, adding 5)
add('Rado', 'DiaStar Original', 'R12160253', 'Green', 'Dress')
add('Rado', 'DiaStar Original', 'R12160103', 'Silver', 'Dress')
add('Rado', 'True Thinline', 'R27972152', 'Black', 'Dress')
add('Rado', 'Captain Cook High-Tech Ceramic', 'R32127152', 'Blue', 'Diver')
add('Rado', 'HyperChrome', 'R32115153', 'Blue', 'Sport')

// Maurice Lacroix (have 5, adding 5)
add('Maurice Lacroix', 'Aikon Automatic 42', 'AI6008-SS002-530-1', 'Grey', 'Integrated Bracelet')
add('Maurice Lacroix', 'Aikon Automatic 39', 'AI6007-SS002-530-1', 'Grey', 'Integrated Bracelet')
add('Maurice Lacroix', 'Aikon Chronograph', 'AI6038-SS002-130-1', 'Blue', 'Chronograph')
add('Maurice Lacroix', 'Masterpiece Moonphase', 'MP6607-SS002-110-1', 'Silver', 'Dress')
add('Maurice Lacroix', 'Masterpiece', 'MP6807-SS002-110-1', 'Silver', 'Dress')

// Alpina (have 4, adding 4)
add('Alpina', 'Alpiner 4 Automatic', 'AL-525NS5AQ6', 'Blue', 'Sport')
add('Alpina', 'Alpiner 4 Automatic', 'AL-525BS5AQ6', 'Black', 'Sport')
add('Alpina', 'Startimer Pilot Heritage', 'AL-435S4SH6', 'Black', 'Pilot')
add('Alpina', 'Seastrong Diver Extreme', 'AL-525LBN4VE6', 'Blue', 'Diver')

// Luminox (have 4, adding 4)
add('Luminox', 'Navy SEAL 3500 Series', 'XS.3502.BO', 'Black', 'Diver')
add('Luminox', 'Pacific Diver', 'XS.3121.BO', 'Black', 'Diver')
add('Luminox', 'Atacama Field', 'XL.1764', 'Black', 'Field')
add('Luminox', 'ICE-SAR Arctic', 'XL.1007.ICE', 'White', 'Diver')

// A. Lange & Söhne (have ~26, adding 6 — too thin for its stature)
add('A. Lange & Söhne', 'Lange 1', '191.032', 'Silver', 'Dress')
add('A. Lange & Söhne', 'Lange 1', '191.039', 'Blue', 'Dress')
add('A. Lange & Söhne', 'Saxonia', '219.028', 'Silver', 'Dress')
add('A. Lange & Söhne', 'Saxonia Thin', '201.027', 'Blue', 'Dress')
add('A. Lange & Söhne', '1815 Chronograph', '414.028', 'Silver', 'Chronograph')
add('A. Lange & Söhne', 'Odysseus', '363.068', 'Blue', 'Sport')

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

console.log(`\n=== Batch 4 Seed Generated ===`)
console.log(`Total entries defined: ${entries.length}`)
console.log(`Duplicates (skipped): ${dupes}`)
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
