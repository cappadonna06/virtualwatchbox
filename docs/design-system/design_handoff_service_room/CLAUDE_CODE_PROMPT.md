# Claude Code Prompt — Build "The Service Room"

Paste the prompt below into Claude Code from the root of the Virtual Watchbox repo. It assumes the design reference bundle (this folder) is available to read.

---

## Prompt

> I'm adding a new top-level area to Virtual Watchbox called **The Service Room** — a collection-wide watch maintenance & provenance hub. A complete high-fidelity design reference is in `design_handoff_service_room/` (read `README.md` first, then the files in `source/`, then look at `screenshots/`). Recreate this design in our existing stack (React + Supabase), using our component library, styling system, data layer, and routing conventions — do **not** copy the prototype's inline-style/Babel approach.
>
> **Build it in vertical slices, pausing after each for review:**
>
> 1. **Data layer.** Add the `watch_service_records` table (columns: id, watch_id, date, type, provider, cost, notes; with RLS) and the document/ownership fields described in the README (`receipt`/`warranty_card`/`service_record`/`box_papers`/`appraisal`/`manual`; `has_box`, `has_papers`, `acquisition_method`, `warranty_expiry`, and a configurable `service_interval_years`). Implement the derived helpers exactly as specified in README → "Derived Logic" (last full service, next-due = last-full + interval, the Overdue/Due-soon/On-track status thresholds, lifetime cost, warranty status, and the `byAttention` sort). Put these in well-tested pure functions.
>
> 2. **Hub shell + summary + layout switch.** The sticky nav entry "Service Room", page header with **Export dossier**, the 4-cell summary strip (Pieces under care / Need attention / Lifetime upkeep / Next on the bench), and the Agenda/Ledger/Gallery segmented switch. Match the tokens in README → "Design Tokens" (warm parchment palette, Cormorant Garamond + DM Sans, gold accent).
>
> 3. **Agenda layout (hero).** The **Service Horizon** band (dot = exact due date, Overdue/Beyond buckets, 24-month axis, lane-packing, legend), the **On the bench** attention cards, and the **Resting easy** list. This is the most important view — get the horizon's due-date clarity right.
>
> 4. **Ledger + Gallery layouts.** Sortable file-cabinet table (with "no papers" flag and totals row) and the editorial gallery cards.
>
> 5. **Watch Dossier drawer.** Right-side 456px drawer: ownership chip strip, service-summary card with the **3/5/7/10-year interval toggle** (writes interval, live-recomputes next-due), filterable **Papers & Provenance**, and the most-recent-first **service timeline** (gold node = clock-resetting service).
>
> 6. **Log a Service modal.** The working form (8 type pills, date, cost, provider with quick-fill + affiliate link, notes). Saving inserts a record and live-updates costs/next-due/status, with a confirmation toast. Selecting Full/Movement Service shows the "resets the clock" note.
>
> 7. **Affiliate hooks + export.** Wire the "Find a center" buttons, the Partner Service Centers band, and the modal's provider link to our affiliate/partner destinations. Implement Export dossier (whole collection from the header, single watch from the drawer) using our existing export pathway — a print-ready/PDF service record per `dossier-export.jsx`.
>
> Use our real watch/photo data (the product already supports per-watch photo uploads with a `photoType`); the images in the bundle are stand-ins. Keep accessibility in mind (focus traps in drawer/modal, Esc to close, hit targets ≥ 44px). Flag anywhere our existing patterns should override the reference.

---

### Notes for the developer
- The prototype pins "today" for deterministic status math — use the real current date in production.
- All status/next-due/cost/warranty values are **computed, not stored**.
- The drawer and modal are overlays with focus management; reuse our existing dialog/sheet primitives rather than the prototype's hand-rolled versions.
- The horizon's central UX requirement (from the client): **the colored dot marks the due month** — keep that unambiguous.
