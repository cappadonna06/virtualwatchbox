// Strap master images are stored ONCE as a vertical strap (top→bottom, buckle at
// the bottom). The Strap Studio reuses that single master two ways via CSS
// transform: as a vertical band behind the case (composite mode) and laid
// sideways to flank the watch (side-by-side mode). These helpers describe the
// geometry for each presentation so callers don't hardcode rotations.

import type { StrapTemplate } from '@/lib/strapTemplates'

/** Width:height of the vertical strap master (~5:6). */
export const STRAP_MASTER_ASPECT = 5 / 6

export interface DrawerOrientation {
  rotation: 0
  width: number
  height: number
}

export interface StudioOrientation {
  rotation: 90 | -90
  /** Rendered element size BEFORE rotation (CSS rotates around centre). */
  width: number
  height: number
  /** Suggested offset so the buckle end points outward, off-frame. */
  x: number
  y: number
}

/** Vertical, as stored — used for swatches and the composite band. */
export function getDrawerOrientation(_template: StrapTemplate | null | undefined, height = 120): DrawerOrientation {
  return { rotation: 0, width: Math.round(height * STRAP_MASTER_ASPECT), height }
}

/**
 * Sideways, flanking the watch case. `side` decides which way the master is
 * rotated so the buckle end points outward (off the visible frame). `length` is
 * the visible run of strap along the watch's horizontal axis.
 */
export function getStudioOrientation(
  _template: StrapTemplate | null | undefined,
  side: 'left' | 'right',
  length = 360,
): StudioOrientation {
  // The master is taller than wide; rotated 90° its height becomes the on-screen
  // band thickness. Keep the thickness proportional to a real strap.
  const thickness = Math.round(length * STRAP_MASTER_ASPECT)
  return {
    rotation: side === 'left' ? 90 : -90,
    width: thickness,
    height: length,
    x: side === 'left' ? -length * 0.18 : length * 0.18,
    y: 0,
  }
}
