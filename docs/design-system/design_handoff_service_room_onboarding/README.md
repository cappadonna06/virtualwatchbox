# Handoff: The Service Room — Empty States & First-Run Onboarding

## Overview
This package specifies the **empty states and first-run onboarding** for **The Service Room** — the Virtual Watchbox surface where collectors track each watch's service schedule, costs, warranty, and provenance documents. It covers the moments *before* the room is populated with data:

1. **Empty State — no watches yet** (marketing-forward first impression).
2. **Empty State — has watches, but no service data** (the conversion moment).
3. **Onboarding wizard** — a calm two-step flow (Set the clock → Build the dossier → Done) that turns an unresolved box into a live service schedule.

It is a companion to the existing **`design_handoff_service_room/`** package, which specifies the *populated* Service Room (Agenda / Ledger / Gallery hub, the Watch Dossier drawer, and the Log-a-Service modal). The **derived service logic, data model, and design tokens are shared** with that package and are summarized again here so this README is self-sufficient.

Both **desktop** and **mobile-first** layouts are included.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS** — static, high-fidelity prototypes that demonstrate the intended look, layout, copy, and interaction affordances. **They are not production code to paste in.** The task is to **recreate these designs in the Virtual Watchbox codebase using its existing environment and patterns** (the live app is React/Next.js + Supabase per the project notes). Reuse the app's existing components, design tokens, routing, and state — map the HTML structure onto those primitives; do not fork a parallel styling system.

Where a token already exists in the app theme, use it. The hex/size values below are the source of truth for what those tokens resolve to.

> The HTML boards present each screen as a labelled artboard for review (desktop) or inside a phone frame (mobile). The **device frame and board chrome are presentation only** — implement the *screen contents* responsively; don't build a bezel.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy, and interaction affordances are final. Recreate pixel-faithfully using the codebase's component library.

---

## Shared Data Model (recap)
Only the fields relevant to onboarding are listed; see `design_handoff_service_room/README.md` for the full model.

**Watch (collection item)**
| Field | Type | Notes |
|---|---|---|
| `id`, `brand`, `model`, `ref` | string | e.g. "Rolex", "Datejust 41", "126331" |
| `image` | url | transparent-bg product shot, shown on a cream tile or unframed |
| `acquiredDate` | date | fallback "clock start" when never serviced |
| `hasBox`, `hasPapers` | bool | drives ownership chips in Step 2 |
| `warrantyExpiry` | date \| null | optional, set in Step 2 |
| `intervalYears` | number | **configurable** full-service cadence — `3 \| 5 \| 7 \| 10`, **default 5** |
| `records[]` | ServiceRecord[] | empty during onboarding |
| `documents[]` | Document[] | populated in Step 2 |

**Document** `{ id, type, label, date }` — `type ∈ receipt · warranty_card · service_record · box_papers · appraisal · manual`.

### Derived logic (implement exactly — same as the populated hub)
- **`lastFullService(w)`** → most-recent record whose type resets the clock (`full` or `movement`). May be null.
- **`nextDueDate(w)`** → `lastFullService.date` **(or `acquiredDate` if never serviced)** `+ intervalYears`.
- **`serviceStatus(w)`** → months from today to `nextDueDate`: `< 0` → **Overdue**; `0–6` → **Due soon**; `> 6` → **On track**.
- **Estimate flag** → when next-due is computed from `acquiredDate` (never serviced) rather than a real service record, surface a soft **"Estimate"** badge.

These are **computed, never stored**. The only writes during onboarding are: `intervalYears` (Step 1), and `documents[]` / `hasBox` / `hasPapers` / `warrantyExpiry` (Step 2).

---

## Screens / Views

### App shell (Screens 1 & 2)
- **Top nav**, 62px (desktop) / 54px (mobile), translucent cream, 1px bottom border. Left: serif **"VW"** monogram in `--gold-deep` + divider + **"The Service Room"** label. Right (desktop): text links *Collection · Discover · Playground* (muted) and **Service Room** (active, ink). Mobile: hamburger · monogram+label · 30px ink avatar.
- **Page header** (desktop): gold eyebrow `MAINTENANCE & PROVENANCE`; serif `h1` "The Service Room" at **52px / weight 300**; one-line muted subtitle.

---

