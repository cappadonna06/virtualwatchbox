'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CatalogWatch, WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'
import CameraCapture from '@/components/CameraCapture'
import AddFromPhotoSheet from '@/components/AddFromPhotoSheet'
import DialSVG from '@/components/watchbox/DialSVG'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { dialColorToHex, dialHandHex, dialMarkerHex } from '@/lib/dialColors'

type AiResult = {
  brand: string
  model: string
  reference: string | null
  referenceShort: string | null
  dialColor: string
  caseSize: number | null
  confidence: number
  identificationNotes: string
  alternates: Array<{ brand: string; model: string; reference: string | null; confidence: number }>
}

type ReferenceCandidate = {
  reference: string
  confidence: 'high' | 'medium' | 'low'
  rationale: string
  sourceUrl?: string
}

type DialBbox = { x: number; y: number; w: number; h: number }

type CatalogMatchMethod = 'reference' | 'brand_model' | 'brand_only' | 'none'

type IdentifyResponse = {
  subject: 'watch' | 'not_watch'
  subjectLabel: string
  aiResult: AiResult
  catalogMatches: CatalogWatch[]
  matchMethod: CatalogMatchMethod
  referenceCandidates: ReferenceCandidate[]
  estimatedValueUsd: number | null
  estimatedValueSource: string | null
  dialBbox: DialBbox | null
}

type Phase = null | 'identifying' | 'results' | 'no_match' | 'not_a_watch' | 'error'

type Props = {
  dest?: string | null
  boxId?: string | null
  onSwitchToSearch: (prefill?: string) => void
  onActiveChange?: (active: boolean) => void
}

export type PhotoSearchHandle = {
  open: () => void
  reset: () => void
}

const SUPPORT_EMAIL = 'support@virtualwatchbox.com'

