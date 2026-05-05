'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'
import { resizeImageFileToDataUrl } from '@/lib/profileDemo'
import WatchboxPhotoEditModal from './WatchboxPhotoEditModal'
import type { WatchboxPhotoCrop } from '@/app/collection/CollectionSessionProvider'

interface Props {
  photoUrl: string | null
  photoCrop: WatchboxPhotoCrop | null
  onPhotoChange: (value: { url: string | null; crop: WatchboxPhotoCrop | null }) => void
  isSignedIn: boolean
  screenWidth: number
}

type EditTrigger = 'crop' | 'camera'

const FALLBACK_ASPECT = 16 / 10
// Mirrors components/collection/CollectionWatchboxSurface.tsx:331 so the photo
// view feels like the same "box" as the watchbox view.
const WATCHBOX_MAX_HEIGHT_DESKTOP = 480
const WATCHBOX_MAX_HEIGHT_MOBILE = 300
// Mirrors the watchboxContainerWidth calc in CollectionWatchboxSurface.tsx:330.
const WATCHBOX_DESKTOP_INSET = 444
const WATCHBOX_MOBILE_INSET = 40
const MIN_COLUMN_WIDTH = 200

function deriveBounds(screenWidth: number) {
  const isMobile = screenWidth > 0 && screenWidth < 768
  const maxHeight = isMobile ? WATCHBOX_MAX_HEIGHT_MOBILE : WATCHBOX_MAX_HEIGHT_DESKTOP
  const maxWidth = screenWidth > 0
    ? Math.max(MIN_COLUMN_WIDTH, screenWidth - (isMobile ? WATCHBOX_MOBILE_INSET : WATCHBOX_DESKTOP_INSET))
    : undefined
  return { isMobile, maxHeight, maxWidth }
}