### Screen 1 — Empty State: no watches yet
**Purpose:** Sell the Service Room and preview the payoff before asking for a single watch.

**Desktop layout** — a single white empty-state card (`--slot`, radius 12px, `--shadow-lg`, 1px `--border-mid`, 44px padding):
- **Top row** — 2-col grid `minmax(0,1.08fr) / minmax(0,1fr)`, 64px gap, `align-items:start`:
  - **Left:** gold eyebrow `THE SERVICE ROOM` → serif headline **"Care is part of the *collection*."** (42px/300, last word italic, forced line break before the italic word) → muted sub paragraph (`--ink-soft`, 15px/1.62).
  - **Right:** muted eyebrow `WHAT THE ROOM KEEPS` → a column of **3 benefit rows**, each = a 38×38px `--tint` rounded-square (radius 9px) holding a 1.5px-stroke `--gold-deep` icon, then a bold 15px title (`--ink`) + 13.5px muted one-liner:
    1. **Never miss a service** — "We estimate every watch's next service date." (icon: clock)
    2. **A dossier that travels** — "Receipts, warranty cards, and records in one place." (icon: doc)
    3. **Know what it's worth to keep** — "Lifetime upkeep at a glance, piece by piece." (icon: coins)
- **Hero visual** — full card-width, separated by a 1px top border (36px gap). A **ghosted Service Horizon** preview: centered gold eyebrow `A PREVIEW OF YOUR SERVICE HORIZON`, then the horizon band (see *Service Horizon* component) rendered at `filter:grayscale(.35); opacity:.62` with ~4 faded sample watch pills, and a centered muted caption "Each watch lands on the horizon, marked by when it's next due."
- **Footer** — 1px top border (28px gap): primary CTA **"Add your first watch"** (`+` icon) on the left + a gold text link **"Browse the catalog →"**.

**Mobile layout** (390pt screen): app header → scroll body (eyebrow, 34px serif headline, sub, the 3 benefit rows, then a bordered **vertical agenda preview** card replacing the horizontal horizon — 3 faded watch rows each with a status dot + due month, captioned) → **sticky bottom CTA bar** (`--slot`, 1px top border, soft top shadow) holding the full-width ink **"Add your first watch"** button + centered "Browse the catalog →" link.

**Behavior:** Primary CTA and "Browse the catalog →" both route into the existing Add-a-Watch flow / catalog respectively. The ghosted horizon is **decorative/non-interactive**. Render this whole screen only when `watches.length === 0`.

---

### Screen 2 — Empty State: has watches, no service data *(the key screen)*
**Purpose:** The collector owns watches but has never logged a service, set an interval, or uploaded a document. Show their pieces **present but unresolved** to create gentle tension, paired with the offer that resolves it.

**Desktop layout** — 2-col grid `minmax(0,1.34fr) / minmax(0,1fr)`, 30px gap, `align-items:start`:
- **Left — collection panel** (white card, radius 12px, `--shadow-xs`):
  - Header (1px bottom border): serif title "Your collection" + muted "5 pieces"; right-aligned **amber pill** `● Schedule not set` (`--ds-bg` / `--ds-fg`, dot `--ds-dot`).
  - **Watch rows** (one per watch, 1px dividers, 20px/26px padding): an **88×88px unframed product shot** (transparent PNG, `drop-shadow(0 5px 12px rgba(26,20,16,.17))`, *no tile/border*) + a meta block (`--gold-deep` brand eyebrow · **serif model name 23px** · muted ref line) + a right-side stat group: **Last serviced** = `—` (`--border-light`), **Next service** = either a dashed **"Estimate"** badge or `—`.
  - Footer strip (`#FCFAF6`, 1px top border): clock icon + muted "No service history on file yet."
- **Right — offer panel** (`--slot` card, radius 12px, `--shadow-lg`, 34px×32px padding): gold eyebrow `SET UP THE ROOM` → serif headline **"Turn the box into a *documented* collection."** (33px/300, "documented" italic, forced break) → muted sub "You've shown what you own. Now make it maintained." → a **"what you'll get" checklist** (4 rows, each a 24px `--ok-bg` circle with a `--ok-fg` check + 14.5px label): *An accurate service schedule · A provenance dossier · Resale-ready records · Warranty tracking* → 1px-bordered footer with full-width primary **"Set up my schedule"**, centered gold link **"I'll do this later"**, and a centered lock-icon privacy line "Your records stay private to you."

