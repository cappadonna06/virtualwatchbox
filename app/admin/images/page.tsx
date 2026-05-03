'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import type { WatchIdentification } from '@/lib/watchVision'

export const dynamic = 'force-dynamic'

type ItemStatus = 'processing' | 'ready' | 'approving' | 'approved' | 'rejected' | 'error'

type QueueItem = {
  id: string
  filename: string
  status: ItemStatus
  previewDataUrl: string
  pngDataUrl?: string
  webpDataUrl?: string
  sourceWidth?: number
  sourceHeight?: number
  processedWidth?: number
  processedHeight?: number
  backgroundRemovalApplied?: boolean
  identification?: WatchIdentification
  watchId: string
  editedFields?: Partial<WatchIdentification>
  error?: string
  editing: boolean
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function autoWatchId(identification?: WatchIdentification): string {
  if (!identification) return ''
  const brand = slugify(identification.brand)
  const model = slugify(identification.model)
  const dial = slugify(identification.dialColor)
  return [brand, model, dial].filter(Boolean).join('-')
}

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high:      { bg: '#E8F4E8', text: '#2D6A2D' },
  medium:    { bg: '#FFF8E6', text: '#8A6A10' },
  low:       { bg: '#FDF0E0', text: '#8A5010' },
  unmatched: { bg: '#FAE8E8', text: '#8A2020' },
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors = CONFIDENCE_COLORS[confidence] ?? CONFIDENCE_COLORS.unmatched
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: brand.radius.pill,
      background: colors.bg,
      color: colors.text,
      fontFamily: brand.font.sans,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {confidence}
    </span>
  )
}

function CheckerboardPreview({ dataUrl, width = 120 }: { dataUrl: string; width?: number }) {
  return (
    <div style={{
      width,
      height: Math.round(width * (900 / 520)),
      flexShrink: 0,
      borderRadius: brand.radius.md,
      overflow: 'hidden',
      background: 'repeating-conic-gradient(#e8e3da 0% 25%, #f4f0eb 0% 50%) 0 0 / 12px 12px',
      border: `1px solid ${brand.colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
}

function ProcessingSpinner({ width = 120 }: { width?: number }) {
  return (
    <div style={{
      width,
      height: Math.round(width * (900 / 520)),
      flexShrink: 0,
      borderRadius: brand.radius.md,
      border: `1px dashed ${brand.colors.borderLight}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      background: brand.colors.slot,
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke={brand.colors.borderLight} strokeWidth="2.5" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={brand.colors.gold} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, letterSpacing: '0.04em' }}>Processing</span>
    </div>
  )
}

function FieldRow({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.04em', minWidth: 72, textTransform: 'uppercase' }}>
        {label}
      </span>
      {editing ? (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1,
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.ink,
            background: brand.colors.bg,
            border: `1px solid ${brand.colors.borderMid}`,
            borderRadius: brand.radius.sm,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
      ) : (
        <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: value ? brand.colors.ink : brand.colors.muted }}>
          {value || '—'}
        </span>
      )}
    </div>
  )
}

