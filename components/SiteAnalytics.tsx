'use client'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { captureLaunchAttribution } from '@/lib/launchAnalytics'

const publicPaths = new Set([
  '/', '/auth', '/collection', '/collection/add', '/collection/straps',
  '/collection/straps/studio', '/discover', '/followed', '/guides/three-watch-collection', '/news', '/playground',
  '/privacy', '/profile', '/profile/preview', '/service-room', '/settings', '/terms',
])

const dynamicPaths = [
  [/^\/collection\/add\/[^/]+$/, '/collection/add/[watchId]'],
  [/^\/collection\/watch\/[^/]+$/, '/collection/watch/[id]'],
  [/^\/playground\/edit\/[^/]+\/[^/]+$/, '/playground/edit/[boxId]/[entryId]'],
  [/^\/playground\/share(?:\/.*)?$/, '/playground/share'],
] as const

function analyticsPath(pathname: string) {
  return publicPaths.has(pathname)
    ? pathname
    : dynamicPaths.find(([pattern]) => pattern.test(pathname))?.[1] ?? null
}

function sanitizeAnalyticsUrl<T extends { url: string; route?: string | null }>(event: T): T | null {
  try {
    const url = new URL(event.url)
    const path = analyticsPath(url.pathname)
    if (!path) return null
    return { ...event, url: `${url.origin}${path}` }
  } catch {
    return null
  }
}

function WebAnalytics() {
  const pathname = usePathname()
  const search = useSearchParams()?.toString() ?? ''
  useEffect(() => {
    captureLaunchAttribution(search)
  }, [search])

  // The Next adapter can derive route names from arbitrary query parameter keys.
  // Use sanitized route templates for the SDK's separate route field as well.
  return (
    <Analytics
      framework="next"
      basePath={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH}
      configString={process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
      route={pathname ? analyticsPath(pathname) : null}
      path={pathname}
      beforeSend={sanitizeAnalyticsUrl}
    />
  )
}

export default function SiteAnalytics() {
  return (
    <>
      <Suspense><WebAnalytics /></Suspense>
      <SpeedInsights beforeSend={sanitizeAnalyticsUrl} />
    </>
  )
}
