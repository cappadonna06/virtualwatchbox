# Handoff: The Service Room — Watch Maintenance & Provenance Hub

## Overview
**The Service Room** is a collection-wide maintenance dashboard for a watch collector. It is the single place an owner goes to see — across *all* of their watches — service history, service costs, documents (papers & provenance), and a clear read on **what to send to the bench next**. Service tracking and scheduling is the hero capability; cost tracking and the document "file cabinet" support it.

It is part of the **Virtual Watchbox** product (tagline: *"Showcase Your Timepieces. Discover What's Next."*) and sits alongside the existing Collection, Discover, and Playground surfaces as a new top-level area called **Service Room**.

This handoff covers two layers:
1. **The Hub** — a collection-wide dashboard with three interchangeable layouts (Agenda, Ledger, Gallery), a summary strip, and a partner-service-center (affiliate) band.
2. **The Dossier** — a per-watch detail drawer with an ownership strip, a filterable Papers & Provenance section, and a service-history timeline, plus a working **Log a Service** modal form.

---

## About the Design Files
The files in `source/` are **design references created in HTML/React (via in-browser Babel)** — a working prototype that demonstrates the intended look, layout, data model, and interactions. **They are not meant to be shipped as-is.** The task is to **recreate this experience inside the target codebase's existing environment** (the prototype mirrors a React + Supabase app — see the original Claude Code session notes below), reusing its established component library, styling system, data layer, and routing.

The prototype is self-contained: it loads React + Babel from CDNs and mounts a series of `.jsx` files that attach their exports to `window`. In production you would convert each of these into proper modules/components.

