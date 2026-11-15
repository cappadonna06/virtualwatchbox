import { budgets } from '@/lib/watchDraftChallenge'
import {
  boardFor, curatedBoards, currentDraftWeek, draftEdition, draftGrid, dreamBox,
  dreamRows, isDraftWeek, weeklyBoard, weeklyEdition, type Board, type Watch,
} from './boards'

export function resolveDraft(query: Pick<URLSearchParams, 'get'>, latest = currentDraftWeek()) {
  const initialPicks = query.get('picks')
  const id = query.get('board')
  const edition = query.get('edition')
  const legacy = Boolean(initialPicks && edition !== draftEdition && edition !== weeklyEdition)
  const archived = Boolean(initialPicks && edition === draftEdition)
  const candidateWeek = query.get('week')
  const validWeek = !candidateWeek || isDraftWeek(candidateWeek, latest)
  const week = legacy || archived ? undefined : validWeek && candidateWeek ? candidateWeek : latest
  const board = legacy ? boardFor(id) : week ? weeklyBoard(id, week) : curatedBoards.find(item => item.id === id) ?? dreamBox
  const budget = legacy ? budgets.find(value => String(value) === query.get('budget')) ?? board.budget : board.budget
  const rows = legacy ? [] : dreamRows(board)
  const watches = legacy ? draftGrid(board, budget).flatMap(row => row.cells.flat()) : rows.flatMap(row => row.cells)
  const options = new Map(watches.map(watch => [watch.id, watch]))
  const requested = new Set((validWeek ? initialPicks : null)?.split(','))
  const candidates = board.groups.flatMap(group => group.watches
    .filter(watch => requested.has(watch.id) && options.has(watch.id))
    .slice(0, legacy && board.id === 'region' ? group.watches.length : 1)
    .map(watch => options.get(watch.id)!))
  const count = legacy ? 5 : board.groups.length
  return { board, budget, legacy, archived, week, rows, count, lineup: candidates.slice(0, count) }
}

export function draftCardPath(sharePath: string) {
  return sharePath.replace('/games/watch-draft?', '/games/watch-draft/card?') + '&v=2'
}

export function fitsDraft(board: Board, lineup: Watch[], count: number, total: number, budget: number) {
  return lineup.length === count && total <= budget &&
    board.groups.every(group => group.watches.some(watch => lineup.some(pick => pick.id === watch.id)))
}