export default function CollectionPhotoView({
  photoUrl,
  photoCrop,
  onPhotoChange,
  isSignedIn,
  screenWidth,
}: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditTrigger>('crop')
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: none)')
    const update = () => setIsTouchDevice(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const { maxHeight, maxWidth } = deriveBounds(screenWidth)

  function openEditor(trigger: EditTrigger, prefill: string | null = null) {
    setPendingSourceUrl(prefill)
    setEditorMode(trigger)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setPendingSourceUrl(null)
  }

  async function ingestDroppedFile(file: File) {
    if (!file || !file.type.startsWith('image/')) return
    setBusy(true)
    setErrorMessage(null)
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 })
      openEditor('crop', dataUrl)
    } catch {
      setErrorMessage('Could not read that file. Try another.')
    } finally {
      setBusy(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void ingestDroppedFile(file)
  }

  const displayAspect = photoCrop?.aspect && Number.isFinite(photoCrop.aspect) && photoCrop.aspect > 0
    ? photoCrop.aspect
    : FALLBACK_ASPECT

  // Cap width to maxHeight * aspect so the height bound is honored without
  // CSS dropping the aspect-ratio (max-height overrides aspect-ratio in the
  // common width-100% case). max-width still applies as the column cap.
  const heightDerivedWidthCap = `${Math.round(maxHeight * displayAspect)}px`
  const sharedFrame: React.CSSProperties = {
    position: 'relative',
    width: `min(100%, ${heightDerivedWidthCap})`,
    maxWidth,
    aspectRatio: displayAspect,
    margin: '0 auto',
    borderRadius: brand.radius.lg,
    overflow: 'hidden',
  }

  if (photoUrl) {
    const showPill = isTouchDevice || isHovered
    return (
      <>
        <div
          style={{ ...sharedFrame, background: brand.colors.slot }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CroppedPhoto photoUrl={photoUrl} photoCrop={photoCrop} />
          {dragging ? <DropOverlay /> : null}
          {busy ? <BusyOverlay /> : null}
          <button
            type="button"
            onClick={() => openEditor('crop')}
            style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: brand.colors.bg,
              background: 'rgba(26,20,16,0.65)',
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              opacity: showPill && !dragging ? 1 : 0,
              transition: `opacity ${brand.transition.base}`,
            }}
          >
            Change Photo
          </button>
        </div>
        {errorMessage ? <ErrorRow message={errorMessage} /> : null}
        <WatchboxPhotoEditModal
          open={editorOpen}
          sourceUrl={pendingSourceUrl ?? photoUrl}
          sourceCrop={pendingSourceUrl ? null : photoCrop}
          initialMode={editorMode}
          onClose={closeEditor}
          onSave={next => { onPhotoChange(next); closeEditor() }}
          onRemove={() => onPhotoChange({ url: null, crop: null })}
        />
      </>
    )
  }

  const emptyFrame: React.CSSProperties = {
    ...sharedFrame,
    aspectRatio: FALLBACK_ASPECT,
    background: dragging ? brand.colors.goldWash : brand.colors.white,
    border: `${dragging ? 2 : 1.5}px dashed ${dragging ? brand.colors.gold : brand.colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 24px',
    transition: `border-color ${brand.transition.fast}, background ${brand.transition.fast}`,
  }

  return (
    <>
      <div
        style={emptyFrame}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CameraIcon size={32} color={dragging ? brand.colors.gold : brand.colors.muted} />
        <h2
          style={{
            fontFamily: brand.font.serif,
            fontSize: 22,
            fontWeight: 500,
            color: brand.colors.ink,
            margin: 0,
            marginTop: 16,
            lineHeight: 1.2,
          }}
        >
          Photo of Your Box
        </h2>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 13,
            color: brand.colors.muted,
            margin: 0,
            marginTop: 6,
            maxWidth: 360,
          }}
        >
          Drag a photo here, take one with your camera, or upload from your device.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={() => openEditor('camera')} style={primaryButtonStyle}>
            Take Photo
          </button>
          <button type="button" onClick={() => openEditor('crop')} style={secondaryButtonStyle}>
            Upload Photo
          </button>
        </div>

        {!isSignedIn ? (
          <Link
            href="/auth?next=/collection"
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.muted,
              marginTop: 14,
              letterSpacing: '0.04em',
              textDecoration: 'underline',
            }}
          >
            Sign in to save it across devices
          </Link>
        ) : null}
        {busy ? <BusyOverlay /> : null}
      </div>
      {errorMessage ? <ErrorRow message={errorMessage} /> : null}
      <WatchboxPhotoEditModal
        open={editorOpen}
        sourceUrl={pendingSourceUrl}
        sourceCrop={null}
        initialMode={editorMode}
        onClose={closeEditor}
        onSave={next => { onPhotoChange(next); closeEditor() }}
      />
    </>
  )
}

function CroppedPhoto({ photoUrl, photoCrop }: { photoUrl: string; photoCrop: WatchboxPhotoCrop | null }) {
  const area = photoCrop?.area
  const hasSavedCrop = Boolean(
    area
    && area.x >= 0
    && area.y >= 0
    && area.width > 0 && area.width <= 100
    && area.height > 0 && area.height <= 100,
  )
  if (!hasSavedCrop) {
    return (
      <img
        src={photoUrl}
        alt="Your watchbox"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return (
    <img
      src={photoUrl}
      alt="Your watchbox"
      draggable={false}
      style={{
        position: 'absolute',
        width: `${10000 / area!.width}%`,
        height: `${10000 / area!.height}%`,
        maxWidth: 'none',
        left: `${-(area!.x / area!.width) * 100}%`,
        top: `${-(area!.y / area!.height) * 100}%`,
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

function DropOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(184,150,77,0.18)',
        border: `2px dashed ${brand.colors.gold}`,
        borderRadius: brand.radius.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: brand.font.sans,
        fontSize: 13,
        color: brand.colors.ink,
        letterSpacing: '0.04em',
        pointerEvents: 'none',
      }}
    >
      Drop to replace photo
    </div>
  )
}

function BusyOverlay() {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(255,255,255,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: brand.font.sans,
        fontSize: 13,
        color: brand.colors.muted,
        letterSpacing: '0.04em',
      }}
    >
      Reading…
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <p
      style={{
        margin: '12px auto 0',
        textAlign: 'center',
        fontFamily: brand.font.sans,
        fontSize: 12,
        color: '#D04040',
      }}
    >
      {message}
    </p>
  )
}

function CameraIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5 9.5h4.6l2.1-2.8h8.6l2.1 2.8H27a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="18" r="5.4" stroke={color} strokeWidth="1.4" />
    </svg>
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
  border: `1px solid ${brand.colors.ink}`,
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
}
