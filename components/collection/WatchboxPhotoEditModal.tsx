'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { brand } from '@/lib/brand'
import { resizeImageFileToDataUrl } from '@/lib/profileDemo'
import type { WatchboxPhotoCrop } from '@/app/collection/CollectionSessionProvider'

type Mode = 'crop' | 'camera'

interface Props {
  open: boolean
  sourceUrl: string | null
  sourceCrop: WatchboxPhotoCrop | null
  initialMode?: Mode
  onClose: () => void
  onSave: (next: { url: string; crop: WatchboxPhotoCrop }) => void
  onRemove?: () => void
}

const PHOTO_ASPECT = 16 / 10
const MAX_DIM = 1600
const JPEG_QUALITY = 0.82

export default function WatchboxPhotoEditModal({
  open,
  sourceUrl,
  sourceCrop,
  initialMode = 'crop',
  onClose,
  onSave,
  onRemove,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [workingUrl, setWorkingUrl] = useState<string | null>(sourceUrl)
  const [crop, setCrop] = useState<Point>({ x: sourceCrop?.x ?? 0, y: sourceCrop?.y ?? 0 })
  const [zoom, setZoom] = useState<number>(sourceCrop?.zoom ?? 1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(sourceCrop?.area ?? null)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setWorkingUrl(sourceUrl)
    setCrop({ x: sourceCrop?.x ?? 0, y: sourceCrop?.y ?? 0 })
    setZoom(sourceCrop?.zoom ?? 1)
    setCroppedArea(sourceCrop?.area ?? null)
    setErrorMessage(null)
    setMode(sourceUrl ? 'crop' : initialMode)
  }, [open, sourceUrl, sourceCrop, initialMode])

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleFileChange = useCallback(async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setErrorMessage(null)
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, {
        maxWidth: MAX_DIM,
        maxHeight: MAX_DIM,
        quality: JPEG_QUALITY,
      })
      setWorkingUrl(dataUrl)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedArea(null)
      setMode('crop')
    } catch {
      setErrorMessage('Could not read that file. Try another.')
    } finally {
      setBusy(false)
    }
  }, [])

  const handleCameraCapture = useCallback((dataUrl: string) => {
    setWorkingUrl(dataUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    setMode('crop')
  }, [])

  const handleSave = useCallback(() => {
    if (!workingUrl || !croppedArea || busy) return
    onSave({
      url: workingUrl,
      crop: {
        x: crop.x,
        y: crop.y,
        zoom,
        area: {
          x: croppedArea.x,
          y: croppedArea.y,
          width: croppedArea.width,
          height: croppedArea.height,
        },
      },
    })
  }, [workingUrl, croppedArea, busy, crop.x, crop.y, zoom, onSave])

  if (!open) return null

  const canSave = Boolean(workingUrl && croppedArea && !busy)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit watchbox photo"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,20,16,0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: brand.colors.white,
          borderRadius: brand.radius.xl,
          maxWidth: 640,
          width: '100%',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          boxShadow: brand.shadow.xl,
          padding: 24,
          fontFamily: brand.font.sans,
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
            {mode === 'camera' ? 'Take Photo' : 'Watchbox Photo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
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

        {mode === 'camera' ? (
          <CameraStage
            onCapture={handleCameraCapture}
            onCancel={() => setMode(workingUrl ? 'crop' : 'crop')}
            onError={msg => { setErrorMessage(msg); setMode('crop') }}
          />
        ) : workingUrl ? (
          <CropStage
            sourceUrl={workingUrl}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={value => setZoom(Math.max(1, Math.min(4, value)))}
            onCropComplete={(_, areaPercentages) => setCroppedArea(areaPercentages)}
          />
        ) : (
          <EmptyStage
            onPickFile={() => fileInputRef.current?.click()}
            onTakePhoto={() => setMode('camera')}
          />
        )}

        {errorMessage ? (
          <p style={{
            marginTop: 12,
            fontSize: 12,
            color: '#D04040',
          }}>{errorMessage}</p>
        ) : null}

        <footer
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'space-between',
            marginTop: 18,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mode === 'crop' && workingUrl ? (
              <>
                <button type="button" onClick={() => setMode('camera')} style={secondaryButtonStyle}>
                  Retake
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={secondaryButtonStyle}>
                  Replace
                </button>
                {onRemove ? (
                  <button
                    type="button"
                    onClick={() => { onRemove(); onClose() }}
                    style={{ ...secondaryButtonStyle, color: '#D04040', border: `1px solid ${brand.colors.borderMid}` }}
                  >
                    Remove
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>
              Cancel
            </button>
            {mode === 'crop' ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  ...primaryButtonStyle,
                  opacity: canSave ? 1 : 0.4,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                }}
              >
                Save Photo
              </button>
            ) : null}
          </div>
        </footer>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            await handleFileChange(file)
          }}
        />
      </div>
    </div>
  )
}

