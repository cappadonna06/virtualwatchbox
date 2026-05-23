export const PLAYGROUND_WATCH_MIME = 'application/vnd.virtualwatchbox.watchid'
export const PLAYGROUND_DRAG_PAYLOAD_KEY = '__playgroundDragWatchId__'

export type DropZoneKind = 'slot' | 'trash'

export type DropZone = {
  kind: DropZoneKind
  /** CSS selector for the zone's elements; each rect is queried at drag start. */
  selector: string
  /** Per-rect numeric index getter. Defaults to reading data-slot-index. */
  indexOf?: (el: HTMLElement) => number
  /** Extra px of forgiveness added to each rect for the touch hit-test. */
  hitPadding?: number
}

export type GhostDragOptions = {
  sourceEl: HTMLElement
  clientX: number
  clientY: number
  ghostWidth?: number
  ghostHeight?: number
  /** Catalog watch id when dragging from the tray; for in-box drags this is the source slot index as a string. */
  payload: string
  /**
   * Drop zones to hit-test against. The first zone with a hit wins (defines
   * `hover.kind` priority); pass slot first then trash so a finger over a
   * slot prefers placing over deleting.
   */
  dropZones: DropZone[]
  onHover?: (hit: { kind: DropZoneKind; index: number } | null) => void
  /**
   * Fires on every pointermove with the ghost element and current hit. Use
   * to restyle the ghost mid-drag (e.g. dim + red border over the trash).
   */
  onHoverStyle?: (ghostEl: HTMLElement, hit: { kind: DropZoneKind; index: number } | null) => void
  onDrop: (hit: { kind: DropZoneKind; index: number } | null, payload: string) => void
}

export function startGhostDrag(options: GhostDragOptions): () => void {
  const { sourceEl, clientX, clientY, payload, dropZones, onHover, onDrop } = options

  const w = options.ghostWidth ?? sourceEl.offsetWidth
  const h = options.ghostHeight ?? sourceEl.offsetHeight
  const clone = sourceEl.cloneNode(true) as HTMLDivElement
  clone.style.cssText += `;position:fixed;pointer-events:none;z-index:9999;width:${w}px;height:${h}px;border:1.5px solid rgba(201,168,76,0.9);box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 12px 32px rgba(201,168,76,0.25);border-radius:6px;opacity:0.92;transform:scale(1.04);left:${clientX - w / 2}px;top:${clientY - h * 1.15}px;background:#FFFCF7`
  document.body.appendChild(clone)

  type Cached = { rects: { rect: DOMRect; index: number }[]; pad: number; kind: DropZoneKind }
  const cached: Cached[] = dropZones.map(zone => ({
    kind: zone.kind,
    pad: zone.hitPadding ?? 12,
    rects: getRects(zone.selector, zone.indexOf),
  }))

  ;(window as unknown as Record<string, string>)[PLAYGROUND_DRAG_PAYLOAD_KEY] = payload

  function hitTest(x: number, y: number): { kind: DropZoneKind; index: number } | null {
    // First zone with any hit wins, then best inset-score inside it.
    for (const { kind, rects, pad } of cached) {
      let bestIndex: number | null = null
      let bestScore = -Infinity
      for (const { rect, index } of rects) {
        if (x < rect.left - pad || x > rect.right + pad) continue
        if (y < rect.top - pad || y > rect.bottom + pad) continue
        const dx = Math.min(x - rect.left, rect.right - x)
        const dy = Math.min(y - rect.top, rect.bottom - y)
        const score = Math.min(dx, dy)
        if (score > bestScore) {
          bestScore = score
          bestIndex = index
        }
      }
      if (bestIndex !== null) return { kind, index: bestIndex }
    }
    return null
  }

  function onMove(ev: PointerEvent) {
    clone.style.left = `${ev.clientX - w / 2}px`
    clone.style.top = `${ev.clientY - h * 1.15}px`
    const hit = hitTest(ev.clientX, ev.clientY)
    if (onHover) onHover(hit)
    if (options.onHoverStyle) options.onHoverStyle(clone, hit)
  }

  function cleanup() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointercancel', onUp)
    clone.remove()
    delete (window as unknown as Record<string, string>)[PLAYGROUND_DRAG_PAYLOAD_KEY]
  }

  function onUp(ev: PointerEvent) {
    const hit = hitTest(ev.clientX, ev.clientY)
    cleanup()
    onDrop(hit, payload)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
  document.addEventListener('pointercancel', onUp)

  return cleanup
}

function getRects(
  selector: string,
  indexOf?: (el: HTMLElement) => number,
): { rect: DOMRect; index: number }[] {
  return Array.from(document.querySelectorAll(selector)).map(el => {
    const html = el as HTMLElement
    return {
      rect: html.getBoundingClientRect(),
      index: indexOf ? indexOf(html) : Number(html.dataset.slotIndex ?? '-1'),
    }
  })
}
