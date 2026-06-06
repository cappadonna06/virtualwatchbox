'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { CatalogWatch, PlaygroundBox, WatchCondition } from '@/types/watch'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { addWatchToPlaygroundBox, createPlaygroundBox, createPlaygroundEntry, normalizePlaygroundBoxes } from '@/lib/playground'
import { createSeededPlaygroundBoxes } from '@/lib/playgroundData'
import { useCollectionSession } from '../../CollectionSessionProvider'
import { brand } from '@/lib/brand'
import WatchStateControl from '@/components/collection/WatchStateControl'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

const STORAGE_KEY = 'playgroundBoxes'
const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
type OwnershipChoice = 'owned' | 'playground'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function StepHeading({
  n,
  children,
  labelColor = '#A89880',
  trailing,
}: {
  n: number
  children: ReactNode
  labelColor?: string
  trailing?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '1px solid #D4CBBF',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 12,
          fontWeight: 600,
          color: '#A89880',
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: labelColor,
          transition: 'color 0.2s',
        }}
      >
        {children}
      </span>
      {trailing}
    </div>
  )
}

function loadPlaygroundBoxes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return normalizePlaygroundBoxes(stored ? JSON.parse(stored) : null, createSeededPlaygroundBoxes())
  } catch {
    return createSeededPlaygroundBoxes()
  }
}

