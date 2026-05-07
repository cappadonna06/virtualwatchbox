import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isValidSupabaseUrl(url: string | undefined): url is string {
  try {
    if (!url) return false
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// Mirrors @supabase/ssr's DEFAULT_COOKIE_OPTIONS. RFC 6265bis caps Max-Age at
// 400 days, which is also what the SDK uses by default.
const SESSION_COOKIE_REFRESH_MAX_AGE = 400 * 24 * 60 * 60

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseKey || supabaseKey === 'FILL_IN') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.warn('[vwb] middleware getUser failed', err)
  }

  // Re-apply auth cookies via Set-Cookie on every navigation so the
  // 400-day Max-Age is refreshed at the HTTP layer.
  //
  // Why this is necessary: @supabase/ssr's browser client writes session
  // cookies via `document.cookie`. Apple's ITP caps any cookie set via
  // JavaScript at 7 days regardless of its Max-Age, while cookies set via
  // HTTP `Set-Cookie` keep their full Max-Age. Because client-side auto-
  // refresh (~ every 55 min) almost always beats the middleware's
  // `getUser()` to refreshing the access token, the SDK's `setAll` callback
  // above doesn't fire on most middleware runs — meaning cookies on Safari
  // / iOS would be capped at 7 days and users would be silently signed out
  // after a week of regular use.
  //
  // Setting the cookie with the same value but via the response refreshes
  // the browser's stored Max-Age via HTTP. On non-Safari browsers this is
  // a harmless no-op; on Safari it bypasses the ITP cap.
  for (const { name, value } of request.cookies.getAll()) {
    if (!name.startsWith('sb-')) continue
    // Don't override cookies the SDK already set on this response — those
    // already have the SDK's freshly-rotated values and proper options.
    if (supabaseResponse.cookies.has(name)) continue
    supabaseResponse.cookies.set(name, value, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      maxAge: SESSION_COOKIE_REFRESH_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return supabaseResponse
}
