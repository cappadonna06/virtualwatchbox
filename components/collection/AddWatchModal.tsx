'use client'

import React, { useState, useLayoutEffect, useRef } from 'react'
import type { Watch, OwnershipStatus, WatchCondition, WatchType } from '@/types/watch'
import { watches as catalogWatches } from '@/lib/watches'

const ALL_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT', 'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]
const DIAL_COLORS = ['Black', 'White', 'Blue', 'Green', 'Grey', 'Silver', 'Champagne', 'Brown', 'Red']
const OWNERSHIP_OPTIONS: OwnershipStatus[] = ['Owned', 'For Sale', 'Recently Added', 'Needs Service']
const CONDITION_OPTIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface AddConfig {
  ownershipStatus: OwnershipStatus
  condition: WatchCondition
  purchasePrice?: number
  purchaseDate?: string
  notes?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (watch: Watch, config: AddConfig) => void
  collectionWatchIds: string[]
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#A89880',
  marginBottom: 8,
  fontFamily: 'var(--font-dm-sans)',
}

const INPUT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans)',
  fontSize: 13,
  padding: '9px 12px',
  border: '1px solid #E0DAD0',
  borderRadius: 6,
  width: '100%',
  boxSizing: 'border-box',
  background: '#FFF',
  color: '#1A1410',
  outline: 'none',
}

export default function AddWatchModal({ isOpen, onClose, onAdd, collectionWatchIds }: Props) {
  const [screenW, setScreenW] = useState(0)
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 state
  const [query, setQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<WatchType[]>([])
  const [dialFilter, setDialFilter] = useState<string | null>(null)
  const [sizeFilter, setSizeFilter] = useState<'sm' | 'md' | 'lg' | null>(null)
  const [selected, setSelected] = useState<Watch | null>(null)
  const [dupTarget, setDupTarget] = useState<Watch | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const savedScrollY = useRef(0)

  // Step 2 state
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus | null>(null)
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')

  useLayoutEffect(() => {
    const update = () => setScreenW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!isOpen) return null

  const isMobile = screenW > 0 && screenW < 768

  // Filter catalog watches
  const filtered = catalogWatches.filter(w => {
    const q = query.toLowerCase()
    const matchesQuery = !q || [w.brand, w.model, w.reference].some(f => f.toLowerCase().includes(q))
    const matchesType = typeFilters.length === 0 || typeFilters.includes(w.watchType)
    const matchesDial = !dialFilter || w.dialColor.toLowerCase().includes(dialFilter.toLowerCase())
    const matchesSize = !sizeFilter || (
      sizeFilter === 'sm' ? w.caseSizeMm <= 38 :
      sizeFilter === 'md' ? w.caseSizeMm >= 39 && w.caseSizeMm <= 41 :
      w.caseSizeMm >= 42
    )
    return matchesQuery && matchesType && matchesDial && matchesSize
  })

  function handleCardClick(watch: Watch) {
    if (collectionWatchIds.includes(watch.id)) {
      setDupTarget(watch)
    } else {
      setSelected(prev => prev?.id === watch.id ? null : watch)
    }
  }

  function goToStep2() {
    if (!selected) return
    savedScrollY.current = scrollRef.current?.scrollTop ?? 0
    setStep(2)
  }

  function goBackToStep1() {
    setStep(1)
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = savedScrollY.current
    }, 0)
  }

  function handleAdd() {
    if (!selected || !ownershipStatus || !condition) return
    onAdd(selected, {
      ownershipStatus,
      condition,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      purchaseDate: purchaseDate || undefined,
      notes: notes || undefined,
    })
  }

  const modalStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        borderRadius: '20px 20px 0 0',
        background: '#FAF8F4',
        maxHeight: '90vh', overflowY: 'auto',
        zIndex: 201,
      }
    : {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw', maxWidth: 680, maxHeight: '85vh',
        overflowY: 'auto', borderRadius: 16,
        background: '#FAF8F4',
        boxShadow: '0 24px 80px rgba(26,20,16,0.2)',
        zIndex: 201,
      }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,20,16,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
        }}
      />

      <div className={isMobile ? 'config-modal' : ''} style={modalStyle} ref={scrollRef}>
        {/* Mobile drag pill */}
        {isMobile && (
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0', margin: '12px auto 4px' }} />
        )}

        {step === 1 && (
          <Step1
            query={query}
            setQuery={setQuery}
            typeFilters={typeFilters}
            setTypeFilters={setTypeFilters}
            dialFilter={dialFilter}
            setDialFilter={setDialFilter}
            sizeFilter={sizeFilter}
            setSizeFilter={setSizeFilter}
            filtered={filtered}
            selected={selected}
            collectionWatchIds={collectionWatchIds}
            onCardClick={handleCardClick}
            onNext={goToStep2}
            onClose={onClose}
            dupTarget={dupTarget}
            onDupCancel={() => setDupTarget(null)}
            onDupConfirm={() => {
              if (dupTarget) {
                setSelected(dupTarget)
                setDupTarget(null)
              }
            }}
          />
        )}

        {step === 2 && selected && (
          <Step2
            watch={selected}
            ownershipStatus={ownershipStatus}
            setOwnershipStatus={setOwnershipStatus}
            condition={condition}
            setCondition={setCondition}
            purchasePrice={purchasePrice}
            setPurchasePrice={setPurchasePrice}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            notes={notes}
            setNotes={setNotes}
            onBack={goBackToStep1}
            onAdd={handleAdd}
          />
        )}
      </div>
    </>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  query: string
  setQuery: (v: string) => void
  typeFilters: WatchType[]
  setTypeFilters: React.Dispatch<React.SetStateAction<WatchType[]>>
  dialFilter: string | null
  setDialFilter: (v: string | null) => void
  sizeFilter: 'sm' | 'md' | 'lg' | null
  setSizeFilter: (v: 'sm' | 'md' | 'lg' | null) => void
  filtered: Watch[]
  selected: Watch | null
  collectionWatchIds: string[]
  onCardClick: (w: Watch) => void
  onNext: () => void
  onClose: () => void
  dupTarget: Watch | null
  onDupCancel: () => void
  onDupConfirm: () => void
}

