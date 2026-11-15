import Image from 'next/image'
import styles from './draft.module.css'

export default function WatchPhoto({ src, eager = false }: { src: string | undefined; eager?: boolean }) {
  return src ? <Image className={styles.photo} src={src} alt="" width={140} height={160} unoptimized loading={eager ? 'eager' : 'lazy'} /> : null
}