**Mobile layout:** app header → collection header (eyebrow "Your collection · 5 pieces" + amber "Schedule not set" pill) → watch list (68px unframed shots, brand eyebrow + 20px serif model + "NEXT SERVICE" label with Estimate/`—`) → a tinted **offer card** (`--tint`, radius 14px) with the same eyebrow/headline/checklist → **sticky bottom CTA bar** (primary "Set up my schedule" + "I'll do this later" link + privacy line).

**Behavior:** "Set up my schedule" (and the watch rows) open the **onboarding wizard** (Screen 3). "I'll do this later" dismisses to the room in its unresolved state. Render this screen when `watches.length > 0` **and** no watch has any `records`, `intervalYears` set, or `documents`.

---

### Screen 3 — Onboarding Wizard
A two-step flow. **Desktop:** a centered modal (~560px wide, radius 12px, `0 16px 50px rgba(0,0,0,.42)` shadow) over a dimmed warm-dark page (`radial-gradient(#2c2823 → #1d1b16)`). **Mobile:** the same flow rendered **full-screen** (no modal chrome; the screen *is* the wizard). All three states are shown stacked (desktop) / as three phones (mobile): **Step 1**, **Step 2**, **Completion**.

**Modal/screen anatomy:** header (gold eyebrow `STEP n OF 2` + serif title + close `✕`), a 2-segment **progress bar** (`--ink` = current, `--gold-deep` = done, `--border` = upcoming), a scrolling body, and a sticky footer (`#FCFAF6`, 1px top border).

#### Step 1 · "Set the clock"
The minimum needed to generate an accurate schedule.
- **"Set one interval for all"** control at top — a `--tint` rounded row (radius 8–10px): bold label + sub "Most automatics run a 5-year cadence." and a **segmented `3y / 5y / 7y / 10y`** toggle (active = ink fill, **default 5y**). One tap applies to every row.
- **Per-watch rows** (3 sample rows; 1px dividers), each:
  - Top line: 40px product tile + **brand · model** name + a quiet **"Skip"** link (row is skippable).
  - **Last full service** control — a bordered date field (calendar icon). Includes a **"Never serviced? Use purchase date"** checkbox; when checked, the field reads `Purchase date · <month yr>` and a soft amber **"Estimate"** badge appears. A quiet **"Not sure?"** helper sits beside it.
  - **Service every** — the per-watch `3 / 5 / 7 / 10`-year segmented toggle (default 5y; writes `intervalYears`).
- **Footer:** progress text ("3 pieces ready") + primary **"Continue"**.

#### Step 2 · "Build the dossier" *(skippable, optional)*
Per watch:
- A context row (product tile + brand/model + "Skip piece").
- **Box** and **Papers** toggle chips (active = `--ok-bg` / `--ok-fg` with a check).
- An optional **Warranty expiry** date field.
- A **drag-and-drop upload zone** (1.5px dashed, `#FCFAF6`, upload icon in a `--tint` square): "Drop receipts, warranty cards, service records — or click to choose."
- **Uploaded items** as small tiles: a tinted "paper" thumbnail (`#F4EFE6` with a white page + doc glyph) + an **editable document-type select** (`receipt · warranty card · service record · box & papers`). Desktop shows tiles in a row; mobile uses a 2-col grid.
- **Footer:** secondary **"Skip for now"** + primary **"Finish"**.

#### Completion · "Your schedule is live"
- Centered success header: a 50–54px `--ok-bg` circle with a check, green eyebrow `ALL SET`, serif **"Your schedule is live"**, muted sub "Every piece has a next-service date. We'll keep it current."
- A **resolved list** of the same watches, each now showing a real next-service month and a colored **status pill** (Overdue / Due soon / On track) computed from the new interval. Sample mix: AP Royal Oak Offshore → *Overdue · was due Nov 2024*; Omega Speedmaster → *Due soon · Sep 2026*; Rolex Datejust 41 → *On track · Mar 2029*; Patek Calatrava → *On track · Nov 2027*.
- A lock-icon **privacy line** "Your records stay private to you."
- **Footer:** primary **"View my agenda"** (+ secondary "Add more detail").

