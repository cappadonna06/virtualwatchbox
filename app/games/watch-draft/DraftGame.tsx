'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { boards, boardFor, budgets, draftUrl, money, type Board, type Budget } from './boards'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

export default function DraftGame() {
  const query = useSearchParams()
  const board = boardFor(query.get('board'))
  const budget = budgets.find(value => String(value) === query.get('budget')) ?? board.budget
  return <Game board={board} budget={budget} initialPicks={query.get('picks')} />
}

function Game({ board, budget: initialBudget, initialPicks }: { board: Board; budget: Budget; initialPicks: string | null }) {
  const [active, setActive] = useState(board)
  const [budget, setBudget] = useState(initialBudget)
  const [picks, setPicks] = useState(() => {
    const requested = new Set(initialPicks?.split(','))
    return board.groups.flatMap(group => group.watches.filter(watch => requested.has(watch.id)).slice(0, board.id === 'region' ? 5 : 1).map(watch => watch.id)).slice(0, 5)
  })
  const [copy, setCopy] = useState<'ready' | 'copied' | 'manual'>('ready')
  const watches = active.groups.flatMap(group => group.watches)
  const lineup = watches.filter(watch => picks.includes(watch.id))
  const total = lineup.reduce((sum, watch) => sum + watch.price, 0)
  const remaining = budget - total
  const hasEveryGroup = active.groups.every(group => group.watches.some(watch => picks.includes(watch.id)))
  const complete = lineup.length === 5 && hasEveryGroup && remaining >= 0
  const sharePath = draftUrl(active, budget, lineup.map(watch => watch.id))

  function changeBoard(next: Board) {
    setActive(next)
    setBudget(next.budget)
    setPicks([])
    setCopy('ready')
    window.history.replaceState(null, '', draftUrl(next, next.budget))
  }

  function changeBudget(next: Budget) {
    setBudget(next)
    setCopy('ready')
    window.history.replaceState(null, '', draftUrl(active, next, picks))
  }

  function updatePicks(next: string[]) {
    setPicks(next)
    setCopy('ready')
    window.history.replaceState(null, '', draftUrl(active, budget, next))
  }

  function toggle(id: string, group: Board['groups'][number]) {
    if (picks.includes(id)) {
      updatePicks(picks.filter(pick => pick !== id))
      return
    }
    const kept = active.id === 'region' ? picks : picks.filter(pick => !group.watches.some(watch => watch.id === pick))
    if (kept.length < 5) updatePicks([...kept, id])
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(sharePath, window.location.origin).href)
      setCopy('copied')
    } catch {
      setCopy('manual')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Virtual Watchbox presents</p>
          <h1>The Watch<br /> <em>Draft.</em></h1>
          <p>Build a five-watch collection on a real-world budget. What makes your lineup?</p>
          <a className={styles.jump} href="#draft-board">Start drafting ↓</a>
        </div>
        <div className={styles.heroImages} aria-hidden="true">
          {[boards[0].groups[0].watches[0], boards[0].groups[2].watches[2], boards[0].groups[4].watches[3]].map(watch => <WatchPhoto key={watch.id} src={watch.image} eager />)}
        </div>
      </header>

      <section className={styles.game} id="draft-board" aria-label="Watch draft">
        <div className={styles.controls}>
          <div className={styles.options} role="group" aria-label="Board">
            {boards.map(item => <button type="button" key={item.id} aria-pressed={item.id === active.id} onClick={() => { if (item.id !== active.id) changeBoard(item) }}>{item.label}</button>)}
          </div>
          <div className={styles.options} role="group" aria-label="Budget">
            {budgets.map(value => <button type="button" key={value} aria-pressed={value === budget} onClick={() => changeBudget(value)}>{money(value)}</button>)}
          </div>
        </div>

        <div className={styles.intro}>
          <h2>{active.title}</h2>
          <p>{active.rule} Stay within {money(budget)}.</p>
        </div>

        <div className={styles.status}>
          <div aria-live="polite"><strong>{lineup.length} / 5</strong><span>Watches picked</span></div>
          <div><strong>{money(total)}</strong><span>Spent</span></div>
          <div aria-live="polite" data-over={remaining < 0}><strong>{money(Math.abs(remaining))}</strong><span>{remaining < 0 ? 'Over budget' : 'Left to spend'}</span></div>
        </div>

        <div className={styles.grid} data-region={active.id === 'region'}>
          {active.groups.map(group => (
            <section className={styles.group} key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              <div className={styles.watches}>
                {group.watches.map(watch => {
                  const picked = picks.includes(watch.id)
                  const disabled = active.id === 'region' && !picked && picks.length >= 5
                  return (
                    <button className={styles.watch} key={watch.id} type="button" aria-pressed={picked} disabled={disabled} onClick={() => toggle(watch.id, group)}>
                      <span className={styles.watchImage}><WatchPhoto src={watch.image} /><span className={styles.check} aria-hidden="true">{picked ? '✓' : '+'}</span></span>
                      <span className={styles.watchBrand}>{watch.brand}</span>
                      <strong>{watch.model}</strong>
                      <span className={styles.price}>{money(watch.price)}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className={styles.lineup}>
          <div>
            <h3>Your lineup</h3>
            {lineup.length > 0 && <ol>{lineup.map(watch => <li key={watch.id}>{watch.brand} {watch.model} <span>{money(watch.price)}</span></li>)}</ol>}
            <p aria-live="polite">{lineup.length < 5 ? 'Pick five watches to share a lineup.' : remaining < 0 ? 'Swap or remove a watch to get back under budget.' : !hasEveryGroup ? 'Swap a pick to include all three countries.' : 'Lineup complete. Share it and see what others would swap.'}</p>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => updatePicks([])} disabled={!lineup.length}>Clear picks</button>
            <button type="button" onClick={share} disabled={!complete}>{copy === 'copied' ? 'Link copied' : 'Copy lineup link'}</button>
          </div>
          {copy === 'manual' && <input className={styles.shareInput} aria-label="Lineup link" readOnly value={new URL(sharePath, window.location.origin).href} onFocus={event => event.currentTarget.select()} />}
        </div>

        <details className={styles.sources}>
          <summary>How watches are priced</summary>
          <p>Approximate U.S. pre-owned values, rounded and fixed for this edition. Checked November 14, 2026. Taxes and shipping excluded.</p>
          <ul>{watches.map(watch => <li key={watch.id}><a href={watch.source} target="_blank" rel="noreferrer">{watch.brand} {watch.model} ({watch.reference})</a></li>)}</ul>
        </details>
      </section>

      <section className={styles.social} aria-labelledby="social-heading">
        <h2 id="social-heading">Social post drafts</h2>
        <p>Each card is playable on its own. The interactive boards have more picks and budget options.</p>
        <div className={styles.socialGrid}>
          {boards.map(item => (
            <article key={item.id}>
              <a href={`/watch-draft/${item.id}.png`} aria-label={`Open ${item.title} social card`}><img src={`/watch-draft/${item.id}.png`} alt={`${item.title} watch draft board for ${money(item.budget)}`} width={1080} height={1350} loading="lazy" /></a>
              <h3>{item.title} · {money(item.budget)}</h3>
              <p>{item.prompt}</p>
              <div className={styles.socialLinks}><a href={`/watch-draft/${item.id}.png`} download>Download PNG</a><a href={draftUrl(item, item.budget)}>Play this board</a></div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
