import type { CSSProperties } from 'react'
import type { Watch } from './boards'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

// Top and bottom of the crop, as percentages of the source. Keep the full case
// and lugs, with a short section of bracelet or strap showing at both ends.
const crops: Record<string, [number, number]> = {
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
}

const captions: Record<string, string> = {
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
