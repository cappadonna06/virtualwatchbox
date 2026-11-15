'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createPlaygroundBox, createPlaygroundEntry } from '@/lib/playground'
import { encodePlaygroundShare, playgroundShareCardPath } from '@/lib/playgroundShare'
import { budgets, draftName, draftTags, type Budget } from '@/lib/watchDraftChallenge'
import { boardFor, dreamBox, dreamRows, dreamUrl, draftUrl, draftGrid, money, type Board } from './boards'
import DraftDial from './DraftDial'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

export default function DraftGame() {
  const query = useSearchParams()
  const initialPicks = query.get('picks')
  const legacy = Boolean(initialPicks && query.get('edition') !== 'dream-box')
  const board = legacy ? boardFor(query.get('board')) : dreamBox
  const budget = legacy
    ? budgets.find(value => String(value) === query.get('budget')) ?? board.budget
    : dreamBox.budget
  return <Game board={board} budget={budget} initialPicks={initialPicks} legacy={legacy} showResult={query.get('view') === 'result'} />
}

function Game({ board, budget, initialPicks, legacy, showResult }: { board: Board; budget: Budget; initialPicks: string | null; legacy: boolean; showResult: boolean }) {
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const { dataLoading, migrationPending, playgroundHydrated, setPlaygroundBoxes } = useCollectionSession()
  const creating = useRef(false)
  const shareDialog = useRef<HTMLDialogElement>(null)
  const [interactive, setInteractive] = useState(false)
  useEffect(() => setInteractive(true), [])
  const [saving, setSaving] = useState(false)
  const watches = legacy ? draftGrid(board, budget).flatMap(row => row.cells.flat()) : dreamRows.flatMap(row => row.cells)
  const [picks, setPicks] = useState(() => {
    const requested = new Set(initialPicks?.split(','))
    const eligible = new Set(watches.map(watch => watch.id))
    return board.groups.flatMap(group => group.watches
      .filter(watch => requested.has(watch.id) && eligible.has(watch.id))
      .slice(0, board.id === 'region' ? 5 : 1)
      .map(watch => watch.id)).slice(0, 5)
  })
  const [copyFeedback, setCopyFeedback] = useState('')
  const [copyFallback, setCopyFallback] = useState('')
  const lineup = watches.filter(watch => picks.includes(watch.id))
  const slots = board.groups.map(group => lineup.find(watch => group.watches.some(option => option.id === watch.id)))
  const total = lineup.reduce((sum, watch) => sum + watch.tier, 0)
  const remaining = budget - total
  const complete = lineup.length === 5 && slots.every(Boolean) && remaining >= 0
  const displayedLineup = legacy ? lineup : slots.flatMap(watch => watch ? [watch] : [])
  const sharePath = (legacy ? draftUrl(board, budget, picks) : dreamUrl(picks)) + '&view=result'
  const challenge = { board: board.id, budget }
  const name = draftName(challenge)
  // The shared image uses the same six-slot layout as a saved Playground box.
  const resultCardToken = complete ? encodePlaygroundShare({
    frame: 'light-oak',
    lining: 'cream',
    slotCount: 6,
    entries: displayedLineup.map((watch, slot) => ({ slot, watchId: watch.id })),
    challenge,
  }) : null

  function resetShareFeedback() {
    setCopyFeedback('')
    setCopyFallback('')
  }

  function updatePicks(next: string[]) {
    setPicks(next)
    resetShareFeedback()
    window.history.replaceState(null, '', dreamUrl(next))
  }

  function toggle(id: string, group: Board['groups'][number]) {
    const kept = picks.filter(pick => !group.watches.some(watch => watch.id === pick))
    updatePicks(picks.includes(id) ? kept : [...kept, id])
  }

  const canSave = interactive && complete && !authLoading && !dataLoading && !migrationPending && playgroundHydrated

  function saveBox() {
    if (!canSave || creating.current) return
    creating.current = true
    setSaving(true)
    const box = createPlaygroundBox({
      name,
      tags: draftTags(challenge),
      entries: displayedLineup.map((watch, slot) => createPlaygroundEntry(watch.id, undefined, undefined, slot)),
    })
    setPlaygroundBoxes(previous => [...previous, box])
    router.push(`/playground?boxId=${box.id}`)
  }

  async function copyResult(withPicks: boolean) {
    const url = new URL(sharePath, window.location.origin).href
    const text = withPicks ? [
      `My ${name} · ${board.title}`,
      ...displayedLineup.map(watch => `• ${watch.brand} ${watch.model} · ${money(watch.tier)}`),
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

  const resultPage = legacy || (showResult && complete)
  const ResultHeading = resultPage ? 'h1' : 'h2'
  const result = (
    <section className={styles.lineup} id="draft-result" aria-labelledby="draft-result-heading">
      <div className={styles.resultHeading}>
        <div>
          <ResultHeading id="draft-result-heading">{complete ? name : 'Your lineup'}</ResultHeading>
          <p aria-live="polite">
            {complete ? `${board.title} · ${money(total)} spent of ${money(budget)}` :
              lineup.length < 5 ? 'Pick five watches to share a lineup.' :
              remaining < 0 ? 'Swap or remove a watch to get back under budget.' : 'Swap a pick to include all three countries.'}
          </p>
        </div>
        {resultPage && <a className={styles.resultLink} href={dreamUrl()}>Play the $15,000 draft →</a>}
      </div>
      <div className={styles.actions}>
        {complete && <button className={styles.primaryAction} type="button" onClick={() => copyResult(true)} disabled={!interactive}>Copy picks + link</button>}
        {complete && <button type="button" onClick={() => copyResult(false)} disabled={!interactive}>Copy lineup link</button>}
        {resultCardToken && <a href={playgroundShareCardPath(resultCardToken)} download="my-watch-draft.png">Download lineup image</a>}
        {complete && <button type="button" onClick={saveBox} disabled={!canSave || saving}>{saving ? 'Opening Playground…' : 'Create Playground box'}</button>}

      </div>
      {copyFeedback && <p role="status">{copyFeedback}</p>}
      {copyFallback && <>
        <p>Copy your results from this field.</p>
        <textarea className={styles.shareInput} aria-label="Copyable draft result" readOnly value={copyFallback} rows={copyFallback.includes('\n') ? 8 : 2} onFocus={event => event.currentTarget.select()} />
      </>}
      {lineup.length > 0 && (
        <ol className={styles.resultPicks}>
          {displayedLineup.map(watch => (
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
      {resultPage ? <div className={styles.resultFirst}>{result}</div> : (
        <section className={styles.game} id="draft-board" aria-label="Watch draft">
          <header className={styles.gameHeader}>
            <h1>The Watch Draft</h1>
            <p><strong>{money(budget)}</strong> · One pick per column</p>
          </header>

          <div className={styles.board} role="region" aria-label="Draft board">
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th scope="col">Tier</th>
                  {board.groups.map(group => <th key={group.title} scope="col">{group.title === 'Chronograph' ? <abbr title="Chronograph">Chrono</abbr> : group.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {dreamRows.map(row => (
                  <tr key={row.price}>
                    <th scope="row" aria-label={money(row.price)}>${row.price / 1000}k</th>
                    {row.cells.map((watch, index) => {
                      const group = board.groups[index]
                      const picked = picks.includes(watch.id)
                      const label = `${watch.brand} ${watch.model}, ${group.title}, ${money(row.price)} tier`
                      return (
                        <td key={group.title}>
                          <button className={styles.watch} type="button" aria-label={label} title={label}
                            aria-pressed={picked} disabled={!interactive} onClick={() => toggle(watch.id, group)}>
                            <DraftDial watch={watch} />
                            {picked && <span className={styles.check} aria-hidden="true">✓</span>}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <section className={styles.dock} aria-label="Your picks">
              <ol className={styles.pickTray}>
                <li className={styles.trayLabel} aria-hidden="true">Your<br />box</li>
                {slots.map((watch, index) => {
                  const group = board.groups[index]
                  const title = group.title === 'Chronograph' ? 'Chrono' : group.title
                  return (
                    <li className={styles.pickSlot} key={group.title}>
                      {watch ? (
                        <button className={styles.watch} type="button" title={`Remove ${watch.brand} ${watch.model}`}
                          aria-label={`Remove ${watch.brand} ${watch.model} from ${group.title}`}
                          onClick={() => toggle(watch.id, group)}>
                          <DraftDial watch={watch} />
                        </button>
                      ) : <span className={styles.emptyPick} role="img" aria-label={`Empty ${group.title} slot`}><span aria-hidden="true">+</span></span>}
                      <span className={styles.pickCategory}>{title}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          </div>

          <div className={styles.gameFooter}>
            <span className={styles.count} aria-live="polite"><strong>{lineup.length}/5</strong> picked</span>
            <span className={styles.balance} data-over={remaining < 0} aria-live="polite">
              <strong>{money(Math.abs(remaining))}</strong> {remaining < 0 ? 'over' : 'left'}
            </span>
            <button type="button" disabled={!lineup.length} onClick={() => updatePicks([])}>Reset</button>
            <button className={styles.shareButton} type="button" disabled={!complete} onClick={() => shareDialog.current?.showModal()}>Share lineup ↗</button>
          </div>

          <dialog className={styles.shareDialog} ref={shareDialog} aria-labelledby="draft-result-heading">
            <button className={styles.closeDialog} type="button" aria-label="Close sharing" onClick={() => shareDialog.current?.close()}>×</button>
            {result}
          </dialog>

          <details className={styles.sources}>
            <summary>Pricing and social card</summary>
            <p>{board.rule} You can repeat a price tier. The tiers are rounded game prices inspired by U.S. pre-owned values. Check the linked references for market estimates.</p>
            <ul>{watches.map(watch => <li key={watch.id}><a href={watch.source} target="_blank" rel="noreferrer">{watch.brand} {watch.model} ({watch.reference})</a></li>)}</ul>
            <a href="/watch-draft/dream-box.png" download>Download the $15,000 challenge card</a>
          </details>
        </section>
      )}
    </div>
  )
}
