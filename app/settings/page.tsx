'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  getProfileDemoState,
  saveProfileDemoState,
  syncPublicProfileSnapshot,
} from '@/lib/profileDemo'
import {
  COLLECTION_SESSION_STORAGE_KEY,
  LEGACY_COLLECTION_SESSION_STORAGE_KEY,
  WATCHBOX_CONFIG_STORAGE_KEY,
  PLAYGROUND_BOXES_STORAGE_KEY,
  PROFILE_DEMO_STORAGE_KEY,
  PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY,
} from '@/lib/storageKeys'
import type { ProfileDemoState, ProfileVisibilitySettings } from '@/types/profile'

// brand.ts has no destructive color token; #A0362A approved per spec.
const DESTRUCTIVE_RED = '#A0362A'

type VisibilityKey = keyof ProfileVisibilitySettings

const TOGGLES: { key: VisibilityKey; label: string }[] = [
  { key: 'showCollection', label: 'My Collection' },
  { key: 'showCollectionStats', label: 'Collection Stats' },
  { key: 'showPlayground', label: 'Playground Boxes' },
  { key: 'showFollowedWatches', label: 'Followed Watches' },
  { key: 'showGrail', label: 'Grail Watch' },
]

const cardStyle: CSSProperties = {
  background: brand.colors.white,
  border: `1px solid ${brand.colors.border}`,
  borderRadius: brand.radius.md,
  padding: '28px 32px',
  marginBottom: 16,
}

const sectionHeadingStyle: CSSProperties = {
  fontFamily: brand.font.serif,
  fontSize: 22,
  fontWeight: 500,
  color: brand.colors.ink,
  margin: 0,
  marginBottom: 4,
  lineHeight: 1.2,
}

const sectionSubheadStyle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
  marginBottom: 16,
}

const metaLabelStyle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
}

const metaValueStyle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 13,
  color: brand.colors.ink,
}

const linkRowStyle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 13,
  color: brand.colors.ink,
  textDecoration: 'none',
  padding: '8px 0',
  display: 'inline-block',
}

