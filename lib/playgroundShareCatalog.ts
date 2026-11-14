import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { brand } from '@/lib/brand'
import type { PlaygroundShare, SharedCatalogWatch } from '@/lib/playgroundShare'
import { withVersion } from '@/lib/watchImages/cacheBust'

const colorPattern = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

function catalogColor(color: string | null, fallback: string) {
  return color && colorPattern.test(color) ? color : fallback
}

function publicCatalogImage(image: string | null | undefined, origin: string) {
  if (!image) return undefined
  try {
    const url = new URL(image)
    if (url.origin === origin && !url.username && !url.password &&
        url.pathname.startsWith('/storage/v1/object/public/watch-images/')) {
      return withVersion(`${url.origin}${url.pathname}`)
    }
  } catch {
    return undefined
  }
}

export async function loadPlaygroundShareCatalog(share: PlaygroundShare, includeEstimates = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Public catalog is unavailable')

  const ids = [...new Set(share.entries.map(entry => entry.watchId))]
  const catalog = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init, signal: AbortSignal.timeout(5000), next: { revalidate: 300 },
      }),
    },
  })
  const columns = 'id, brand, model, reference, dial_color_hex, marker_color_hex, hand_color_hex'
  const publicWatches = catalog.from('catalog_watches')
  const watchQuery = includeEstimates
    ? publicWatches.select(`${columns}, estimated_value` as const)
    : publicWatches.select(columns)
  const [watchResult, imageResult] = await Promise.all([
    watchQuery
      .eq('moderation_status', 'approved')
      // Photo-submission IDs contain a fragment of the submitting user's ID.
      .or('source.is.null,source.neq.user_submission')
      .in('id', ids),
    catalog.from('watch_images')
      .select('catalog_watch_id, webp_url, png_url')
      .eq('variant', 'primary')
      .in('catalog_watch_id', ids),
  ])
  if (watchResult.error) throw watchResult.error

  const origin = new URL(url).origin
  const images = new Map(imageResult.data?.map(row => [row.catalog_watch_id, row]))
  const watches = new Map<string, SharedCatalogWatch>()
  const estimates = new Map<string, number>()
  for (const row of watchResult.data) {
    const image = images.get(row.id)
    watches.set(row.id, {
      brand: row.brand,
      model: row.model,
      reference: row.reference ?? '',
      dialConfig: {
        dialColor: catalogColor(row.dial_color_hex, brand.colors.ink),
        markerColor: catalogColor(row.marker_color_hex, brand.colors.onDarkMuted),
        handColor: catalogColor(row.hand_color_hex, brand.colors.white),
      },
      imageUrl: publicCatalogImage(image?.webp_url, origin) ?? publicCatalogImage(image?.png_url, origin),
    })
    if ('estimated_value' in row && row.estimated_value != null) {
      const estimate = Number(row.estimated_value)
      if (Number.isFinite(estimate) && estimate > 0) estimates.set(row.id, estimate)
    }
  }

  return { watches, estimates }
}
