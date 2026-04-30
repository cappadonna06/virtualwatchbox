'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { watches as catalogWatches } from '@/lib/watches'
import type { PlaygroundBox, WatchCondition } from '@/types/watch'
import { addWatchToPlaygroundBox, createPlaygroundBox, createPlaygroundEntry, normalizePlaygroundBoxes } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import { useCollectionSession } from '../../CollectionSessionProvider'
import { brand } from '@/lib/brand'
import WatchStateControl from '@/components/collection/WatchStateControl'

const STORAGE_KEY = 'playgroundBoxes'
const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
type OwnershipChoice = 'owned' | 'playground'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function loadPlaygroundBoxes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return normalizePlaygroundBoxes(stored ? JSON.parse(stored) : null, SEEDED_PLAYGROUND_BOXES)
  } catch {
    return SEEDED_PLAYGROUND_BOXES
  }
}

export default function AddWatchConfirmPage() {
  const params = useParams<{ watchId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCollection, followWatch, isInCollection } = useCollectionSession()

  const watch = useMemo(() => catalogWatches.find(w => w.id === params.watchId), [params.watchId])

  const dest = searchParams.get('dest')
  const source = searchParams.get('source')
  const incomingBoxId = searchParams.get('boxId')
  const isPlaygroundContext = dest === 'playground'

  const [choice, setChoice] = useState<OwnershipChoice>(isPlaygroundContext ? 'playground' : 'owned')
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [playgroundBoxes, setPlaygroundBoxes] = useState<PlaygroundBox[]>(SEEDED_PLAYGROUND_BOXES)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(incomingBoxId)
  const [newBoxOpen, setNewBoxOpen] = useState(false)
  const [newBoxName, setNewBoxName] = useState('')
  const [viewportWidth, setViewportWidth] = useState(1280)

  useEffect(() => {
    const boxes = loadPlaygroundBoxes()
    setPlaygroundBoxes(boxes)

    if (incomingBoxId && boxes.some(box => box.id === incomingBoxId)) {
      setSelectedBoxId(incomingBoxId)
    } else if (!incomingBoxId) {
      setSelectedBoxId(boxes[0]?.id ?? null)
    }
  }, [incomingBoxId])

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  if (!watch) {
    router.replace('/collection/add')
    return null
  }

  const resolvedWatch = watch
  const alreadyInCollection = isInCollection(resolvedWatch.id)
  const isCompact = viewportWidth < 980
  const eyebrowLabel = source === 'followed'
    ? 'Followed Watch'
    : isPlaygroundContext
    ? 'Add to Playground'
    : 'Add a Watch'

  function persistPlaygroundBoxes(boxes: PlaygroundBox[], autoFollowWatchId?: string) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes))
    setPlaygroundBoxes(boxes)
    if (autoFollowWatchId) followWatch(autoFollowWatchId)
  }

  function handleAddToPlayground() {
    if (!selectedBoxId) return
    const boxes = loadPlaygroundBoxes()
    const updated = addWatchToPlaygroundBox(boxes, selectedBoxId, resolvedWatch.id)
    persistPlaygroundBoxes(updated, resolvedWatch.id)
    router.push(`/playground?boxId=${selectedBoxId}`)
  }

  function handleCreateBoxAndAdd() {
    if (!newBoxName.trim()) return
    const boxes = loadPlaygroundBoxes()
    const newBox: PlaygroundBox = createPlaygroundBox({
      name: newBoxName.trim(),
      entries: [createPlaygroundEntry(resolvedWatch.id)],
    })
    const updated = [...boxes, newBox]
    persistPlaygroundBoxes(updated, resolvedWatch.id)
    router.push(`/playground?boxId=${newBox.id}`)
  }

  function commitCollectionAdd() {
    if (!condition) return

    addToCollection(resolvedWatch, condition, {
      price: purchasePrice ? Number(purchasePrice) : undefined,
      date: purchaseDate || undefined,
      notes: notes.trim() || undefined,
    })
    router.push('/collection')
  }

  return (
    <div style={{ padding: isCompact ? '28px 20px 72px' : '36px 56px 80px', borderTop: `1px solid ${brand.colors.border}` }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          marginBottom: 28,
          cursor: 'pointer',
          color: '#A89880',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← Back to search
      </button>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 1fr) minmax(340px, 520px)',
            gap: isCompact ? 28 : 48,
            alignItems: 'start',
          }}
        >
          <div style={{ position: isCompact ? 'relative' : 'sticky', top: isCompact ? 'auto' : 88 }}>
            <div
              style={{
                background: '#F5F2EC',
                border: '1px solid #EAE5DC',
                borderRadius: 16,
                position: 'relative',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
              }}
            >
              <Image
                src={resolvedWatch.imageUrl}
                alt={resolvedWatch.model}
                fill
                sizes={isCompact ? '100vw' : '(max-width: 1024px) 100vw, 45vw'}
                style={{ objectFit: 'contain', padding: 32, filter: 'drop-shadow(0 16px 32px rgba(26,20,16,0.18))' }}
              />
              <WatchStateControl
                catalogWatchId={resolvedWatch.id}
                source="add_detail"
              />
            </div>
          </div>

          <div style={{ maxWidth: isCompact ? 'none' : 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ width: 16, height: 1, background: '#D4CBBF', flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#A89880',
                }}
              >
                {eyebrowLabel}
              </span>
            </div>

            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 8 }}>
              {resolvedWatch.brand}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: isCompact ? 38 : 44, fontWeight: 400, lineHeight: 0.95, color: '#1A1410' }}>
                {resolvedWatch.model}
              </div>
              {alreadyInCollection && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(232,244,232,0.92)',
                    color: '#2D6A2D',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  In Collection
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#A89880', letterSpacing: '0.02em', marginBottom: 16 }}>
              {resolvedWatch.reference}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                rowGap: 4,
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 13,
                color: '#1A1410',
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              <span>{resolvedWatch.caseMaterial}</span>
              <span style={{ color: '#D4CBBF', margin: '0 10px' }}>|</span>
              <span>Dial: {resolvedWatch.dialColor}</span>
              <span style={{ color: '#D4CBBF', margin: '0 10px' }}>|</span>
              <span>{resolvedWatch.caseSizeMm} mm</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                paddingBottom: 20,
                marginBottom: 20,
                borderBottom: '1px solid #EAE5DC',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: isCompact ? 34 : 38, fontWeight: 400, color: '#C9A84C', lineHeight: 1 }}>
                {fmt(resolvedWatch.estimatedValue)}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880' }}>
                Est. Market Value
              </span>
            </div>

            <div style={{ marginBottom: 24 }}>
              {[
                ['Watch Type', resolvedWatch.watchType],
                ['Movement', resolvedWatch.movement],
                ['Complications', resolvedWatch.complications.join(', ') || '—'],
                ['Case Material', resolvedWatch.caseMaterial],
                ['Dial Color', resolvedWatch.dialColor],
                ['Case Size', `${resolvedWatch.caseSizeMm}mm`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 16,
                    padding: '8px 0',
                    borderBottom: '1px solid #F0EBE3',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#A89880' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500, color: '#1A1410', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: '#EAE5DC', marginBottom: 20 }} />

            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
              Where does it go?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {([
                { id: 'owned', headline: 'Add to My Collection', sub: 'You own this watch' },
                { id: 'playground', headline: 'Add to Playground', sub: 'Dream box, no ownership' },
              ] as const).map(option => {
                const active = choice === option.id
                return (
                  <button
                    key={option.id}
                    onClick={() => setChoice(option.id)}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: active ? '1.5px solid #1A1410' : '1px solid #E8E2D8',
                      background: active ? '#1A1410' : '#FFFFFF',
                      boxShadow: active ? '0 4px 16px rgba(26,20,16,0.12)' : '0 1px 4px rgba(26,20,16,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 400, lineHeight: 1.2, color: active ? '#FAF8F4' : '#1A1410', marginBottom: 4 }}>
                      {option.headline}
                    </div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, letterSpacing: '0.06em', color: active ? 'rgba(250,248,244,0.55)' : '#A89880' }}>
                      {option.sub}
                    </div>
                  </button>
                )
              })}
            </div>

            {choice === 'owned' ? (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                  Condition
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {CONDITIONS.map(option => {
                    const active = condition === option
                    return (
                      <button
                        key={option}
                        onClick={() => setCondition(option)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 20,
                          border: active ? '1.5px solid #1A1410' : '1px solid #E8E2D8',
                          background: active ? '#1A1410' : '#FFFFFF',
                          color: active ? '#FAF8F4' : '#1A1410',
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setDetailsOpen(prev => !prev)}
                  style={{
                    marginBottom: 12,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 11,
                    color: '#A89880',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1, color: '#C9A84C' }}>{detailsOpen ? '−' : '+'}</span>
                  {detailsOpen ? 'Hide purchase details' : 'Add purchase details'}
                </button>

                {detailsOpen && (
                  <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                    <input
                      type="number"
                      placeholder="Purchase Price"
                      value={purchasePrice}
                      onChange={e => setPurchasePrice(e.target.value)}
                      style={inputStyle}
                    />
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      style={inputStyle}
                    />
                    <textarea
                      rows={3}
                      placeholder="Notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                  Choose a Playground Box
                </div>

                <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                  {playgroundBoxes.map(box => {
                    const active = selectedBoxId === box.id
                    return (
                      <button
                        key={box.id}
                        onClick={() => setSelectedBoxId(box.id)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: active ? '1.5px solid #C9A84C' : '1px solid #E8E2D8',
                          background: active ? 'rgba(201,168,76,0.06)' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, color: '#1A1410', lineHeight: 1.1 }}>
                            {box.name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginTop: 2 }}>
                            {box.entries.length} watches
                          </div>
                        </div>
                        {active && (
                          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C' }}>
                            Selected
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setNewBoxOpen(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 11,
                    color: '#A89880',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    marginBottom: newBoxOpen ? 10 : 0,
                  }}
                >
                  {newBoxOpen ? '− Cancel new box' : '+ Create New Box'}
                </button>

                {newBoxOpen && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                    <input
                      value={newBoxName}
                      onChange={e => setNewBoxName(e.target.value)}
                      placeholder="Name your new Playground box"
                      style={inputStyle}
                    />
                    <button
                      onClick={handleCreateBoxAndAdd}
                      disabled={!newBoxName.trim()}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        background: newBoxName.trim() ? '#1A1410' : '#C8BFAF',
                        color: '#FAF8F4',
                        border: 'none',
                        borderRadius: 6,
                        cursor: newBoxName.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Create Box and Add
                    </button>
                  </div>
                )}
              </div>
            )}

            {choice === 'owned' ? (
              <button
                disabled={!condition}
                onClick={() => {
                  if (!condition) return
                  commitCollectionAdd()
                }}
                style={primaryButtonStyle(!condition)}
              >
                Add to My Collection
              </button>
            ) : (
              <button
                disabled={!selectedBoxId}
                onClick={handleAddToPlayground}
                style={primaryButtonStyle(!selectedBoxId)}
              >
                Add to Playground
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E8E2D8',
  borderRadius: 6,
  fontFamily: 'var(--font-dm-sans)',
  fontSize: 13,
  color: '#1A1410',
  background: '#FFFFFF',
  outline: 'none',
}

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '14px 20px',
    background: disabled ? '#C8BFAF' : '#1A1410',
    color: '#FAF8F4',
    border: 'none',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-dm-sans)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'background 0.15s ease',
  }
}
