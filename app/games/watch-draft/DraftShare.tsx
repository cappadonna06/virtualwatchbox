'use client'

import { useEffect, useRef, useState } from 'react'
import { draftCardPath } from './resolveDraft'
import styles from './draft.module.css'

export default function DraftShare({ path, title, text }: { path: string; title: string; text: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [native, setNative] = useState(false)
  const [file, setFile] = useState<File | null>()
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const imagePath = draftCardPath(path)

  useEffect(() => setNative(typeof navigator.share === 'function'), [])

  useEffect(() => {
    if (!open || !native) return
    const request = new AbortController()
    const timeout = window.setTimeout(() => { request.abort(); setFile(null) }, 6500)
    fetch(imagePath, { signal: request.signal })
      .then(response => {
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw new Error('Image unavailable')
        return response.blob()
      })
      .then(blob => setFile(new File([blob], 'virtual-watchbox-draft.png', { type: 'image/png' })))
      .catch(() => { if (!request.signal.aborted) setFile(null) })
    return () => { window.clearTimeout(timeout); request.abort() }
  }, [open, native, imagePath])

  function openSheet() {
    setStatus('idle')
    setFile(undefined)
    setOpen(true)
    dialog.current?.showModal()
  }

  async function share() {
    const url = new URL(path, window.location.origin).href
    if (native) {
      const files = file ? [file] : undefined
      const withImage = files && navigator.canShare?.({ files })
      try {
        await navigator.share(withImage ? { title, text, url, files } : { title, text, url })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        // Some in-app browsers expose Web Share but block it in their container.
        setNative(false)
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setStatus('copied')
    } catch {
      setStatus('manual')
    }
  }

  const preparing = native && file === undefined
  const nativeImage = file && native && navigator.canShare?.({ files: [file] })

  return <>
    <button className={styles.shareButton} type="button" onClick={openSheet}>Share results ↗</button>
    <dialog className={styles.shareDialog} ref={dialog} onClose={() => setOpen(false)} aria-labelledby="share-result-title">
      <header className={styles.shareHeader}>
        <h2 id="share-result-title">Share results</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close sharing">×</button>
      </header>
      {open && <>
        {/* The PNG is generated for this exact lineup. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.sharePreview} src={imagePath} width={1200} height={630} alt={`Share card for your ${title}`} />
        <div className={styles.shareActions}>
          <button type="button" onClick={share} disabled={preparing}>
            {preparing ? 'Preparing image…' : native ? 'Share…' : status === 'copied' ? 'Copied' : 'Copy results'}
          </button>
          {(!nativeImage && !preparing) && <a href={imagePath} download="virtual-watchbox-draft.png">Save image</a>}
        </div>
        {status === 'copied' && <p role="status">Results and link copied.</p>}
        {status === 'manual' && <textarea aria-label="Copyable draft results" className={styles.shareInput} readOnly rows={5}
          value={`${text}\n${new URL(path, window.location.origin).href}`} onFocus={event => event.currentTarget.select()} />}
      </>}
    </dialog>
  </>
}
