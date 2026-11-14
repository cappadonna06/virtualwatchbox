'use client'

import { useEffect, useRef, useState } from 'react'
import { preparePlaygroundShare } from '@/app/playground/share/actions'
import { brand } from '@/lib/brand'
import { FRAMES, LININGS } from '@/lib/frameConfig'
import { trackPlaygroundShare } from '@/lib/launchAnalytics'
import {
  createPlaygroundShare,
  encodePlaygroundShare,
  formatPlaygroundShareTotal,
  playgroundSharePath,
} from '@/lib/playgroundShare'
import type { PlaygroundBox } from '@/types/watch'

type Preview = Extract<Awaited<ReturnType<typeof preparePlaygroundShare>>, { status: 'ready' }>

export default function PlaygroundShareModal({ box, onClose }: { box: PlaygroundBox; onClose: () => void }) {
  const [share] = useState(() => createPlaygroundShare(box))
  const [preview, setPreview] = useState<Preview>()
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [includeTotal, setIncludeTotal] = useState(false)
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const dialog = useRef<HTMLDialogElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)

  const baseToken = encodePlaygroundShare(share)
  const total = includeTotal ? preview?.total : undefined
  const token = total === undefined ? baseToken : encodePlaygroundShare({ ...share, total })
  const url = token ? new URL(playgroundSharePath(token), window.location.origin).href : ''

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  useEffect(() => {
    if (!baseToken) return
    let active = true
    async function load(token: string) {
      try {
        const result = await preparePlaygroundShare(token)
        if (!active) return
        if (result.status === 'ready') {
          setPreview(result)
          return
        }
        setLoadError(result.status === 'unavailable'
          ? 'Every watch must be in the public catalog to share this box. Remove or replace any private or unavailable watches and try again.'
          : 'The catalog could not be checked. Try again in a moment.')
      } catch {
        if (active) setLoadError('The catalog could not be checked. Try again in a moment.')
      }
    }
    void load(baseToken)
    return () => { active = false }
  }, [baseToken, attempt])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      trackPlaygroundShare('playground_share_copied')
    } catch {
      setStatus('manual')
    }
  }

  useEffect(() => {
    if (status === 'manual') linkInput.current?.select()
  }, [status])

  const primary = {
    background: brand.colors.ink,
    color: brand.colors.white,
    border: 0,
    borderRadius: brand.radius.btn,
    padding: '11px 16px',
    fontFamily: brand.font.sans,
    cursor: 'pointer',
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="playground-share-title"
      onCancel={event => {
        event.preventDefault()
        onClose()
      }}
      style={{
        position: 'fixed', inset: 0, margin: 'auto', width: 'min(480px, calc(100% - 32px))',
        maxHeight: 'calc(100dvh - 40px)', overflowY: 'auto', boxSizing: 'border-box',
        padding: '22px clamp(16px, 5vw, 28px)', border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.lg, background: brand.colors.slot, boxShadow: brand.shadow.menu,
        color: brand.colors.ink, fontFamily: brand.font.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="playground-share-title" style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 34, lineHeight: 1 }}>
          Share Box
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" style={{
          border: 0, background: 'none', cursor: 'pointer', color: brand.colors.muted, padding: '4px 8px', fontSize: 16,
        }}>✕</button>
      </div>
      <p style={{ margin: '12px 0 14px', lineHeight: 1.55, fontSize: 14 }}>
        Anyone with the link can view this snapshot. It includes the catalog watches and photos, slot positions, frame, and lining.
      </p>
      {preview ? (
        <>
          <p style={{ margin: 0, fontSize: 13, color: brand.colors.muted }}>
            {share.slotCount}-slot box · {FRAMES.find(frame => frame.id === share.frame)?.label} · {LININGS.find(lining => lining.id === share.lining)?.label}
          </p>
          <ol style={{
            listStyle: 'none', margin: '10px 0 16px', padding: 0, maxHeight: 'min(180px, 29dvh)', overflowY: 'auto',
            fontSize: 13, borderBlock: `1px solid ${brand.colors.border}`,
          }}>
            {preview.watches.map(watch => (
              <li key={watch.slot} style={{ display: 'flex', gap: 12, padding: '6px 0' }}>
                <span style={{ color: brand.colors.goldDeep }}>Slot {watch.slot + 1}</span>
                <span style={{ flex: 1 }}>
                  {watch.brand} {watch.model}{watch.reference ? ` · ${watch.reference}` : ''}
                </span>
              </li>
            ))}
          </ol>
          {preview.total !== undefined && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14 }}>
              <input type="checkbox" checked={includeTotal} onChange={event => {
                setIncludeTotal(event.target.checked)
                setStatus('idle')
              }} style={{ accentColor: brand.colors.goldDeep }} />
              Include catalog estimate ({formatPlaygroundShareTotal(preview.total)})
            </label>
          )}
          {url ? (
            <>
              <button type="button" onClick={copyLink} style={primary}>Copy link</button>
              <p role="status" style={{ margin: status === 'idle' ? 0 : '8px 0 0', fontSize: 13, color: brand.colors.muted }}>
                {status === 'copied' ? 'Link copied.' : status === 'manual' ? 'Select and copy this link manually.' : ''}
              </p>
              {status === 'manual' && (
                <input ref={linkInput} aria-label="Share link" readOnly value={url} style={{
                  width: '100%', marginTop: 8, padding: '8px 10px', border: `1px solid ${brand.colors.borderLight}`,
                  borderRadius: brand.radius.btn, fontFamily: brand.font.sans,
                }} />
              )}
            </>
          ) : <p role="alert" style={{ fontSize: 14 }}>This snapshot is too large to share with the estimate.</p>}
        </>
      ) : (
        <p role={loadError || !baseToken ? 'alert' : 'status'} style={{ margin: '14px 0 0', fontSize: 14, color: brand.colors.muted }}>
          {loadError || (baseToken ? 'Checking the public catalog…' : 'This box could not fit into a share link. Try a smaller box.')}
        </p>
      )}
      {loadError && (
        <button type="button" onClick={() => {
          setLoadError('')
          setAttempt(attempt + 1)
        }} style={{ ...primary, marginTop: 12 }}>Try again</button>
      )}
    </dialog>
  )
}