Original feature scope this design realizes (from the product's Claude Code backlog):
- **Session 3 — Photo type picker + Papers & Provenance:** document types `receipt`, `warranty_card`, `service_record`, `box_papers` (plus `appraisal`, `manual`); a filtered "Papers & Provenance" section on the detail view; an ownership detail strip (has_box, has_papers, acquisition_method, warranty expiry as compact chips).
- **Session 4 — Service History:** a `watch_service_records` table; a "Log a service" form (date, type pill selector, provider, cost, notes); a most-recent-first service timeline; a "next full service" estimate; a running total cost; and a "last serviced" hint.

This design also adds, per the client's direction: **configurable per-watch service intervals**, a **service-horizon timeline visualization**, **warranty countdown chips**, an **export-a-dossier** action, and **affiliate hooks for service shops**.

---

## Fidelity
**High-fidelity.** Final colors, typography, spacing, component styling, copy, and interaction behavior are all specified. Recreate the UI faithfully using the codebase's existing primitives. Exact tokens and measurements are listed below; the `source/` files are the source of truth where this README is silent.

---

## Data Model

### Watch (collection item)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `brand`, `model`, `ref` | string | e.g. "Rolex", "Datejust 41", "126331" |
| `nickname` | string | optional, e.g. "The everyday" (not shown in current screens) |
| `image` | url | product shot on transparent/white bg, displayed on a cream tile |
| `caseSizeMm`, `caseMaterial`, `dialColor`, `movement`, `type` | string/number | spec fields |
| `acquiredDate` | date | |
| `acquiredFrom` | enum | `ad` · `grey` · `auction` · `private` · `gift` · `inherited` |
| `purchasePrice`, `estValue` | number (USD) | |
| `hasBox`, `hasPapers` | bool | drives ownership chips + "no papers" flag |
| `warrantyExpiry` | date \| null | drives warranty chips/countdown |
| `intervalYears` | number | **configurable** full-service cadence (3/5/7/10) |
| `records[]` | ServiceRecord[] | |
| `documents[]` | Document[] | |

### ServiceRecord
`{ id, date, type, provider (string), cost (number USD), notes (string) }`
**type** is one of 8 (see Service Types). Records where the type "resets the clock" (Full Service, Movement Service) reset the next-due calculation.

### Document
`{ id, type, label (string), date }`
**type** ∈ `receipt` · `warranty_card` · `service_record` · `box_papers` · `appraisal` · `manual`.

### Service Types (the pill selector)
| id | Label | Resets clock? | Glyph |
|---|---|---|---|
| `full` | Full Service | ✅ | ◍ |
| `movement` | Movement Service | ✅ | ⊚ |
| `water` | Water-Resistance | — | ◌ |
| `battery` | Battery | — | ▮ |
| `polish` | Polishing | — | ◇ |
| `strap` | Strap / Bracelet | — | ⌒ |
| `repair` | Repair | — | ✚ |
| `other` | Other | — | • |

---

## Derived Logic (critical — implement exactly)
All date math in the prototype is pinned to a fixed "today" for determinism; in production use the real current date.

- **`lastFullService(w)`** → most-recent record whose type resets the clock (`full` or `movement`). May be null.
- **`nextDueDate(w)`** → `lastFullService.date` (or `acquiredDate` if never serviced) **+ `intervalYears`**.
- **`serviceStatus(w)`** → compares months from today to `nextDueDate`:
  - `< 0 months` → **Overdue** (red)
  - `0–6 months` → **Due soon** (amber)
  - `> 6 months` → **On track** (green)
- **`lifetimeCost(w)`** → sum of all `record.cost`.
- **`warrantyStatus(w)`** → null if no expiry; else `expired` (past), `soon` (≤ 4 months out), or `active`.
- **`byAttention`** sort → Overdue → Due soon → On track, then soonest-due first. Used to order cards/lists.

---

## Screens / Views

### 1. App shell
- **Sticky top nav**, 62px tall, translucent cream with blur and a 1px bottom border. Left: a serif **"VW"** monogram in gold + a vertical divider + **"The Service Room"** label. Right: text links *Collection · Discover · Playground* (muted) and **Service Room** (active, ink). Max content width **1320px**, 40px side padding.
- **Page header:** gold eyebrow "MAINTENANCE & PROVENANCE"; an `h1` "The Service Room" in light serif at **52px**; a one-line muted subtitle; and a top-right **Export dossier** secondary button (downloads the whole collection as a printable dossier).
- **Summary strip:** a single white rounded card divided into 4 equal cells (1px dividers): **Pieces under care** (count) · **Need attention** (count, amber/green) · **Lifetime upkeep** (sum, gold) · **Next on the bench** (month + which watch). Each cell: tiny uppercase label, big serif value (~34px), muted sub-line.
- **Layout switcher:** segmented control (Agenda / Ledger / Gallery) with leading icons; active = ink fill, white text. To its right, a muted helper sentence.
- **Footer:** italic serif line + an uppercase wordmark, divided by a 1px top border.

### 2. Hub — Agenda layout (default) — *the hero view*
Three stacked sections, each led by a `SectionHead` (gold eyebrow + serif title + muted hint **below** the title — never inline, to avoid serif-metric reflow overlap):
- **Service horizon** ("The next two years"): a horizontal timeline band (see Components → Service Horizon).
- **On the bench** (`Needs attention · N`): one **AttentionCard** per overdue/due-soon watch, most-urgent first.
- **Resting easy** (`On track · N`): compact **OnTrackRow** list for the rest.

### 3. Hub — Ledger layout — *the "file cabinet"*
A single white table card. Sortable column headers (click to sort, click again to reverse; active header shows a caret): **Piece · Last serviced · Next due · Interval · Lifetime upkeep · Papers · Warranty**, plus a trailing "+" (log) action. Each row is clickable (opens the dossier) with a subtle hover tint (`#FCFAF6`) and active tint (`#FBF7EE`). A **no papers** pill appears in the Papers cell when `hasPapers` is false. A bold **totals row** at the bottom (piece count · summed upkeep in gold · total docs).

### 4. Hub — Gallery layout
Responsive grid (`auto-fill, minmax(308px, 1fr)`, 18px gap) of editorial **GalleryCards**, ordered by attention. Each card: a cream image panel (status chip top-left, warranty chip top-right, large floating product shot with drop shadow), then brand/model/ref, a 2×2 stat grid (Last full service · Next due · Lifetime upkeep · On file count), and **Log a service** (primary) + **Dossier** (secondary) buttons.

### 5. Partner Service Centers (affiliate band)
Appears below the active layout, separated by a 1px rule. Gold eyebrow "PARTNER SERVICE CENTERS" + serif title, with a **"Sponsored"** pill top-right. Three cards (name, category eyebrow, blurb, CTA with a gold ↗). Hover raises border to gold + soft shadow. These are the **affiliate hooks**; wire CTAs to partner/affiliate URLs. Additionally, every **Find a center ↗** button throughout the app is an affiliate entry point (currently deep-links to a brand-specific service-center search).

### 6. Watch Dossier (right-side drawer)
Slides in from the right, **456px** wide, full height, cream background, with a dimmed backdrop (click or Esc to close). Structure top→bottom:
- **Header bar:** "SERVICE DOSSIER" eyebrow + **Export** (downloads this one watch's dossier) + close (×).
- **Hero:** product shot on a cream tile (116px) beside gold brand eyebrow, large serif model name, and ref/size/material/movement lines.
- **Ownership strip:** compact chips — Box / No box, Papers / No papers (green check when present), acquisition method, and the warranty chip.
- **Service summary card:** status chip + due read-out; a 2×2 of Last full service · Lifetime upkeep (gold) · **Service every [3y/5y/7y/10y]** segmented toggle (this writes `intervalYears` and recomputes next-due live) · Next full service; then **Log a service** (primary) + **Find a center ↗**.
- **Papers & Provenance:** count + filter chips (All + each present doc type); a list of document rows, each with a tinted "paper" thumbnail, label, type tag, date, and a view affordance. Shows a warning row when original papers are missing.
- **Service history timeline:** most-recent-first. A vertical rail where clock-resetting services get a **gold filled node** (others a hollow node); each entry shows type (glyph + label), date, provider, cost (or "No charge" in green), and notes.

### 7. Log a Service (modal)
Centered dialog (max 540px wide, scrolls if tall). Header shows the watch thumb + "LOG A SERVICE" + brand/model. Fields:
- **Service type** — the 8 type pills (single-select; active = ink fill). Selecting a clock-resetting type shows a gold note: *"Resets the service clock — next due recalculates to N years out."*
- **Date** (date input, capped at today) and **Cost (USD)** (number input with $ affix) side by side.
- **Service provider** — text input + quick-fill suggestion chips + a gold **"Find a [brand] center ↗"** affiliate link.
- **Notes** — textarea.
- Sticky footer: a live summary line (type · date · cost) + **Cancel** / **Save record**. Saving prepends the record to that watch's timeline and live-updates lifetime cost, next-due, and status everywhere. A confirmation toast appears bottom-center.

---

## Interactions & Behavior
- **Layout switch** (Agenda/Ledger/Gallery): instant, no animation needed; selection is local UI state.
- **Open dossier:** click a card / row / gallery "Dossier" → drawer slides in (`transform: translateX` over `0.32s cubic-bezier(0.32,0.72,0,1)`); backdrop fades in. Esc or backdrop click closes.
- **Log a service:** opens modal; **Save** prepends the record (immutably) and recomputes all derived values; closes modal; shows a toast (~2.8s).
- **Change interval:** the dossier's 3/5/7/10-year toggle updates `intervalYears` and immediately re-derives next-due/status for that watch across all views.
- **Sort (Ledger):** click header to sort asc; click again for desc.
- **Export dossier:** header button exports the whole collection; the drawer's Export exports one watch. Both generate a standalone, **print-ready branded HTML dossier** (cover meta, per-watch summary + service table + documents, and a totals block) and trigger a download. In production, prefer a server-rendered PDF or the codebase's existing export pathway.
- **Affiliate CTAs:** "Find a center", partner cards, and the modal's provider link are the monetization hooks — route to partner/affiliate destinations.
- **Hover states:** gallery cards lift (`translateY(-3px)` + shadow); ledger rows tint; partner cards border-gold + shadow.

## State Management
Per-watch: `records[]`, `documents[]`, `intervalYears`. App-level UI: active `layout`, `selectedWatchId` (drawer), `logForWatchId` (modal), transient `toast`. All derived values (status, next-due, lifetime cost, warranty) are **computed, never stored**. In production these map to `watches`, `watch_service_records`, and `watch_documents` tables (with RLS); mutations are the log-service insert and the interval update.

---

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| bg | `#FAF8F4` | page background (warm parchment) |
| slot | `#FFFCF7` | drawer/modal surface |
| card | `#FFFFFF` | cards, table |
| cream tile | `#FAF8F4` | watch-image tiles |
| ink | `#1A1410` | primary text, primary buttons |
| muted | `#A89880` | secondary text, labels |
| gold | `#C9A84C` | brand accent, eyebrows, totals, resets |
| border | `#EAE5DC` | hairlines |
| borderLight | `#D4CBBF` | stronger dividers / control borders |
| **Overdue** | text `#8A2020` · bg `#FAE8E8` · dot `#B23A3A` | red status |
| **Due soon** | text `#8A5010` · bg `#FFF3E0` · dot `#C98A2A` | amber status |
| **On track** | text `#2D6A2D` · bg `#E8F4E8` · dot `#5A9A5A` | green status |
| Warranty soon | text `#8A6A10` · bg `#FFF8E6` | |
| Warranty active | text `#1A4A8A` · bg `#E8F0FA` | |

### Type
- **Serif — Cormorant Garamond** (weights 300/400/500): all display/headings, model names, big stat values. h1 ~52px/300; section titles ~28px/400; model names 22–30px/400.
- **Sans — DM Sans** (400/500/600/700): all UI text, labels, numbers, buttons.
- **Meta label** convention: DM Sans, 9–10px, weight 500, `letter-spacing: 0.12em`, UPPERCASE, muted (or gold for eyebrows).
- Load both from Google Fonts.

### Spacing / Radius / Shadow
- Content max-width **1320px**; 40px gutters. Section gap **40px**; card padding 18–22px.
- Radii: cards 12–14px; chips/pills 20–26px (full); buttons 4px; inputs 8px; small tiles 7–10px.
- Shadows are soft and low-opacity (`rgba(26,20,16,0.04–0.1)`); product shots use `drop-shadow` to sit on cream tiles. Status chips: 6px colored dot + tinted pill.

---

## Components (reusable)
- **StatusChip** (dot + label, optional `· MonthYear`), **WarrantyChip** (shield + countdown), **TypeTag** (glyph + label pill, selectable), **DocChip** (filter chip with count), **Meta** (uppercase tracked label), **WatchThumb** (product shot on cream tile), **Icon** (inline 1.5px-stroke set: wrench, doc, box, shield, calendar, clock, plus, download, check, chevrons, drop, spark, receipt, list/grid/rows, arrowUpRight, search).
- **Service Horizon** (Agenda hero): a horizontal band with three zones — a tinted **Overdue** bucket (left of the NOW line), a **24-month dated axis** (ticks at 0/6/12/18/24 months → Now…Beyond), and a **Beyond** bucket (right). Each watch is a pill (small floating product shot + brand + due month) tethered to a **status-colored dot positioned exactly on its due month**; dated pieces also get a faint vertical guide down to the month ticks. Greedy lane-packing (3 lanes) avoids overlap; pills near the right edge flow leftward. A legend (Overdue/Due soon/On track) sits below. *Key UX principle the client called out: the **dot** is the unambiguous due-date marker.*

---

## Assets
Product shots in `source/img/` (PNG, transparent/white bg, displayed on cream tiles with a drop shadow): Rolex Datejust 41, Omega Speedmaster Broad Arrow, Patek Philippe Calatrava, Audemars Piguet Royal Oak Offshore, A. Lange & Söhne Lange 1, Oris Big Crown Pointer Date. Plus the Virtual Watchbox brand mark (`mark-gold.svg`, `mark-ink.png`). Replace with the owner's own uploaded photos in production (the product already supports per-watch photo uploads with a `photoType`).

## Files (`source/`)
- `The Service Room.html` — shell: fonts, pinned React+Babel, script order, mount.
- `service-data.jsx` — data model, taxonomies (service types, doc types, acquisition), the sample collection, formatting helpers.
- `hub-core.jsx` — **derived service logic** (status, next-due, costs, warranty, sort) + design tokens + shared primitives (chips, tags, icons, thumbs).
- `ServiceHorizon.jsx` — the horizon visualization.
- `HubAgenda.jsx` / `HubLedger.jsx` / `HubGallery.jsx` — the three layouts (+ shared `SectionHead`, `Stat`, button styles).
- `WatchDrawer.jsx` — dossier drawer (ownership strip, service summary + interval toggle, Papers & Provenance, timeline).
- `LogServiceModal.jsx` — the working log-a-service form.
- `dossier-export.jsx` — branded print-ready dossier generator.
- `MaintenanceHub.jsx` — root: nav, header, summary strip, layout switch, partner band, state, toast.

## Screenshots (`screenshots/`)
`01-agenda-overview` (header + summary + horizon) · `02-agenda-bench` (On the bench / Resting easy) · `03-ledger` (file-cabinet table) · `04-gallery` (editorial cards) · `05-log-service-modal` (form; the type-pill selector sits above the visible crop — see §7). The Watch Dossier drawer is a right-side overlay that screenshot tooling can't capture cleanly; see §6 and `WatchDrawer.jsx` for its full spec.
