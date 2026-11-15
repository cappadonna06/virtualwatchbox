import { notFound } from 'next/navigation'
import { boards, draftGrid, money } from '../../boards'
import WatchPhoto from '../../WatchPhoto'
import styles from '../../draft.module.css'

export const metadata = { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } }

export function generateStaticParams() {
  return boards.map(board => ({ board: board.id }))
}

export default function Poster({ params }: { params: { board: string } }) {
  const board = boards.find(item => item.id === params.board)
  if (!board) notFound()

  const rows = draftGrid(board, board.budget)
    .map(row => ({
      ...row,
      cells: row.cells.map(cell => [...cell]
        .sort((a, b) => Math.abs(a.price - row.price) - Math.abs(b.price - row.price))
        .slice(0, board.id === 'region' ? 2 : 1)),
    }))

  return (
    <article className={styles.poster} data-poster data-region={board.id === 'region'} data-board={board.id}>
      <header>
        <div className={styles.posterTop}><span>VIRTUAL WATCHBOX</span><span>{board.title.toUpperCase()}</span></div>
        <p className={styles.posterTitle}>The Watch <em>Draft</em></p>
        <h1>{money(board.budget)} <span>for five watches</span></h1>
        <p>{board.rule} Repeat tiers if you like.</p>
      </header>
      <table className={styles.posterGrid} aria-label="Price tiers and eligible watches">
        <thead><tr><th scope="col">Tier</th>{board.groups.map(group => <th scope="col" key={group.title}>{group.title}</th>)}</tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.price}>
              <th scope="row">{money(row.price)}</th>
              {row.cells.map((cell, index) => (
                <td key={board.groups[index].title}>
                  <div className={styles.posterCell} data-pair={cell.length === 2}>
                    {cell.map(watch => <div className={styles.posterWatch} key={watch.id}>
                      <WatchPhoto src={watch.image} eager />
                      <span>{watch.brand}</span>
                      <strong>{watch.model}</strong>
                    </div>)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <footer><strong>Drop your five and your total.</strong><span>USD tiers based on pre-owned prices · Nov 2026</span></footer>
    </article>
  )
}