function Step1({
  query, setQuery, typeFilters, setTypeFilters,
  dialFilter, setDialFilter, sizeFilter, setSizeFilter,
  filtered, selected, collectionWatchIds, onCardClick,
  onNext, onClose, dupTarget, onDupCancel, onDupConfirm,
}: Step1Props) {
  function toggleType(t: WatchType) {
    setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div style={{ padding: '20px 20px 100px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 24, color: '#1A1410' }}>Add a Watch</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 20, lineHeight: 1, padding: 4 }}
        >
          ✕
        </button>
      </div>

      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by brand, model, or reference..."
        style={{ ...INPUT_STYLE, marginBottom: 12 }}
      />

      {/* Filter chips */}
      <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 8, paddingBottom: 4 }}>
        {/* Watch Type */}
        {ALL_WATCH_TYPES.map(t => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            style={{
              display: 'inline-block',
              marginRight: 6, marginBottom: 6,
              padding: '5px 12px',
              borderRadius: 20,
              border: typeFilters.includes(t) ? 'none' : '1px solid #E0DAD0',
              background: typeFilters.includes(t) ? '#1A1410' : 'transparent',
              color: typeFilters.includes(t) ? '#FAF8F4' : '#A89880',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', marginBottom: 8, paddingBottom: 4 }}>
        {/* Dial Color */}
        {DIAL_COLORS.map(c => (
          <button
            key={c}
            onClick={() => setDialFilter(dialFilter === c ? null : c)}
            style={{
              display: 'inline-block',
              marginRight: 6, marginBottom: 6,
              padding: '5px 12px',
              borderRadius: 20,
              border: dialFilter === c ? 'none' : '1px solid #E0DAD0',
              background: dialFilter === c ? '#1A1410' : 'transparent',
              color: dialFilter === c ? '#FAF8F4' : '#A89880',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </button>
        ))}

        {/* Case Size */}
        {([['sm', '≤38mm'], ['md', '39–41mm'], ['lg', '≥42mm']] as ['sm' | 'md' | 'lg', string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSizeFilter(sizeFilter === key ? null : key)}
            style={{
              display: 'inline-block',
              marginRight: 6, marginBottom: 6,
              padding: '5px 12px',
              borderRadius: 20,
              border: sizeFilter === key ? 'none' : '1px solid #E0DAD0',
              background: sizeFilter === key ? '#1A1410' : 'transparent',
              color: sizeFilter === key ? '#FAF8F4' : '#A89880',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#A89880' }}>
          No watches found. Try adjusting your filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
        >
          {filtered.map(w => {
            const inCollection = collectionWatchIds.includes(w.id)
            const isSelected = selected?.id === w.id
            return (
              <div
                key={w.id}
                onClick={() => onCardClick(w)}
                style={{
                  background: '#FFFFFF',
                  border: isSelected ? '1.5px solid rgba(201,168,76,0.8)' : '1px solid #EAE5DC',
                  boxShadow: isSelected ? '0 0 0 3px rgba(201,168,76,0.15)' : 'none',
                  borderRadius: 10,
                  padding: 14,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C9A84C', fontFamily: 'var(--font-dm-sans)', marginBottom: 2 }}>{w.brand}</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-cormorant)', color: '#1A1410', lineHeight: 1.15, marginBottom: 2 }}>{w.model}</div>
                <div style={{ fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginBottom: 4 }}>Ref. {w.reference}</div>
                <div style={{ fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginBottom: 8 }}>{w.caseSizeMm}mm · {w.dialColor}</div>
                <div style={{ fontSize: 20, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginBottom: 8 }}>{fmt(w.estimatedValue)}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: '#1A1410', color: '#FAF8F4', fontFamily: 'var(--font-dm-sans)' }}>{w.watchType}</span>
                  {inCollection && (
                    <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: '#E8F0E8', color: '#3A6A2D', fontFamily: 'var(--font-dm-sans)' }}>In Collection</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Duplicate warning modal */}
      {dupTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 210,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#FAF8F4', borderRadius: 12, padding: 24,
              width: 320, boxShadow: '0 16px 48px rgba(26,20,16,0.2)',
              border: '1px solid #EAE5DC',
            }}
          >
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#1A1410', marginBottom: 8 }}>Already in your collection</div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#A89880', marginBottom: 20 }}>
              You already own a {dupTarget.brand} {dupTarget.model}. Add another one?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onDupCancel}
                style={{
                  flex: 1, padding: '9px 0',
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
                  background: 'transparent', color: '#1A1410',
                  border: '1px solid #E0DAD0', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDupConfirm}
                style={{
                  flex: 1, padding: '9px 0',
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
                  background: '#1A1410', color: '#FAF8F4',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Add Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 202,
          padding: '12px 20px 20px',
          background: '#FAF8F4',
          borderTop: '1px solid #EAE5DC',
        }}
      >
        <button
          onClick={onNext}
          disabled={!selected}
          style={{
            width: '100%', padding: '12px 0',
            fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
            background: selected ? '#1A1410' : '#E0DAD0',
            color: selected ? '#FAF8F4' : '#A89880',
            border: 'none', borderRadius: 6,
            cursor: selected ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Select Watch →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  watch: Watch
  ownershipStatus: OwnershipStatus | null
  setOwnershipStatus: (v: OwnershipStatus) => void
  condition: WatchCondition | null
  setCondition: (v: WatchCondition) => void
  purchasePrice: string
  setPurchasePrice: (v: string) => void
  purchaseDate: string
  setPurchaseDate: (v: string) => void
  notes: string
  setNotes: (v: string) => void
  onBack: () => void
  onAdd: () => void
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div style={{ borderRadius: 6, border: '1px solid #E0DAD0', overflow: 'hidden', display: 'flex' }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flex: 1, padding: '8px 0', textAlign: 'center',
            fontSize: 11, fontFamily: 'var(--font-dm-sans)', fontWeight: 500,
            cursor: 'pointer', border: 'none',
            transition: 'all 0.15s',
            background: value === opt ? '#1A1410' : 'transparent',
            color: value === opt ? '#FAF8F4' : '#A89880',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function Step2({
  watch, ownershipStatus, setOwnershipStatus, condition, setCondition,
  purchasePrice, setPurchasePrice, purchaseDate, setPurchaseDate,
  notes, setNotes, onBack, onAdd,
}: Step2Props) {
  const canAdd = !!ownershipStatus && !!condition

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      {/* Back link */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', padding: 0, marginBottom: 16 }}
      >
        ← Back
      </button>

      {/* Title */}
      <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#1A1410', marginBottom: 4 }}>
        Adding: {watch.brand} {watch.model}
      </div>
      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#A89880', marginBottom: 24 }}>Ref. {watch.reference} · {watch.caseSizeMm}mm</div>

      {/* Ownership Status */}
      <div style={{ marginBottom: 20 }}>
        <div style={SECTION_LABEL as React.CSSProperties}>Ownership Status</div>
        <SegmentedControl options={OWNERSHIP_OPTIONS} value={ownershipStatus} onChange={setOwnershipStatus} />
      </div>

      {/* Condition */}
      <div style={{ marginBottom: 20 }}>
        <div style={SECTION_LABEL as React.CSSProperties}>Condition</div>
        <SegmentedControl options={CONDITION_OPTIONS} value={condition} onChange={setCondition} />
      </div>

      {/* Purchase Price */}
      <div style={{ marginBottom: 16 }}>
        <div style={SECTION_LABEL as React.CSSProperties}>Purchase Price (optional)</div>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E0DAD0', borderRadius: 6, overflow: 'hidden', background: '#FFF' }}>
          <span style={{ padding: '9px 10px', fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#A89880', borderRight: '1px solid #E0DAD0', background: '#FAF8F4' }}>$</span>
          <input
            type="number"
            value={purchasePrice}
            onChange={e => setPurchasePrice(e.target.value)}
            placeholder="0"
            style={{ ...INPUT_STYLE, border: 'none', borderRadius: 0, flex: 1 }}
          />
        </div>
      </div>

      {/* Purchase Date */}
      <div style={{ marginBottom: 16 }}>
        <div style={SECTION_LABEL as React.CSSProperties}>Purchase Date (optional)</div>
        <input
          type="date"
          value={purchaseDate}
          onChange={e => setPurchaseDate(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 24 }}>
        <div style={SECTION_LABEL as React.CSSProperties}>Notes (optional)</div>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="AD purchase, complete set..."
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {/* Add button */}
      <button
        onClick={onAdd}
        disabled={!canAdd}
        style={{
          width: '100%', padding: '13px 0',
          fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
          background: canAdd ? '#1A1410' : '#1A1410',
          color: '#FAF8F4',
          border: 'none', borderRadius: 6,
          cursor: canAdd ? 'pointer' : 'not-allowed',
          opacity: canAdd ? 1 : 0.4,
          transition: 'opacity 0.15s',
        }}
      >
        Add to Collection
      </button>
    </div>
  )
}