function QueueCard({
  item,
  onApprove,
  onReject,
  onToggleEdit,
  onFieldChange,
  onWatchIdChange,
}: {
  item: QueueItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onToggleEdit: (id: string) => void
  onFieldChange: (id: string, field: keyof WatchIdentification, value: string) => void
  onWatchIdChange: (id: string, value: string) => void
}) {
  const ident = { ...item.identification, ...item.editedFields }
  const isProcessing = item.status === 'processing'
  const isApproving = item.status === 'approving'
  const isDone = item.status === 'approved' || item.status === 'rejected'

  return (
    <div style={{
      display: 'flex',
      gap: 20,
      padding: '20px 24px',
      background: item.status === 'approved' ? '#F0F7F0' : item.status === 'rejected' ? brand.colors.slot : brand.colors.white,
      border: `1px solid ${item.status === 'approved' ? '#C8E6C8' : brand.colors.borderMid}`,
      borderRadius: brand.radius.xl,
      opacity: isDone ? 0.6 : 1,
      transition: `opacity ${brand.transition.base}`,
    }}>
      {isProcessing
        ? <ProcessingSpinner />
        : item.pngDataUrl
          ? <CheckerboardPreview dataUrl={item.pngDataUrl} />
          : <CheckerboardPreview dataUrl={item.previewDataUrl} />
      }

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.03em' }}>
              {item.filename}
            </span>
            {ident.confidence && <ConfidenceBadge confidence={ident.confidence} />}
            {item.backgroundRemovalApplied && (
              <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, letterSpacing: '0.03em' }}>
                bg removed
              </span>
            )}
          </div>
          {!isDone && !isProcessing && (
            <button
              onClick={() => onToggleEdit(item.id)}
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                padding: '4px 8px',
              }}
            >
              {item.editing ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {isProcessing ? (
          <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, margin: 0 }}>
            Running image processing and AI identification...
          </p>
        ) : item.status === 'error' ? (
          <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: '#D04040', margin: 0 }}>{item.error}</p>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.04em', minWidth: 72, textTransform: 'uppercase' }}>
                  Watch ID
                </span>
                {item.editing ? (
                  <input
                    value={item.watchId}
                    onChange={e => onWatchIdChange(item.id, e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      color: brand.colors.gold,
                      background: brand.colors.bg,
                      border: `1px solid ${brand.colors.borderMid}`,
                      borderRadius: brand.radius.sm,
                      padding: '4px 8px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.gold, letterSpacing: '0.02em' }}>
                    {item.watchId || '—'}
                  </span>
                )}
              </div>
              <FieldRow label="Brand"    value={ident.brand ?? ''}     editing={item.editing} onChange={v => onFieldChange(item.id, 'brand', v)} />
              <FieldRow label="Model"    value={ident.model ?? ''}     editing={item.editing} onChange={v => onFieldChange(item.id, 'model', v)} />
              <FieldRow label="Reference" value={ident.reference ?? ''} editing={item.editing} onChange={v => onFieldChange(item.id, 'reference', v)} />
              <FieldRow label="Dial"     value={ident.dialColor ?? ''} editing={item.editing} onChange={v => onFieldChange(item.id, 'dialColor', v)} />
              <FieldRow label="Type"     value={ident.watchType ?? ''} editing={item.editing} onChange={v => onFieldChange(item.id, 'watchType', v)} />
              {ident.caseSizeMm && (
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginBottom: 2 }}>
                  {ident.caseSizeMm}mm{ident.lugWidthMm ? ` · ${ident.lugWidthMm}mm lug` : ''}
                  {ident.caseMaterial ? ` · ${ident.caseMaterial}` : ''}
                </div>
              )}
              {ident.notes && (
                <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, fontStyle: 'italic', marginTop: 4 }}>
                  {ident.notes}
                </div>
              )}
            </div>

            {!isDone && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onApprove(item.id)}
                  disabled={isApproving || !item.watchId}
                  style={{
                    padding: '8px 18px',
                    background: isApproving ? brand.colors.muted : brand.colors.ink,
                    color: brand.colors.bg,
                    border: 'none',
                    borderRadius: brand.radius.btn,
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    cursor: isApproving || !item.watchId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isApproving ? 'Saving...' : 'Approve →'}
                </button>
                <button
                  onClick={() => onReject(item.id)}
                  disabled={isApproving}
                  style={{
                    padding: '8px 14px',
                    background: 'none',
                    color: brand.colors.muted,
                    border: `1px solid ${brand.colors.border}`,
                    borderRadius: brand.radius.btn,
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    fontWeight: 400,
                    cursor: isApproving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            )}
            {item.status === 'approved' && (
              <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: '#2D6A2D' }}>Approved and saved.</span>
            )}
            {item.status === 'rejected' && (
              <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>Rejected.</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminImagesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  async function processFile(file: File) {
    const itemId = crypto.randomUUID()
    const previewDataUrl = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })

    setQueue(prev => [...prev, {
      id: itemId,
      filename: file.name,
      status: 'processing',
      previewDataUrl,
      watchId: '',
      editing: false,
    }])

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/admin/process-image', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as {
        pngDataUrl: string
        webpDataUrl: string
        sourceWidth: number
        sourceHeight: number
        processedWidth: number
        processedHeight: number
        backgroundRemovalApplied: boolean
        identification: WatchIdentification | null
      }
      updateItem(itemId, {
        status: 'ready',
        pngDataUrl: data.pngDataUrl,
        webpDataUrl: data.webpDataUrl,
        sourceWidth: data.sourceWidth,
        sourceHeight: data.sourceHeight,
        processedWidth: data.processedWidth,
        processedHeight: data.processedHeight,
        backgroundRemovalApplied: data.backgroundRemovalApplied,
        identification: data.identification ?? undefined,
        watchId: autoWatchId(data.identification ?? undefined),
      })
    } catch (err) {
      updateItem(itemId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Processing failed',
      })
    }
  }

  const handleFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    list.forEach(f => void processFile(f))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleApprove(id: string) {
    const item = queue.find(i => i.id === id)
    if (!item?.pngDataUrl || !item.webpDataUrl || !item.watchId) return

    updateItem(id, { status: 'approving' })

    try {
      const res = await fetch('/api/admin/approve-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchId: item.watchId,
          pngDataUrl: item.pngDataUrl,
          webpDataUrl: item.webpDataUrl,
          sourceWidth: item.sourceWidth ?? 0,
          sourceHeight: item.sourceHeight ?? 0,
          processedWidth: item.processedWidth ?? 0,
          processedHeight: item.processedHeight ?? 0,
          backgroundRemovalApplied: item.backgroundRemovalApplied ?? false,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      updateItem(id, { status: 'approved' })
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Approval failed',
      })
    }
  }

  function handleReject(id: string) {
    updateItem(id, { status: 'rejected' })
  }

  function handleToggleEdit(id: string) {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, editing: !item.editing } : item))
  }

  function handleFieldChange(id: string, field: keyof WatchIdentification, value: string) {
    setQueue(prev => prev.map(item => {
      if (item.id !== id) return item
      const editedFields = { ...item.editedFields, [field]: value }
      const merged = { ...item.identification, ...editedFields }
      return { ...item, editedFields, watchId: autoWatchId(merged as WatchIdentification) }
    }))
  }

  function handleWatchIdChange(id: string, value: string) {
    updateItem(id, { watchId: slugify(value) })
  }

  if (authLoading) return null

  if (!user) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 61px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, margin: '0 0 12px' }}>
            Sign in to access the image intake tool.
          </p>
          <button
            onClick={() => router.push('/auth')}
            style={{
              padding: '10px 24px',
              background: brand.colors.ink,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: brand.radius.btn,
              fontFamily: brand.font.sans,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Sign in →
          </button>
        </div>
      </div>
    )
  }

  const pendingCount = queue.filter(i => i.status === 'ready').length
  const approvedCount = queue.filter(i => i.status === 'approved').length

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '48px 40px 120px',
        borderTop: `1px solid ${brand.colors.border}`,
      }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: brand.font.serif,
            fontSize: 32,
            fontWeight: 500,
            color: brand.colors.ink,
            margin: '0 0 6px',
            letterSpacing: '0.01em',
          }}>
            Image Intake
          </h1>
          <p style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, margin: 0 }}>
            Drop watch photos to process, identify, and add to the catalog.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          style={{
            border: `2px dashed ${dragging ? brand.colors.gold : brand.colors.borderLight}`,
            borderRadius: brand.radius.xl,
            padding: '40px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? brand.colors.goldWash : brand.colors.slot,
            transition: `border-color ${brand.transition.fast}, background ${brand.transition.fast}`,
            marginBottom: 32,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
            <path d="M16 4v16M8 12l8-8 8 8" stroke={brand.colors.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 24h20" stroke={brand.colors.muted} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink, margin: '0 0 4px', fontWeight: 500 }}>
            Drop images here, or click to select
          </p>
          <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, margin: 0 }}>
            PNG, JPG, WebP, AVIF — multiple files supported
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.muted, margin: 0 }}>
                Queue — {queue.length} image{queue.length !== 1 ? 's' : ''}
              </h2>
              {pendingCount > 0 && (
                <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
                  {pendingCount} awaiting approval
                </span>
              )}
              {approvedCount > 0 && (
                <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: '#2D6A2D' }}>
                  {approvedCount} approved
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {queue.map(item => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onToggleEdit={handleToggleEdit}
                  onFieldChange={handleFieldChange}
                  onWatchIdChange={handleWatchIdChange}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
