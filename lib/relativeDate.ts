const SHORT_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const LONG_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const then = new Date(t)
  const diffMs = now.getTime() - t
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))

  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  if (then.getFullYear() === now.getFullYear()) return SHORT_DATE.format(then)
  return LONG_DATE.format(then)
}
