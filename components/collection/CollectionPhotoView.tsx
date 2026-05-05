'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'
import WatchboxPhotoEditModal from './WatchboxPhotoEditModal'
import type { WatchboxPhotoCrop } from '@/app/collection/CollectionSessionProvider'

interface Props {
  photoUrl: string | null
  photoCrop: WatchboxPhotoCrop | null
  onPhotoChange: (value: { url: string | null; crop: WatchboxPhotoCrop | null }) => void
  isSignedIn: boolean
}

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  minHeight: 320,
  borderRadius: brand.radius.lg,
  overflow: 'hidden',
  background: brand.colors.slot,
}

type EditTrigger = 'crop' | 'camera'

export default function CollectionPhotoView({
  photoUrl,
  photoCrop,
  onPhotoChange,
  isSignedIn,
}: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditTrigger>('crop')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: none)')
    const update = () => setIsTouchDevice(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  function openEditor(trigger: EditTrigger) {
    setEditorMode(trigger)
    setEditorOpen(true)
  }

  if (photoUrl) {
    const showPill = isTouchDevice || isHovered
    return (
      <>
        <div
          style={CONTAINER_STYLE}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CroppedPhoto photoUrl={photoUrl} photoCrop={photoCrop} />
          {isSignedIn ? (
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
                opacity: showPill ? 1 : 0,
                transition: `opacity ${brand.transition.base}`,
              }}
            >
              Change Photo
            </button>
          ) : null}
        </div>
        <WatchboxPhotoEditModal
          open={editorOpen}
          sourceUrl={photoUrl}
          sourceCrop={photoCrop}
          initialMode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSave={next => { onPhotoChange(next); setEditorOpen(false) }}
          onRemove={() => onPhotoChange({ url: null, crop: null })}
        />
      </>
    )
  }

  return (
    <>
      <div
        style={{
          ...CONTAINER_STYLE,
          background: brand.colors.white,
          border: `1.5px dashed ${brand.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 24px',
        }}
      >
        <CameraIcon size={32} color={brand.colors.muted} />
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
          Take or upload a photo of your physical watch box.
        </p>

        {isSignedIn ? (
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={() => openEditor('camera')} style={primaryButtonStyle}>
              Take Photo
            </button>
            <button type="button" onClick={() => openEditor('crop')} style={secondaryButtonStyle}>
              Upload Photo
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            <Link
              href="/auth?next=/collection"
              style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}
            >
              Sign in to save your watchbox photo
            </Link>
          </div>
        )}

      </div>
      {isSignedIn ? (
        <WatchboxPhotoEditModal
          open={editorOpen}
          sourceUrl={null}
          sourceCrop={null}
          initialMode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSave={next => { onPhotoChange(next); setEditorOpen(false) }}
        />
      ) : null}
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
