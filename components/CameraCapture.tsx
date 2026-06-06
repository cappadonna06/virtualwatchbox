'use client'

import { useEffect, useRef, useState } from 'react'
import { brand } from '@/lib/brand'

export const CAMERA_MAX_DIM = 1600
export const CAMERA_JPEG_QUALITY = 0.82

type Props = {
  onCapture: (dataUrl: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

/**
 * Live webcam capture stage. Renders a <video> element streaming from the
 * device camera (rear camera when available), with a Capture button that
 * snapshots a downscaled JPEG and hands the data URL back via onCapture.
 *
 * If getUserMedia is unsupported or denied, calls onError with a message —
 * the caller is expected to fall back to a file picker.
 */
export default function CameraCapture({ onCapture, onCancel, onError }: Props) {
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
    const ratio = Math.min(CAMERA_MAX_DIM / video.videoWidth, CAMERA_MAX_DIM / video.videoHeight, 1)
    const w = Math.round(video.videoWidth * ratio)
    const h = Math.round(video.videoHeight * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', CAMERA_JPEG_QUALITY)
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
            fontSize: 15,
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
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          style={{ ...primaryButtonStyle, opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'not-allowed' }}
        >
          Capture
        </button>
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