**Design principles to honor:** smart, non-blocking defaults (5y interval; an unknown service date schedules from the purchase date and shows a soft *Estimate* badge); **nothing is required to proceed** — every step and row is skippable; include one quiet line that records stay private to the owner.

---

## Service Horizon component (used ghosted in Screen 1 desktop)
A horizontal band, ~178px tall (radius 12px, white, 1px `--border`). Three zones: a tinted **Overdue** bucket on the left of the `NOW` line (~13%), a **24-month dated axis** with ticks at 0/6/12/18/24 months (`Now · Dec '26 · Jun '27 · Dec '27 · Beyond`), and a **Beyond** bucket on the right (~87%). Each watch is a rounded **pill** (small floating product shot + brand + due month) tethered to a **status-colored dot positioned exactly on its due month**; dated pieces also drop a faint vertical guide to the axis. Greedy 3-lane packing avoids overlap; pills near the right edge flow leftward. A legend (Overdue / Due soon / On track) sits below. *In the empty state this is rendered faded (grayscale + reduced opacity) with sample pills as a non-interactive preview.* On **mobile** it is replaced by a **vertical agenda list** (watch + status dot + due month per row). See `design_handoff_service_room/source/ServiceHorizon_h5.jsx` for the precise placement math.

---

## Interactions & Behavior
- **Which empty state renders:** `watches.length === 0` → Screen 1. `watches.length > 0` and no service data anywhere → Screen 2. Otherwise → the populated hub.
- **Open wizard:** Screen 2's "Set up my schedule" (or a watch row) opens the wizard. Desktop = modal + dimmed backdrop (fade in; Esc / backdrop-click closes). Mobile = full-screen route.
- **Interval toggles:** "Set one interval for all" writes `intervalYears` to every watch; per-row toggles override a single watch. Both immediately re-derive `nextDueDate` / `serviceStatus` for the Completion preview.
- **Never serviced checkbox:** swaps the clock start to `acquiredDate` and tags the resulting next-due with the **Estimate** badge.
- **Step 2 uploads:** dropping/choosing a file adds a `document` tile with an editable `type`; toggling Box/Papers sets `hasBox`/`hasPapers`; warranty field sets `warrantyExpiry`.
- **Nothing is required:** "Skip", "Skip piece", "Skip for now", and "I'll do this later" all advance/dismiss without writing.
- **Completion → "View my agenda":** routes to the populated Agenda hub.
- **Reduced motion:** all transforms/transitions are decorative — honor `prefers-reduced-motion: reduce`.

## State Management
- `watches: Watch[]` — gates which screen renders.
- Wizard UI state: `wizardOpen`, `step` (1 | 2 | done), and a working draft of per-watch `{ intervalYears, lastServiceDate | usePurchaseDate, hasBox, hasPapers, warrantyExpiry, documents[] }`.
- On **Finish/Continue**, commit the draft: write `intervalYears` and any `documents` / ownership / warranty fields to each watch (maps to `watches`, `watch_documents` tables with RLS in production). All status/next-due values are **computed, never stored**.

---

## Design Tokens
Canonical source: `colors_and_type.css` (bundled). These are the readability-pass values used by the refreshed app.

### Color
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FAF8F4` | page background (warm parchment) |
| `--slot` | `#FFFCF7` | cards, modal/drawer surfaces |
| `--card` | `#FFFFFF` | panels, table cards |
| `--tile` | `#FAF8F4` | watch-image tiles |
| `--tint` | `#F4EFE6` | benefit icon squares, "interval for all" row, offer card (mobile) |
| `--bg-2` | `#F2EEE5` | Estimate badge fill |
| `--ink` | `#1A1410` | primary text, primary buttons |
| `--ink-soft` | `#43392E` | lead/intro paragraphs |
| `--muted` | `#6A5B48` | secondary text, captions (≈6:1 AA) |
| `--faint` | `#9A8B73` | decorative only — stat dashes, slot numbers |
| `--gold` | `#C9A84C` | bright gold — dark surfaces / decorative accents only |
| `--gold-deep` | `#876A12` | antique gold — eyebrows, links, gold text on light (AA) |
| `--border` | `#EAE5DC` | hairlines / dividers |
| `--border-mid` | `#E8E2D8` | card borders |
| `--border-light` | `#D4CBBF` | control borders, empty-stat dash |
| **Overdue** | text `#8A2020` · bg `#FAE8E8` · dot `#B23A3A` | red status |
| **Due soon** | text `#8A5010` · bg `#FFF3E0` · dot `#C98A2A` | amber status (also "Schedule not set" pill) |
| **On track** | text `#2D6A2D` · bg `#E8F4E8` · dot `#5A9A5A` | green status (also checklist checks) |
| Warranty soon | text `#8A6A10` · bg `#FFF8E6` | |
| Warranty active | text `#1A4A8A` · bg `#E8F0FA` | |

