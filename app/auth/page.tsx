'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'

type AuthState = 'idle' | 'loading' | 'sending' | 'sent'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const [email, setEmail] = useState('')
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const rawNext = searchParams?.get('next') ?? null
  // Only allow same-origin paths to avoid open-redirect via the query string.
  const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  function callbackUrl() {
    const base = window.location.origin + '/auth/callback'
    return safeNext ? `${base}?next=${encodeURIComponent(safeNext)}` : base
  }

  async function handleGoogle() {
    if (authState === 'loading') return
    setAuthState('loading')
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    })
    if (authError) {
      setError(authError.message)
      setAuthState('idle')
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || authState === 'sending') return
    setAuthState('sending')
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    })
    if (authError) {
      setError(authError.message)
      setAuthState('idle')
    } else {
      setAuthState('sent')
    }
  }

  const busy = authState === 'loading' || authState === 'sending'

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: brand.colors.bg,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <p
            style={{
              margin: 0,
              fontFamily: brand.font.serif,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: brand.colors.ink,
            }}
          >
            Virtual Watchbox
          </p>
        </div>

        {/* Gold rule */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{ width: 36, height: 1, background: brand.colors.gold }} />
        </div>

        {/* Card */}
        <div
          style={{
            background: brand.colors.white,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.xl,
            padding: '40px 40px 36px',
            boxShadow: brand.shadow.md,
          }}
        >
          {authState === 'sent' ? (
            /* ── Confirmation state ── */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: brand.colors.goldWash,
                  border: `1px solid ${brand.colors.goldLine}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M2 6l8 5 8-5" stroke={brand.colors.gold} strokeWidth="1.4" strokeLinecap="round" />
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke={brand.colors.gold} strokeWidth="1.4" />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: brand.font.serif,
                  fontSize: 22,
                  fontWeight: 400,
                  color: brand.colors.ink,
                  margin: '0 0 10px',
                }}
              >
                Check your email
              </p>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.muted,
                  margin: '0 0 24px',
                  lineHeight: 1.6,
                }}
              >
                We sent a sign-in link to{' '}
                <strong style={{ color: brand.colors.ink }}>{email}</strong>
              </p>
              <button
                onClick={() => setAuthState('idle')}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  color: brand.colors.muted,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  padding: 0,
                }}
              >
                Use a different method
              </button>
            </div>
          ) : (
            /* ── Sign-in form ── */
            <>
              <p
                style={{
                  fontFamily: brand.font.serif,
                  fontSize: 22,
                  fontWeight: 400,
                  color: brand.colors.ink,
                  margin: '0 0 6px',
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                }}
              >
                Sign in
              </p>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.muted,
                  margin: '0 0 28px',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Save your collection and access it anywhere
              </p>

              {/* Google button */}
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  color: brand.colors.muted,
                  margin: '0 0 10px',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                By continuing, you agree to our{' '}
                <Link href="/terms" style={{ color: brand.colors.gold, textDecoration: 'none' }}>Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" style={{ color: brand.colors.gold, textDecoration: 'none' }}>Privacy Policy</Link>.
              </p>

              <button
                onClick={handleGoogle}
                disabled={busy}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.borderMid}`,
                  borderRadius: brand.radius.md,
                  fontFamily: brand.font.sans,
                  fontSize: 14,
                  fontWeight: 500,
                  color: brand.colors.ink,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  boxShadow: brand.shadow.xs,
                  transition: `box-shadow ${brand.transition.fast}, border-color ${brand.transition.fast}`,
                  marginBottom: 20,
                }}
              >
                <GoogleIcon />
                {authState === 'loading' ? 'Redirecting…' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ flex: 1, height: 1, background: brand.colors.borderLight }} />
                <span
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    color: brand.colors.muted,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  or
                </span>
                <div style={{ flex: 1, height: 1, background: brand.colors.borderLight }} />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink}>
                <label
                  htmlFor="auth-email"
                  style={{
                    display: 'block',
                    fontFamily: brand.font.sans,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: brand.colors.muted,
                    marginBottom: 8,
                  }}
                >
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: `1px solid ${error ? '#D04040' : brand.colors.border}`,
                    borderRadius: brand.radius.md,
                    padding: '11px 14px',
                    fontFamily: brand.font.sans,
                    fontSize: 14,
                    color: brand.colors.ink,
                    background: brand.colors.bg,
                    outline: 'none',
                    marginBottom: error ? 8 : 14,
                    transition: `border-color ${brand.transition.fast}`,
                  }}
                />
                {error && (
                  <p
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      color: '#D04040',
                      margin: '0 0 12px',
                    }}
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: busy ? brand.colors.muted : brand.colors.ink,
                    color: brand.colors.bg,
                    border: 'none',
                    borderRadius: brand.radius.md,
                    fontFamily: brand.font.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    transition: `background ${brand.transition.fast}`,
                  }}
                >
                  {authState === 'sending' ? 'Sending…' : 'Send Magic Link'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link
            href="/"
            style={{
              fontFamily: brand.font.sans,
              fontSize: 13,
              color: brand.colors.muted,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Continue without signing in →
          </Link>
        </div>

      </div>
    </div>
  )
}