function CropStage({
  sourceUrl,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
}: {
  sourceUrl: string
  crop: Point
  zoom: number
  onCropChange: (point: Point) => void
  onZoomChange: (zoom: number) => void
  onCropComplete: (pixels: Area, percentages: Area) => void
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5 }}>
        Drag to position. Pinch or scroll to zoom.
      </p>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          background: brand.colors.slot,
          borderRadius: brand.radius.lg,
          overflow: 'hidden',
          border: `1px solid ${brand.colors.border}`,
          touchAction: 'none',
        }}
      >
        <Cropper
          image={sourceUrl}
          crop={crop}
          zoom={zoom}
          aspect={PHOTO_ASPECT}
          cropShape="rect"
          showGrid={false}
          zoomWithScroll
          objectFit="cover"
          minZoom={1}
          maxZoom={4}
          restrictPosition
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: brand.colors.muted, letterSpacing: '0.06em' }}>ZOOM</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={e => onZoomChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: brand.colors.gold }}
          aria-label="Zoom"
        />
      </div>
    </div>
  )
}

function CameraStage({
  onCapture,
  onCancel,
  onError,
}: {
  onCapture: (dataUrl: string) => void
  onCancel: () => void
  onError: (message: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        onError('Camera not available in this browser. Use Upload instead.')
        return
      }
      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1200 } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          setReady(true)
        }
      } catch {
        onError('Camera permission denied. Use Upload instead.')
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [onError])

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const ratio = Math.min(MAX_DIM / video.videoWidth, MAX_DIM / video.videoHeight, 1)
    const w = Math.round(video.videoWidth * ratio)
    const h = Math.round(video.videoHeight * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    onCapture(dataUrl)
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          background: brand.colors.dark,
          borderRadius: brand.radius.lg,
          overflow: 'hidden',
          border: `1px solid ${brand.colors.border}`,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {!ready ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.colors.bg,
            fontSize: 13,
            letterSpacing: '0.04em',
          }}>
            Starting camera…
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
          Cancel
        </button>
        <button type="button" onClick={capture} disabled={!ready} style={{ ...primaryButtonStyle, opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }}>
          Capture
        </button>
      </div>
    </div>
  )
}

function EmptyStage({ onPickFile, onTakePhoto }: { onPickFile: () => void; onTakePhoto: () => void }) {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 10',
        background: brand.colors.slot,
        border: `1.5px dashed ${brand.colors.border}`,
        borderRadius: brand.radius.lg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: brand.colors.muted, lineHeight: 1.5, maxWidth: 360 }}>
        Take a photo with your camera, or upload an existing image.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={onTakePhoto} style={primaryButtonStyle}>Take Photo</button>
        <button type="button" onClick={onPickFile} style={secondaryButtonStyle}>Upload Photo</button>
      </div>
    </div>
  )
}

const primaryButtonStyle: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  padding: '10px 20px',
  background: brand.colors.ink,
  color: brand.colors.bg,
  border: 'none',
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  padding: '10px 20px',
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.borderMid}`,
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
}
