import type { CSSProperties } from 'react'
import type { Watch } from './boards'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

// Top and bottom of the crop, as percentages of the source. Keep the full case
// and lugs, with a short section of bracelet or strap showing at both ends.
const crops: Record<string, [number, number]> = {
  'seiko-hbc006': [11, 85],
  'tudor-m79000b-0001': [10, 85],
  'omega-310-30-42-50-01-001': [12, 79],
  'grand-seiko-sbga211': [11, 79],
  'omega-210-30-42-20-01-001': [12, 79],
  'omega-220-10-38-20-03-001': [12, 79],
  'grand-seiko-sbgj001': [10, 82],
  'omega-3510-80-00': [12, 79],
  'cartier-wsta0041': [17, 75],
  'tudor-m25407n-0001': [11, 81],
  'iwc-iw327001': [10, 87],
  'grand-seiko-sbgm221': [9, 80],
  'omega-3510-50-00': [14, 86],
  'longines-l2-919-4-78-3': [11, 80],
  'tudor-m79030n-0001': [11, 83],
  'tudor-m79950-0001': [11, 79],
  'tudor-m79830rb-0001': [9, 84],
  'hamilton-h38416711': [17, 80],
  'nomos-glashutte-101': [12, 85],
  'longines-l3-781-4-96-6': [13, 81],
  'longines-l3-830-4-52-6': [14, 81],
  'longines-l3-812-4-63-6': [12, 80],
  'seiko-ssc813': [14, 86],
  'seiko-sarb065': [10, 83],
  'seiko-srp777': [11, 84],
  'hamilton-h70405730': [16, 80],
  'seiko-ssk003': [12, 89],
  'tudor-m7939g1a0nru-0003': [12, 84],
  'longines-l3-821-4-53-6': [12, 82],
  'oris-01-793-7775-8734-set': [8, 78],
  'sinn-900-011': [11, 87],
  'longines-l3-820-4-73-2': [11, 80],
  'oris-01-400-7769-6355-07-4-22-75fc': [12, 80],
  'sinn-358-061': [12, 86],
  'oris-01-111-7700-4061-set-1-23-71fc': [11, 84],
  'sinn-140-020': [12, 85],
  'omega-2517-50-00': [12, 81],
  'longines-l4-815-4-78-2': [11, 80],
  'oris-01-754-7741-4065-07-8-20-22': [10, 81],
  'sinn-103-061': [10, 84],
  'omega-2561-80-00': [15, 82],
  'tudor-m91350-0001': [10, 89],
  'oris-01-733-7707-4064-07-8-20-18': [10, 85],
  'sinn-556-014': [15, 90],
  'cartier-wsnm0004': [10, 83],
  'glashutte-original-1-39-52-01-02-04': [15, 85],
  'seiko-sbdx014g': [9, 79],
  'seiko-sbdx017': [10, 84],
  'grand-seiko-sbga201': [10, 82],
  'nomos-180': [12, 86],
  'seiko-spb151': [12, 84],
  'seiko-srpc43': [11, 87],
  'tissot-t137-410-11-041-00': [14, 82],
  'tissot-t127-407-11-041-00': [10, 82],
  'nomos-737': [14, 86],
}

const captions: Record<string, string> = {
  'Black Bay 54 Blue': 'BB 54 Blue',
  '5 Sports GMT': 'Seiko GMT',
  'Aqua Terra 38': 'Aqua Terra',
  'HydroConquest': 'HydroConq.',
  'Intra-Matic Chrono': 'Intra-Matic',
  'Master Moonphase': 'Moonphase',
  'Seamaster 300M': 'Seamaster',
  'Speedmaster Blue': 'Blue Speedy',
  'Speedmaster Moonwatch': 'Moonwatch',
  'Speedmaster Reduced': 'Speedy Red.',
  'Spirit Zulu Time': 'Zulu Time',
  'Black Bay 58 GMT': 'BB 58 GMT',
  'Spirit Flyback': 'Flyback',
  'ProPilot Coulson': 'ProPilot',
  'Spirit Chronograph': 'Spirit Chrono',
  'Aquis Calibre 400': 'Aquis 400',
  'Artelier Calibre 111': 'Artelier 111',
  '140 St Space Chrono': '140 Space',
  'Aqua Terra Quartz': 'Aqua Terra Q',
  'Flagship Heritage': 'Flagship',
  'Big Crown Pointer Date': 'Big Crown',
  'Seamaster Quartz': 'Seamaster Q',
  'Divers Sixty-Five': 'Divers 65',
  'Drive de Cartier': 'Drive',
  'Marinemaster 300': 'Marinemaster',
  'Tangente Update': 'Tangente',
  'Presage Star Bar': 'Star Bar',
  'Gentleman Auto': 'Gentleman',
  'Club Campus 38': 'Club Campus',
}

export default function DraftDial({ watch, showCaption = true }: { watch: Watch; showCaption?: boolean }) {
  const [top, bottom] = crops[watch.id] ?? [12, 84]
  const span = bottom - top
  const cropStyle = {
    '--photo-height': `${10000 / span}%`,
    '--photo-offset': `${-100 * top / span}%`,
  } as CSSProperties

  return (
    <>
      <span className={styles.dial} style={cropStyle}><WatchPhoto src={watch.image} eager /></span>
      {showCaption && <strong className={styles.caption}>{captions[watch.model] ?? watch.model}</strong>}
    </>
  )
}
