import { notFound } from 'next/navigation'
import { boards, money } from '../../boards'
import WatchPhoto from '../../WatchPhoto'
import styles from '../../draft.module.css'

export const metadata = { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }

export function generateStaticParams() {
  return boards.map(board => ({ board: board.id }))
}

export default function Poster({ params }: { params: { board: string } }) {
  const board = boards.find(item => item.id === params.board)
  if (!board) notFound()

  const groups = board.groups.map(group => {
    if (board.id === 'region') return group
    const reserve = board.groups
      .filter(other => other !== group)
      .reduce((total, other) => total + Math.min(...other.watches.map(watch => watch.price)), 0)
    const eligible = group.watches.filter(watch => watch.price + reserve <= board.budget)
    const watches = eligible.length > 3 ? [...eligible.slice(0, 2), eligible[eligible.length - 1]] : eligible
    return { ...group, watches }
  })

  return (
    <article className={styles.poster} data-poster data-region={board.id === 'region'} data-board={board.id}>
      <header>
        <div className={styles.posterTop}><span>VIRTUAL WATCHBOX</span><span>{board.title.toUpperCase()}</span></div>
        <p className={styles.posterTitle}>The Watch <em>Draft</em></p>
        <h1>{money(board.budget)} <span>for five watches</span></h1>
        <p>{board.rule} Stay within budget.</p>
      </header>
      <div className={styles.posterGrid}>
        {groups.map(group => (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {group.watches.map(watch => (
              <div className={styles.posterWatch} key={watch.id}>
                <WatchPhoto src={watch.image} eager />
                <span>{watch.brand}</span>
                <strong>{watch.model}</strong>
                <b>{money(watch.price)}</b>
              </div>
            ))}
          </section>
        ))}
      </div>
      <footer><strong>Drop your five and your total.</strong><span>Rounded pre-owned USD estimates · Nov 2026</span></footer>
    </article>
  )
}
