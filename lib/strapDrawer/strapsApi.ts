// lib/strapDrawer/strapsApi.ts
// Shared server-side helpers for the user_straps + strap_watch_overrides API
// routes. Kept out of the route files so route modules export only HTTP handlers.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StrapMaterial, StrapStyle, StrapWatchOverride, UserStrap } from '@/types/watch'

export const STRAP_MATERIALS: StrapMaterial[] = [
  'leather', 'rubber', 'nylon', 'canvas', 'fabric',
  'metal', 'silicone', 'ceramic', 'exotic', 'other',
]

export const STRAP_STYLES: StrapStyle[] = ['dressy', 'sporty', 'casual', 'rugged', 'vintage']

export type StrapRow = {
  id: string
  user_id: string
  name: string | null
  brand: string | null
  material: string
  sub_material: string | null
  color: string
  color_hex: string | null
  lug_width_mm: number
  style: string | null
  tapered_to_mm: number | null
  length_mm: number | null
  clasp_type: string | null
  purchase_price: number | null
  purchase_url: string | null
  photo_url: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export function rowToStrap(row: StrapRow): UserStrap {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? undefined,
    brand: row.brand ?? undefined,
    material: row.material as StrapMaterial,
    subMaterial: row.sub_material ?? undefined,
    color: row.color,
    colorHex: row.color_hex ?? undefined,
    lugWidthMm: row.lug_width_mm,
    style: (row.style ?? undefined) as StrapStyle | undefined,
    taperedToMm: row.tapered_to_mm ?? undefined,
    lengthMm: row.length_mm ?? undefined,
    claspType: row.clasp_type ?? undefined,
    purchasePrice: row.purchase_price ?? undefined,
    purchaseUrl: row.purchase_url ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export type OverrideRow = {
  id: string
  user_id: string
  strap_id: string
  watch_id: string
  override: string
  notes: string | null
  created_at: string
}

export function rowToOverride(row: OverrideRow): StrapWatchOverride {
  return {
    id: row.id,
    strapId: row.strap_id,
    watchId: row.watch_id,
    override: row.override as 'fits' | 'excluded',
    notes: row.notes ?? undefined,
  }
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

const intOrNull = (v: unknown, errors: string[], field: string, min?: number, max?: number): number | null | undefined => {
  if (v === null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) { errors.push(field); return undefined }
  if (min != null && n < min) { errors.push(field); return undefined }
  if (max != null && n > max) { errors.push(field); return undefined }
  return Math.round(n)
}

// Validate + coerce strap fields shared by POST (partial=false) and PATCH
// (partial=true). Returns the snake_case DB payload + any invalid fields.
export function parseStrapBody(body: Record<string, unknown>, partial: boolean) {
  const payload: Record<string, unknown> = {}
  const errors: string[] = []

  if (!partial || body.material !== undefined) {
    const m = body.material
    if (typeof m !== 'string' || !STRAP_MATERIALS.includes(m as StrapMaterial)) errors.push('material')
    else payload.material = m
  }
  if (!partial || body.color !== undefined) {
    const c = typeof body.color === 'string' ? body.color.trim() : ''
    if (!c) errors.push('color')
    else payload.color = c.slice(0, 60)
  }
  if (!partial || body.lugWidthMm !== undefined) {
    const n = Number(body.lugWidthMm)
    if (!Number.isInteger(n) || n < 6 || n > 32) errors.push('lugWidthMm')
    else payload.lug_width_mm = n
  }
  if (body.style !== undefined) {
    const s = body.style
    if (s === null || s === '') payload.style = null
    else if (typeof s !== 'string' || !STRAP_STYLES.includes(s as StrapStyle)) errors.push('style')
    else payload.style = s
  }
  if (body.name !== undefined) payload.name = str(body.name, 80)
  if (body.brand !== undefined) payload.brand = str(body.brand, 60)
  if (body.subMaterial !== undefined) payload.sub_material = str(body.subMaterial, 40)
  if (body.colorHex !== undefined) payload.color_hex = str(body.colorHex, 9)
  // Curated strap templates (Quick pick) pass a hosted image URL straight through on create,
  // instead of the file-upload path used for user photos.
  if (body.photoUrl !== undefined) payload.photo_url = str(body.photoUrl, 500)
  if (body.claspType !== undefined) payload.clasp_type = str(body.claspType, 60)
  if (body.purchaseUrl !== undefined) payload.purchase_url = str(body.purchaseUrl, 500)
  if (body.notes !== undefined) payload.notes = str(body.notes, 500)

  if (body.taperedToMm !== undefined) {
    const v = intOrNull(body.taperedToMm, errors, 'taperedToMm', 0, 40)
    if (v !== undefined) payload.tapered_to_mm = v
  }
  if (body.lengthMm !== undefined) {
    const v = intOrNull(body.lengthMm, errors, 'lengthMm', 0, 400)
    if (v !== undefined) payload.length_mm = v
  }
  if (body.purchasePrice !== undefined) {
    const v = intOrNull(body.purchasePrice, errors, 'purchasePrice', 0)
    if (v !== undefined) payload.purchase_price = v
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder)
    if (Number.isFinite(n)) payload.sort_order = Math.round(n)
  }

  return { payload, errors }
}

// Confirm the caller owns the strap. RLS would catch a stray write anyway;
// failing fast gives a cleaner 404.
export async function loadOwnStrap(
  supabase: SupabaseClient,
  strapId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data, error } = await supabase
    .from('user_straps')
    .select('id, user_id')
    .eq('id', strapId)
    .maybeSingle()
  if (error) return { ok: false, status: 500, message: error.message }
  if (!data || data.user_id !== userId) return { ok: false, status: 404, message: 'not_found' }
  return { ok: true }
}
