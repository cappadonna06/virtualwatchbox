'use client'

import { useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'

type AuthState = 'idle' | 'loading' | 'sent'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || authState === 'loading') return

    setAuthState('loading')
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (authError) {
      setError(authError.message)
      setAuthState('idle')
    } else {
      setAuthState('sent')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: brand.colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: brand.font.serif,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: '0.02em',
              color: brand.colors.ink,
              margin: '0 0 10px',
            }}
          >
            Virtual Watchbox
          </h1>
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: brand.colors.muted,
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            Sign in to save your collection
          </p>
        </div>

        <div
          style={{
            background: brand.colors.white,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.xl,
            padding: 32,
            boxShadow: brand.shadow.md,
          }}
        >
          {authState === 'sent' ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: brand.radius.circle,
                  background: brand.colors.goldWash,
                  border: `1px solid ${brand.colors.goldLine}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 6l8 5 8-5" stroke={brand.colors.gold} strokeWidth="1.4" strokeLinecap="round" />
                  <rect x="2" y="4" width="16" height="12" rx="2" stroke={brand.colors.gold} strokeWidth="1.4" />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: brand.colors.ink,
                  margin: '0 0 8px',
                }}
              >
                Check your email
              </p>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.muted,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                We sent a link to <strong style={{ color: brand.colors.ink }}>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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
                  padding: '12px 16px',
                  fontFamily: brand.font.sans,
                  fontSize: 14,
                  color: brand.colors.ink,
                  background: brand.colors.bg,
                  outline: 'none',
                  marginBottom: error ? 8 : 20,
                  transition: `border-color ${brand.transition.fast}`,
                }}
              />
              {error && (
                <p
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    color: '#D04040',
                    margin: '0 0 16px',
                  }}
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={authState === 'loading' || !email.trim()}
                style={{
                  width: '100%',
                  padding: '13px 24px',
                  background: authState === 'loading' ? brand.colors.muted : brand.colors.ink,
                  color: brand.colors.bg,
                  border: 'none',
                  borderRadius: brand.radius.btn,
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  cursor: authState === 'loading' ? 'not-allowed' : 'pointer',
                  transition: `background ${brand.transition.fast}`,
                }}
              >
                {authState === 'loading' ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>

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
