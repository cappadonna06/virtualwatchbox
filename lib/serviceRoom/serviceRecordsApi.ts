// lib/serviceRoom/serviceRecordsApi.ts
// Shared server-side helpers for the watch_service_records API routes. Kept
// out of the route files themselves so route modules export only HTTP handlers.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ServiceType, WatchServiceRecord } from '@/types/watch'

export const SERVICE_TYPES: ServiceType[] = [
  'full', 'movement', 'water', 'battery', 'polish', 'strap', 'repair', 'other',
]

export type RecordRow = {
  id: string
  watch_id: string
  user_id: string
  service_date: string
  service_type: string
  provider: string | null
  cost: number | null
  currency: string | null
  notes: string | null
  created_at: string
}

export function rowToRecord(row: RecordRow): WatchServiceRecord {
  return {
    id: row.id,
    watchId: row.watch_id,
    serviceDate: row.service_date,
    serviceType: row.service_type as ServiceType,
    provider: row.provider ?? undefined,
    cost: row.cost ?? undefined,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// Validate + coerce the mutable fields shared by POST (partial=false) and
// PATCH (partial=true). Returns the snake_case DB payload + any invalid fields.
export function parseRecordBody(body: Record<string, unknown>, partial: boolean) {
  const payload: Record<string, unknown> = {}
  const errors: string[] = []

  if (!partial || body.serviceDate !== undefined) {
    const d = typeof body.serviceDate === 'string' ? body.serviceDate : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) errors.push('serviceDate')
    else payload.service_date = d
  }
  if (!partial || body.serviceType !== undefined) {
    const t = body.serviceType
    if (typeof t !== 'string' || !SERVICE_TYPES.includes(t as ServiceType)) errors.push('serviceType')
    else payload.service_type = t
  }
  if (body.provider !== undefined) {
    payload.provider = typeof body.provider === 'string' && body.provider.trim()
      ? body.provider.trim() : null
  }
  if (body.cost !== undefined) {
    if (body.cost === null || body.cost === '') payload.cost = null
    else {
      const n = Number(body.cost)
      if (!Number.isFinite(n) || n < 0) errors.push('cost')
      else payload.cost = Math.round(n)
    }
  }
  if (body.currency !== undefined) {
    payload.currency = typeof body.currency === 'string' && body.currency.trim()
      ? body.currency.trim().slice(0, 8) : 'USD'
  }
  if (body.notes !== undefined) {
    payload.notes = typeof body.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 500) : null
  }
  return { payload, errors }
}

// Confirm the caller owns the watch the records hang off. RLS would catch a
// stray write anyway; failing fast gives a cleaner error.
export async function assertOwnsWatch(
  supabase: SupabaseClient,
  watchId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data, error } = await supabase
    .from('watches')
    .select('id, user_id')
    .eq('id', watchId)
    .maybeSingle()
  if (error) return { ok: false, status: 500, message: error.message }
  if (!data || data.user_id !== userId) return { ok: false, status: 404, message: 'not_found' }
  return { ok: true }
}