function Section({ title, subhead, children }: { title: string; subhead?: string; children: ReactNode }) {
  return (
    <section style={cardStyle}>
      <h2 style={sectionHeadingStyle}>{title}</h2>
      {subhead && <div style={sectionSubheadStyle}>{subhead}</div>}
      {children}
    </section>
  )
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange() }}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 9999,
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? brand.colors.gold : brand.colors.border,
        transition: `background ${brand.transition.base}, opacity ${brand.transition.base}`,
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 9999,
          background: brand.colors.white,
          boxShadow: brand.shadow.xs,
          transition: `left ${brand.transition.base}`,
        }}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [profile, setProfile] = useState<ProfileDemoState | null>(null)
  const [profileCloudHydrated, setProfileCloudHydrated] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserIdRef = useRef<string | null>(null)
  const upsertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setProfile(getProfileDemoState())
  }, [])

  useEffect(() => {
    const nextId = user?.id ?? null
    if (lastUserIdRef.current !== nextId) {
      lastUserIdRef.current = nextId
      setProfileCloudHydrated(false)
    }
  }, [user?.id])

  // Cloud read: hydrate visibility from user_profiles when signed in. Mirrors the
  // pattern in components/profile/ProfileSurface.tsx so /profile and /settings stay
  // in sync across devices.
  useEffect(() => {
    if (!user || !profile || profileCloudHydrated) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_profiles')
          .select('visibility')
          .eq('id', user.id)
          .maybeSingle()

        if (cancelled) return
        if (error) console.error('[vwb] settings visibility read error', error)

        if (data && typeof data.visibility === 'object' && data.visibility) {
          const v = data.visibility as Record<string, unknown>
          setProfile(current => {
            if (!current) return current
            const merged: ProfileDemoState = {
              ...current,
              visibility: {
                ...current.visibility,
                ...(typeof v.isPublic === 'boolean' ? { isPublic: v.isPublic } : {}),
                ...(typeof v.showCollection === 'boolean' ? { showCollection: v.showCollection } : {}),
                ...(typeof v.showCollectionStats === 'boolean' ? { showCollectionStats: v.showCollectionStats } : {}),
                ...(typeof v.showPlayground === 'boolean' ? { showPlayground: v.showPlayground } : {}),
                ...(typeof v.showFollowedWatches === 'boolean' ? { showFollowedWatches: v.showFollowedWatches } : {}),
                ...(typeof v.showGrail === 'boolean' ? { showGrail: v.showGrail } : {}),
              },
            }
            const saved = saveProfileDemoState(merged)
            syncPublicProfileSnapshot({ profile: saved })
            return saved
          })
        }
        setProfileCloudHydrated(true)
      } catch (err) {
        if (cancelled) return
        console.error('[vwb] settings visibility hydrate failed', err)
        setProfileCloudHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [user, profile, profileCloudHydrated])

  // Tab-focus refetch: re-hydrate when the user comes back so cross-device edits show up.
  useEffect(() => {
    if (!user) return
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      setProfileCloudHydrated(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (upsertTimer.current) clearTimeout(upsertTimer.current)
    }
  }, [])

  function showToast(message: string) {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setToastMsg(message)
    setToastVisible(true)
    showTimer.current = setTimeout(() => {
      setToastVisible(false)
      hideTimer.current = setTimeout(() => setToastMsg(null), 300)
    }, 2500)
  }

  function scheduleVisibilityUpsert(visibility: ProfileVisibilitySettings) {
    if (!user) return
    if (upsertTimer.current) clearTimeout(upsertTimer.current)
    upsertTimer.current = setTimeout(() => {
      ;(async () => {
        try {
          const supabase = createClient()
          const { error } = await supabase.from('user_profiles').upsert(
            { id: user.id, visibility },
            { onConflict: 'id' },
          )
          if (error) console.error('[vwb] settings visibility upsert error', error)
        } catch (err) {
          console.error('[vwb] settings visibility upsert failed', err)
        }
      })()
    }, 500)
  }

  function handleToggle(key: VisibilityKey) {
    if (!profile) return
    const next: ProfileDemoState = {
      ...profile,
      visibility: { ...profile.visibility, [key]: !profile.visibility[key] },
    }
    const saved = saveProfileDemoState(next)
    setProfile(saved)
    syncPublicProfileSnapshot({ profile: saved })
    scheduleVisibilityUpsert(saved.visibility)
  }

  function handleSignOut() {
    void signOut()
    router.push('/')
  }

  function handleConfirmReset() {
    try {
      window.sessionStorage.removeItem(COLLECTION_SESSION_STORAGE_KEY)
      window.sessionStorage.removeItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY)
      window.localStorage.removeItem(WATCHBOX_CONFIG_STORAGE_KEY)
      window.localStorage.removeItem(PLAYGROUND_BOXES_STORAGE_KEY)
      window.localStorage.removeItem(PROFILE_DEMO_STORAGE_KEY)
      window.localStorage.removeItem(PUBLIC_PROFILE_SNAPSHOT_STORAGE_KEY)
    } catch {
      // ignore storage exceptions; navigation still proceeds
    }
    setConfirmingReset(false)
    showToast('Local data cleared.')
    router.push('/')
  }

  const deletionBody = `Hi, I'd like to request deletion of my Virtual Watchbox data. My account email is: ${user?.email ?? ''}.`
  const deletionHref = `mailto:support@virtualwatchbox.com?subject=${encodeURIComponent('Data Deletion Request')}&body=${encodeURIComponent(deletionBody)}`

  return (
    <main style={{ background: brand.colors.bg, minHeight: '100vh' }}>
      <div className="settings-shell" style={{ maxWidth: 960, margin: '0 auto', padding: '48px 56px' }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: brand.font.serif,
              fontSize: 36,
              fontWeight: 500,
              color: brand.colors.ink,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Settings
          </h1>
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: brand.colors.muted,
              margin: 0,
              marginTop: 8,
            }}
          >
            Manage your account, privacy, and data.
          </p>
        </header>

        <Section title="Account" subhead="Identity & session">
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={metaLabelStyle}>Email</span>
                <span style={metaValueStyle}>{user.email ?? '—'}</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    border: `1px solid ${brand.colors.ink}`,
                    background: 'transparent',
                    color: brand.colors.ink,
                    padding: '10px 18px',
                    borderRadius: brand.radius.btn,
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 14,
                  color: brand.colors.muted,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                You&apos;re browsing as a guest.
              </p>
              <div>
                <Link
                  href="/auth"
                  style={{
                    background: brand.colors.ink,
                    color: brand.colors.bg,
                    padding: '11px 18px',
                    borderRadius: brand.radius.btn,
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Sign in to save your collection
                </Link>
              </div>
            </div>
          )}
        </Section>

        <Section title="Privacy & Sharing" subhead="Public profile visibility">
          {profile && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '4px 0 16px 0',
                  borderBottom: `1px solid ${brand.colors.border}`,
                  marginBottom: 4,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: brand.colors.ink,
                    }}
                  >
                    Public profile
                  </div>
                  <div
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      color: brand.colors.muted,
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {profile.visibility.isPublic
                      ? 'Your profile is viewable. Use the modules below to fine-tune what shows.'
                      : 'Your profile is private. No one else can view it.'}
                  </div>
                </div>
                <Toggle
                  on={profile.visibility.isPublic}
                  onChange={() => handleToggle('isPublic')}
                  label="Public profile"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', opacity: profile.visibility.isPublic ? 1 : 0.55, transition: `opacity ${brand.transition.base}` }}>
                {TOGGLES.map((t, i) => {
                  const isLast = i === TOGGLES.length - 1
                  const on = profile.visibility[t.key]
                  return (
                    <div
                      key={t.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: isLast ? 'none' : `1px solid ${brand.colors.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: brand.font.sans,
                          fontSize: 13,
                          color: brand.colors.ink,
                        }}
                      >
                        {t.label}
                      </span>
                      <Toggle
                        on={on}
                        onChange={() => handleToggle(t.key)}
                        label={t.label}
                        disabled={!profile.visibility.isPublic}
                      />
                    </div>
                  )
                })}
              </div>
              <p
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  color: brand.colors.muted,
                  marginTop: 16,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                These settings control what appears on your public profile.
              </p>
              <Link
                href="/profile/preview"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  color: brand.colors.gold,
                  marginTop: 8,
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                Preview public profile →
              </Link>
            </div>
          )}
        </Section>

        <Section title="Data & Storage" subhead="Manage your data">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${brand.colors.border}`,
              }}
            >
              <a
                href={deletionHref}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.ink,
                  textDecoration: 'none',
                }}
              >
                Request data deletion
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${brand.colors.border}`,
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              {confirmingReset ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 13,
                      color: brand.colors.ink,
                    }}
                  >
                    This will clear all local data. Are you sure?
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: brand.font.sans,
                        fontSize: 13,
                        fontWeight: 600,
                        color: DESTRUCTIVE_RED,
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: brand.font.sans,
                        fontSize: 13,
                        color: brand.colors.muted,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: brand.font.sans,
                    fontSize: 13,
                    color: DESTRUCTIVE_RED,
                  }}
                >
                  Reset local device data
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                opacity: 0.4,
                cursor: 'default',
              }}
              aria-disabled="true"
            >
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.ink,
                }}
              >
                Download my data — Coming soon
              </span>
            </div>
          </div>
        </Section>

        <Section title="Legal & Transparency" subhead="Policies & support">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Link href="/privacy" style={linkRowStyle}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={linkRowStyle}>
              Terms of Use
            </Link>
            <a href="mailto:support@virtualwatchbox.com" style={linkRowStyle}>
              support@virtualwatchbox.com
            </a>
          </div>
          <div style={{ height: 1, background: brand.colors.border, marginTop: 12 }} />
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: brand.colors.muted,
              lineHeight: 1.6,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            Virtual Watchbox may earn a commission when you purchase through watch market, strap, or box links on this site. This supports keeping the platform free for all collectors.
          </p>
        </Section>
      </div>

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: `translateX(-50%) translateY(${toastVisible ? '0' : '12px'})`,
            padding: '11px 16px',
            borderRadius: brand.radius.md,
            background: brand.colors.ink,
            color: brand.colors.bg,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            boxShadow: brand.shadow.xl,
            opacity: toastVisible ? 1 : 0,
            transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
            zIndex: 320,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </main>
  )
}