### Type
- **Serif — Cormorant Garamond** (300/400/500, plus italics): all display/headings, model names, big stat values. h1 52px/300; section & offer titles 28–33px/300–400; model names 19–23px/400; headlines set one **italic** word. Load from Google Fonts.
- **Sans — DM Sans** (400/500/600/700): all UI text, labels, numbers, buttons.
- **Eyebrow / meta convention:** DM Sans, 10–12px, weight 600, `letter-spacing:.12–.14em`, UPPERCASE, `--gold-deep` (gold eyebrows) or `--muted`.
- **Buttons:** DM Sans, ~11.5–12px, weight 600, `letter-spacing:.1em`, UPPERCASE.
- **Floor:** 11px for any real text. The `—` in empty stat cells is a *no-value glyph*, not prose.

### Spacing / Radius / Shadow
- 4px spacing scale (4 / 8 / 12 / 16 / 24 / 32 / 40 / 56). Desktop content max-width ~1100–1280px; card padding 32–44px.
- Radii: buttons 4px · small cards 6px · modals/inputs 8px · cards 10–12px · large panels 12–14px · pills/badges 20px · circle 9999px.
- Shadows: resting `0 1px 4px rgba(26,20,16,.04)` · large panel `0 4px 24px rgba(26,20,16,.06)` · floating modal `0 8px 24px rgba(26,20,16,.13)` (mobile sticky bar uses a soft top shadow `0 -10px 26px rgba(26,20,16,.06)`). Product shots use `drop-shadow`, never a box-shadow, so they sit on cream.

### Iconography
Inline **1.5px-stroke**, no-fill SVG set (`viewBox 0 0 16 16`): clock, calendar, doc, box, coins, check, plus, close, arrow-up-right, upload, help, lock, spark, receipt, chevron-down. Swap for the codebase's existing icon set (e.g. Lucide: `clock`, `file-text`, `package`, `coins`, `check`, `plus`, `x`, `arrow-up-right`, `upload`, `help-circle`, `lock`, `sparkles`, `receipt`, `chevron-down`).

> **Implementation gotcha (observed while building these mocks):** Cormorant Garamond's metrics differ from the fallback, so a serif headline that wraps can collide with the element beneath it during the font swap. In the static mocks this was avoided with explicit line breaks / `white-space:nowrap` on short titles. In a real app, prefer `font-display: optional`/`swap` with a metrics-matched fallback and ensure headings reserve their wrapped height — don't rely on a frozen single-line box.

---

## Assets
Product shots (PNG, transparent bg) in `img/`: Rolex Datejust 41, Omega Speedmaster Broad Arrow, Patek Philippe Calatrava, Audemars Piguet Royal Oak Offshore, A. Lange & Söhne Lange 1, Oris Big Crown Pointer Date. **In production, use the owner's own uploaded photos** — these are stand-ins. The "VW" monogram is a serif text placeholder; **use the real Virtual Watchbox brand mark** from `brand/` in the design system.

## Files
- `The Service Room - Onboarding.html` — desktop board: all three screens as labelled artboards.
- `The Service Room - Onboarding Mobile.html` — mobile-first board: the same three flows in phone frames (Screen 1, Screen 2, and the wizard as Step 1 / Step 2 / Completion).
- `colors_and_type.css` — canonical design tokens (source of truth).
- `img/` — watch product shots used in the mocks.

### Related
- `design_handoff_service_room/` — the **populated** Service Room (hub layouts, Watch Dossier drawer, Log-a-Service modal) and the full data model + derived-logic source (`hub-core.jsx`, `service-data.jsx`, `ServiceHorizon_h5.jsx`). Implement onboarding and the populated hub against the same logic.
