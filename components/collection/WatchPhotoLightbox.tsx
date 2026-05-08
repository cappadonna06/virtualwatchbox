'use client'

import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'
import type { UserWatchPhoto } from '@/types/watch'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'

type Props = {
  photos: UserWatchPhoto[]
  startId: string
  ownedWatchId: string
  onClose: () => void
}

export default function WatchPhotoLightbox({ photos, startId, ownedWatchId, onClose }: Props) {
  const { setPrimaryWatchPhoto, updateWatchPhotoCaption, deleteWatchPhoto } = useCollectionSession()

  const [activeId, setActiveId] = useState(startId)
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionDraft, setCaptionDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  // If photos array changes from outside (delete, primary swap, etc.), keep the
  // active selection stable when possible; if it disappeared, fall to the
  // adjacent photo or close.
  useEffect(() => {
    if (photos.length === 0) {
      onClose()
      return
    }
    if (!photos.some(p => p.id === activeId)) {
      setActiveId(photos[Math.max(0, photos.findIndex(p => p.id === activeId))]?.id ?? photos[0].id)
    }
  }, [photos, activeId, onClose])

  const activeIndex = Math.max(0, photos.findIndex(p => p.id === activeId))
  const active = photos[activeIndex]

  function navigate(delta: number) {
    if (photos.length === 0) return
    const next = (activeIndex + delta + photos.length) % photos.length
    setActiveId(photos[next].id)
    setEditingCaption(false)
    setConfirmDelete(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingCaption) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft') { navigate(-1); return }
      if (e.key === 'ArrowRight') { navigate(1); return }
      if ((e.key === 'Backspace' || e.key === 'Delete') && active) {
        setConfirmDelete(true)
      }
      if (e.key.toLowerCase() === 'p' && active && !active.isPrimary) {
        void setPrimaryWatchPhoto(ownedWatchId, active.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, photos.length, active?.id, editingCaption])

  if (!active) return null

  async function handleSetPrimary() {
    if (!active || active.isPrimary || busy) return
    setBusy(true)
    try { await setPrimaryWatchPhoto(ownedWatchId, active.id) }
    finally { setBusy(false) }
  }

  function startEditCaption() {
    if (!active) return
    setCaptionDraft(active.caption ?? '')
    setEditingCaption(true)
  }

  async function saveCaption() {
    if (!active || busy) return
    setBusy(true)
    try {
      await updateWatchPhotoCaption(ownedWatchId, active.id, captionDraft.trim())
      setEditingCaption(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!active || busy) return
    setBusy(true)
    try {
      const wasIndex = activeIndex
      await deleteWatchPhoto(ownedWatchId, active.id)
      // After delete, useEffect will re-anchor the active id; nudge to a stable position.
      setConfirmDelete(false)
      if (photos.length - 1 === 0) {
        onClose()
      } else {
        const next = photos[wasIndex + 1] ?? photos[wasIndex - 1]
        if (next) setActiveId(next.id)
      }
    } catch {
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(12,9,6,0.92)',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'rgba(250,248,244,0.7)',
          marginBottom: 12,
          fontFamily: brand.font.sans,
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <span>{activeIndex + 1} of {photos.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(250,248,244,0.85)',
            fontSize: 20,
            cursor: 'pointer',
            padding: 6,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Photo + nav */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous"
            style={navButtonStyle('left')}
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.photoUrl}
          alt={active.caption ?? 'Watch photo'}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: brand.radius.md,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next"
            style={navButtonStyle('right')}
          >
            ›
          </button>
        )}
      </div>

      {/* Caption */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          marginTop: 14,
          textAlign: 'center',
          color: 'rgba(250,248,244,0.85)',
          fontFamily: brand.font.serif,
          fontSize: 16,
          fontStyle: editingCaption ? 'normal' : 'italic',
          minHeight: 28,
        }}
      >
        {editingCaption ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              autoFocus
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value.slice(0, 140))}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); void saveCaption() }
                if (e.key === 'Escape') { e.preventDefault(); setEditingCaption(false) }
              }}
              placeholder="Add a caption…"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid rgba(255,255,255,0.2)`,
                borderRadius: brand.radius.sm,
                color: '#FAF8F4',
                fontFamily: brand.font.serif,
                fontSize: 16,
                padding: '6px 12px',
                outline: 'none',
                minWidth: 280,
              }}
            />
            <button type="button" onClick={saveCaption} disabled={busy} style={inlineActionStyle}>Save</button>
            <button type="button" onClick={() => setEditingCaption(false)} style={inlineActionStyle}>Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditCaption}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              fontStyle: active.caption ? 'italic' : 'normal',
              cursor: 'pointer',
              padding: 0,
              opacity: active.caption ? 1 : 0.55,
            }}
          >
            {active.caption || 'Add a caption…'}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {confirmDelete ? (
          <>
            <span style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: 'rgba(250,248,244,0.85)',
              marginRight: 4,
            }}>
              Delete this photo?
            </span>
            <button type="button" onClick={handleDelete} disabled={busy} style={toolbarButton('#9A2222')}>Confirm</button>
            <button type="button" onClick={() => setConfirmDelete(false)} style={toolbarButton()}>Cancel</button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSetPrimary}
              disabled={active.isPrimary || busy}
              style={toolbarButton(active.isPrimary ? brand.colors.gold : undefined)}
            >
              {active.isPrimary ? '★ Primary' : '★ Set as primary'}
            </button>
            <button type="button" onClick={startEditCaption} style={toolbarButton()}>✎ Caption</button>
            <a
              href={active.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...toolbarButton(), display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              ⤓ Open
            </a>
            <button type="button" onClick={() => setConfirmDelete(true)} style={toolbarButton()}>🗑 Delete</button>
          </>
        )}
      </div>
    </div>
  )
}

function navButtonStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    [side]: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.45)',
    color: '#FAF8F4',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

function toolbarButton(color?: string): React.CSSProperties {
  const isAccent = !!color && color !== 'transparent'
  return {
    padding: '8px 14px',
    background: isAccent && color === '#9A2222' ? '#9A2222' : 'rgba(255,255,255,0.08)',
    color: isAccent ? '#FFFFFF' : 'rgba(250,248,244,0.92)',
    border: `1px solid ${isAccent && color !== '#9A2222' ? color : 'rgba(255,255,255,0.18)'}`,
    borderRadius: brand.radius.btn,
    fontFamily: brand.font.sans,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textDecoration: 'none',
    textTransform: 'none',
  }
}

const inlineActionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(250,248,244,0.92)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: brand.radius.sm,
  fontFamily: brand.font.sans,
  fontSize: 11,
  padding: '5px 10px',
  cursor: 'pointer',
}
