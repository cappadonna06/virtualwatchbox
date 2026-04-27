'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import { watches } from '@/lib/watches'
import type { OwnershipStatus, Watch, WatchCondition, WatchType } from '@/types/watch'

const DIAL_FILTERS = ['Black', 'White', 'Blue', 'Green', 'Grey', 'Silver', 'Champagne', 'Brown', 'Red']
const WATCH_TYPES: WatchType[] = [
  'Diver',
  'Dress',
  'Sport',
  'Chronograph',
  'GMT',
  'Pilot',
  'Field',
  'Integrated Bracelet',
  'Vintage',
]

const OWNERSHIP_OPTIONS: OwnershipStatus[] = ['Owned', 'For Sale', 'Recently Added', 'Needs Service']
const CONDITION_OPTIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']

type CaseSizeBucket = 'small' | 'mid' | 'large' | null

interface AddConfig {
  ownershipStatus: OwnershipStatus
  condition: WatchCondition
  purchasePrice?: number
  purchaseDate?: string
  notes?: string
}

interface AddWatchModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (watch: Watch, config: AddConfig) => void
  existingWatchIds: string[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function matchesDialFilter(watch: Watch, selected: string[]) {
  if (!selected.length) return true
  const d = watch.dialColor.toLowerCase()
  return selected.some(color => d.includes(color.toLowerCase()))
}

function matchesSize(watch: Watch, bucket: CaseSizeBucket) {
  if (!bucket) return true
  if (bucket === 'small') return watch.caseSizeMm <= 38
  if (bucket === 'mid') return watch.caseSizeMm >= 39 && watch.caseSizeMm <= 41
  return watch.caseSizeMm >= 42
}

function sectionLabel(label: string) {
  return (
    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 8 }}>
      {label}
    </div>
  )
}

