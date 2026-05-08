'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { brand } from '@/lib/brand'
import type { UserWatchPhoto } from '@/types/watch'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchPhotoLightbox from './WatchPhotoLightbox'

type Props = {
  ownedWatchId: string
  variant?: 'sidebar' | 'grid'
}

export default function WatchPhotoGallery({ ownedWatchId, variant = 'sidebar' }: Props) {
  const { getWatchPhotos, uploadWatchPhotos, reorderWatchPhotos } = useCollectionSession()
  const photos = getWatchPhotos(ownedWatchId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (list.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadWatchPhotos(ownedWatchId, list)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(photos, oldIndex, newIndex)
    try {
      await reorderWatchPhotos(ownedWatchId, next.map(p => p.id))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Reorder failed')
    }
  }

  const isSidebar = variant === 'sidebar'

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp,image/*"
        multiple
        onChange={e => e.target.files && handleFiles(e.target.files)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: isSidebar ? 10 : 16,
        paddingBottom: isSidebar ? 0 : 12,
        borderBottom: isSidebar ? 'none' : `1px solid ${brand.colors.borderLight}`,
      }}>
        <div style={{
          fontFamily: brand.font.sans,
          fontSize: isSidebar ? 9 : 10,
          fontWeight: 600,
          letterSpacing: isSidebar ? '0.12em' : '0.16em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
        }}>
          Photos {photos.length > 0 && <span style={{ color: brand.colors.ink, marginLeft: 4 }}>{photos.length}</span>}
        </div>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.gold,
              letterSpacing: '0.04em',
            }}
          >
            {uploading ? 'Uploading…' : '+ Add'}
          </button>
        )}
      </div>

      {/* Empty state */}
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          disabled={uploading}
          style={{
            width: '100%',
            padding: isSidebar ? '18px 14px' : '32px 24px',
            background: dragOver ? brand.colors.goldWash : brand.colors.slot,
            border: `1.5px dashed ${dragOver ? brand.colors.gold : brand.colors.borderLight}`,
            borderRadius: brand.radius.lg,
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isSidebar ? 6 : 10,
            color: brand.colors.muted,
            transition: `border-color ${brand.transition.fast}, background ${brand.transition.fast}`,
          }}
        >
          <svg width={isSidebar ? 22 : 28} height={isSidebar ? 22 : 28} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="18" height="14" rx="2" stroke={brand.colors.muted} strokeWidth="1.4" />
            <path d="M8 6l1.5-2h5L16 6" stroke={brand.colors.muted} strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" stroke={brand.colors.muted} strokeWidth="1.4" />
          </svg>
          <div style={{
            fontFamily: brand.font.serif,
            fontSize: isSidebar ? 14 : 18,
            color: brand.colors.ink,
          }}>
            {uploading ? 'Uploading…' : 'Add photos'}
          </div>
          {!isSidebar && (
            <div style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: brand.colors.muted,
              textAlign: 'center',
              maxWidth: 360,
              lineHeight: 1.5,
            }}>
              Wrist shots, the day you got it, service receipts — anything you want to remember about this watch.
            </div>
          )}
          <div style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            color: brand.colors.muted,
            letterSpacing: '0.04em',
          }}>
            Click to choose · or drop here
          </div>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={photos.map(p => p.id)}
            strategy={isSidebar ? horizontalListSortingStrategy : rectSortingStrategy}
          >
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                handleFiles(e.dataTransfer.files)
              }}
              style={isSidebar ? {
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 4,
                outline: dragOver ? `2px dashed ${brand.colors.gold}` : 'none',
                outlineOffset: 4,
                borderRadius: brand.radius.sm,
              } : {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
                padding: dragOver ? 8 : 0,
                outline: dragOver ? `2px dashed ${brand.colors.gold}` : 'none',
                outlineOffset: 4,
                borderRadius: brand.radius.md,
              }}
            >
              {photos.map(photo => (
                <SortableThumb
                  key={photo.id}
                  photo={photo}
                  variant={variant}
                  onClick={() => setLightboxId(photo.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {uploadError && (
        <div style={{
          marginTop: 8,
          padding: '6px 10px',
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: '#9A2222',
          background: 'rgba(208,64,64,0.08)',
          border: '1px solid rgba(208,64,64,0.3)',
          borderRadius: brand.radius.sm,
        }}>
          {uploadError}
        </div>
      )}

      {!isSidebar && photos.length > 0 && (
        <div style={{
          marginTop: 14,
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.muted,
        }}>
          Drag to reorder. Click any photo to view, edit, or set as primary.
        </div>
      )}

      {lightboxId && photos.length > 0 && (
        <WatchPhotoLightbox
          photos={photos}
          startId={lightboxId}
          ownedWatchId={ownedWatchId}
          onClose={() => setLightboxId(null)}
        />
      )}
    </div>
  )
}

function SortableThumb({
  photo,
  variant,
  onClick,
}: {
  photo: UserWatchPhoto
  variant: 'sidebar' | 'grid'
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const isSidebar = variant === 'sidebar'
  const size = isSidebar ? 56 : undefined

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: 'relative',
        flexShrink: isSidebar ? 0 : undefined,
        width: size,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        {...attributes}
        {...listeners}
        style={{
          position: 'relative',
          width: size,
          height: size,
          aspectRatio: isSidebar ? undefined : '1 / 1',
          padding: 0,
          background: brand.colors.slot,
          border: `1px solid ${photo.isPrimary ? brand.colors.goldLine : brand.colors.border}`,
          borderRadius: isSidebar ? brand.radius.sm : brand.radius.md,
          cursor: isDragging ? 'grabbing' : 'pointer',
          overflow: 'hidden',
          display: 'block',
          touchAction: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.photoUrl}
          alt={photo.caption ?? 'Watch photo'}
          style={{
            width: '100%',
            height: isSidebar ? '100%' : undefined,
            aspectRatio: isSidebar ? undefined : '1 / 1',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
        {photo.isPrimary && (
          <span style={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: isSidebar ? 14 : 18,
            height: isSidebar ? 14 : 18,
            borderRadius: '50%',
            background: brand.colors.gold,
            color: brand.colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isSidebar ? 9 : 11,
            lineHeight: 1,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}>★</span>
        )}
      </button>
      {!isSidebar && photo.caption && (
        <div
          style={{
            marginTop: 8,
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {photo.caption}
        </div>
      )}
    </div>
  )
}