export default function AddWatchConfirmPage() {
  const params = useParams<{ watchId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCollection, followWatch, isInCollection, collectionWatches } = useCollectionSession()

  const { allWatches, fetchById, registerWatches } = useCatalog()
  // The in-memory catalog only holds the top-2000 by heat. The other ~33k
  // refs are accessible via Add Watch search but won't appear here unless
  // we hydrate on demand.
  const localWatch = useMemo(
    () => allWatches.find(w => w.id === params.watchId),
    [allWatches, params.watchId],
  )
  const [remoteWatch, setRemoteWatch] = useState<CatalogWatch | null>(null)
  const [remoteResolved, setRemoteResolved] = useState(false)
  const watch = localWatch ?? remoteWatch

  useEffect(() => {
    if (localWatch || !params.watchId) {
      setRemoteResolved(true)
      return
    }
    let cancelled = false
    setRemoteResolved(false)
    fetchById(params.watchId).then(found => {
      if (cancelled) return
      setRemoteWatch(found)
      // Inject into the in-memory catalog so any follow/target/grail action
      // on this page (or subsequent /collection render after Add) sees the
      // ref. Without this, the resolve layer drops it as "unknown catalog id"
      // even though we just successfully fetched it from Supabase.
      if (found) registerWatches([found])
      setRemoteResolved(true)
    }).catch(() => {
      if (cancelled) return
      setRemoteWatch(null)
      setRemoteResolved(true)
    })
    return () => { cancelled = true }
  }, [params.watchId, localWatch, fetchById, registerWatches])

  // Owned instances of this catalog watch — for the duplicate-aware UX. One user
  // can own multiple of the same model (a vintage and a current production, etc.).
  const ownedInstances = useMemo(
    () => collectionWatches.filter(w => w.watchId === params.watchId),
    [collectionWatches, params.watchId],
  )

  const dest = searchParams.get('dest')
  const source = searchParams.get('source')
  const incomingBoxId = searchParams.get('boxId')
  const slotParam = searchParams.get('slot')
  const targetSlot = slotParam !== null && Number.isFinite(Number(slotParam)) ? Number(slotParam) : undefined
  const isPlaygroundContext = dest === 'playground'

  const [choice, setChoice] = useState<OwnershipChoice>(isPlaygroundContext ? 'playground' : 'owned')
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [conditionNudge, setConditionNudge] = useState(false)
  const conditionRef = useRef<HTMLDivElement | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addAnotherOpen, setAddAnotherOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [playgroundBoxes, setPlaygroundBoxes] = useState<PlaygroundBox[]>(createSeededPlaygroundBoxes)
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
    if (!remoteResolved) {
      // Wait for fetchById to resolve before deciding to redirect.
      return (
        <div
          style={{
            padding: '120px 40px',
            textAlign: 'center',
            fontFamily: brand.font.sans,
            fontSize: 15,
            color: brand.colors.muted,
          }}
        >
          Loading watch…
        </div>
      )
    }
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
    const updated = addWatchToPlaygroundBox(boxes, selectedBoxId, resolvedWatch.id, targetSlot)
    persistPlaygroundBoxes(updated, resolvedWatch.id)
    router.push(`/playground?boxId=${selectedBoxId}`)
  }

  function handleCreateBoxAndAdd() {
    if (!newBoxName.trim()) return
    const boxes = loadPlaygroundBoxes()
    const newBox: PlaygroundBox = createPlaygroundBox({
      name: newBoxName.trim(),
      entries: [createPlaygroundEntry(resolvedWatch.id, undefined, undefined, targetSlot ?? 0)],
    })
    const updated = [...boxes, newBox]
    persistPlaygroundBoxes(updated, resolvedWatch.id)
    router.push(`/playground?boxId=${newBox.id}`)
  }

  async function commitCollectionAdd() {
    if (!condition) return
    if (submitting) return  // guard against double-click re-entry
    setSubmitting(true)

    // If the user arrived from the photo-search flow, PhotoSearch stashed
    // their uploaded photo URL keyed by this watch's id. Use it as the
    // owned-watch photo so the catalog SVG fallback is replaced by their
    // actual shot when the catalog row has no curated image.
    let photoUrl: string | undefined
    try {
      const raw = sessionStorage.getItem(`vwb:pending-photo:${resolvedWatch.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { photoUrl?: string }
        if (parsed?.photoUrl) photoUrl = parsed.photoUrl
        sessionStorage.removeItem(`vwb:pending-photo:${resolvedWatch.id}`)
      }
    } catch { /* ignore */ }

    const newOwnedId = addToCollection(resolvedWatch, condition, {
      price: purchasePrice ? Number(purchasePrice) : undefined,
      date: purchaseDate || undefined,
      notes: notes.trim() || undefined,
      photoUrl,
    }, targetSlot)

    // Register the user's uploaded photo into the gallery so it appears in
    // the watch detail. Best-effort — failure to register doesn't prevent
    // the watch from being added.
    if (photoUrl && newOwnedId) {
      try {
        await fetch(`/api/user-watches/${newOwnedId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl }),
        })
      } catch { /* non-fatal */ }
    }

    router.push('/collection')
  }

  const canAdd = choice === 'owned' ? !!condition : !!selectedBoxId
  const ctaHelper = canAdd
    ? 'Ready when you are.'
    : choice === 'owned'
    ? 'Select a condition to continue.'
    : 'Pick a box to continue.'

  const ctaNode = (
    <>
      {choice === 'owned' ? (
        <button
          disabled={submitting}
          aria-disabled={!condition}
          onClick={() => {
            if (submitting) return
            if (!condition) {
              setConditionNudge(true)
              conditionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              window.setTimeout(() => setConditionNudge(false), 1400)
              return
            }
            void commitCollectionAdd()
          }}
          style={{
            ...primaryButtonStyle(!condition || submitting),
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting
            ? 'Adding…'
            : `${alreadyInCollection ? 'Add another to My Collection' : 'Add to My Collection'}${condition ? '  →' : ''}`}
        </button>
      ) : (
        <button
          disabled={!selectedBoxId}
          onClick={handleAddToPlayground}
          style={primaryButtonStyle(!selectedBoxId)}
        >
          {`Add to Playground${selectedBoxId ? '  →' : ''}`}
        </button>
      )}
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 12,
          color: '#A89880',
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        {ctaHelper}
      </div>
      {alreadyInCollection && addAnotherOpen && (
        <button
          type="button"
          onClick={() => setAddAnotherOpen(false)}
          style={{
            marginTop: 10,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 12,
            color: '#A89880',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            alignSelf: 'flex-start',
          }}
        >
          Cancel — don&apos;t add another
        </button>
      )}
    </>
  )

  const showActionArea = !alreadyInCollection || addAnotherOpen || submitting

  return (
    <div style={{ padding: isCompact ? '28px 20px 132px' : '36px 56px 80px', borderTop: `1px solid ${brand.colors.border}` }}>
      <style>{`@keyframes addwatch-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
      {(() => {
        const fromParam = searchParams.get('from')
        const isFromDiscover = fromParam === 'discover'
        const label = isFromDiscover ? '← Back to Discover' : '← Back to search'
        const onClick = isFromDiscover ? () => router.push('/discover') : () => router.back()
        return (
          <button
            onClick={onClick}
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
            {label}
          </button>
        )
      })()}

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
              <WatchImageOrDial
                watch={resolvedWatch}
                fill
                sizes={isCompact ? '100vw' : '(max-width: 1024px) 100vw, 45vw'}
                imageStyle={{ objectFit: 'contain', padding: 32, filter: 'drop-shadow(0 16px 32px rgba(26,20,16,0.18))' }}
                dialSize={isCompact ? 160 : 220}
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
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#A89880',
                }}
              >
                {eyebrowLabel}
              </span>
            </div>

            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 8 }}>
              {resolvedWatch.brand}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: isCompact ? 38 : 44, fontWeight: 400, lineHeight: 0.95, color: '#1A1410' }}>
                {resolvedWatch.model}
              </div>
              {alreadyInCollection && !submitting && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(232,244,232,0.92)',
                    color: '#2D6A2D',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  In Collection
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15, color: '#A89880', letterSpacing: '0.02em', marginBottom: 16 }}>
              {resolvedWatch.reference}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                rowGap: 4,
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 15,
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
              <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: isCompact ? 34 : 38, fontWeight: 400, color: brand.colors.goldDeep, lineHeight: 1 }}>
                {fmt(resolvedWatch.estimatedValue)}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A89880' }}>
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
                ...(resolvedWatch.lugWidthMm ? [['Lug Width', `${resolvedWatch.lugWidthMm}mm`] as [string, string]] : []),
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
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500, color: '#1A1410', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: '#EAE5DC', marginBottom: 20 }} />

            {alreadyInCollection && !addAnotherOpen && !submitting && (
              <div style={{
                padding: '14px 16px',
                background: 'rgba(232,244,232,0.6)',
                border: '1px solid #C8E6C8',
                borderRadius: 10,
                marginBottom: 18,
              }}>
                <div style={{
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2D6A2D', marginBottom: 6,
                }}>
                  ✓ {ownedInstances.length === 1 ? 'You already have one of these' : `You have ${ownedInstances.length} of these`}
                </div>

                {ownedInstances.length === 1 ? (
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#1A1410', lineHeight: 1.5, marginBottom: 14 }}>
                    Added{ownedInstances[0].purchaseDate ? ` ${ownedInstances[0].purchaseDate}` : ''}{ownedInstances[0].condition ? ` · ${ownedInstances[0].condition}` : ''}.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {ownedInstances.map(inst => (
                      <div
                        key={inst.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '8px 10px',
                          background: '#FFFFFF',
                          border: '1px solid #DCEAD9',
                          borderRadius: 6,
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 12,
                          color: '#1A1410',
                        }}
                      >
                        <span>
                          <span style={{ fontWeight: 500 }}>{inst.condition}</span>
                          {inst.purchaseDate && <span style={{ color: '#A89880', marginLeft: 6 }}>· {inst.purchaseDate}</span>}
                        </span>
                        <Link
                          href={`/collection/watch/${inst.id}`}
                          style={{ color: brand.colors.goldDeep, textDecoration: 'none', fontWeight: 500 }}
                        >
                          Manage →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ownedInstances.length === 1 && (
                    <Link
                      href={`/collection/watch/${ownedInstances[0].id}`}
                      style={{
                        padding: '10px 16px',
                        background: '#1A1410',
                        color: '#FAF8F4',
                        border: '1px solid #1A1410',
                        borderRadius: 6,
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                      }}
                    >
                      Manage your watch →
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddAnotherOpen(true)}
                    style={{
                      padding: '10px 16px',
                      background: 'transparent',
                      color: '#1A1410',
                      border: '1px solid #1A1410',
                      borderRadius: 6,
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                    }}
                  >
                    + Add another
                  </button>
                </div>
              </div>
            )}

            {(!alreadyInCollection || addAnotherOpen || submitting) && (
            <>
            <StepHeading n={1}>
              {alreadyInCollection ? 'Add another copy — where does it go?' : 'Where does it go?'}
            </StepHeading>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0,
                  background: '#F0EBE3',
                  border: '1px solid #E8E2D8',
                  borderRadius: 12,
                  padding: 4,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: `calc(4px + ${choice === 'playground' ? 1 : 0} * (50% - 4px))`,
                    width: 'calc(50% - 4px)',
                    background: '#1A1410',
                    borderRadius: 9,
                    boxShadow: '0 4px 16px rgba(26,20,16,0.18)',
                    transition: 'left 0.22s cubic-bezier(.4,0,.2,1)',
                  }}
                />
                {([
                  { id: 'owned', title: 'I Own This', sub: isCompact ? 'My Collection' : 'Goes to My Collection' },
                  { id: 'playground', title: 'Just Dreaming', sub: isCompact ? 'Playground box' : 'Saves to a Playground box' },
                ] as const).map(option => {
                  const active = choice === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => setChoice(option.id)}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: isCompact ? '12px 13px' : '13px 16px',
                        borderRadius: 9,
                        transition: 'color 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: '50%',
                            flexShrink: 0,
                            border: active ? '4px solid #C9A84C' : '1.5px solid #D4CBBF',
                            background: active ? '#1A1410' : 'transparent',
                            transition: 'all 0.18s ease',
                          }}
                        />
                        <span
                          style={{
                            fontFamily: 'var(--font-cormorant)',
                            fontSize: isCompact ? 17 : 19,
                            fontWeight: 400,
                            lineHeight: 1.1,
                            color: active ? '#FAF8F4' : '#1A1410',
                          }}
                        >
                          {option.title}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 12,
                          letterSpacing: '0.03em',
                          paddingLeft: 20,
                          color: active ? 'rgba(250,248,244,0.6)' : '#A89880',
                        }}
                      >
                        {option.sub}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 12,
                  color: '#A89880',
                  lineHeight: 1.5,
                  marginTop: 9,
                }}
              >
                Pick where it lives — you&apos;ll confirm with the button below.
              </div>
            </div>

            <div key={choice} style={{ animation: 'addwatch-fade 0.25s ease' }}>
            {choice === 'owned' ? (
              <div ref={conditionRef} style={{ marginBottom: 24 }}>
                <StepHeading
                  n={2}
                  labelColor={conditionNudge ? '#8A6A10' : '#A89880'}
                  trailing={
                    !condition ? (
                      <span
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 12,
                          color: conditionNudge ? '#8A6A10' : '#A89880',
                          fontStyle: 'italic',
                          transition: 'color 0.2s',
                        }}
                      >
                        Choose one to continue
                      </span>
                    ) : undefined
                  }
                >
                  Condition
                </StepHeading>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {CONDITIONS.map(option => {
                    const active = condition === option
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setCondition(option)
                          setConditionNudge(false)
                        }}
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
                <StepHeading n={2}>Choose a Playground Box</StepHeading>

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
                          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', marginTop: 2 }}>
                            {box.entries.length} watches
                          </div>
                        </div>
                        {active && (
                          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.goldDeep }}>
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
            </div>

            {!isCompact && ctaNode}
            </>
            )}
          </div>
        </div>
      </div>

      {isCompact && showActionArea && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            padding: '14px 20px calc(14px + env(safe-area-inset-bottom))',
            borderTop: '1px solid #EAE5DC',
            background: '#FAF8F4',
            boxShadow: '0 -2px 14px rgba(26,20,16,0.06)',
          }}
        >
          {ctaNode}
        </div>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px',
  border: '1px solid #E8E2D8',
  borderRadius: 6,
  fontFamily: 'var(--font-dm-sans)',
  // 16px is the iOS Safari focus-zoom threshold — anything smaller
  // triggers an auto-zoom that persists and breaks the layout.
  fontSize: 16,
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
