export const draftPath = '/games/watch-draft'
export const budgets = [5000, 10000, 15000] as const
export type Budget = (typeof budgets)[number] | 9000

const labels = { type: 'By watch type', brand: 'By brand', region: 'By region' } as const
export type DraftChallenge = { board: keyof typeof labels; budget: Budget }
const tag = 'Watch Draft'

export function draftChallenge(board: unknown, budget: unknown): DraftChallenge | undefined {
  if ((board !== 'type' && board !== 'brand' && board !== 'region') ||
    (budget !== 5000 && budget !== 10000 && budget !== 15000 && !(budget === 9000 && board === 'region'))) return undefined
  return { board, budget }
}

export function draftName({ board, budget }: DraftChallenge) {
  return `$${budget / 1000}k ${board === 'region' ? 'International Dream Box' : 'Dream Box'}`
}

export function draftTags({ board, budget }: DraftChallenge) {
  return [tag, labels[board], `$${budget.toLocaleString('en-US')}`]
}

export function challengeFromTags(tags: string[]) {
  if (!tags.includes(tag)) return undefined
  const board = Object.entries(labels).find(([, label]) => tags.includes(label))?.[0]
  const budget = [...budgets, 9000].find(value => tags.includes(`$${value.toLocaleString('en-US')}`))
  return draftChallenge(board, budget)
}

export function challengePath({ board, budget }: DraftChallenge) {
  return `${draftPath}?board=${board}&budget=${budget}`
}
