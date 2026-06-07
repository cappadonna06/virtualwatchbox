// components/serviceRoom/onboarding/wizardDraft.ts
// Pure working-draft state for the first-run onboarding wizard. No React, no
// side effects — the wizard holds one of these per session and commits it to
// the real persistence paths on Continue / Finish.

import { DEFAULT_INTERVAL_YEARS, normalizeInterval, type ServiceWatch } from '@/lib/serviceRoom/derive'
import type { PhotoType, ServiceIntervalYears } from '@/types/watch'

export interface DraftDoc {
  /** Local temp id — not a persisted photo id. */
  id: string
  file: File
  type: PhotoType
}

export interface WatchDraft {
  ownedWatchId: string
  // ── Step 1 · Set the clock ──
  intervalYears: ServiceIntervalYears
  /** Whether the interval was ever explicitly chosen (seeded true when the
   *  watch already had one). Currently informational — Continue persists the
   *  interval regardless, as the explicit "room is set up" signal. */
  intervalTouched: boolean
  /** ISO yyyy-mm-dd of the last full service, or null when none chosen. */
  lastServiceDate: string | null
  /** "Never serviced? Use purchase date" — schedules from purchaseDate, no record written. */
  usePurchaseDate: boolean
  step1Skipped: boolean
  // ── Step 2 · Build the dossier ──
  hasBox: boolean | null
  hasPapers: boolean | null
  warrantyExpiresAt: string | null
  docs: DraftDoc[]
  step2Skipped: boolean
}

export type WizardDraft = Record<string, WatchDraft>

export function makeWatchDraft(sw: ServiceWatch): WatchDraft {
  return {
    ownedWatchId: sw.watch.id,
    intervalYears: normalizeInterval(sw.watch.intervalYears),
    intervalTouched: sw.watch.intervalYears != null,
    lastServiceDate: null,
    usePurchaseDate: false,
    step1Skipped: false,
    hasBox: sw.watch.hasBox ?? null,
    hasPapers: sw.watch.hasPapers ?? null,
    warrantyExpiresAt: sw.watch.warrantyExpiresAt ?? null,
    docs: [],
    step2Skipped: false,
  }
}

export function makeInitialDraft(watches: ServiceWatch[]): WizardDraft {
  const draft: WizardDraft = {}
  for (const sw of watches) draft[sw.watch.id] = makeWatchDraft(sw)
  return draft
}

// Guess a document type from a filename (editable in the UI). Mirrors the
// heuristic in LogServiceModal; falls back to service_record.
export function guessDocType(name: string): PhotoType {
  const n = (name || '').toLowerCase()
  if (/receipt|invoice|bill/.test(n)) return 'receipt'
  if (/warrant|guarantee/.test(n)) return 'warranty_card'
  if (/box|paper|tag/.test(n)) return 'box_papers'
  return 'service_record'
}

export { DEFAULT_INTERVAL_YEARS }
