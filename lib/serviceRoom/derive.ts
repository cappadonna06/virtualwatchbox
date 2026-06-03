// lib/serviceRoom/derive.ts
// Pure derived service logic for the Service Room (Feature 2F).
// No React, no side effects — everything here is a deterministic function of
// its inputs (a watch's records + interval + ownership facts), so it can be
// reasoned about and tested in isolation. The real current date is the only
// ambient input and is injectable as `now` for determinism.

import type {
  DocumentPhotoType,
  OwnedWatch,
  PhotoType,
  ResolvedOwnedWatch,
  ServiceIntervalYears,
  ServiceType,
  UserWatchPhoto,
  WatchServiceRecord,
} from '@/types/watch'
import { brand } from '@/lib/brand'

// ─── The aggregate the hub reasons about ─────────────────────────────────
// A resolved owned watch bundled with its service records, its document
// photos (Papers & Provenance), and its chosen service interval.
export interface ServiceWatch {
  watch: ResolvedOwnedWatch
  records: WatchServiceRecord[]
  documents: UserWatchPhoto[]
  intervalYears: ServiceIntervalYears
}

export const DEFAULT_INTERVAL_YEARS: ServiceIntervalYears = 5

export function normalizeInterval(value: unknown): ServiceIntervalYears {
  return value === 3 || value === 5 || value === 7 || value === 10
    ? value
    : DEFAULT_INTERVAL_YEARS
}

// ─── Service type taxonomy (the pill selector) ───────────────────────────
export interface ServiceTypeMeta {
  id: ServiceType
  label: string
  /** Full/Movement service resets the next-due "clock". */
  resets: boolean
  glyph: string
}

export const SERVICE_TYPES: ServiceTypeMeta[] = [
  { id: 'full', label: 'Full Service', resets: true, glyph: '◍' },
  { id: 'movement', label: 'Movement Service', resets: true, glyph: '⊚' },
  { id: 'water', label: 'Water-Resistance', resets: false, glyph: '◌' },
  { id: 'battery', label: 'Battery', resets: false, glyph: '▮' },
  { id: 'polish', label: 'Polishing', resets: false, glyph: '◇' },
  { id: 'strap', label: 'Strap / Bracelet', resets: false, glyph: '⌒' },
  { id: 'repair', label: 'Repair', resets: false, glyph: '✚' },
  { id: 'other', label: 'Other', resets: false, glyph: '•' },
]

const SERVICE_TYPE_FALLBACK = SERVICE_TYPES[SERVICE_TYPES.length - 1]

export function serviceTypeMeta(id: string): ServiceTypeMeta {
  return SERVICE_TYPES.find(t => t.id === id) ?? SERVICE_TYPE_FALLBACK
}

// ─── Document taxonomy (Papers & Provenance) ─────────────────────────────
export interface DocTypeMeta {
  id: DocumentPhotoType
  label: string
}

export const DOC_TYPES: DocTypeMeta[] = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'warranty_card', label: 'Warranty Card' },
  { id: 'service_record', label: 'Service Record' },
  { id: 'box_papers', label: 'Box & Papers' },
  { id: 'appraisal', label: 'Appraisal' },
  { id: 'manual', label: 'Manual' },
]

const DOC_TYPE_IDS = new Set<string>(DOC_TYPES.map(d => d.id))

export function isDocumentPhotoType(type: PhotoType | null | undefined): type is DocumentPhotoType {
  return type != null && DOC_TYPE_IDS.has(type)
}

export function docTypeMeta(id: string): DocTypeMeta {
  return DOC_TYPES.find(t => t.id === id) ?? { id: id as DocumentPhotoType, label: id }
}

export function docTint(type: string): string {
  return (brand.docTint as Record<string, string>)[type] ?? brand.colors.muted
}

// Full set of photo types with their human labels — used by the upload picker
// and lightbox type selector. Documents grouped after the visual types.
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  wrist_shot: 'Wrist shot',
  dial: 'Dial',
  case_back: 'Case back',
  macro: 'Macro',
  lifestyle: 'Lifestyle',
  receipt: 'Receipt',
  warranty_card: 'Warranty card',
  service_record: 'Service record',
  box_papers: 'Box & papers',
  appraisal: 'Appraisal',
  manual: 'Manual',
  other: 'Other',
}

export const PHOTO_TYPE_ORDER: PhotoType[] = [
  'wrist_shot', 'dial', 'case_back', 'macro', 'lifestyle',
  'receipt', 'warranty_card', 'service_record', 'box_papers', 'appraisal', 'manual',
  'other',
]

// ─── Acquisition method labels (real OwnedWatch enum) ────────────────────
export const ACQ_LABEL: Record<NonNullable<OwnedWatch['acquisitionMethod']>, string> = {
  new: 'New',
  'pre-owned': 'Pre-owned',
  gift: 'Gift',
  inherited: 'Inherited',
  trade: 'Trade',
  auction: 'Auction',
}

// ─── Formatting helpers ──────────────────────────────────────────────────
const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

/** Format a cost stored in cents as a whole-dollar string ($1,480). */
export function formatCost(cents: number | null | undefined): string {
  return moneyFmt.format(Math.round((cents ?? 0) / 100))
}

/** Always returns a fresh Date so callers can mutate safely. */
export function parseDate(d: string | Date): Date {
  if (d instanceof Date) return new Date(d.getTime())
  // Bare ISO dates parse at noon to dodge timezone day-shift.
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d)
}

export function formatDate(
  d: string | Date,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  return parseDate(d).toLocaleDateString('en-US', opts)
}