function confidenceBucket(score: number): 'high' | 'medium' | 'low' {
  if (score > 0.8) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

function buildSummaryLine(ai: AiResult, method: CatalogMatchMethod): string {
  const head = `Identified as ${[ai.brand, ai.model].filter(Boolean).join(' ').trim()}`
  const segments = [head]
  if (ai.reference) segments.push(`ref. ${ai.reference}`)
  // Only show the AI confidence badge when we have a real catalog reference match.
  // For brand_model / brand_only / none, the AI's dial-read confidence does not
  // tell the user anything useful about the cards shown.
  if (method === 'reference') segments.push(`confidence: ${confidenceBucket(ai.confidence)}`)
  return segments.join(' · ')
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const PhotoSearch = forwardRef<PhotoSearchHandle, Props>(function PhotoSearch(
  { dest = null, boxId = null, onSwitchToSearch, onActiveChange },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [phase, setPhase] = useState<Phase>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [matches, setMatches] = useState<CatalogWatch[]>([])
  const [matchMethod, setMatchMethod] = useState<CatalogMatchMethod>('none')
  const [referenceCandidates, setReferenceCandidates] = useState<ReferenceCandidate[]>([])
  const [estimatedValueUsd, setEstimatedValueUsd] = useState<number | null>(null)
  const [dialBbox, setDialBbox] = useState<DialBbox | null>(null)
  const [subjectLabel, setSubjectLabel] = useState<string>('')
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    onActiveChange?.(phase !== null)
  }, [phase, onActiveChange])

  async function handleFile(file: File | null) {
    if (!file) return
    setImageFile(file)
    try {
      const dataUrl = await readAsDataUrl(file)
      setImageDataUrl(dataUrl)
    } catch {
      // preview optional
    }
    setPhase('identifying')
    setAiResult(null)
    setMatches([])
    setMatchMethod('none')
    setReferenceCandidates([])
    setEstimatedValueUsd(null)
    setDialBbox(null)
    setSubjectLabel('')

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/identify-watch', { method: 'POST', body: formData })
      if (!res.ok) {
        setPhase('error')
        return
      }
      const body = (await res.json()) as IdentifyResponse
      setAiResult(body.aiResult)
      setMatches(body.catalogMatches)
      setMatchMethod(body.matchMethod)
      setReferenceCandidates(body.referenceCandidates ?? [])
      setEstimatedValueUsd(body.estimatedValueUsd ?? null)
      setDialBbox(body.dialBbox ?? null)
      setSubjectLabel(body.subjectLabel ?? '')

      if (body.subject === 'not_watch') {
        setPhase('not_a_watch')
        return
      }
      // Treat brand_only as no_match — those cards are "other Longines" not "your watch".
      // Only reference + brand_model tier matches show as identified results.
      const hasRealMatch =
        body.catalogMatches.length > 0 &&
        (body.matchMethod === 'reference' || body.matchMethod === 'brand_model')
      setPhase(hasRealMatch ? 'results' : 'no_match')
    } catch {
      setPhase('error')
    }
  }

  function reset() {
    setPhase(null)
    setImageDataUrl(null)
    setImageFile(null)
    setAiResult(null)
    setMatches([])
    setMatchMethod('none')
    setReferenceCandidates([])
    setEstimatedValueUsd(null)
    setDialBbox(null)
    setSubjectLabel('')
    setAddSheetOpen(false)
    setCameraOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function prefillFromAi(): string {
    if (!aiResult) return ''
    return [aiResult.brand, aiResult.model].filter(Boolean).join(' ').trim()
  }

  async function handleCameraCapture(dataUrl: string) {
    setCameraOpen(false)
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], 'capture.jpg', { type: blob.type || 'image/jpeg' })
      await handleFile(file)
    } catch {
      setPhase('error')
    }
  }

  function fallbackToUpload() {
    setCameraOpen(false)
    // give the modal a tick to unmount before clicking the (visually-hidden) input
    setTimeout(() => fileInputRef.current?.click(), 0)
  }

  useImperativeHandle(ref, () => ({
    open: () => setCameraOpen(true),
    reset,
  }))

  return (
    <div>
      {/* Hidden file input — used as the upload fallback path inside the camera modal,
          and as the entry point on platforms where getUserMedia isn't available. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp,image/*"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {cameraOpen && (
        <CameraModal
          onCapture={handleCameraCapture}
          onCancel={() => setCameraOpen(false)}
          onUploadInstead={fallbackToUpload}
          onError={fallbackToUpload}
        />
      )}

      {phase === 'identifying' && (
        <ConciergeLoading imageDataUrl={imageDataUrl} isMobile={isMobile} />
      )}

      {phase === 'results' && aiResult && matches.length > 0 && (
        <div>
          <ResultHeader imageDataUrl={imageDataUrl} ai={aiResult} method={matchMethod} onChange={reset} />
          <PrimaryMatchCard
            watch={matches[0]}
            ai={aiResult}
            dest={dest}
            boxId={boxId}
            isMobile={isMobile}
            imageFile={imageFile}
            imageDataUrl={imageDataUrl}
            dialBbox={dialBbox}
          />
          {matches.length > 1 && (
            <NextBestMatches
              watches={matches.slice(1)}
              dest={dest}
              boxId={boxId}
              isMobile={isMobile}
            />
          )}
          <div style={{ marginTop: 22, fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
            Not the right watch?{' '}
            <button
              type="button"
              onClick={() => { onSwitchToSearch(prefillFromAi()); reset() }}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              → Search manually
            </button>
          </div>
        </div>
      )}

      {phase === 'no_match' && aiResult && (
        <div>
          <ResultHeader imageDataUrl={imageDataUrl} ai={aiResult} method={matchMethod} onChange={reset} />
          <DiscoveredWatchCard
            ai={aiResult}
            imageDataUrl={imageDataUrl}
            referenceCandidates={referenceCandidates}
            canAdd={!!imageFile}
            onAdd={() => setAddSheetOpen(true)}
            onSearchManually={() => { onSwitchToSearch(prefillFromAi()); reset() }}
            isMobile={isMobile}
          />
          {matches.length > 0 && (
            <NextBestMatches
              watches={matches}
              dest={dest}
              boxId={boxId}
              isMobile={isMobile}
              variant="no_match"
            />
          )}
          <div style={{ marginTop: 22, fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>Not the right watch?</span>
            <button
              type="button"
              onClick={() => { onSwitchToSearch(prefillFromAi()); reset() }}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              → Search manually
            </button>
            <span style={{ color: brand.colors.borderMid }}>·</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                `Catalog request: ${aiResult.brand} ${aiResult.model}${referenceCandidates[0] ? ` ${referenceCandidates[0].reference}` : ''}`,
              )}`}
              style={{
                fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink,
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              → Request we add it to the catalog
            </a>
          </div>
        </div>
      )}

      {phase === 'not_a_watch' && (
        <NotAWatchPanel
          imageDataUrl={imageDataUrl}
          subjectLabel={subjectLabel}
          isMobile={isMobile}
          onTryAgain={() => fileInputRef.current?.click()}
          onTakePhoto={() => setCameraOpen(true)}
          onCancel={reset}
        />
      )}

      {addSheetOpen && imageFile && aiResult && (
        <AddFromPhotoSheet
          imageFile={imageFile}
          imageDataUrl={imageDataUrl}
          prefill={{
            brand: aiResult.brand,
            model: aiResult.model,
            reference: referenceCandidates[0]?.reference ?? aiResult.reference ?? '',
            dialColor: aiResult.dialColor,
            watchType: '' as WatchType | '',
            caseSizeMm: aiResult.caseSize,
            caseMaterial: '',
            movement: '',
            estimatedValue: estimatedValueUsd,
          }}
          dialBbox={dialBbox}
          onClose={() => setAddSheetOpen(false)}
          onAdded={() => { setAddSheetOpen(false); reset() }}
        />
      )}

      {phase === 'error' && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 14, padding: '60px 20px', textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: brand.font.sans, fontSize: 15, color: brand.colors.ink, maxWidth: 360 }}>
            Couldn&apos;t identify this watch — try a clearer photo of the dial.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 18px', borderRadius: brand.radius.btn,
                background: brand.colors.ink, border: `1px solid ${brand.colors.ink}`,
                color: brand.colors.bg, fontFamily: brand.font.sans, fontSize: 12,
                fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => { onSwitchToSearch(prefillFromAi()); reset() }}
              style={{
                padding: '10px 18px', borderRadius: brand.radius.btn,
                background: 'transparent', border: `1px solid ${brand.colors.ink}`,
                color: brand.colors.ink, fontFamily: brand.font.sans, fontSize: 12,
                fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer',
              }}
            >
              Search manually →
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes vw-photo-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes vw-loupe-traverse {
          0%   { transform: translate(-30%, -30%) scale(1); }
          25%  { transform: translate(20%,  -30%) scale(1.05); }
          50%  { transform: translate(20%,  20%)  scale(1); }
          75%  { transform: translate(-30%, 20%)  scale(1.05); }
          100% { transform: translate(-30%, -30%) scale(1); }
        }
        @keyframes vw-loupe-settle {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.95; }
          50%  { transform: translate(0, 0) scale(1.04); opacity: 1; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.95; }
        }
        @keyframes vw-dot-pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.5; }
        }
        @keyframes vw-progress-fill {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vw-loupe-anim { animation: none !important; transform: translate(0, 0) !important; }
        }
      `}</style>
    </div>
  )
})

export default PhotoSearch

const primaryLinkStyle: React.CSSProperties = {
  background: brand.colors.ink,
  color: brand.colors.bg,
  border: `1px solid ${brand.colors.ink}`,
  padding: '10px 16px',
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const secondaryLinkStyle: React.CSSProperties = {
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.ink}`,
  padding: '10px 16px',
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

function ConciergeChip() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 11px',
      borderRadius: brand.radius.pill,
      // Deep ink background reads cleanly on any surface — light cream cards,
      // dark photos, sweaters, scenery, etc. Gold mark + cream text keep the
      // luxury voice without losing contrast on the user's uploaded photo.
      border: `1px solid rgba(255,255,255,0.12)`,
      background: 'rgba(26, 20, 16, 0.92)',
      color: brand.colors.bg,
      fontFamily: brand.font.sans,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      boxShadow: '0 4px 14px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(4px)',
    }}>
      <span style={{ color: brand.colors.gold, fontSize: 11, lineHeight: 1 }}>✦</span>
      <span style={{
        fontFamily: brand.font.serif,
        fontSize: 12,
        letterSpacing: '0.04em',
        textTransform: 'none',
        fontWeight: 400,
        color: brand.colors.bg,
      }}>
        Watchbox Concierge
      </span>
    </span>
  )
}

function ConciergeLoading({
  imageDataUrl,
  isMobile,
}: {
  imageDataUrl: string | null
  isMobile: boolean
}) {
  // Stage 0 = examining the dial (vision)
  // Stage 1 = cross-referencing manufacturer catalog (lookup)
  // Stage 2 (rarely seen) = matching to your watchbox
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1800)
    const t2 = setTimeout(() => setStage(2), 4800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const stages = [
    { label: 'Examining the dial', sub: 'Reading brand cues, indices, hands, bracelet…' },
    { label: 'Cross-referencing manufacturer catalog', sub: 'Searching the brand site for the matching reference…' },
    { label: 'Matching to your watchbox', sub: 'Finalizing the result…' },
  ]

  const tileSize = isMobile ? 'min(86vw, 360px)' : 360

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'flex-start',
        gap: isMobile ? 22 : 36,
        padding: isMobile ? '8px 0 16px' : '12px 0 28px',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            position: 'relative',
            width: tileSize,
            height: tileSize,
            maxWidth: '100%',
            borderRadius: brand.radius.xl,
            overflow: 'hidden',
            background: brand.colors.slot,
            border: `1px solid ${brand.colors.border}`,
            boxShadow: brand.shadow.md,
          }}
        >
          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Uploaded watch"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
          {/* Loupe — 35% of tile, traverses on stage 0, settles on stage 1+ */}
          <div
            className="vw-loupe-anim"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '35%',
              height: '35%',
              marginLeft: '-17.5%',
              marginTop: '-17.5%',
              borderRadius: '50%',
              border: `1.5px solid ${brand.colors.gold}`,
              boxShadow: '0 0 0 9999px rgba(26,20,16,0.18), inset 0 0 24px rgba(201,168,76,0.18)',
              pointerEvents: 'none',
              animation: stage === 0
                ? 'vw-loupe-traverse 4s ease-in-out infinite'
                : 'vw-loupe-settle 2.4s ease-in-out infinite',
            }}
          />
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <ConciergeChip />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, alignSelf: isMobile ? 'stretch' : 'center' }}>
        <div style={{
          fontFamily: brand.font.serif,
          fontSize: isMobile ? 22 : 26,
          fontWeight: 400,
          color: brand.colors.ink,
          lineHeight: 1.15,
          marginBottom: 4,
        }}>
          Concierge is examining your watch
        </div>
        <div style={{
          fontFamily: brand.font.sans,
          fontSize: 14,
          color: brand.colors.muted,
          marginBottom: 18,
        }}>
          This usually takes a few seconds.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stages.map((s, i) => {
            const isCurrent = i === stage
            const isDone = i < stage
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: isDone ? 0.55 : 1 }}>
                <span style={{ marginTop: 6, width: 10, height: 10, position: 'relative', flexShrink: 0 }}>
                  {isDone ? (
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: brand.colors.gold,
                      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.85)',
                    }} />
                  ) : isCurrent ? (
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: brand.colors.gold,
                      animation: 'vw-dot-pulse 1.2s ease-in-out infinite',
                    }} />
                  ) : (
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: brand.colors.border,
                    }} />
                  )}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: brand.font.sans,
                    fontSize: 15,
                    fontWeight: isCurrent ? 600 : 500,
                    color: isCurrent ? brand.colors.ink : (isDone ? brand.colors.muted : brand.colors.ink),
                    letterSpacing: '0.02em',
                  }}>
                    {isDone ? '✓ ' : ''}{s.label}
                  </div>
                  {isCurrent && (
                    <div style={{
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      color: brand.colors.muted,
                      marginTop: 2,
                    }}>
                      {s.sub}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          marginTop: 22,
          height: 3,
          width: '100%',
          maxWidth: 320,
          borderRadius: 999,
          background: brand.colors.border,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: brand.colors.gold,
            transform: `translateX(${stage === 0 ? -60 : stage === 1 ? -10 : 0}%)`,
            transition: 'transform 1.2s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

function PrimaryMatchCard({
  watch,
  ai,
  dest,
  boxId,
  isMobile,
  imageFile,
  imageDataUrl,
  dialBbox,
}: {
  watch: CatalogWatch
  ai: AiResult
  dest: string | null
  boxId: string | null
  isMobile: boolean
  imageFile: File | null
  imageDataUrl: string | null
  dialBbox: DialBbox | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const params = new URLSearchParams()
  if (dest) params.set('dest', dest)
  if (boxId) params.set('boxId', boxId)
  const href = `/collection/add/${watch.id}${params.toString() ? `?${params.toString()}` : ''}`

  // When the catalog row has no curated image, keep the user's uploaded photo
  // so it renders in their watchbox instead of an empty slot. Stash a marker
  // in sessionStorage that the confirm page reads on commit. The actual upload
  // happens server-side here, before navigation, so the URL is ready.
  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (busy) return
    if (!watch.imageUrl && imageFile) {
      setBusy(true)
      try {
        const formData = new FormData()
        formData.append('image', imageFile, imageFile.name || 'watch.jpg')
        if (dialBbox) {
          formData.append('bboxX', String(dialBbox.x))
          formData.append('bboxY', String(dialBbox.y))
          formData.append('bboxW', String(dialBbox.w))
          formData.append('bboxH', String(dialBbox.h))
        }
        const res = await fetch('/api/user-watches/upload-photo', { method: 'POST', body: formData })
        if (res.ok) {
          const body = await res.json() as { photoUrl?: string }
          if (body.photoUrl) {
            try {
              sessionStorage.setItem(
                `vwb:pending-photo:${watch.id}`,
                JSON.stringify({ photoUrl: body.photoUrl, dataUrl: imageDataUrl ?? null, ts: Date.now() }),
              )
            } catch { /* ignore storage failures */ }
          }
        }
      } catch {
        // Non-fatal — fall through to navigation; the user can retry from the add page if they want.
      } finally {
        setBusy(false)
      }
    }
    router.push(href)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 18 : 28,
        padding: isMobile ? 18 : 24,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.goldLine}`,
        borderRadius: brand.radius.xl,
        boxShadow: brand.shadow.md,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : 220,
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: brand.colors.slot,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.border}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {watch.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={watch.imageUrl}
            alt={`${watch.brand} ${watch.model}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 18 }}
          />
        ) : (
          <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
            No photo
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px',
          borderRadius: brand.radius.pill,
          background: '#E8F4E8',
          color: '#2D6A2D',
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          ✓ Match found
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 4 }}>
          {watch.brand}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 26 : 32, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 4 }}>
          {watch.model}
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted, letterSpacing: '0.02em', marginBottom: 14 }}>
          Ref. {watch.reference}
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
          fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink,
          marginBottom: 18,
        }}>
          <span>{watch.caseSizeMm}mm</span>
          <span style={{ color: brand.colors.borderMid }}>·</span>
          <span>{watch.caseMaterial}</span>
          <span style={{ color: brand.colors.borderMid }}>·</span>
          <span>{watch.dialColor} dial</span>
          {watch.estimatedValue ? (
            <>
              <span style={{ color: brand.colors.borderMid }}>·</span>
              <span style={{ color: brand.colors.goldDeep, fontFamily: brand.font.serif, fontSize: 14 }}>
                {fmt(watch.estimatedValue)}
              </span>
            </>
          ) : null}
        </div>
        <Link
          href={href}
          onClick={handleAdd}
          aria-disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 20px',
            background: brand.colors.ink,
            color: brand.colors.bg,
            border: `1px solid ${brand.colors.ink}`,
            borderRadius: brand.radius.btn,
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            opacity: busy ? 0.7 : 1,
            pointerEvents: busy ? 'none' : 'auto',
          }}
        >
          {busy ? 'Saving photo…' : 'Add to my watchbox →'}
        </Link>
        {ai.identificationNotes && (
          <div style={{ marginTop: 14, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, fontStyle: 'italic' }}>
            Concierge note: {ai.identificationNotes}
          </div>
        )}
      </div>
    </div>
  )
}

