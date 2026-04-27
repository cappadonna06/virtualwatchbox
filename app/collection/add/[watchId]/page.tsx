'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { watches as catalogWatches } from '@/lib/watches'
import type { WatchCondition } from '@/types/watch'
import DialSVG from '@/components/watchbox/DialSVG'
import { useCollectionSession } from '../../CollectionSessionProvider'

const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']

type OwnershipChoice = 'owned' | 'followed' | null

export default function AddWatchConfirmPage() {
  const params = useParams<{ watchId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCollection, followWatch } = useCollectionSession()

  const watch = useMemo(() => catalogWatches.find(w => w.id === params.watchId), [params.watchId])

  const [choice, setChoice] = useState<OwnershipChoice>(null)
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
    <div style={{ padding: '56px 56px 120px', borderTop: '1px solid #EAE5DC' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginBottom: 18,
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

      <div style={{ textAlign: 'center', padding: '32px 20px 24px' }}>
        <div style={{ width: 88, height: 88, margin: '0 auto 16px' }}>
          <DialSVG
            dialColor={watch.dialConfig.dialColor}
            markerColor={watch.dialConfig.markerColor}
            handColor={watch.dialConfig.handColor}
            size={88}
          />
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', fontFamily: 'var(--font-dm-sans)' }}>
          {watch.brand}
        </div>
        <div style={{ fontSize: 28, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 4 }}>
          {watch.model}
        </div>
        <div style={{ fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 4 }}>
          Ref. {watch.reference}
        </div>
        {isDuplicate && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)' }}>
            Adding a duplicate of a watch already in your collection.
          </div>
        )}
      </div>

      <div style={{ height: 1, background: '#EAE5DC', margin: '0 0 28px' }} />

      <div style={{ maxWidth: 540 }}>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880', marginBottom: 16 }}>
          DO YOU OWN THIS WATCH?
        </div>

        <button
          onClick={() => setChoice('owned')}
          style={{
            width: '100%',
            padding: '15px 20px',
            background: '#1A1410',
            color: '#FAF8F4',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>Yes — add to My Collection</span>
          <span style={{ color: '#C9A84C99' }}>→</span>
        </button>

        <button
          onClick={() => setChoice('followed')}
          style={{
            width: '100%',
            padding: '15px 20px',
            background: '#FFFFFF',
            color: '#1A1410',
            border: '1px solid #EAE5DC',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>No — save to Followed Watches</span>
          <span style={{ color: '#A89880' }}>→</span>
        </button>

        {choice === 'owned' && (
          <div style={{ marginTop: 16 }}>
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
                    padding: '9px 0',
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
                marginTop: 16,
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
                width: '100%',
                padding: '13px',
                marginTop: 24,
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
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 12, marginBottom: 20, lineHeight: 1.5 }}>
              We&apos;ll save this to your Followed Watches. You can track listings and add it to a Playground box later.
            </p>
            <button
              onClick={() => {
                followWatch(watch.id)
                router.push('/collection')
              }}
              style={{
                width: '100%',
                padding: '13px',
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
  )
}
