'use client'

// components/serviceRoom/onboarding/OnboardingWizard.tsx
// First-run onboarding wizard shell. Owns the working draft + commit sequence;
// renders a centered modal over a dimmed page (desktop) or full-screen
// (mobile). Two steps — Set the clock → Build the dossier → Completion — every
// step and row skippable. Commits write through the real session paths.

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import { DEFAULT_INTERVAL_YEARS, type ServiceWatch } from '@/lib/serviceRoom/derive'
import type { PhotoType, ServiceIntervalYears, UserWatchPhoto, WatchServiceRecord } from '@/types/watch'
import type { ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import { Icon, btnPrimary, btnSecondary } from '@/components/serviceRoom/primitives'
import { guessDocType, makeInitialDraft, type WizardDraft } from './wizardDraft'
import { STRIP_BG } from './onboardingShared'
import { WizardStep1 } from './WizardStep1'
import { WizardStep2 } from './WizardStep2'
import { WizardCompletion } from './WizardCompletion'

const sans = brand.font.sans
const serif = brand.font.serif

type Step = 1 | 2 | 'done'

type Props = {
  watches: ServiceWatch[]
  now: Date
  isMobile: boolean
  setWatchInterval: (id: string, years: ServiceIntervalYears) => Promise<void> | void
  logServiceRecord: (id: string, data: ServiceRecordInput) => Promise<WatchServiceRecord>
  uploadWatchPhotos: (id: string, files: File[], photoType?: PhotoType | null, serviceRecordId?: string) => Promise<UserWatchPhoto[]>
  updateCollectionWatch: (id: string, updates: { hasBox?: boolean; hasPapers?: boolean; warrantyExpiresAt?: string }) => void
  showToast: (msg: string) => void
  onClose: () => void
  onDone: (dest: 'agenda' | 'hub') => void
}

export function OnboardingWizard({
  watches, now, isMobile, setWatchInterval, logServiceRecord, uploadWatchPhotos, updateCollectionWatch, showToast, onClose, onDone,
}: Props) {
  const [step, setStep] = useState<Step>(1)
  const [step2Index, setStep2Index] = useState(0)
  const [allInterval, setAllInterval] = useState<ServiceIntervalYears>(DEFAULT_INTERVAL_YEARS)
  const [committing, setCommitting] = useState(false)
  // Draft seeded once from the watches present at open; new watches mid-flow
  // are not expected (the wizard owns the screen).
  const [draft, setDraft] = useState<WizardDraft>(() => makeInitialDraft(watches))

  // Lock the page scroll behind the wizard (matters for the mobile full-screen
  // layout; harmless on desktop where the backdrop covers everything).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const patchWatch = (id: string, partial: Partial<WizardDraft[string]>) =>
    setDraft(d => ({ ...d, [id]: { ...d[id], ...partial } }))

  const onAllInterval = (y: ServiceIntervalYears) => {
    setAllInterval(y)
    setDraft(d => {
      const next: WizardDraft = {}
      for (const [id, wd] of Object.entries(d)) next[id] = { ...wd, intervalYears: y, intervalTouched: true }
      return next
    })
  }

  const addFiles = (id: string, files: FileList | File[]) =>
    setDraft(d => {
      const list = Array.from(files).map((file, i) => ({ id: `doc-${id}-${d[id].docs.length + i}-${file.name}`, file, type: guessDocType(file.name) }))
      return { ...d, [id]: { ...d[id], docs: [...d[id].docs, ...list] } }
    })
  const setDocType = (id: string, docId: string, type: PhotoType) =>
    setDraft(d => ({ ...d, [id]: { ...d[id], docs: d[id].docs.map(x => x.id === docId ? { ...x, type } : x) } }))
  const removeDoc = (id: string, docId: string) =>
    setDraft(d => ({ ...d, [id]: { ...d[id], docs: d[id].docs.filter(x => x.id !== docId) } }))

  const readyCount = useMemo(() => watches.filter(sw => !draft[sw.watch.id]?.step1Skipped).length, [watches, draft])

  async function commitStep1() {
    if (committing) return
    setCommitting(true)
    await Promise.allSettled(watches.map(async sw => {
      const d = draft[sw.watch.id]
      if (!d || d.step1Skipped) return
      try {
        await Promise.resolve(setWatchInterval(sw.watch.id, d.intervalYears))
        if (d.lastServiceDate && !d.usePurchaseDate) {
          await logServiceRecord(sw.watch.id, { serviceDate: d.lastServiceDate, serviceType: 'full', cost: null })
        }
      } catch {
        showToast(`Could not set the schedule for ${sw.watch.brand}`)
      }
    }))
    setCommitting(false)
    setStep2Index(0)
    setStep(2)
  }

  async function commitStep2() {
    if (committing) return
    setCommitting(true)
    await Promise.allSettled(watches.map(async sw => {
      const d = draft[sw.watch.id]
      if (!d || d.step2Skipped) return
      try {
        const patch: { hasBox?: boolean; hasPapers?: boolean; warrantyExpiresAt?: string } = {}
        if (d.hasBox != null) patch.hasBox = d.hasBox
        if (d.hasPapers != null) patch.hasPapers = d.hasPapers
        if (d.warrantyExpiresAt) patch.warrantyExpiresAt = d.warrantyExpiresAt
        if (Object.keys(patch).length) updateCollectionWatch(sw.watch.id, patch)
        if (d.docs.length) {
          const byType = new Map<PhotoType, File[]>()
          for (const doc of d.docs) {
            const list = byType.get(doc.type) ?? []
            list.push(doc.file)
            byType.set(doc.type, list)
          }
          for (const [t, files] of byType) await uploadWatchPhotos(sw.watch.id, files, t)
        }
      } catch {
        showToast(`Could not save documents for ${sw.watch.brand}`)
      }
    }))
    setCommitting(false)
    setStep('done')
  }

  const total = watches.length
  const currentWatch = watches[step2Index]
  const isLastPiece = step2Index >= total - 1

  // ── header / progress copy ──
  const head = step === 1
    ? { eyebrow: 'Step 1 of 2', title: 'Set the clock', sub: "Enough to estimate each watch's next service." }
    : { eyebrow: 'Step 2 of 2 · optional', title: 'Build the dossier', sub: 'Add papers and warranties. Skip anything you like.' }

  return (
    <div
      onClick={isMobile ? undefined : onClose}
      style={isMobile
        ? { position: 'fixed', inset: 0, zIndex: 320, background: brand.colors.slot }
        : { position: 'fixed', inset: 0, zIndex: 320, background: 'radial-gradient(circle at 50% 38%, #2c2823, #1d1b16)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Set up your service schedule"
        style={isMobile
          ? { display: 'flex', flexDirection: 'column', height: '100%', background: brand.colors.slot }
          : { display: 'flex', flexDirection: 'column', width: 'min(560px, 100%)', maxHeight: '92vh', background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl, boxShadow: '0 16px 50px rgba(0,0,0,0.42)', overflow: 'hidden' }}
      >
        {step !== 'done' && (
          <div style={{ padding: isMobile ? '18px 20px 0' : '22px 26px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.goldDeep }}>{head.eyebrow}</div>
                <h3 style={{ fontFamily: serif, fontSize: isMobile ? 26 : 28, fontWeight: 400, color: brand.colors.ink, margin: '4px 0 0', lineHeight: 1.1 }}>{head.title}</h3>
                <p style={{ fontFamily: sans, fontSize: 13.5, color: brand.colors.muted, margin: '6px 0 0' }}>{head.sub}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}>
                <Icon name="close" size={14} color={brand.colors.muted} />
              </button>
            </div>
            <ProgressBar step={step} />
          </div>
        )}

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 20px' : '20px 26px' }}>
          {step === 1 && (
            <WizardStep1 watches={watches} draft={draft} allInterval={allInterval} onAllInterval={onAllInterval} patchWatch={patchWatch} isMobile={isMobile} />
          )}
          {step === 2 && currentWatch && (
            <WizardStep2
              sw={currentWatch} index={step2Index} total={total} d={draft[currentWatch.watch.id]}
              onPatch={partial => patchWatch(currentWatch.watch.id, partial)}
              onAddFiles={files => addFiles(currentWatch.watch.id, files)}
              onSetDocType={(docId, type) => setDocType(currentWatch.watch.id, docId, type)}
              onRemoveDoc={docId => removeDoc(currentWatch.watch.id, docId)}
              isMobile={isMobile}
            />
          )}
          {step === 'done' && <WizardCompletion watches={watches} now={now} />}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px calc(14px + env(safe-area-inset-bottom))', borderTop: `1px solid ${brand.colors.border}`, background: STRIP_BG, flexShrink: 0 }}>
          {step === 1 && (
            <>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.muted }}>{readyCount} {readyCount === 1 ? 'piece' : 'pieces'} ready</span>
              <button type="button" onClick={commitStep1} disabled={committing} style={{ ...btnPrimary, padding: '11px 24px', opacity: committing ? 0.6 : 1 }}>
                {committing ? 'Saving…' : 'Continue'}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" onClick={commitStep2} disabled={committing} style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: brand.colors.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Skip for now</button>
                <span style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.faint }}>Piece {step2Index + 1} of {total}</span>
              </div>
              <button type="button" onClick={() => { if (isLastPiece) void commitStep2(); else setStep2Index(i => i + 1) }} disabled={committing} style={{ ...btnPrimary, padding: '11px 24px', opacity: committing ? 0.6 : 1 }}>
                {committing ? 'Saving…' : isLastPiece ? 'Finish' : 'Next piece'}
              </button>
            </>
          )}
          {step === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
              <button type="button" onClick={() => onDone('hub')} style={{ ...btnSecondary, padding: '10px 18px' }}>Add more detail</button>
              <button type="button" onClick={() => onDone('agenda')} style={{ ...btnPrimary, padding: '11px 22px' }}>View my agenda</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ step }: { step: Step }) {
  const seg = (state: 'done' | 'current' | 'upcoming'): CSSProperties => ({
    flex: 1, height: 3, borderRadius: 3,
    background: state === 'done' ? brand.colors.goldDeep : state === 'current' ? brand.colors.ink : brand.colors.border,
  })
  return (
    <div style={{ display: 'flex', gap: 6, margin: '16px 0 0' }}>
      <span style={seg(step === 1 ? 'current' : 'done')} />
      <span style={seg(step === 1 ? 'upcoming' : 'current')} />
    </div>
  )
}

const closeBtn: CSSProperties = {
  width: 30, height: 30, flexShrink: 0, borderRadius: brand.radius.sm, border: `1px solid ${brand.colors.border}`,
  background: brand.colors.white, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0,
}
