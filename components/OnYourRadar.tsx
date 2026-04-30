'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { watches as catalogWatches } from '@/lib/watches'
import type { Watch } from '@/types/watch'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  followedWatchIds: Set<string>
  toggleFollowedWatch: (id: string) => void
}

export default function OnYourRadar({ followedWatchIds, toggleFollowedWatch }: Props) {
  const router = useRouter()
  const [removeTarget, setRemoveTarget] = useState<Watch | null>(null)

  const followedWatches = useMemo(
    () => catalogWatches.filter(watch => followedWatchIds.has(watch.id)),
    [followedWatchIds],
  )

  if (followedWatches.length === 0) return null

  function openWatchDetail(watchId: string) {
    router.push(`/collection/add/${watchId}?source=followed`)
  }

  return (
    <div className="radar-section" style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
            Followed · {followedWatches.length} {followedWatches.length === 1 ? 'watch' : 'watches'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 400, color: '#1A1410' }}>
            On Your <em>Radar.</em>
          </h3>
        </div>
        <button
          onClick={() => router.push('/playground')}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            color: '#C9A84C',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          Open Playground →
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {followedWatches.map(watch => (
          <div
            key={watch.id}
            onClick={() => openWatchDetail(watch.id)}
            style={{
              flex: '0 0 160px',
              background: '#fff',
              border: '1px solid #EAE5DC',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={event => {
              event.currentTarget.style.boxShadow = '0 4px 16px rgba(26,20,16,0.10)'
              event.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={event => {
              event.currentTarget.style.boxShadow = 'none'
              event.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ position: 'relative' }}>
              <Image
                src={watch.imageUrl}
                alt={watch.model}
                width={160}
                height={160}
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', background: '#F8F4EE', display: 'block', padding: 8 }}
              />
              <button
                onClick={event => {
                  event.stopPropagation()
                  setRemoveTarget(watch)
                }}
                title="Remove from followed"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid rgba(212,203,191,0.8)',
                  background: 'rgba(250,248,244,0.92)',
                  color: '#A89880',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  fontSize: 12,
                  backdropFilter: 'blur(6px)',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 3 }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, lineHeight: 1.2, color: '#1A1410', marginBottom: 2 }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 5 }}>
                {watch.dialColor}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>
                {fmt(watch.estimatedValue)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {removeTarget && (
        <>
          <div
            onClick={() => setRemoveTarget(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,20,16,0.45)',
              zIndex: 300,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 301,
              background: '#FFFFFF',
              border: '1px solid #EAE5DC',
              borderRadius: 12,
              padding: '24px 24px 20px',
              width: 'min(420px, calc(100vw - 32px))',
              boxShadow: '0 24px 64px rgba(26,20,16,0.18)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
              Remove Followed Watch
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, color: '#1A1410', lineHeight: 1.1, marginBottom: 8 }}>
              Remove from Radar?
            </div>
            <p style={{ margin: '0 0 18px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', lineHeight: 1.5 }}>
              {removeTarget.brand} {removeTarget.model} will be removed from your followed watches.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setRemoveTarget(null)}
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: '#1A1410',
                  border: '1px solid #D4CBBF',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleFollowedWatch(removeTarget.id)
                  setRemoveTarget(null)
                }}
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '10px 12px',
                  background: '#1A1410',
                  color: '#FAF8F4',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
