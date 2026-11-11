'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Admin traffic is the owner reviewing the site, not visitors — keep it out of
// the pageview numbers.
function dropAdmin(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    if (new URL(event.url).pathname.startsWith('/admin')) return null
  } catch {
    // Malformed URL: send as-is.
  }
  return event
}

export default function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={dropAdmin} />
      <SpeedInsights />
    </>
  )
}