export default function AddWatchModal({ isOpen, onClose, onAdd, existingWatchIds }: AddWatchModalProps) {
  const [screenW, setScreenW] = useState(0)
  const [step, setStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<WatchType[]>([])
  const [dialFilters, setDialFilters] = useState<string[]>([])
  const [sizeFilter, setSizeFilter] = useState<CaseSizeBucket>(null)
  const [selectedWatch, setSelectedWatch] = useState<Watch | null>(null)

  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus | null>(null)
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)

  useLayoutEffect(() => {
    const update = () => setScreenW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const isMobile = screenW > 0 && screenW < 768

  const existingIds = useMemo(() => new Set(existingWatchIds), [existingWatchIds])
  const isAlreadyInCollection = (watchId: string) =>
    existingIds.has(watchId) || existingWatchIds.some(id => id.startsWith(`${watchId}-`))

  const filteredWatches = useMemo(() => {
    const q = query.trim().toLowerCase()

    return watches.filter(watch => {
      const matchesText = !q || [watch.brand, watch.model, watch.reference].some(part => part.toLowerCase().includes(q))
      const matchesType = !typeFilters.length || typeFilters.includes(watch.watchType)
      return matchesText && matchesType && matchesDialFilter(watch, dialFilters) && matchesSize(watch, sizeFilter)
    })
  }, [dialFilters, query, sizeFilter, typeFilters])

  const canSubmit = Boolean(selectedWatch && ownershipStatus && condition)

  if (!isOpen) return null

  const panelStyle = isMobile
    ? {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 201,
        borderRadius: '20px 20px 0 0',
        background: '#FAFAF8',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column' as const,
      }
    : {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90vw',
        maxWidth: 640,
        maxHeight: '85vh',
        overflowY: 'auto' as const,
        zIndex: 201,
        borderRadius: 16,
        background: '#FFFFFF',
        boxShadow: '0 24px 80px rgba(26,20,16,0.2)',
      }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', backdropFilter: 'blur(2px)', zIndex: 200 }}
      />

      <div className={isMobile ? 'config-modal' : undefined} style={panelStyle}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>
        )}

        <div style={{ padding: isMobile ? '10px 18px 12px' : '18px 22px 14px', borderBottom: '1px solid #EAE5DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
              Add Watch
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, color: '#1A1410', lineHeight: 1 }}>
              {step === 1 ? 'Search & Select' : 'Configure & Add'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 20, lineHeight: 1, padding: 4 }}>
            ✕
          </button>
        </div>

        {step === 1 && (
          <div style={{ padding: isMobile ? '14px 16px 18px' : '16px 22px 20px', overflowY: 'auto' }}>
            {sectionLabel('Search Catalog')}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search brand, model, or reference"
              style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', outline: 'none', color: '#1A1410', background: '#FFFFFF', marginBottom: 12 }}
            />

            {sectionLabel('Watch Type')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {WATCH_TYPES.map(type => {
                const active = typeFilters.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilters(prev => (prev.includes(type) ? prev.filter(v => v !== type) : [...prev, type]))}
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 11,
                      letterSpacing: '0.03em',
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: active ? '1px solid rgba(201,168,76,0.8)' : '1px solid #E0DAD0',
                      background: active ? 'rgba(201,168,76,0.12)' : '#FFFFFF',
                      color: active ? '#C9A84C' : '#A89880',
                      cursor: 'pointer',
                    }}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {sectionLabel('Dial Color')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {DIAL_FILTERS.map(color => {
                const active = dialFilters.includes(color)
                return (
                  <button
                    key={color}
                    onClick={() => setDialFilters(prev => (prev.includes(color) ? prev.filter(v => v !== color) : [...prev, color]))}
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 11,
                      letterSpacing: '0.03em',
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: active ? '1px solid rgba(201,168,76,0.8)' : '1px solid #E0DAD0',
                      background: active ? 'rgba(201,168,76,0.12)' : '#FFFFFF',
                      color: active ? '#C9A84C' : '#A89880',
                      cursor: 'pointer',
                    }}
                  >
                    {color}
                  </button>
                )
              })}
            </div>

            {sectionLabel('Case Size')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { label: '≤38mm', value: 'small' as const },
                { label: '39–41mm', value: 'mid' as const },
                { label: '≥42mm', value: 'large' as const },
              ].map(option => {
                const active = sizeFilter === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setSizeFilter(prev => (prev === option.value ? null : option.value))}
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 11,
                      letterSpacing: '0.03em',
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: active ? '1px solid rgba(201,168,76,0.8)' : '1px solid #E0DAD0',
                      background: active ? 'rgba(201,168,76,0.12)' : '#FFFFFF',
                      color: active ? '#C9A84C' : '#A89880',
                      cursor: 'pointer',
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
              {filteredWatches.map(watch => {
                const inCollection = isAlreadyInCollection(watch.id)
                const selected = selectedWatch?.id === watch.id

                return (
                  <button
                    key={watch.id}
                    onClick={() => {
                      setSelectedWatch(watch)
                      setStep(2)
                    }}
                    style={{
                      textAlign: 'left',
                      border: selected ? '1px solid rgba(201,168,76,0.8)' : '1px solid #EAE5DC',
                      borderRadius: 10,
                      padding: 12,
                      background: '#FFFFFF',
                      boxShadow: selected ? '0 0 0 1px rgba(201,168,76,0.4), 0 10px 26px rgba(201,168,76,0.18)' : '0 4px 14px rgba(26,20,16,0.04)',
                      cursor: 'pointer',
                      opacity: 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C' }}>
                        {watch.brand}
                      </span>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, padding: '2px 7px', borderRadius: 999, background: '#1A1410', color: '#FAF8F4' }}>
                        {watch.watchType}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, color: '#1A1410', lineHeight: 1.1, marginBottom: 4 }}>
                      {watch.model}
                    </div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 2 }}>Ref. {watch.reference}</div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 8 }}>{watch.caseSizeMm}mm · {watch.dialColor}</div>
                    <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, color: '#1A1410', marginBottom: 8 }}>{fmt(watch.estimatedValue)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880' }}>
                        {inCollection ? 'In Collection' : 'Select'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#C9A84C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Select
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && selectedWatch && (
          <div style={{ padding: isMobile ? '14px 16px 18px' : '16px 22px 20px', overflowY: 'auto' }}>
            <button
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', padding: 0, marginBottom: 12, cursor: 'pointer', color: '#A89880', fontFamily: 'var(--font-dm-sans)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Back
            </button>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 4 }}>
                {selectedWatch.brand}
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, color: '#1A1410', lineHeight: 1.1 }}>
                {selectedWatch.model}
              </div>
              {isAlreadyInCollection(selectedWatch.id) && (
                <div
                  style={{
                    marginTop: 8,
                    display: 'inline-block',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 10,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#A89880',
                    border: '1px solid #E0DAD0',
                    borderRadius: 999,
                    padding: '3px 8px',
                    background: '#FAF8F4',
                  }}
                >
                  In Collection
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              {sectionLabel('Ownership Status')}
              <div style={{ display: 'flex', border: '1px solid #E8E2D8', borderRadius: 6, overflow: 'hidden' }}>
                {OWNERSHIP_OPTIONS.map((option, i) => (
                  <button
                    key={option}
                    onClick={() => setOwnershipStatus(option)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderLeft: i > 0 ? '1px solid #E8E2D8' : 'none',
                      borderRadius: 0,
                      background: ownershipStatus === option ? '#1A1410' : 'transparent',
                      color: ownershipStatus === option ? '#FAF8F4' : '#A89880',
                      fontSize: 11,
                      fontFamily: 'var(--font-dm-sans)',
                      fontWeight: 500,
                      padding: '7px 0',
                      cursor: 'pointer',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              {sectionLabel('Condition')}
              <div style={{ display: 'flex', border: '1px solid #E8E2D8', borderRadius: 6, overflow: 'hidden' }}>
                {CONDITION_OPTIONS.map((option, i) => (
                  <button
                    key={option}
                    onClick={() => setCondition(option)}
                    style={{
                      flex: 1,
                      border: 'none',
                      borderLeft: i > 0 ? '1px solid #E8E2D8' : 'none',
                      borderRadius: 0,
                      background: condition === option ? '#1A1410' : 'transparent',
                      color: condition === option ? '#FAF8F4' : '#A89880',
                      fontSize: 11,
                      fontFamily: 'var(--font-dm-sans)',
                      fontWeight: 500,
                      padding: '7px 0',
                      cursor: 'pointer',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                {sectionLabel('Purchase Price (USD)')}
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="Optional"
                  style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', outline: 'none', color: '#1A1410', background: '#FFFFFF' }}
                />
              </div>
              <div>
                {sectionLabel('Purchase Date')}
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', outline: 'none', color: '#1A1410', background: '#FFFFFF' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              {sectionLabel('Notes')}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Optional"
                style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, padding: '9px 12px', border: '1px solid #E0DAD0', borderRadius: 6, width: '100%', outline: 'none', color: '#1A1410', background: '#FFFFFF', resize: 'vertical' }}
              />
            </div>

            <button
              disabled={!canSubmit}
              onClick={() => {
                if (!selectedWatch || !ownershipStatus || !condition) return
                if (isAlreadyInCollection(selectedWatch.id)) {
                  setDuplicateConfirmOpen(true)
                  return
                }
                onAdd(selectedWatch, {
                  ownershipStatus,
                  condition,
                  purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
                  purchaseDate: purchaseDate || undefined,
                  notes: notes.trim() || undefined,
                })
              }}
              style={{
                width: '100%',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '11px 18px',
                background: canSubmit ? '#1A1410' : '#B8ADA0',
                color: '#FAF8F4',
                border: 'none',
                borderRadius: 6,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Add to Collection
            </button>

            {duplicateConfirmOpen && (
              <>
                <div
                  onClick={() => setDuplicateConfirmOpen(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', backdropFilter: 'blur(2px)', zIndex: 210 }}
                />
                <div
                  style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    maxWidth: 380,
                    zIndex: 211,
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #EAE5DC',
                    boxShadow: '0 20px 60px rgba(26,20,16,0.2)',
                    padding: 18,
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
                    Already in Collection
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 24, color: '#1A1410', lineHeight: 1.1, marginBottom: 10 }}>
                    Add duplicate watch?
                  </div>
                  <p style={{ margin: '0 0 14px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', lineHeight: 1.5 }}>
                    This watch already exists in your collection. You can still add it as another entry.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => setDuplicateConfirmOpen(false)}
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '9px 12px',
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
                        if (!selectedWatch || !ownershipStatus || !condition) return
                        onAdd(selectedWatch, {
                          ownershipStatus,
                          condition,
                          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
                          purchaseDate: purchaseDate || undefined,
                          notes: notes.trim() || undefined,
                        })
                        setDuplicateConfirmOpen(false)
                      }}
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '9px 12px',
                        background: '#1A1410',
                        color: '#FAF8F4',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Add Duplicate
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
