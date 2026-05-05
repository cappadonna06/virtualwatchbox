'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'
import { resizeImageFileToDataUrl } from '@/lib/profileDemo'

interface Props {
  photoUrl: string | null
  onPhotoChange: (dataUrl: string) => void
  isSignedIn: boolean
  uploading: boolean
  setUploading: (value: boolean) => void
  errorMessage: string | null
  setErrorMessage: (message: string | null) => void
}

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  minHeight: 320,
  borderRadius: brand.radius.lg,
  overflow: 'hidden',
  background: brand.colors.white,
}

export default function CollectionPhotoView({
  photoUrl,
  onPhotoChange,
  isSignedIn,
  uploading,
  setUploading,
  errorMessage,
  setErrorMessage,
}: Props) {
  const captureInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: none)')
    const update = () => setIsTouchDevice(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setErrorMessage(null)
    setUploading(true)
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.82,
      })
      onPhotoChange(dataUrl)
    } catch {
      setErrorMessage('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (photoUrl) {
    const showPill = isTouchDevice || isHovered
    return (
      <div
        style={CONTAINER_STYLE}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={photoUrl}
          alt="Your watchbox"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {uploading ? <UploadingOverlay /> : null}
        {isSignedIn && !uploading ? (
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
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
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            await handleFile(file)
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        ...CONTAINER_STYLE,
        border: `1.5px dashed ${brand.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
      }}
    >
      {uploading ? (
        <UploadingOverlay />
      ) : (
        <>
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
              <button
                type="button"
                onClick={() => captureInputRef.current?.click()}
                style={primaryButtonStyle}
              >
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                style={secondaryButtonStyle}
              >
                Upload Photo
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 24 }}>
              <Link href="/auth" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}>
                Sign in to save your watchbox photo
              </Link>
            </div>
          )}

          {errorMessage ? (
            <div
              style={{
                marginTop: 14,
                fontFamily: brand.font.sans,
                fontSize: 12,
                color: brand.colors.muted,
              }}
            >
              {errorMessage}
            </div>
          ) : null}
        </>
      )}

      {isSignedIn ? (
        <>
          <input
            ref={captureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={async event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              await handleFile(file)
            }}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              await handleFile(file)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

function UploadingOverlay() {
  return (
    <div
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
      Uploading…
    </div>
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
