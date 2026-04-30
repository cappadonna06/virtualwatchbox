'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { PlaygroundBox, PlaygroundWatchOverrides, ResolvedWatch, WatchCondition, WatchType } from '@/types/watch'
import { normalizePlaygroundBoxes } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import { watches as catalogWatches } from '@/lib/watches'
import DialSVG from '@/components/watchbox/DialSVG'
import { DEFAULT_RESOLVED_WATCH_CONDITION } from '@/lib/watchData'

const STORAGE_KEY = 'playgroundBoxes'
const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
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

export default function EditPlaygroundWatchPage() {
  const params = useParams<{ boxId: string; entryId: string }>()
  const router = useRouter()

  const [boxes, setBoxes] = useState<PlaygroundBox[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [reference, setReference] = useState('')
  const [caseSizeMm, setCaseSizeMm] = useState('')
  const [caseMaterial, setCaseMaterial] = useState('')
  const [dialColor, setDialColor] = useState('')
  const [movement, setMovement] = useState('')
  const [complications, setComplications] = useState('')
  const [condition, setCondition] = useState<WatchCondition>('Excellent')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [watchType, setWatchType] = useState<WatchType>('Sport')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setBoxes(normalizePlaygroundBoxes(stored ? JSON.parse(stored) : null, SEEDED_PLAYGROUND_BOXES))
    } catch {
      setBoxes(SEEDED_PLAYGROUND_BOXES)
    } finally {
      setHydrated(true)
    }
  }, [])

  const box = useMemo(() => boxes.find(item => item.id === params.boxId), [boxes, params.boxId])
  const entry = useMemo(() => box?.entries.find(item => item.id === params.entryId) ?? null, [box, params.entryId])
  const sourceWatch = useMemo(() => catalogWatches.find(watch => watch.id === entry?.watchId) ?? null, [entry])

  useEffect(() => {
    if (!entry || !sourceWatch) return
    const merged = { ...sourceWatch, ...entry.overrides }
    setReference(merged.reference)
    setCaseSizeMm(String(merged.caseSizeMm))
    setCaseMaterial(merged.caseMaterial)
    setDialColor(merged.dialColor)
    setMovement(merged.movement)
    setComplications(merged.complications.join(', '))
    setCondition(entry.overrides?.condition ?? DEFAULT_RESOLVED_WATCH_CONDITION)
    setEstimatedValue(String(merged.estimatedValue))
    setNotes(entry.overrides?.notes ?? '')
    setWatchType(merged.watchType)
  }, [entry, sourceWatch])

  if (hydrated && (!box || !entry || !sourceWatch)) {
    router.replace('/playground')
    return null
  }

  if (!entry || !sourceWatch) {
    return null
  }

  const activeBox = box!
  const activeEntry = entry!
  const baseWatch = sourceWatch!

  const previewWatch: ResolvedWatch = {
    ...baseWatch,
    id: activeEntry.id,
    watchId: baseWatch.id,
    reference,
    caseSizeMm: Number(caseSizeMm) || baseWatch.caseSizeMm,
    caseMaterial,
    dialColor,
    movement,
    complications: complications.split(',').map(value => value.trim()).filter(Boolean),
    condition,
    estimatedValue: Number(estimatedValue) || baseWatch.estimatedValue,
    notes,
    watchType,
  }

  function buildOverrides(): PlaygroundWatchOverrides {
    const overrides: PlaygroundWatchOverrides = {}

    if (reference !== baseWatch.reference) overrides.reference = reference
    if ((Number(caseSizeMm) || baseWatch.caseSizeMm) !== baseWatch.caseSizeMm) overrides.caseSizeMm = Number(caseSizeMm)
    if (caseMaterial !== baseWatch.caseMaterial) overrides.caseMaterial = caseMaterial
    if (dialColor !== baseWatch.dialColor) overrides.dialColor = dialColor
    if (movement !== baseWatch.movement) overrides.movement = movement

    const parsedComplications = complications.split(',').map(value => value.trim()).filter(Boolean)
    if (parsedComplications.join('|') !== baseWatch.complications.join('|')) overrides.complications = parsedComplications

    if (condition !== DEFAULT_RESOLVED_WATCH_CONDITION) overrides.condition = condition
    if ((Number(estimatedValue) || baseWatch.estimatedValue) !== baseWatch.estimatedValue) overrides.estimatedValue = Number(estimatedValue)
    if (notes !== '') overrides.notes = notes
    if (watchType !== baseWatch.watchType) overrides.watchType = watchType

    return overrides
  }

  function handleSave() {
    const overrides = buildOverrides()
    const updated = boxes.map(item => {
      if (item.id !== activeBox.id) return item
      return {
        ...item,
        entries: item.entries.map(candidate =>
          candidate.id === activeEntry.id
            ? {
                ...candidate,
                overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
              }
            : candidate,
        ),
      }
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    router.push(`/playground?boxId=${activeBox.id}&entryId=${activeEntry.id}`)
  }

  return (
    <div style={{ padding: '40px 56px 90px', borderTop: '1px solid #EAE5DC' }}>
      <button
        onClick={() => router.push(`/playground?boxId=${activeBox.id}&entryId=${activeEntry.id}`)}
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
        ← Back to Playground
      </button>

      <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 32, fontWeight: 400, color: '#1A1410', margin: '0 0 6px' }}>
        Edit Playground Watch
      </h1>
      <p style={{ margin: '0 0 24px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880' }}>
        Update this watch for <span style={{ color: '#1A1410' }}>{activeBox.name}</span> only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(320px, 1fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ border: '1px solid #EAE5DC', borderRadius: 12, padding: 18, background: '#FFFFFF' }}>
          <div style={{ width: 120, height: 120, margin: '0 auto 12px', position: 'relative' }}>
            <DialSVG
              dialColor={sourceWatch.dialConfig.dialColor}
              markerColor={sourceWatch.dialConfig.markerColor}
              handColor={sourceWatch.dialConfig.handColor}
              size={120}
            />
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', fontFamily: 'var(--font-dm-sans)' }}>
            {previewWatch.brand}
          </div>
          <div style={{ fontSize: 26, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 4, lineHeight: 1.1 }}>
            {previewWatch.model}
          </div>
          <div style={{ fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 4 }}>
            Ref. {previewWatch.reference}
          </div>
          <div style={{ fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginTop: 8 }}>
            {previewWatch.caseMaterial} · {previewWatch.dialColor} · {previewWatch.caseSizeMm}mm
          </div>
          <div style={{ fontSize: 22, fontFamily: 'var(--font-cormorant)', color: '#1A1410', marginTop: 14 }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(previewWatch.estimatedValue)}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Reference">
            <input value={reference} onChange={event => setReference(event.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Case Size (mm)">
              <input type="number" value={caseSizeMm} onChange={event => setCaseSizeMm(event.target.value)} style={inputStyle} />
            </Field>
            <Field label="Estimated Value">
              <input type="number" value={estimatedValue} onChange={event => setEstimatedValue(event.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Case Material">
            <input value={caseMaterial} onChange={event => setCaseMaterial(event.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Dial Color">
              <input value={dialColor} onChange={event => setDialColor(event.target.value)} style={inputStyle} />
            </Field>
            <Field label="Movement">
              <input value={movement} onChange={event => setMovement(event.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Complications">
            <input
              value={complications}
              onChange={event => setComplications(event.target.value)}
              placeholder="Comma-separated"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Condition">
              <select value={condition} onChange={event => setCondition(event.target.value as WatchCondition)} style={inputStyle}>
                {CONDITIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Watch Type">
              <select value={watchType} onChange={event => setWatchType(event.target.value as WatchType)} style={inputStyle}>
                {WATCH_TYPES.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea rows={4} value={notes} onChange={event => setNotes(event.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => router.push(`/playground?boxId=${activeBox.id}&entryId=${activeEntry.id}`)}
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
              onClick={handleSave}
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
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const inputStyle: CSSProperties = {
  fontFamily: 'var(--font-dm-sans)',
  fontSize: 13,
  padding: '9px 12px',
  border: '1px solid #E0DAD0',
  borderRadius: 6,
  width: '100%',
  color: '#1A1410',
  background: '#FFFFFF',
  outline: 'none',
}