export function formatMonthYear(d: string | Date): string {
  return parseDate(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

/** Fractional months between a and b (positive = b is later than a). */
export function monthsBetween(a: string | Date, b: string | Date): number {
  const da = parseDate(a), db = parseDate(b)
  return (db.getFullYear() - da.getFullYear()) * 12
    + (db.getMonth() - da.getMonth())
    + (db.getDate() - da.getDate()) / 30
}

export function addYears(d: string | Date, y: number): Date {
  const nd = parseDate(d); nd.setFullYear(nd.getFullYear() + y); return nd
}

export function addMonths(d: string | Date, m: number): Date {
  const nd = parseDate(d); nd.setMonth(nd.getMonth() + m); return nd
}

/** Compact "in 4 mo" / "2.1 yr ago" / "this month". */
export function relTime(d: string | Date, now: Date = new Date()): string {
  const m = monthsBetween(now, d)
  const am = Math.abs(m)
  let txt: string
  if (am < 1) return 'this month'
  if (am < 12) txt = `${Math.round(am)} mo`
  else { const y = am / 12; txt = `${y < 2 ? y.toFixed(1) : Math.round(y)} yr` }
  return m >= 0 ? `in ${txt}` : `${txt} ago`
}

// ─── Status palette types ────────────────────────────────────────────────
export type ServiceStatusKey = 'overdue' | 'due' | 'ok'

export interface ServiceStatus {
  key: ServiceStatusKey
  label: string
  bg: string
  fg: string
  dot: string
  track: string
  due: Date
  /** Months from `now` to due (negative = overdue). */
  months: number
}

const STATUS_LABEL: Record<ServiceStatusKey, string> = {
  overdue: 'Overdue',
  due: 'Due soon',
  ok: 'On track',
}

// ─── Derived service logic ───────────────────────────────────────────────
/** Most-recent clock-resetting record (full/movement). Null if none. */
export function lastFullService(sw: ServiceWatch): WatchServiceRecord | null {
  const resets = sw.records.filter(r => serviceTypeMeta(r.serviceType).resets)
  if (resets.length === 0) return null
  return resets.reduce((a, b) => (parseDate(a.serviceDate) > parseDate(b.serviceDate) ? a : b))
}

/** Most-recent record of any type. Null if none. */
export function lastAnyService(sw: ServiceWatch): WatchServiceRecord | null {
  if (sw.records.length === 0) return null
  return sw.records.reduce((a, b) => (parseDate(a.serviceDate) > parseDate(b.serviceDate) ? a : b))
}

/**
 * Next full-service due date = last clock-resetting service (or the purchase
 * date if never serviced) + the configured interval.
 */
export function nextDueDate(sw: ServiceWatch): Date {
  const lf = lastFullService(sw)
  const base = lf ? lf.serviceDate : sw.watch.purchaseDate
  return addYears(base, sw.intervalYears)
}

export function serviceStatus(sw: ServiceWatch, now: Date = new Date()): ServiceStatus {
  const due = nextDueDate(sw)
  const months = monthsBetween(now, due)
  const key: ServiceStatusKey = months < 0 ? 'overdue' : months <= 6 ? 'due' : 'ok'
  const palette = brand.serviceStatus[key]
  return { key, label: STATUS_LABEL[key], ...palette, due, months }
}

/** Sum of all recorded costs (cents). */
export function lifetimeCostCents(sw: ServiceWatch): number {
  return sw.records.reduce((s, r) => s + (r.cost ?? 0), 0)
}

// ─── Warranty ─────────────────────────────────────────────────────────────
export type WarrantyKey = 'expired' | 'soon' | 'active'

export interface WarrantyStatus {
  key: WarrantyKey
  label: string
  bg: string
  fg: string
  date: string
  months: number
}

export function warrantyStatus(sw: ServiceWatch, now: Date = new Date()): WarrantyStatus | null {
  const expiry = sw.watch.warrantyExpiresAt
  if (!expiry) return null
  const months = monthsBetween(now, expiry)
  if (months < 0) return { key: 'expired', label: 'Warranty expired', ...brand.warranty.expired, date: expiry, months }
  if (months <= 4) return { key: 'soon', label: 'Warranty ending', ...brand.warranty.soon, date: expiry, months }
  return { key: 'active', label: 'Under warranty', ...brand.warranty.active, date: expiry, months }
}

// ─── Sorting ───────────────────────────────────────────────────────────────
const ATTENTION_ORDER: Record<ServiceStatusKey, number> = { overdue: 0, due: 1, ok: 2 }

/** Overdue → due → on-track, then soonest-due first. */
export function byAttention(a: ServiceWatch, b: ServiceWatch, now: Date = new Date()): number {
  const sa = serviceStatus(a, now), sb = serviceStatus(b, now)
  if (ATTENTION_ORDER[sa.key] !== ATTENTION_ORDER[sb.key]) {
    return ATTENTION_ORDER[sa.key] - ATTENTION_ORDER[sb.key]
  }
  return sa.due.getTime() - sb.due.getTime()
}

// ─── Aggregate builder ─────────────────────────────────────────────────────
/**
 * Bundle a resolved owned watch with its records + documents into the
 * ServiceWatch shape the hub consumes. Documents are the watch's photos whose
 * photoType is a Papers & Provenance document type.
 */
export function buildServiceWatch(
  watch: ResolvedOwnedWatch,
  records: WatchServiceRecord[],
  photos: UserWatchPhoto[],
): ServiceWatch {
  return {
    watch,
    records,
    documents: photos.filter(p => isDocumentPhotoType(p.photoType)),
    intervalYears: normalizeInterval(watch.intervalYears),
  }
}
