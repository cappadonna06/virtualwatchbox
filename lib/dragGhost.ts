export const PLAYGROUND_WATCH_MIME = 'application/vnd.virtualwatchbox.watchid'
export const PLAYGROUND_DRAG_PAYLOAD_KEY = '__playgroundDragWatchId__'

type GhostDragOptions = {
  sourceEl: HTMLElement
  clientX: number
  clientY: number
  ghostWidth?: number
  ghostHeight?: number
  watchId: string
  targetSelector: string
  onHover?: (slotIndex: number | null) => void
  onDrop: (slotIndex: number | null, watchId: string) => void
}

export function startGhostDrag(options: GhostDragOptions): () => void {
  const { sourceEl, clientX, clientY, watchId, targetSelector, onHover, onDrop } = options

  const w = options.ghostWidth ?? sourceEl.offsetWidth
  const h = options.ghostHeight ?? sourceEl.offsetHeight
  const clone = sourceEl.cloneNode(true) as HTMLDivElement
  clone.style.cssText += `;position:fixed;pointer-events:none;z-index:9999;width:${w}px;height:${h}px;border:1.5px solid rgba(201,168,76,0.9);box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 12px 32px rgba(201,168,76,0.25);border-radius:6px;opacity:0.92;transform:scale(1.04);left:${clientX - w / 2}px;top:${clientY - h * 1.15}px;background:#FFFCF7`
  document.body.appendChild(clone)

  const rects = getSlotRects(targetSelector)
  ;(window as unknown as Record<string, string>)[PLAYGROUND_DRAG_PAYLOAD_KEY] = watchId

  function hitTest(x: number, y: number): number | null {
    const hit = rects.find(({ rect }) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    )
    return hit ? hit.index : null
  }

  function onMove(ev: PointerEvent) {
    clone.style.left = `${ev.clientX - w / 2}px`
    clone.style.top = `${ev.clientY - h * 1.15}px`
    if (onHover) onHover(hitTest(ev.clientX, ev.clientY))
  }

  function cleanup() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointercancel', onUp)
    clone.remove()
    delete (window as unknown as Record<string, string>)[PLAYGROUND_DRAG_PAYLOAD_KEY]
  }

  function onUp(ev: PointerEvent) {
    const slotIndex = hitTest(ev.clientX, ev.clientY)
    cleanup()
    onDrop(slotIndex, watchId)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
  document.addEventListener('pointercancel', onUp)

  return cleanup
}

function getSlotRects(selector: string): { rect: DOMRect; index: number }[] {
  return Array.from(document.querySelectorAll(selector)).map(el => {
    const html = el as HTMLElement
    return {
      rect: html.getBoundingClientRect(),
      index: Number(html.dataset.slotIndex ?? '-1'),
    }
  })
}
