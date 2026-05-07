'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import AddSearchWatchCard from '@/components/collection/AddSearchWatchCard'
import CameraCapture from '@/components/CameraCapture'

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

type IdentifyResponse = {
  aiResult: AiResult
  catalogMatches: CatalogWatch[]
  matchMethod: 'reference' | 'brand_model' | 'brand_only' | 'none'
}

type Phase = null | 'identifying' | 'results' | 'no_match' | 'error'

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

function buildSummaryLine(ai: AiResult): string {
  const head = `Identified as ${[ai.brand, ai.model].filter(Boolean).join(' ').trim()}`
  const segments = [head]
  if (ai.reference) segments.push(`ref. ${ai.reference}`)
  segments.push(`confidence: ${confidenceBucket(ai.confidence)}`)
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
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [matches, setMatches] = useState<CatalogWatch[]>([])
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
    try {
      const dataUrl = await readAsDataUrl(file)
      setImageDataUrl(dataUrl)
    } catch {
      // preview optional
    }
    setPhase('identifying')
    setAiResult(null)
    setMatches([])

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
      setPhase(body.catalogMatches.length > 0 ? 'results' : 'no_match')
    } catch {
      setPhase('error')
    }
  }

  function reset() {
    setPhase(null)
    setImageDataUrl(null)
    setAiResult(null)
    setMatches([])
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
        <div>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              gap: 14,
              marginBottom: 18,
            }}
          >
            {imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageDataUrl}
                alt="Uploaded watch"
                style={{
                  width: isMobile ? '100%' : 120,
                  height: isMobile ? 'auto' : 120,
                  maxHeight: isMobile ? 280 : 120,
                  objectFit: 'cover',
                  borderRadius: brand.radius.md,
                  border: `1px solid ${brand.colors.border}`,
                  display: 'block',
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.ink, marginBottom: 8 }}>
                Identifying watch...
              </div>
              <ShimmerBar width={180} />
            </div>
          </div>
          <SkeletonGrid />
        </div>
      )}

      {phase === 'results' && aiResult && (
        <div>
          <ResultHeader imageDataUrl={imageDataUrl} ai={aiResult} onChange={reset} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))',
              gap: 16,
              justifyContent: 'start',
            }}
          >
            {matches.map(watch => (
              <AddSearchWatchCard key={watch.id} watch={watch} dest={dest} boxId={boxId} />
            ))}
          </div>
          <div style={{ marginTop: 22, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>
            Not the right watch?{' '}
            <button
              type="button"
              onClick={() => { onSwitchToSearch(prefillFromAi()); reset() }}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink,
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
          <ResultHeader imageDataUrl={imageDataUrl} ai={aiResult} onChange={reset} />
          <div
            style={{
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.xl,
              padding: '28px 24px',
              background: brand.colors.slot,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontFamily: brand.font.serif, fontSize: 20, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.2 }}>
              {[aiResult.brand, aiResult.model, aiResult.reference ? `Ref. ${aiResult.reference}` : null].filter(Boolean).join(' · ')}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted }}>
              This watch isn&apos;t in our catalog yet.
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { onSwitchToSearch(prefillFromAi()); reset() }}
                style={primaryLinkStyle}
              >
                Search manually →
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  `Catalog request: ${aiResult.brand} ${aiResult.model}${aiResult.reference ? ` ${aiResult.reference}` : ''}`,
                )}`}
                style={secondaryLinkStyle}
              >
                Request this watch →
              </a>
            </div>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 14, padding: '60px 20px', textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.ink, maxWidth: 360 }}>
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

      <style jsx>{`
        @keyframes vw-photo-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
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
              fontSize: 12,
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
  onChange,
}: {
  imageDataUrl: string | null
  ai: AiResult
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
            fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted,
            textDecoration: 'underline', textUnderlineOffset: 2, alignSelf: 'flex-start',
          }}
        >
          ✕ Change photo
        </button>
        <div
          style={{
            fontFamily: brand.font.sans, fontSize: 12,
            color: brand.colors.muted, fontStyle: 'italic',
          }}
        >
          {buildSummaryLine(ai)}
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
