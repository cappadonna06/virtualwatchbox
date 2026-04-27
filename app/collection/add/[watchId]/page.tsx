'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { watches as catalogWatches } from '@/lib/watches'
import type { WatchCondition } from '@/types/watch'
import DialSVG from '@/components/watchbox/DialSVG'
import { useCollectionSession } from '../../CollectionSessionProvider'

const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
type OwnershipChoice = 'owned' | 'followed'

export default function AddWatchConfirmPage() {
  const params = useParams<{ watchId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCollection, followWatch } = useCollectionSession()

  const watch = useMemo(() => catalogWatches.find(w => w.id === params.watchId), [params.watchId])

  const [choice, setChoice] = useState<OwnershipChoice>('owned')
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')

  if (!watch) {
    router.replace('/collection/add')
    return null
  }

  const isDuplicate = searchParams.get('duplicate') === 'true'

  return (
    <div style={{ padding: '40px 56px 90px', borderTop: '1px solid #EAE5DC' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginBottom: 14,
          cursor: 'pointer',
          color: '#A89880',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        ← Back to search
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(360px, 1fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ border: '1px solid #EAE5DC', borderRadius: 12, padding: 18, background: '#FFFFFF' }}>
          <div style={{ width: 120, height: 120, margin: '0 auto 12px' }}>
            <DialSVG
              dialColor={watch.dialConfig.dialColor}
              markerColor={watch.dialConfig.markerColor}
              handColor={watch.dialConfig.handColor}
              size={120}
            />
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', fontFamily: 'var(--font-dm-sans)' }}>
            {watch.brand}
          </div>
          <div style={{ fontSize: 26, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 4, lineHeight: 1.1 }}>
            {watch.model}
          </div>
          <div style={{ fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 4 }}>
            Ref. {watch.reference}
          </div>
          <div style={{ fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 8 }}>
            {watch.caseMaterial} · {watch.dialColor} · {watch.caseSizeMm}mm
          </div>
        </div>

        <div>
          {isDuplicate && (
            <div style={{ marginBottom: 10, fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)' }}>
              Adding a duplicate of a watch already in your collection.
            </div>
          )}

          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
            I OWN THIS WATCH
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid #E0DAD0', borderRadius: 7, overflow: 'hidden', marginBottom: 16 }}>
            {(['owned', 'followed'] as const).map((option, i) => (
              <button
                key={option}
                onClick={() => setChoice(option)}
                style={{
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid #E0DAD0' : 'none',
                  background: choice === option ? '#1A1410' : 'transparent',
                  color: choice === option ? '#FAF8F4' : '#A89880',
                  padding: '8px 16px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {option === 'owned' ? 'Yes' : 'No'}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: '#EAE5DC', margin: '0 0 16px' }} />

          {choice === 'owned' && (
            <div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 }}>
                Condition
              </div>
              <div style={{ display: 'flex', border: '1px solid #E0DAD0', borderRadius: 7, overflow: 'hidden' }}>
                {CONDITIONS.map((option, i) => (
                  <button
                    key={option}
                    onClick={() => setCondition(option)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      textAlign: 'center',
                      fontSize: 11,
                      fontFamily: 'var(--font-dm-sans)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                      borderLeft: i > 0 ? '1px solid #E0DAD0' : 'none',
                      background: condition === option ? '#1A1410' : 'transparent',
                      color: condition === option ? '#FAF8F4' : '#A89880',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setDetailsOpen(prev => !prev)}
                style={{
                  marginTop: 12,
                  marginBottom: 8,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  color: '#A89880',
                  cursor: 'pointer',
                }}
              >
                {detailsOpen ? '－ Hide details' : '＋ Add purchase details'}
              </button>

              {detailsOpen && (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
                      Purchase Price
                    </div>
                    <input
                      type="number"
                      placeholder="0"
                      value={purchasePrice}
                      onChange={e => setPurchasePrice(e.target.value)}
                      style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', color: '#1A1410', background: '#FFFFFF', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
                      Purchase Date
                    </div>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', color: '#1A1410', background: '#FFFFFF', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
                      Notes
                    </div>
                    <textarea
                      rows={3}
                      placeholder="AD purchase, complete set..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', color: '#1A1410', background: '#FFFFFF', outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              <button
                disabled={!condition}
                onClick={() => {
                  if (!condition) return
                  addToCollection(watch, condition, {
                    price: purchasePrice ? Number(purchasePrice) : undefined,
                    date: purchaseDate || undefined,
                    notes: notes.trim() || undefined,
                  })
                  router.push('/collection')
                }}
                style={{
                  width: '260px',
                  padding: '12px',
                  marginTop: 18,
                  border: 'none',
                  borderRadius: 8,
                  cursor: condition ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'background 0.15s',
                  background: condition ? '#1A1410' : '#C8BFAF',
                  color: '#FAF8F4',
                }}
              >
                Add to My Collection
              </button>
            </div>
          )}

          {choice === 'followed' && (
            <div>
              <p style={{ fontSize: 12, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
                We&apos;ll save this to your Followed Watches. You can track listings and add it to a Playground box later.
              </p>
              <button
                onClick={() => {
                  followWatch(watch.id)
                  router.push('/collection')
                }}
                style={{
                  width: '260px',
                  padding: '12px',
                  background: '#1A1410',
                  color: '#FAF8F4',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Save to Followed Watches
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