function NextBestMatches({
  watches,
  dest,
  boxId,
  isMobile,
  variant = 'matched',
}: {
  watches: CatalogWatch[]
  dest: string | null
  boxId: string | null
  isMobile: boolean
  variant?: 'matched' | 'no_match'
}) {
  const headline = variant === 'no_match'
    ? 'Closest watches in our catalog'
    : 'Concierge wasn’t certain — these were the closest alternatives.'
  const sub = variant === 'no_match'
    ? 'Not the same watch, but here’s what looks closest. Pick one to add it instead, or keep the discovered watch above.'
    : 'Pick the one that matches your watch, or stick with the primary match above.'
  const startRank = variant === 'no_match' ? 1 : 2

  return (
    <section style={{ marginTop: 40 }}>
      {/* Hairline divider with inset label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span style={{ height: 1, background: brand.colors.borderLight, flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: brand.colors.gold, fontSize: 12, lineHeight: 1 }}>✦</span>
          <span style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
          }}>
            {variant === 'no_match' ? 'Closest in catalog' : 'Next best matches'}
          </span>
        </span>
        <span style={{ height: 1, background: brand.colors.borderLight, flex: 1 }} />
      </div>

      <div style={{
        fontFamily: brand.font.serif,
        fontSize: 18,
        fontWeight: 400,
        color: brand.colors.ink,
        lineHeight: 1.3,
        marginBottom: 4,
        textAlign: 'center',
      }}>
        {headline}
      </div>
      <div style={{
        fontFamily: brand.font.sans,
        fontSize: 14,
        color: brand.colors.muted,
        marginBottom: 22,
        textAlign: 'center',
      }}>
        {sub}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : watches.length === 1
              ? 'minmax(280px, 480px)'
              : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          justifyContent: watches.length === 1 ? 'center' : 'start',
        }}
      >
        {watches.map((watch, i) => (
          <NextBestMatchCard
            key={watch.id}
            watch={watch}
            rank={i + startRank}
            dest={dest}
            boxId={boxId}
          />
        ))}
      </div>
    </section>
  )
}

function NextBestMatchCard({
  watch,
  rank,
  dest,
  boxId,
}: {
  watch: CatalogWatch
  rank: number
  dest: string | null
  boxId: string | null
}) {
  const params = new URLSearchParams()
  if (dest) params.set('dest', dest)
  if (boxId) params.set('boxId', boxId)
  const href = `/collection/add/${watch.id}${params.toString() ? `?${params.toString()}` : ''}`
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        gap: 16,
        padding: 14,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.lg,
        textDecoration: 'none',
        transition: `border-color ${brand.transition.fast}, box-shadow ${brand.transition.fast}, transform ${brand.transition.fast}`,
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = brand.colors.goldLine
        e.currentTarget.style.boxShadow = brand.shadow.sm
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = brand.colors.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={{
        position: 'absolute',
        top: 10,
        right: 12,
        fontFamily: brand.font.serif,
        fontSize: 12,
        color: brand.colors.goldDeep,
        letterSpacing: '0.04em',
      }}>
        #{rank}
      </span>

      <div
        style={{
          width: 96,
          height: 96,
          flexShrink: 0,
          borderRadius: brand.radius.md,
          background: brand.colors.slot,
          border: `1px solid ${brand.colors.border}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="96px"
          dialSize={70}
          imageStyle={{ objectFit: 'contain', padding: 8 }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 18 }}>
        <div style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: brand.colors.goldDeep,
          marginBottom: 2,
        }}>
          {watch.brand}
        </div>
        <div style={{
          fontFamily: brand.font.serif,
          fontSize: 19,
          fontWeight: 400,
          color: brand.colors.ink,
          lineHeight: 1.1,
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {watch.model}
        </div>
        <div style={{
          fontFamily: brand.font.sans,
          fontSize: 12,
          color: brand.colors.muted,
          letterSpacing: '0.02em',
          marginBottom: 8,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          Ref. {watch.reference}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.ink,
            whiteSpace: 'nowrap',
          }}>
            {watch.caseSizeMm}mm · {watch.dialColor}
          </span>
          {watch.estimatedValue ? (
            <span style={{
              fontFamily: brand.font.serif,
              fontSize: 14,
              color: brand.colors.goldDeep,
              whiteSpace: 'nowrap',
            }}>
              {fmt(watch.estimatedValue)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function DiscoveredWatchCard({
  ai,
  imageDataUrl,
  referenceCandidates,
  canAdd,
  onAdd,
  onSearchManually,
  isMobile,
}: {
  ai: AiResult
  imageDataUrl: string | null
  referenceCandidates: ReferenceCandidate[]
  canAdd: boolean
  onAdd: () => void
  onSearchManually: () => void
  isMobile: boolean
}) {
  const dialHex = dialColorToHex(ai.dialColor)
  const markerHex = dialMarkerHex(dialHex)
  const handHex = dialHandHex(dialHex)
  const primaryRef = referenceCandidates[0]?.reference ?? ''
  const altRefs = referenceCandidates.slice(1, 3).map(c => c.reference)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 18 : 28,
        padding: isMobile ? 18 : 24,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.goldLine}`,
        borderRadius: brand.radius.xl,
        boxShadow: brand.shadow.md,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : 220,
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: brand.colors.slot,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.border}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt={`Your ${ai.brand} ${ai.model}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <DialSVG
            dialColor={dialHex}
            markerColor={markerHex}
            handColor={handHex}
            size={isMobile ? 160 : 180}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px',
          borderRadius: brand.radius.pill,
          background: brand.colors.goldWash,
          color: brand.colors.ink,
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 12,
          border: `1px solid ${brand.colors.goldLine}`,
        }}>
          <span style={{ color: brand.colors.gold, fontSize: 11, lineHeight: 1 }}>✦</span>
          Discovered by Concierge
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 4 }}>
          {ai.brand || 'Unknown brand'}
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: isMobile ? 26 : 32, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 4 }}>
          {ai.model || 'Unknown model'}
        </div>
        {primaryRef && (
          <div style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted, letterSpacing: '0.02em', marginBottom: altRefs.length > 0 ? 2 : 14 }}>
            Likely ref. {primaryRef}
          </div>
        )}
        {altRefs.length > 0 && (
          <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: 14 }}>
            Or: {altRefs.join(', ')}
          </div>
        )}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 12px',
          fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink,
          marginBottom: 14,
        }}>
          {ai.caseSize ? <span>{ai.caseSize}mm</span> : null}
          {ai.caseSize && ai.dialColor ? <span style={{ color: brand.colors.borderMid }}>·</span> : null}
          {ai.dialColor ? <span>{ai.dialColor} dial</span> : null}
        </div>
        <div style={{
          padding: '8px 12px',
          marginBottom: 14,
          borderRadius: brand.radius.sm,
          background: brand.colors.slot,
          border: `1px solid ${brand.colors.borderLight}`,
          fontFamily: brand.font.sans,
          fontSize: 12,
          color: brand.colors.muted,
          lineHeight: 1.5,
        }}>
          We don&apos;t have this watch in our catalog yet. We&apos;ll save it to your watchbox using your photo and these details.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            style={{
              padding: '12px 20px',
              background: canAdd ? brand.colors.ink : brand.colors.muted,
              color: brand.colors.bg,
              border: `1px solid ${canAdd ? brand.colors.ink : brand.colors.muted}`,
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Add to my watchbox →
          </button>
          <button
            type="button"
            onClick={onSearchManually}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              color: brand.colors.ink,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Not this — search manually
          </button>
        </div>
      </div>
    </div>
  )
}

// Tasteful copy that adapts to whatever Concierge saw. Keeps the luxury tone
// (no exclamation points, no emoji-driven UI) while still feeling warm.
function buildNotAWatchCopy(label: string): { headline: string; body: string } {
  const cleaned = (label || '').toLowerCase().trim()

  // Specific, charming responses for things people actually upload by accident.
  if (/cat|kitt/.test(cleaned)) {
    return {
      headline: 'A handsome cat — but not a watch.',
      body: 'Concierge identifies wristwatches. Your cat is a separate masterpiece.',
    }
  }
  if (/dog|puppy|pup/.test(cleaned)) {
    return {
      headline: 'Lovely dog — but not a watch.',
      body: 'Concierge identifies wristwatches. Send the watch on the wrist instead?',
    }
  }
  if (/person|portrait|selfie|face/.test(cleaned)) {
    return {
      headline: 'Looking sharp — but no watch in frame.',
      body: 'Try a closer photo of the wrist or the dial itself.',
    }
  }
  if (/empty|box without|watch box/.test(cleaned)) {
    return {
      headline: 'Nice watch box — but the watch is missing.',
      body: 'Place the watch face-up in good light and try again.',
    }
  }
  if (/scenery|landscape|outdoor|sky/.test(cleaned)) {
    return {
      headline: 'A pretty scene — but not a watch.',
      body: 'Concierge needs a photo of the watch itself to help.',
    }
  }
  if (/blurry|unrecognizable|unclear|out of focus/.test(cleaned)) {
    return {
      headline: 'Concierge couldn’t make out a watch.',
      body: 'Try a sharper photo with the dial well-lit and centered in frame.',
    }
  }
  if (cleaned) {
    // Vowel-aware article so "an apple" reads naturally
    const article = /^[aeiou]/.test(cleaned) ? 'an' : 'a'
    return {
      headline: `That looks like ${article} ${cleaned}.`,
      body: 'Concierge identifies wristwatches. Try a photo of the watch itself.',
    }
  }
  return {
    headline: 'Concierge didn’t see a watch in this photo.',
    body: 'Try a clearer shot of the dial — face-up, well-lit, centered in frame.',
  }
}

function NotAWatchPanel({
  imageDataUrl,
  subjectLabel,
  isMobile,
  onTryAgain,
  onTakePhoto,
  onCancel,
}: {
  imageDataUrl: string | null
  subjectLabel: string
  isMobile: boolean
  onTryAgain: () => void
  onTakePhoto: () => void
  onCancel: () => void
}) {
  const { headline, body } = buildNotAWatchCopy(subjectLabel)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 18 : 28,
        padding: isMobile ? 22 : 28,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        boxShadow: brand.shadow.sm,
        alignItems: isMobile ? 'stretch' : 'center',
      }}
    >
      <div
        style={{
          width: isMobile ? '100%' : 200,
          aspectRatio: '1 / 1',
          flexShrink: 0,
          background: brand.colors.slot,
          borderRadius: brand.radius.lg,
          border: `1px solid ${brand.colors.border}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {imageDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageDataUrl}
              alt="Uploaded photo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'grayscale(0.4) brightness(0.92)',
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(26,20,16,0) 60%, rgba(26,20,16,0.18))',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              padding: '3px 9px',
              borderRadius: brand.radius.pill,
              background: 'rgba(255,255,255,0.92)',
              border: `1px solid ${brand.colors.border}`,
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
            }}>
              Not a watch
            </div>
          </>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px',
          borderRadius: brand.radius.pill,
          background: brand.colors.goldWash,
          color: brand.colors.ink,
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          border: `1px solid ${brand.colors.goldLine}`,
          marginBottom: 12,
        }}>
          <span style={{ color: brand.colors.gold, fontSize: 11, lineHeight: 1 }}>✦</span>
          Watchbox Concierge
        </div>
        <div style={{
          fontFamily: brand.font.serif,
          fontSize: isMobile ? 24 : 28,
          fontWeight: 400,
          color: brand.colors.ink,
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: brand.font.sans,
          fontSize: 15,
          color: brand.colors.muted,
          lineHeight: 1.55,
          marginBottom: 18,
          maxWidth: 460,
        }}>
          {body}
        </div>

        <div style={{
          display: 'grid',
          gap: 6,
          marginBottom: 22,
          padding: '12px 14px',
          background: brand.colors.slot,
          border: `1px solid ${brand.colors.borderLight}`,
          borderRadius: brand.radius.md,
        }}>
          <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 4 }}>
            Tips for a great identification
          </div>
          <TipRow text="Fill the frame with the watch — wrist or close-up dial both work." />
          <TipRow text="Avoid heavy reflections; soft, even light reads best." />
          <TipRow text="Keep the dial roughly upright so brand text is readable." />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onTryAgain}
            style={{
              padding: '12px 20px',
              background: brand.colors.ink,
              color: brand.colors.bg,
              border: `1px solid ${brand.colors.ink}`,
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Upload a different photo
          </button>
          <button
            type="button"
            onClick={onTakePhoto}
            style={{
              padding: '12px 18px',
              background: 'transparent',
              color: brand.colors.ink,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Use camera
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 14px',
              background: 'transparent',
              color: brand.colors.muted,
              border: 'none',
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 400,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function TipRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: brand.colors.gold, fontSize: 11, lineHeight: 1.5, flexShrink: 0 }}>·</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink, lineHeight: 1.5 }}>
        {text}
      </span>
    </div>
  )
}

function CameraModal({
  onCapture,
  onCancel,
  onUploadInstead,
  onError,
}: {
  onCapture: (dataUrl: string) => void
  onCancel: () => void
  onUploadInstead: () => void
  onError: (msg: string) => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(26,20,16,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: brand.colors.bg,
          borderRadius: brand.radius.xl,
          width: 'min(640px, 100%)',
          padding: 24,
          boxShadow: brand.shadow.xl,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: 22,
            fontWeight: 500,
            color: brand.colors.ink,
          }}>
            Take a photo
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: brand.colors.muted,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </header>
        <CameraCapture
          onCapture={onCapture}
          onCancel={onCancel}
          onError={onError}
        />
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            type="button"
            onClick={onUploadInstead}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: brand.colors.muted,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Upload from device instead
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultHeader({
  imageDataUrl,
  ai,
  method,
  onChange,
}: {
  imageDataUrl: string | null
  ai: AiResult
  method: CatalogMatchMethod
  onChange: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
      {imageDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageDataUrl}
          alt="Uploaded watch"
          style={{
            width: 72, height: 72, objectFit: 'cover',
            borderRadius: brand.radius.md,
            border: `1px solid ${brand.colors.border}`,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
        <button
          type="button"
          onClick={onChange}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted,
            textDecoration: 'underline', textUnderlineOffset: 2, alignSelf: 'flex-start',
          }}
        >
          ✕ Change photo
        </button>
        <div
          style={{
            fontFamily: brand.font.sans, fontSize: 14,
            color: brand.colors.muted, fontStyle: 'italic',
          }}
        >
          {buildSummaryLine(ai, method)}
        </div>
      </div>
    </div>
  )
}

function ShimmerBar({ width }: { width: number }) {
  return (
    <div
      style={{
        width, height: 12, borderRadius: brand.radius.sm,
        background: brand.colors.border,
        animation: 'vw-photo-pulse 1.4s ease-in-out infinite',
      }}
    />
  )
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))',
        gap: 16, justifyContent: 'start',
      }}
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            background: brand.colors.white,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.xl,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100%', aspectRatio: '4 / 3',
              background: brand.colors.border,
              animation: 'vw-photo-pulse 1.4s ease-in-out infinite',
            }}
          />
          <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: '40%', height: 9, background: brand.colors.border, borderRadius: brand.radius.sm, animation: 'vw-photo-pulse 1.4s ease-in-out infinite' }} />
            <div style={{ width: '70%', height: 18, background: brand.colors.border, borderRadius: brand.radius.sm, animation: 'vw-photo-pulse 1.4s ease-in-out infinite' }} />
            <div style={{ width: '50%', height: 11, background: brand.colors.border, borderRadius: brand.radius.sm, animation: 'vw-photo-pulse 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
