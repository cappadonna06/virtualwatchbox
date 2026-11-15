'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createPlaygroundBox, createPlaygroundEntry } from '@/lib/playground'
import { draftName, draftTags } from '@/lib/watchDraftChallenge'
import { curatedBoards, dreamBox, dreamUrl, draftUrl, money, weekLabel, weeklyBoard, type Board } from './boards'
import { fitsDraft, resolveDraft } from './resolveDraft'
import DraftShare from './DraftShare'
import DraftDial from './DraftDial'
import WatchPhoto from './WatchPhoto'
import styles from './draft.module.css'

export default function DraftGame({ latestWeek, resultRequested }: { latestWeek: string; resultRequested: boolean }) {
  const query = useSearchParams()
  const state = resolveDraft(query, latestWeek)
  return <Game key={`${state.board.id}:${state.week ?? (state.legacy ? 'legacy' : 'archive')}:${resultRequested ? 'result' : 'play'}`} initial={state} showResult={resultRequested} />
}

function Game({ initial, showResult }: { initial: ReturnType<typeof resolveDraft>; showResult: boolean }) {
  const { board, budget, legacy, archived, week, rows, count } = initial
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const { dataLoading, migrationPending, playgroundHydrated, setPlaygroundBoxes } = useCollectionSession()
  const creating = useRef(false)
  const [interactive, setInteractive] = useState(false)
  useEffect(() => setInteractive(true), [])
  const [saving, setSaving] = useState(false)
  const watches = legacy ? initial.lineup : rows.flatMap(row => row.cells)
  const [picks, setPicks] = useState(() => initial.lineup.map(watch => watch.id))
  const lineup = watches.filter(watch => picks.includes(watch.id))
  const slots = board.groups.map(group => lineup.find(watch => group.watches.some(option => option.id === watch.id)))
  const total = lineup.reduce((sum, watch) => sum + watch.tier, 0)
  const remaining = budget - total
  const complete = fitsDraft(board, lineup, count, total, budget)
  const displayedLineup = legacy ? lineup : slots.flatMap(watch => watch ? [watch] : [])
  const sharePath = (legacy ? draftUrl(board, budget, picks) : dreamUrl(board, picks, week)) + '&view=result'
  const challenge = { board: board.id, budget }
  const name = draftName(challenge)
  const shareText = [
    `My ${name} · ${board.title}`,
    ...displayedLineup.map(watch => `${watch.brand} ${watch.model} · ${money(watch.tier)}`),
    `${money(total)} of ${money(budget)} spent`,
  ].join('\n')

  function updatePicks(next: string[]) {
    setPicks(next)
    window.history.replaceState(null, '', dreamUrl(board, next, week))
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

  const resultPage = legacy || archived || (showResult && complete)
  const replayBoard = week ? weeklyBoard(board.id, week) : curatedBoards.find(option => option.id === board.id) ?? dreamBox
  const save = complete && <button className={styles.playgroundAction} type="button" onClick={saveBox} disabled={!canSave || saving}>{saving ? 'Opening Playground…' : 'Save to Playground'}</button>
  const result = (
    <section className={styles.lineup} id="draft-result" aria-labelledby="draft-result-heading">
      <div className={styles.resultHeading}>
        <div>
          <h1 id="draft-result-heading">{complete ? name : 'Your lineup'}</h1>
          <p aria-live="polite">
            {complete ? `${week ? `Week of ${weekLabel(week)} · ` : ''}${board.title} · ${money(total)} spent of ${money(budget)}` :
              lineup.length < count ? `Pick ${count} watches to share a lineup.` :
              remaining < 0 ? 'Swap or remove a watch to get back under budget.' : 'Swap a pick to include all three countries.'}
          </p>
        </div>
        <Link className={styles.resultLink} href={dreamUrl(replayBoard, [], week)}>Play this challenge →</Link>
      </div>
      {complete && <div className={styles.resultShare}><DraftShare path={sharePath} title={name} text={shareText} /></div>}
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
      {save}
    </section>
  )

  return (
    <div className={styles.page}>
      {resultPage ? <div className={styles.resultFirst}>{result}</div> : (
        <section className={styles.game} id="draft-board" aria-label="Watch draft">
          <header className={styles.gameHeader}>
            <h1>The Watch Draft</h1>
            <p>{week && <>Week of {weekLabel(week)} · </>}<strong>{money(budget)}</strong> · {count === 3 ? 'One per country' : 'One per column'}</p>
            <nav className={styles.editions} aria-label="Draft editions">
              {curatedBoards.map(option => (
                <Link key={option.id} href={dreamUrl(week ? weeklyBoard(option.id, week) : option, [], week)} aria-current={option.id === board.id ? 'page' : undefined}>
                  {{ type: 'Types', brand: 'Brands', region: 'International' }[option.id]}
                </Link>
              ))}
            </nav>
          </header>

          <div className={styles.board} style={{ '--columns': board.groups.length } as CSSProperties} data-three={count === 3} role="region" aria-label="Draft board">
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th scope="col">Tier</th>
                  {board.groups.map(group => <th key={group.title} scope="col">{group.title === 'Chronograph' ? <abbr title="Chronograph">Chrono</abbr> :
                    board.id === 'region' && group.title.includes(' ') ? group.title.split(' ').map(word => <span className={styles.regionHeader} key={word}>{word}{' '}</span>) : group.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
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
                  return (
                    <li className={styles.pickSlot} key={group.title}>
                      {watch ? (
                        <button className={styles.watch} type="button" title={`Remove ${watch.brand} ${watch.model}`}
                          aria-label={`Remove ${watch.brand} ${watch.model} from ${group.title}`}
                          onClick={() => toggle(watch.id, group)}>
                          <DraftDial watch={watch} showCaption={false} />
                        </button>
                      ) : <span className={styles.emptyPick} role="img" aria-label={`Empty ${group.title} slot`} />}
                    </li>
                  )
                })}
              </ol>
            </section>
          </div>

          <div className={styles.gameFooter}>
            <span className={styles.balance} data-over={remaining < 0} aria-live="polite" aria-atomic="true">
              <strong>{money(Math.abs(remaining))}</strong> <span>{remaining < 0 ? 'over budget' : 'left'}</span>
            </span>
            <span aria-live="polite"><strong>{lineup.length}/{count}</strong> picked</span>
            <button type="button" disabled={!lineup.length} onClick={() => updatePicks([])}>Reset</button>
            {complete ? <DraftShare key={sharePath} path={sharePath} title={name} text={shareText} /> :
              <button className={styles.shareButton} type="button" disabled>Share results ↗</button>}
          </div>
          {save}

          <details className={styles.sources}>
            <summary>Pricing sources</summary>
            <p>{board.rule} You can repeat a price tier. The tiers are rounded game prices inspired by U.S. pre-owned values. Check the linked references for market estimates.</p>
            <ul>{watches.map(watch => <li key={watch.id}><a href={watch.source} target="_blank" rel="noreferrer">{watch.brand} {watch.model} ({watch.reference})</a></li>)}</ul>
          </details>
        </section>
      )}
    </div>
  )
}
