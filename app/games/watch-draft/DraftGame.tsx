'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createPlaygroundBox, createPlaygroundEntry } from '@/lib/playground'
import { encodePlaygroundShare, playgroundShareCardPath } from '@/lib/playgroundShare'
import { budgets, draftName, draftTags, type Budget } from '@/lib/watchDraftChallenge'
import { boards, boardFor, draftUrl, draftGrid, money, type Board } from './boards'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

export default function DraftGame() {
  const query = useSearchParams()
  const board = boardFor(query.get('board'))
  const budget = budgets.find(value => String(value) === query.get('budget')) ?? board.budget
  return <Game board={board} budget={budget} initialPicks={query.get('picks')} showResult={query.get('view') === 'result'} />
}

function Game({ board, budget: initialBudget, initialPicks, showResult }: { board: Board; budget: Budget; initialPicks: string | null; showResult: boolean }) {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const { dataLoading, migrationPending, playgroundHydrated, setPlaygroundBoxes } = useCollectionSession()
  const creating = useRef(false)
  const [interactive, setInteractive] = useState(false)
  useEffect(() => setInteractive(true), [])
  const [saving, setSaving] = useState(false)
  const [active, setActive] = useState(board)
  const [budget, setBudget] = useState(initialBudget)
  const [picks, setPicks] = useState(() => {
    const requested = new Set(initialPicks?.split(','))
    const eligible = new Set(draftGrid(board, initialBudget).flatMap(row => row.cells.flat().map(watch => watch.id)))
    return board.groups.flatMap(group => group.watches.filter(watch => requested.has(watch.id) && eligible.has(watch.id)).slice(0, board.id === 'region' ? 5 : 1).map(watch => watch.id)).slice(0, 5)
  })
  const [copyFeedback, setCopyFeedback] = useState('')
  const [copyFallback, setCopyFallback] = useState('')
  const rows = draftGrid(active, budget)
  const watches = rows.flatMap(row => row.cells.flat())
  const lineup = watches.filter(watch => picks.includes(watch.id))
  const total = lineup.reduce((sum, watch) => sum + watch.tier, 0)
  const remaining = budget - total
  const hasEveryGroup = active.groups.every(group => group.watches.some(watch => picks.includes(watch.id)))
  const complete = lineup.length === 5 && hasEveryGroup && remaining >= 0
  const sharePath = draftUrl(active, budget, lineup.map(watch => watch.id)) + '&view=result'
  const challenge = { board: active.id, budget }
  const name = draftName(challenge)
  // The shared image uses the same six-slot layout as a saved Playground box.
  const resultCardToken = complete ? encodePlaygroundShare({
    frame: 'light-oak',
    lining: 'cream',
    slotCount: 6,
    entries: lineup.map((watch, slot) => ({ slot, watchId: watch.id })),
    challenge,
  }) : null

  function resetShareFeedback() {
    setCopyFeedback('')
    setCopyFallback('')
  }

  function changeBoard(next: Board) {
    setActive(next)
    setBudget(next.budget)
    setPicks([])
    resetShareFeedback()
    window.history.replaceState(null, '', draftUrl(next, next.budget))
  }

  function changeBudget(next: Budget) {
    const eligible = new Set(draftGrid(active, next).flatMap(row => row.cells.flat().map(watch => watch.id)))
    const kept = picks.filter(id => eligible.has(id))
    setBudget(next)
    setPicks(kept)
    resetShareFeedback()
    window.history.replaceState(null, '', draftUrl(active, next, kept))
  }

  function updatePicks(next: string[]) {
    setPicks(next)
    resetShareFeedback()
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

  const canSave = interactive && complete && !authLoading && !dataLoading && !migrationPending && playgroundHydrated

  function saveBox() {
    if (!canSave || creating.current) return
    creating.current = true
    setSaving(true)
    const box = createPlaygroundBox({
      name,
      tags: draftTags(challenge),
      entries: lineup.map((watch, slot) => createPlaygroundEntry(watch.id, undefined, undefined, slot)),
    })
    setPlaygroundBoxes(previous => [...previous, box])
    router.push(`/playground?boxId=${box.id}`)
  }

  async function copyResult(withPicks: boolean) {
    const url = new URL(sharePath, window.location.origin).href
    const text = withPicks ? [
      `My ${name} · ${active.title}`,
      ...lineup.map(watch => `• ${watch.brand} ${watch.model} · ${money(watch.tier)}`),
      `${money(total)} of ${money(budget)} spent`,
      `See my picks or draft your own: ${url}`,
    ].join('\n') : url
    resetShareFeedback()
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(withPicks ? 'Picks and link copied.' : 'Lineup link copied.')
    } catch {
      setCopyFallback(text)
    }
  }

  const ResultHeading = showResult && complete ? 'h1' : 'h2'
  const result = (
    <section className={styles.lineup} id="draft-result" aria-labelledby="draft-result-heading">
      <div className={styles.resultHeading}>
        <div>
          <ResultHeading id="draft-result-heading">{complete ? name : 'Your lineup'}</ResultHeading>
          <p aria-live="polite">
            {complete ? `${active.title} · ${money(total)} spent of ${money(budget)}` :
              lineup.length < 5 ? 'Pick five watches to share a lineup.' :
              remaining < 0 ? 'Swap or remove a watch to get back under budget.' : 'Swap a pick to include all three countries.'}
          </p>
        </div>
        {showResult && complete && <a className={styles.resultLink} href={draftUrl(active, budget)}>Build your own lineup →</a>}
      </div>
      <div className={styles.actions}>
        {complete && <button className={styles.primaryAction} type="button" onClick={() => copyResult(true)} disabled={!interactive}>Copy picks + link</button>}
        {complete && <button type="button" onClick={() => copyResult(false)} disabled={!interactive}>Copy lineup link</button>}
        {resultCardToken && <a href={playgroundShareCardPath(resultCardToken)} download="my-watch-draft.png">Download lineup image</a>}
        {complete && <button type="button" onClick={saveBox} disabled={!canSave || saving}>{saving ? 'Opening Playground…' : 'Create Playground box'}</button>}
        {lineup.length > 0 && !showResult && <button type="button" onClick={() => updatePicks([])}>Clear picks</button>}
      </div>
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {copyFallback && <>
        <p>Copy your results from this field.</p>
        <textarea className={styles.shareInput} aria-label="Copyable draft result" readOnly value={copyFallback} rows={copyFallback.includes('\n') ? 8 : 2} onFocus={event => event.currentTarget.select()} />
      </>}
      {lineup.length > 0 && (
        <ol className={styles.resultPicks}>
          {lineup.map(watch => (
            <li key={watch.id}>
              <WatchPhoto src={watch.image} eager={showResult} />
              <span>{watch.brand}</span>
              <strong>{watch.model}</strong>
              <b>{money(watch.tier)}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  )

  return (
    <div className={styles.page}>
      {showResult && complete ? <div className={styles.resultFirst}>{result}</div> : <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Virtual Watchbox presents</p>
          <h1>The Watch<br /> <em>Draft.</em></h1>
          <p>Build a five-watch collection on a real-world budget. What makes your lineup?</p>
          <a className={styles.jump} href="#draft-board">Start drafting ↓</a>
        </div>
        <div className={styles.heroImages} aria-hidden="true">
          {[boards[0].groups[0].watches[0], boards[0].groups[2].watches[2], boards[0].groups[4].watches[3]].map(watch => <WatchPhoto key={watch.id} src={watch.image} eager />)}
        </div>
      </header>}

      <section className={styles.game} id="draft-board" aria-label="Watch draft">
        <div className={styles.controls}>
          <div className={styles.options} role="group" aria-label="Board">
            {boards.map(item => <button type="button" key={item.id} aria-pressed={item.id === active.id} disabled={!interactive} onClick={() => { if (item.id !== active.id) changeBoard(item) }}>{item.label}</button>)}
          </div>
          <div className={styles.options} role="group" aria-label="Budget">
            {budgets.map(value => <button type="button" key={value} aria-pressed={value === budget} disabled={!interactive} onClick={() => changeBudget(value)}>{money(value)}</button>)}
          </div>
        </div>

        <div className={styles.intro}>
          <h2>{active.title}</h2>
          <p>{active.rule} You can pick from the same price tier more than once.</p>
        </div>

        <div className={styles.status}>
          <div aria-live="polite"><strong>{lineup.length} / 5</strong><span>Watches picked</span></div>
          <div><strong>{money(total)}</strong><span>Spent</span></div>
          <div aria-live="polite" data-over={remaining < 0}><strong>{money(Math.abs(remaining))}</strong><span>{remaining < 0 ? 'Over budget' : 'Left to spend'}</span></div>
          {complete && !showResult && <a href="#draft-result" className={styles.resultsJump}>View and share picks ↓</a>}
        </div>

        <p className={styles.scrollHelp} id="draft-scroll-help">Scroll the board to see all categories and tiers.</p>
        <div className={styles.boardScroll} tabIndex={0} role="region" aria-label="Draft board" aria-describedby="draft-scroll-help">
          <table className={styles.matrix} data-region={active.id === 'region'}>
            <thead><tr><th scope="col">Tier</th>{active.groups.map(group => <th key={group.title} scope="col">{group.title}</th>)}</tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.price}>
                  <th scope="row"><span>{money(row.price)}</span></th>
                  {row.cells.map((cell, index) => (
                    <td key={active.groups[index].title}>
                      <div className={styles.cellWatches}>
                        {cell.map(watch => {
                          const picked = picks.includes(watch.id)
                          const disabled = !interactive || (active.id === 'region' && !picked && picks.length >= 5)
                          return (
                            <button
                              className={styles.watch}
                              key={watch.id}
                              type="button"
                              aria-label={`${watch.brand} ${watch.model}, ${active.groups[index].title}, ${money(row.price)} tier`}
                              aria-pressed={picked}
                              disabled={disabled}
                              onClick={() => toggle(watch.id, active.groups[index])}
                            >
                              <span className={styles.watchImage}><WatchPhoto src={watch.image} /><span className={styles.check} aria-hidden="true">{picked ? '✓' : '+'}</span></span>
                              <span className={styles.watchBrand}>{watch.brand}</span>
                              <strong>{watch.model}</strong>
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!(showResult && complete) && result}

        <details className={styles.sources}>
          <summary>How watches are priced</summary>
          <p>Draft prices use whole-dollar tiers based on approximate U.S. pre-owned values checked November 14, 2026. Tiers are set for each budget. Taxes and shipping excluded.</p>
          <ul>{watches.map(watch => <li key={watch.id}><a href={watch.source} target="_blank" rel="noreferrer">{watch.brand} {watch.model} ({watch.reference})</a></li>)}</ul>
        </details>
      </section>

      <section className={styles.social} aria-labelledby="social-heading">
        <h2 id="social-heading">Social post drafts</h2>
        <p>The social cards use the same tiers and show a selection of watches from the interactive boards.</p>
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
