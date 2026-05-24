# Virtual Watchbox PRD — v1.14

**Site:** virtualwatchbox.com  
**Tagline:** *Showcase Your Timepieces. Discover What's Next.*  
**Updated:** May 2026 — v1.14

| Version | Change |
|---|---|
| v1.0 | Initial PRD |
| v1.1 | Added Core Interaction Pattern (hover card + slide-out sidebar) |
| v1.2 | Added Physical Watch Box Commerce to monetization |
| v1.3 | Added Feature 2A — My Collection Page (views, stats, draft workflow) |
| v1.4 | Added Feature 2B — Watch Categories (Collection, Playground, Followed, Next Targets, Grail) and expanded catalog/data model planning. |
| v1.5 | Added shared watchbox overflow handling and expanded the add-watch flow. |
| v1.6 | Expanded Feature 4 — Playground Mode to current shipped scope, including cards view, stats, box customization, and entry editing. |
| v1.7 | Synced the PRD to the current codebase for Feature 3, Feature 4, session/data model, and roadmap. |
| v1.8 | Added profile-first sharing, public profile/box surfaces, and the Followed → Next Targets → Grail hierarchy. |
| v1.9 | Added current implementation status snapshot and Feature 2A third view: Real Watchbox Photo for My Collection. |
| v1.10 | Added Collection Jewel, tightened ownership rules for Target/Grail/Jewel intent states, and added profile hero selection between Grail and Jewel. |
| v1.11 | Added Feature 6 — Settings & Account Controls, including account deletion/data controls, privacy/sharing controls, and legal transparency surfaces. |
| v1.12 | Shipped Feature 9 — AI Photo Identification ("Watchbox Concierge") end-to-end with verify vs intake split, market-value capture, and dial-bbox cropping. Added Feature 2D — Per-Watch Photo Gallery (sidebar + owned-watch detail page + lightbox + drag-reorder). Added Feature 2E — Owned Watch Detail Page (`/collection/watch/[id]`). Updated Feature 3 with duplicate-aware add page and add-from-photo for not-in-catalog watches. Added Feature 13 — Admin Catalog & Submissions Tooling. Documented `/news` (Feature 11) and `/discover` (new Feature 14) which were already shipped but listed as pending in v1.11. **Intent fix:** Grail no longer has a planned `/collection` surface — by definition Grail is unowned, so its home is the FeaturedProfileWatch picker on `/profile`. The earlier "Grail surface on /collection" planning was dropped. The `/collection` UI pass now scopes to Next Targets treatment + header / stats / cards / mobile polish. |
| v1.13 | **Catalog scale-up:** 35,659 catalog watches in Supabase with 4,000+ imaged; server-side search via pg_trgm full-text index + curated nicknames; heat-score algorithm rework. **Discover editorial redesign:** magazine-style layout with LLM-personalized hero, daily-rotated recommendations, per-section refresh, model-family filtering, mobile compact dark hero. **Playground upgrades:** import collection on empty box, drag-from-tray with long-press reorder + sparse slots + drag-to-trash, Supabase persistence for logged-in users. **Admin image-review tool** at `/admin/image-review` with failure-mode tagging. **Collection improvements:** empty-state CTA with auth-nudge layer, stability fix decoupling owned-set from heat-score cache. Updated Feature 3 search infrastructure, Feature 4 shipped scope, Feature 13 with image-review, Feature 14 with editorial redesign. Cleaned Phase 3 of already-shipped duplicates. |
| v1.14 | **Next Targets moved from `/collection` to `/discover`** — aspirational watches belong on the discovery surface, not the owned-watches surface (same principle that moved Grail to `/profile`). Added Targets/Grail section to Feature 14 (Discover) as § 03 between Upgrade and Next Slot. **Feature 2D photo categories promoted from P2 to P0** — photo type picker (wrist shot, receipt, warranty card, case back, etc.) surfaced in upload and lightbox. Added document-oriented types: `receipt`, `warranty_card`, `service_record`. **Feature 2F — Service History** — new per-watch service tracking with timeline, next-due estimates, and cost tracking. Added "Papers & Provenance" and "Service History" sections to Feature 2E detail page. **Feature 7 rewritten as "The Strap Drawer"** — first-class strap inventory at `/collection/straps` with `UserStrap` + `StrapWatchOverride` data models, auto-match by lug width, manual overrides, combo stats, compatibility matrix. Replaces old one-liner stub + VW-17/VW-18. Updated data model with `UserStrap`, `StrapWatchOverride`, `StrapMaterial`, `StrapStyle`, `WatchServiceRecord` types. Updated `/collection` UI pass scope to remove Targets (now on Discover) and add ownership detail fields. |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Interaction Pattern](#2-core-interaction-pattern)
3. [Core Features](#3-core-features)
4. [Monetization Strategy](#4-monetization-strategy)
5. [Technical Stack & Integrations](#5-technical-stack--integrations)
6. [MVP Build Roadmap](#6-mvp-build-roadmap)
7. [Success Metrics](#7-success-metrics)
8. [Competitive Differentiation](#8-competitive-differentiation)

---

## 1. Product Overview

Virtual Watchbox is a luxury-tech web platform that brings watch collections to life. Built for collectors, dreamers, and horological explorers, it gives users a dynamic, fully customizable digital watch box where they can display, organize, and interact with their watches in detail.

### 1.1 Mission Statement

To be the definitive digital home for every watch collector — a place to showcase what you own, explore what you want, and discover what's next.

### 1.2 Target Users

- Active watch collectors managing an existing collection
- Aspiring collectors building dream boxes and wishlists
- Watch enthusiasts who follow market news and trends
- Casual buyers discovering and purchasing their next watch

### 1.3 Platform

- **Primary:** Web app (responsive desktop and mobile)
- **Future:** Native iOS and Android

---

## 2. Core Interaction Pattern

### Hover Card + Slide-Out Sidebar

The universal UI standard applied across every watch box surface in the product.

1. **Hover** — floating mini-card appears above the slot with brand, name, ref, size, estimated value, and a click-to-expand cue
2. **Click** — right-hand sidebar slides open with full detail: dial visualization or product image, specs, value/ownership data, and actions
3. **Dismiss** — re-click the active slot, click the close affordance, or dismiss the mobile sheet/backdrop

**Design rules:**
- Hover card never obscures adjacent slots
- Sidebar swaps content in place without reflowing the grid
- Only one sidebar is open at a time
- Empty slots show an add-watch affordance
- Active slot is highlighted with a gold border while the sidebar is open
- Watchboxes auto-expand to the next supported slot count as watch count grows
- At max visible capacity, the final slot becomes a `+N more` overflow slot
- Clicking overflow opens a hidden-watch list:
  - desktop: anchored flyout
  - mobile: bottom sheet

**Applies to:** homepage watchbox, `/collection`, `/playground`, shared embedded watchbox surfaces, and future public box pages

The owned-watch detail surface is a **dedicated route** (`/collection/watch/[id]`) layered on top of the sidebar. The sidebar remains the at-a-glance view; the detail page is the focused "manage my watch" surface (Feature 2E).

---

## 3. Core Features

### Feature 1 — Virtual Watch Box Display

The homepage centerpiece. A high-fidelity grid layout replicating the feel of a real watch box.

**Functional Requirements**
- Grid with configurable slot count: `4`, `6`, `8`, `10`
- Box customization: frame material, lining, slot count
- Box config persisted locally and to Supabase when signed in
- Hover card + click sidebar (Section 2)
- Empty slot → Add Watch flow (Feature 3)
- Overflow handling: auto-expand through supported slot counts, then show `+N more` in the final slot
- Auto-grown slot counts persist to Supabase (no shrink-then-grow flicker on reload)
- Responsive layout
- Drag-and-drop slot reordering (P1)
- Customize popover dismisses on click-outside + Escape

| Feature | Priority |
|---|---|
| Box grid display | P0 |
| Hover card + sidebar | P0 |
| Box customizer (frame, lining, slot count) | P0 |
| Empty slot Add Watch flow | P0 |
| Watchbox overflow handling | P0 |
| Auto-grow slot count synced to cloud | P0 |
| Drag & drop reorder | P1 |

---

### Feature 2 — Watch Detail Sidebar

Triggered by clicking any watch slot. This is the shared detail surface across owned, aspirational, and public watchbox experiences.

**Displays:** dial visualization or product image, brand, model, reference, case size, material, dial color, movement, complications, condition/value badges, estimated value, and supporting notes/specs depending on surface.

**Owner-only sidebar additions** (My Collection mode):
- **Photos section** — horizontal thumbnail strip of the user's per-watch gallery (Feature 2D), with `+ Add` and the gold ★ primary marker.
- **`View full detail →`** link to the owned-watch detail page (`/collection/watch/[id]`, Feature 2E).

**Quick actions vary by surface:**
- **Collection:** Find For Sale ↗ / Sell This Watch / Swap Strap / Edit / Delete
- **Playground:** Find For Sale ↗ / Add to My Collection / Edit / Delete
- **Public readonly surfaces:** Find For Sale ↗ plus any non-mutating public CTA

The Photos section is hidden in `mode='public'` and `mode='followed'` — the gallery is a personal record, not a public one.

---

### Feature 2A — My Collection Page (`/collection`)

Dedicated working surface for owned watches. Three primary views plus a persistent stats section, all sharing data with the homepage watchbox.

#### Views
- **Watchbox** — reuses homepage component + box customizer toolbar
- **Cards** — watch card presentation with brand, model, ref, type badge, value, and ownership status
- **Stats section** — below-fold factual analysis, always visible independent of the current top view

**Watchbox overflow behavior**
- Watchbox view remains complete up to the max visible box size through auto-expansion
- If owned watches exceed max visible capacity, the final slot becomes `+N more`
- Cards view is always the full-list surface for every owned watch

#### Stats
- Portfolio value (total, cost basis, gain/loss)
- Dial colors — chip row with counts including zeros
- Watch types — badge grid with counts including zeros
- Complications — badge grid with counts including zeros
- Brand breakdown — pill list

#### Draft Workflow
Collection layout/config changes create local draft-like state. Add-watch actions are committed immediately; watchbox configuration changes still surface an unsaved changes bar.

Unsaved changes bar:
`You have X unsaved changes` → Save to My Collection / Save as Playground / Discard

`Save as Playground` is a placeholder for the next phase.

#### Near-Term Expansion

**`/collection` UI pass.** A cohesive visual + structural review of the working surface, scoped to:

- **Header / value pill / action button** spacing and hierarchy review
- **Stats section** typography and density pass (portfolio value, dial colors, watch types, complications, brand breakdown)
- **Cards view** spacing + status badge consistency
- **Mobile reflow** for sidebar → bottom sheet transitions and overflow behavior
- **Surface existing ownership detail fields in EditWatchModal** — `has_box`, `has_papers`, `acquisition_method`, `warranty_expires_at`, `last_serviced_at`, `service_notes`. These columns exist in Supabase (migration 017) but aren't exposed in the edit UI yet.

> Both Grail and Next Targets are intentionally **not** on `/collection`. `/collection` is the truth about what the user owns. Aspirational/intent surfaces belong on `/discover` (Targets/Grail section) and `/profile` (FeaturedProfileWatch picker). See Feature 14 § 03 for the Targets/Grail treatment.

**Other near-term:**
- Save as Playground flow
- Review Changes drawer
- Card filters
- Shop This Box CTA

#### View C — Real Watchbox Photo (camera icon)

A third Collection view that represents the collector's **actual physical watchbox** as a photo surface, separate from the virtual slot UI and card list.

**Entry in view switcher**
- Third icon in the My Collection view switcher uses a camera metaphor
- Ordering: Watchbox / Cards / Photo

**States**
- **Photo exists:** show saved watchbox photo in a framed surface
- **No photo yet:** centered helper state with camera-style graphic, short helper copy, and two actions:
  - `Upload Photo`
  - `Take Photo`

**Take Photo workflow**
- Open guided capture helper area with:
  - Framing guide overlay optimized for top-down watchbox photos
  - Brief helper copy for lighting, distance, and angle
  - `Retake` and `Use Photo` controls

**Upload workflow**
- Standard file picker for image upload (`jpg`, `png`, `heic` where supported)
- Client-side compression/resizing before save for performance

**Post-save actions**
- Replace photo
- Remove photo (returns to helper state)

**Persistence**
- Demo/local mode: local/session storage
- Account mode: Supabase Storage `watch-photos` bucket with watchbox config row

**MVP guardrails**
- Informational visual surface only in v1
- No slot-level click targets or per-watch image mapping in this phase

---

### Feature 2B — Watch Categories

These categories define the main user-facing states and surfaces in the product. In practice, the same catalog watch can appear in multiple places: as an owned watch, a followed watch, or one or more Playground entries.

The intent model is intentionally split between owned and unowned states:

- **Followed** can apply to any catalog watch, owned or unowned.
- **Next Target** can apply only to unowned watches and must be followed.
- **Grail** can apply only to an unowned followed watch.
- **Collection Jewel** can apply only to an owned collection watch.

This preserves a clean collector mental model: Grail is what the user is chasing; Jewel is the pride of what they already own.

#### Category 1 — In My Collection

The source of truth. These are watches the user actually owns.

- Populates the homepage watchbox and `/collection`
- Homepage and `/collection` watchboxes may show `+N more` overflow
- Stats are computed only from this category
- Managed via the Add Watch flow (Feature 3) or Add From Photo (Feature 9)
- Full ownership metadata: condition, purchase date, price paid, estimated value, notes
- Adding a duplicate is allowed; the catalog detail/add page treats duplicates first-class (Feature 3)

**Data:** `collectionWatches: Watch[]`

---

#### Category 2 — Playground Watches

Fantasy/dream collections. Not owned. Each watch belongs to a named Playground box.

- Lives on `/playground`
- Multiple named boxes: Dream Collection, Under $10K, Travel Box, etc.
- Each box has its own frame, lining, slot count, and entry list
- Playground boxes can overflow via `+N more`
- Same hover card + sidebar interaction, but sidebar emphasizes market value rather than ownership value
- Sidebar CTAs: Find For Sale ↗ / Add to My Collection, with edit/delete controls for the selected Playground entry
- Built directly on `/playground` today
- Any watch added to any Playground box is automatically added to Followed Watches
- Removing a watch from Playground does **not** auto-remove it from Followed Watches

**Data:** `playgroundBoxes: PlaygroundBox[]` with entry-based storage and optional per-entry overrides

---

#### Category 3 — Followed Watches

The canonical aspirational save layer. A followed watch is something the user wants to keep track of, compare, or potentially buy later.

- Heart/save behavior feeds this category
- Watches added to Playground are auto-followed
- No ownership metadata required
- Dedicated Followed Watches surface is future work
- Followed Watches are the base pool for both Next Targets and Grail
- Can be promoted to Next Target or designated as Grail only when the watch is not owned
- Owned watches may remain followed, but cannot be Target or Grail

**Data:** `followedWatchIds: string[]`

---

#### Category 4 — Next Targets

Up to 3 followed watches the user plans to acquire next. This is a curated shortlist, not a separate watch pool.

**Rules**
- Must be a subset of Followed Watches
- Must not be in My Collection
- Max 3 enforced
- Intended to force prioritization and curation

**Fields per target:**
- Watch (from followed watches / catalog)
- Target price (optional)
- Desired condition
- Intent type: `Addition` | `Replacement`
- If Replacement: which owned watch it would replace
- Linked Playground box (optional)
- Notes
- Target date (optional)

**UI**
- Dedicated section on `/discover` (§ 03 — see Feature 14). Targets and Grail are aspirational/intent state — they belong on the discovery surface alongside algorithmic recommendations, not on `/collection` (owned-watches truth).
- Public profile surfacing is possible later
- Each target includes `Track Listings →` affiliate CTA

**Data:** `nextTargets: WatchTarget[]` (max 3)

---

#### Category 5 — Grail

Exactly one followed watch designated as the user's emotional north star.

**Rules**
- Must be a followed watch
- Must not be in My Collection
- Exactly one at a time
- Special crown-icon treatment and dedicated visual emphasis

**UI**
- Surfaced prominently in the profile card via the FeaturedProfileWatch picker (Grail or Jewel)
- Grail's home is `/profile` — by definition Grail is unowned, so it does not belong on `/collection` (the owned-watches surface)
- Shows brand, model, reference, and estimated market price
- CTA: `Find on Market →`

**Data:** `grailWatchId: string | null`

---

#### Category 6 — Collection Jewel

Exactly one owned watch designated as the centerpiece or pride of the user's actual collection. This is the owned counterpart to Grail.

**Rules**
- Must be in My Collection
- Exactly one at a time
- Cannot be a Next Target or Grail while owned
- If a watch is removed from Collection, clear Jewel status if matched
- If a Grail is added to Collection, clear Grail status and optionally prompt the user to make it the Collection Jewel
- Followed state may remain unchanged when a watch becomes Jewel

**UI**
- Diamond/gem icon treatment
- Badge label: `Jewel`
- Badge appears on owned watch cards and owned watchbox slots
- Hover card line: `Collection Jewel`
- Sidebar action: `Set as Jewel` / `Remove Jewel`
- Profile hero can feature either the Grail or the Collection Jewel using the same card shell

**Data:** `collectionJewelWatchId: string | null`


---

#### Category Summary Table

| Category | Max | Page | Metadata | Stats | Actions |
|---|---|---|---|---|---|
| In My Collection | Unlimited | Homepage + `/collection` + `/collection/watch/[id]` | Full ownership + photo gallery | Yes | Find For Sale, Sell, Swap Strap, Manage gallery |
| Playground Watches | Unlimited | `/playground` | Per-box config + optional per-entry overrides | Box-level only | Find For Sale, Add to Collection, Edit, Delete |
| Followed Watches | Unlimited | Dedicated surface pending; profile section later | None | No | Add to Collection, Promote to Target, Set as Grail |
| Next Targets | 3 | `/discover` § 03 | Target metadata on followed watches | No | Track Listings |
| Grail | 1 | Profile card (FeaturedProfileWatch picker on `/profile`) | Special designation on unowned followed watch | No | Find on Market |
| Collection Jewel | 1 | Collection watchbox/cards + profile hero | Special designation on owned watch | No | View in Collection, Swap Strap, Service, Insure |

---

#### Watch Catalog vs. Collection

**The catalog is the union of `lib/watches.ts` (static seed) and `public.catalog_watches` (dynamic Supabase rows).**

- Catalog: all available references used in search/add/discovery flows, filtered by `moderation_status='approved' OR submitted_by=auth.uid()`
- Collection: the user's owned watches
- A catalog watch becomes an owned watch only when explicitly added to Collection
- Dynamic rows take precedence over static seed for the same id, so admin edits to seed watches are effective on every read site

Catalog watches must never show owned status unless the user has actually added that watch to the collection state.

---

### Feature 2D — Per-Watch Photo Gallery

Every owned watch has a personal photo gallery — wrist shots, "received it today", service receipts, anything the collector wants to remember about that specific watch. Replaces the previous single-photo model.

#### Why

When admins curate a higher-quality catalog photo for a watch, the user's personal photos shouldn't disappear. Photos are personal records of ownership; the catalog photo is the canonical product shot.

#### Image Resolution Order

The watchbox slot, cards view, and detail page render the highest-priority image available:

1. **Admin-curated catalog photo** (`watch_images` table)
2. **Catalog row image** (`catalog_watches.image_url`, set by user-photo submissions)
3. **Primary user gallery photo** (`user_watch_photos` where `is_primary=true`)
4. **SVG dial fallback** (rendered with the watch's `dialConfig` colors)

Admin curation upgrades the watchbox slot but never hides user photos — they always remain visible in the gallery.

#### Surfaces

**Sidebar** (Feature 2 owner mode)
- Horizontal thumbnail strip (56×56 desktop, 64×64 mobile)
- `+ Add` button
- Gold ★ overlay on the primary photo
- Empty state: dashed-border tile with "Add wrist shots" CTA
- Drag-drop upload directly on the section

**Owned watch detail page** (Feature 2E)
- Full-width grid below the specs (220px+ tiles, captions visible under each)
- Same gallery data as sidebar, larger and more browsable
- Drag-to-reorder via `@dnd-kit`

**Lightbox** (full-screen modal)
- Photo centered, max `min(90vh, 90vw)`
- Caption inline-editable below the photo
- Toolbar: `★ Set as primary · ✎ Caption · ⤓ Open · 🗑 Delete`
- Photo counter top-right ("3 of 7")
- Keyboard: `Esc` close · `←` `→` navigate · `Backspace`/`Delete` delete (with confirm) · `P` toggle primary
- Mobile: swipe to navigate

#### Functional Requirements

- Upload one or many photos at once (file picker `multiple`, drag-drop)
- "Open camera" link reuses the existing CameraCapture component
- Captions: optional, single-line, ~140 chars
- Set-primary (one per watch, atomic flip-others-off)
- Delete with auto-promote (if the deleted photo was primary, oldest remaining becomes primary)
- Drag-to-reorder thumbnails (sidebar + grid)
- AI photo flow lands new uploads in the gallery as primary automatically (Feature 9)

#### Visibility

- Owner-only on collection / playground (when owned)
- Hidden in `mode='public'` and `mode='followed'`

#### Photo Categories

Each gallery photo has an optional `photoType` that classifies it for filtering and section grouping on the detail page. The column exists in Supabase (migration 018) but is not yet exposed in the UI.

**Photo types:**

| Type | Label | Use |
|---|---|---|
| `wrist_shot` | Wrist shot | On-wrist photo |
| `dial` | Dial | Close-up of the dial face |
| `case_back` | Case back | Movement or serial view |
| `macro` | Macro | Detail shot (bezel, crown, lume, etc.) |
| `lifestyle` | Lifestyle | Watch in context (desk, travel, etc.) |
| `receipt` | Receipt | Purchase receipt or invoice |
| `warranty_card` | Warranty card | Manufacturer warranty / guarantee card |
| `service_record` | Service record | Service invoice or receipt |
| `box_papers` | Box & papers | Photo of original box, papers, hang tags |
| `other` | Other | Anything else |

**UI for type selection:**
- **On upload:** optional type picker chips below the file drop zone (defaults to no type / auto-detect later)
- **In lightbox toolbar:** type selector pill next to the caption edit action. Tap to cycle or pick from a dropdown
- **Gallery filtering:** detail page gallery groups photos by type when more than ~6 photos exist — "Wrist shots", "Documents & Papers", "Detail" sections. Below 6, flat grid with type badge overlay

**Documents & Papers grouping:** `receipt`, `warranty_card`, `service_record`, `box_papers` are surfaced together as a "Papers & Provenance" section on the detail page (Feature 2E). This gives collectors a single place to store proof of purchase, warranty status, and service history alongside the watch record.

#### Data

```typescript
export interface UserWatchPhoto {
  id: string
  watchId: string         // owned-watch id
  photoUrl: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
  photoType?: PhotoType
  takenAt?: string        // date when photo was taken
}

export type PhotoType =
  | 'wrist_shot'
  | 'dial'
  | 'case_back'
  | 'macro'
  | 'lifestyle'
  | 'receipt'
  | 'warranty_card'
  | 'service_record'
  | 'box_papers'
  | 'other'
```

Backed by `public.user_watch_photos` with RLS scoped to the owner. Backfilled from the legacy single `watches.photo_url` on migration. `photo_type` and `taken_at` columns added in migration 018.

| Feature | Priority |
|---|---|
| Sidebar thumbnail strip + lightbox | P0 (shipped) |
| Grid variant on owned watch detail page | P0 (shipped) |
| Upload (file picker + drag-drop) + camera | P0 (shipped) |
| Set-primary + delete + captions | P0 (shipped) |
| Drag-to-reorder | P0 (shipped) |
| AI photo flow auto-add | P0 (shipped) |
| Photo type picker in upload + lightbox | P0 |
| Photo type badge on gallery thumbnails | P0 |
| "Papers & Provenance" grouped section on detail page | P0 |
| In-app crop for gallery photos | P2 |

---

### Feature 2E — Owned Watch Detail Page (`/collection/watch/[id]`)

Focused, full-page surface for a specific owned watch instance. Distinct from the catalog detail/add page (Feature 3) — that one is for the catalog watch as a product, this one is for the user's specific instance with their condition, notes, photos, and history.

#### Layout

- **Sticky image column** (desktop) using the standard image fallback chain
- **Specs column** with full grid: brand, model, reference, watch type, est. market value, case size, material, dial color, movement, complications, condition, ownership status, purchase date, price paid, notes
- **Ownership detail strip** — below specs: acquisition method, has box, has papers, warranty expiry. Compact chip/badge layout. Values come from existing Supabase columns (migration 017) surfaced through `EditWatchModal`.
- **Edit + Delete** icon buttons in the specs header — Edit opens the existing `EditWatchModal`
- **Papers & Provenance section** — filtered gallery view showing only document-type photos (`receipt`, `warranty_card`, `service_record`, `box_papers`). Appears between specs and the main gallery when document photos exist. Compact horizontal strip with type label badges. Gives collectors a single place to find proof of purchase, warranty cards, and service receipts without scrolling through wrist shots.
- **Service History section** (Feature 2F) — service timeline card below Papers & Provenance. Shows past services, next service due estimate, and total service cost.
- **Bottom gallery section** — Feature 2D in grid variant (large tiles, captions, drag-reorder, lightbox). When >6 photos, groups by type ("Wrist shots", "Detail", "Documents") with section headers.

Mobile: image and specs stack; gallery becomes 2-up.

#### Entry Points

- "View full detail →" link in the owner-mode sidebar (Feature 2)
- Direct deeplink (`/collection/watch/{ownedWatchId}` is share-stable for the owner)
- "Manage your watch →" CTA on the duplicate-aware add page (Feature 3) when the user already owns a catalog watch

The watchbox slot and card view continue to open the sidebar — the detail page is one click deeper, opt-in.

| Feature | Priority |
|---|---|
| `/collection/watch/[id]` route | P0 (shipped) |
| Edit modal integration | P0 (shipped) |
| Delete with confirm | P0 (shipped) |
| Bottom gallery section | P0 (shipped) |
| Ownership detail strip (box, papers, acquisition, warranty) | P0 |
| Papers & Provenance section (document photo grouping) | P0 |
| Service History section (Feature 2F) | P0 |
| Photo type grouping in gallery (>6 photos) | P1 |
| Per-instance ownership + sharing visibility (multi-instance owners) | P1 |

---

### Feature 2F — Service History

Per-watch service tracking. Collectors need to know when each watch was last serviced, what was done, what it cost, and when service is next due. Mechanical watches typically need full service every 5–7 years; this feature surfaces that cadence.

#### Why

"Needs Service" is already an ownership status (OwnershipStatus), but there's no structured record of *what* was serviced, *when*, or *what's coming next*. Service history is one of the most valuable records a collector maintains — it directly affects resale value, warranty status, and long-term ownership cost.

#### Service Record

Each owned watch can have zero or more service records, ordered by date.

```typescript
export interface WatchServiceRecord {
  id: string
  watchId: string           // owned-watch id
  serviceDate: string       // ISO date
  serviceType: ServiceType
  provider?: string         // "Rolex Service Center", "local watchmaker", etc.
  cost?: number             // in user's currency
  currency?: string         // default 'USD'
  notes?: string            // free text
  createdAt: string
}

export type ServiceType =
  | 'full_service'           // complete movement overhaul
  | 'partial_service'        // targeted repair
  | 'battery_replacement'    // quartz only
  | 'crystal_replacement'
  | 'bracelet_service'       // link adjustment, clasp repair, polish
  | 'water_resistance_test'
  | 'polishing'
  | 'regulation'             // timing adjustment
  | 'other'
```

#### UI — Detail Page Section

Appears on the owned-watch detail page (`/collection/watch/[id]`) between Papers & Provenance and the photo gallery.

**Empty state:**
- Muted card: "No service history yet" with `+ Log a service` CTA

**With records:**
- **Service timeline** — compact vertical timeline, most recent first. Each entry shows: date, service type badge, provider (if set), cost (if set), and notes excerpt
- **Next service estimate** — computed from the most recent `full_service` date + 5 years (configurable per movement type later). Shows as a subtle "Next full service: ~March 2029" line above the timeline when a full service exists. If overdue, shows in a warm amber treatment.
- **Total service cost** — sum of all recorded costs, shown as a running total at the bottom of the timeline
- **`+ Log a service` CTA** — opens an inline form or modal with: date, service type (pill selector), provider (text), cost (number), notes (textarea)

**Sidebar hint:**
- When service records exist, the sidebar specs section shows a "Last serviced: [date]" line. Pulls from the most recent `WatchServiceRecord.serviceDate` (or falls back to `lastServicedAt` on the watch if no records exist yet).
- "Needs Service" ownership status + overdue service estimate together surface a gentle amber nudge

#### Persistence

New Supabase table: `public.watch_service_records`
- RLS scoped to the owner (same pattern as `user_watch_photos`)
- Columns mirror `WatchServiceRecord` type above
- Indexed on `watch_id` for per-watch queries

The existing `watches.last_serviced_at` and `watches.service_notes` fields (migration 017) serve as a lightweight fallback for users who don't want to log structured records. The detail page checks `watch_service_records` first; if empty, falls back to `last_serviced_at` for the sidebar hint.

#### Functional Requirements

| Feature | Priority |
|---|---|
| `watch_service_records` Supabase table + RLS | P0 |
| Log a service form (date, type, provider, cost, notes) | P0 |
| Service timeline on detail page | P0 |
| Next service estimate (5yr from last full service) | P0 |
| Total service cost running total | P0 |
| Sidebar "Last serviced" hint | P0 |
| Service record photo linking (attach `service_record` photos to a record) | P1 |
| Movement-type-aware service interval (manual vs quartz vs spring drive) | P1 |
| Service reminder notifications | P2 |

---

### Feature 3 — Watch Search & Add Watch Flow

The add-watch experience is a dedicated helper route, not a modal and not a reflowing slide-in panel. Adding a watch is a focused, durable action.

#### Routes

- `/collection/add` — search and select a watch (with camera icon → photo identification, Feature 9)
- `/collection/add/[watchId]` — detail + confirm

Both routes maintain the nav bar.

#### Entry Points

- Add Watch button in CollectionHeader → `/collection/add`
- Empty slot in Collection watchbox → `/collection/add`
- Empty slot in Playground box → `/collection/add?dest=playground&boxId=[id]`

#### Search Page (`/collection/add`)

**On load:** search bar with a camera icon, default browse state showing top watches by heat score with pagination.

Helper line:
> Search by brand, model, or reference number — or tap the camera to identify by photo

**Search infrastructure:**
- Server-side full-text search via `pg_trgm` GIN index on generated `search_text` column (concatenates brand, model, reference, model_family, nickname, watch_type, complications)
- Curated collector nicknames (e.g. "Pepsi", "Hulk", "Speedy") searchable via `data/catalog-nicknames.json`
- CatalogProvider paginates top 2,000 by heat score into memory; remaining watches fetched on demand
- Brand filter with photos-only inner-join for browsing
- Debounced search with ILIKE matching

**As the user types:**
- Live results appear
- Each result card shows SVG dial render or catalog image, brand, model, reference, case size/material, estimated value
- Filter chips appear contextually below search
- Chips show match counts
- Zero-count chips are grayed out, not hidden
- Filters:
  - Case Material
  - Dial Color
  - Case Size
- Watch Type chips are intentionally excluded from this flow
- Already owned watches show `In Collection`
- Sort controls for relevance, heat score, price

**Camera icon** (right side of the search bar):
- Opens the camera capture / file picker for AI photo identification (Feature 9)
- Inline result UI: "Watchbox Concierge" loading → match card or "Discovered by Concierge" panel for not-in-catalog watches

**Clicking a result:**
- always routes to `/collection/add/[watchId]`
- preserves relevant context such as `dest`, `boxId`, and future `from`
- if already owned, the duplicate-aware detail page (below) handles it first-class

#### Detail + Confirm Page (`/collection/add/[watchId]`)

The second step is a product-detail screen, not a plain confirm form.

**Surface content:**
- Large watch image (admin-curated → catalog → primary user photo → SVG)
- Heart/follow action over the image
- Brand, model, reference
- Quick spec strip
- Estimated market value
- Watch specifications block

**Duplicate-aware behavior**

When the user already owns one or more instances of the catalog watch, the page transforms:

- **Single instance:** soft green "✓ You already have one of these — added {date}" panel above the action area
  - Primary CTA: `Manage your watch →` (links to `/collection/watch/[ownedWatchId]`)
  - Secondary CTA: `+ Add another` (expands the inline condition + purchase flow)
- **2+ instances:** list of owned instances above the action area, each with `condition · purchase date · Manage →`
  - `+ Add another` available below for adding a third copy

**Primary decision (when not already owned, or when "Add another" is expanded):**

`Where does it go?`

- Add to My Collection
- Add to Playground

**Collection path**
- Condition required
- Optional purchase details accordion
- CTA: Add to My Collection (or Add another to My Collection)
- Submit guard prevents double-click duplicates
- Redirects to `/collection`
- Success toast shown

**Playground path**
- No condition required
- User chooses an existing Playground box or creates one inline
- CTA: Add to Playground
- Redirects to `/playground?boxId=[id]`

**Follow behavior**
- Hearting adds the watch to `followedWatchIds`
- Toast: `Saved to your Followed Watches`
- Follow is a lightweight secondary action, not the main branching decision

**Contextual route behavior**
- The page accepts a `from`/context parameter
- Eyebrow copy and back link should reflect where the user came from:
  - Collection
  - Playground
  - future public/share surfaces if needed

#### Ownership Metadata (post-add, not at add time)

These fields remain editable later from Collection surfaces rather than being required in the add flow:
- For Sale
- Needs Service
- Recently Added
- Condition changes
- Purchase price/date edits
- Notes

#### Design Rules

- Dedicated routes, not modal
- SVG dial renders in every result card
- Filters appear only after search starts
- Filter order: Case Material → Dial Color → Case Size
- Step 2 is a product-detail page with a destination decision
- Condition is the only required field when adding to Collection
- Playground add path remains lightweight
- Add is a committed action, not a draft
- Duplicate ownership is first-class on the detail page, not a search-results branching condition

| Feature | Priority |
|---|---|
| `/collection/add` search route | P0 |
| Camera icon → AI photo identification entry | P0 |
| `/collection/add/[watchId]` detail + confirm route | P0 |
| Duplicate-aware detail page (single + multi-instance) | P0 |
| SVG dial render in search results | P0 |
| Progressive filter reveal | P0 |
| Filter chips with match counts | P0 |
| Collection vs Playground intent selector | P0 |
| Condition required field (Collection path only) | P0 |
| Inline Playground box picker/creation | P0 |
| Submit guard against double-click | P0 |
| Contextual `from` parameter for eyebrow/back link | P0 |
| Followed watches state | P0 |
| Ownership metadata editable post-add (EditWatchModal) | P0 (shipped) |

---

### Feature 4 — Playground Mode (`/playground`)

Dream boxes unconstrained by ownership. The creative, aspirational counterpart to My Collection.

#### Core Concept

Playground answers: *What would my collection look like if…*

- No ownership required
- Multiple named boxes
- Per-box visual configuration
- Same hover card → sidebar interaction as Collection
- Market-value-first treatment instead of ownership-first treatment
- Boxes overflow via `+N more`
- Additions auto-follow the watch

#### Page Layout

**Header**
- Title: Playground
- Subtitle: Build your dream collection. No limits.
- New Box CTA
- Active box tabs / switcher

**Main area**
- Watchbox view
- Cards view
- Per-box stats section
- Inline editable box name
- Box tags
- Empty slots route into add-watch flow

**Toolbar**
- Sort controls
- Share action
- Delete box
- Customize Watchbox controls for frame, lining, slot count

#### Sidebar — Playground Context

Shows:
- brand, model, reference
- market value
- watch type
- specs

Actions:
- Find For Sale ↗
- Add to My Collection
- Edit
- Delete

#### Adding Watches to a Playground Box

- Empty slot → `/collection/add?dest=playground&boxId=[id]`
- Add-watch detail page defaults to Playground when entered from Playground
- Originating box is preselected
- User can still switch destination before confirming
- **Import collection on empty box** — one-click "Start from your collection" CTA copies all owned watches with condition/notes into the active box
- **Drag from tray** — browse/search tray below the watchbox, drag watches into specific slots with visual hover feedback

#### Sharing a Box

Playground sharing is part of the broader profile/share system, not a standalone temporary link mechanic.

- Box shares should resolve to the public box surface
- Clipboard share links are P0
- OG image generation is P1
- Desktop can use hover affordances
- Mobile must expose a visible share action

#### Drag to Reorder

Shipped for Playground. Long-press to initiate drag on mobile (iOS Safari compatible), HTML5 drag on desktop. Sparse slot support — drops land where you aim, gaps preserved. Drag-to-trash to remove watches. No draft workflow required.

#### Current shipped scope

| Feature | Priority |
|---|---|
| `/playground` page with header and box switcher | P0 |
| Seeded demo boxes with real catalog watches | P0 |
| WatchBox component reused with Playground data | P0 |
| Hover card + sidebar in Playground mode | P0 |
| Playground sidebar actions (Find For Sale, Add to Collection, Edit, Delete) | P0 |
| Inline box name editing | P0 |
| New Box modal | P0 |
| Add watch to Playground via add-watch flow | P0 |
| Watchbox overflow handling | P0 |
| Watchbox customization controls | P0 |
| Cards view for each Playground box | P0 |
| Per-box stats section | P0 |
| Per-entry Playground edit flow | P0 |
| Clipboard box share action | P0 |
| Drag to reorder within box | P0 (shipped) |
| Import collection on empty box | P0 (shipped) |
| Drag watches from tray into slots | P0 (shipped) |
| Drag-to-trash for removal | P0 (shipped) |
| Supabase persistence for logged-in users | P0 (shipped) |

---

### Feature 5 — Public Profile & Shareable Collection Surfaces

Sharing should feel personal and identity-driven, not like a utility link to a temporary Playground state. The core public share surface is the collector profile, with shareable box pages beneath it.

#### Route Model

**V1 demo scope**
- localStorage-backed
- no accounts required
- public demo profile lives at `/profile`

**Future account-backed routes**
- profile page: `/u/[handle]`
- public box page: `/u/[handle]/box/[slug]`

#### Profile Page Composition

- **Profile card**
  - profile image/avatar
  - profile name / handle
  - configurable public stats and summary fields
- **Featured watch card**
  - surfaced inside or directly beneath the profile card
  - user can choose Grail or Collection Jewel
  - Grail uses crown-icon treatment
  - Jewel uses diamond/gem-icon treatment
  - same card shell and layout for both states
- **My Collection**
  - static section
- **Playground**
  - carousel of box previews
- **Followed Watches**
  - list/grid section using the existing card language

#### Public Interaction Rules

- Clicking any watch opens a readonly public watch detail page
- Clicking a Collection or Playground box preview on the profile page navigates to the public box page
- No inline expansion of boxes within the profile page
- Public profile surfaces are readonly
- Per-watch user photo galleries are NOT exposed on public surfaces (Feature 2D — owner-only)

#### Profile Visibility / Configuration

V1 scope is intentionally narrow:
- visibility/surfacing toggles only
- editable choice over what collection stats or modules are shown
- no drag-and-drop profile builder

#### Share Surfaces

- Share profile
- Share Collection box
- Share Playground box

#### Share Affordances

- Desktop: share icon on box hover
- Mobile/touch: always-visible share action

#### Share Output / Metadata

Examples:
- `Marc's Profile`
- `Marc's Collection`
- `Marc's Dream Collection`

**Effort split**
- Clipboard share links for profile and box pages = P0
- OG image generation for profile and box pages = P1

#### Scope Priorities

| Feature | Priority |
|---|---|
| `/profile` demo page backed by localStorage | P0 |
| Profile card with configurable surfaced stats | P0 |
| Grail card surfaced in profile | P0 |
| Static My Collection section | P0 |
| Playground carousel with box previews | P0 |
| Followed Watches section | P0 |
| Public readonly box page | P0 |
| Clipboard share links for profile and box pages | P0 |
| Unified share modal (profile + Collection box + Playground box) | P0 (shipped) |
| OG image generation for share cards (`/api/og/box/[slug]`) | P0 (shipped) |
| Future `/u/[handle]` route model | P1 |
| Full account-backed public identity system | P2 |

---

### Feature 6 — Settings & Account Controls

A dedicated settings surface where collectors manage account, privacy, data, and legal preferences without mixing those controls into profile-editing flows.

#### Route and Scope

- Primary route: `/settings`
- This route is an account/control center, not a public profile surface
- `/profile` remains the identity/showcase editor and public preview workspace

#### 6.1 Account

- Email display (read-only when identity is managed by Google OAuth)
- Auth method status (Google and/or magic link)
- Sign out all sessions (future)
- Danger zone with `Delete account + purge data` as the primary destructive CTA

#### 6.2 Privacy & Sharing

- Public profile visibility master toggle
- Existing module visibility controls in one place:
  - Collection
  - Playground
  - Followed Watches
  - Featured Grail/Jewel
- `Preview public profile` link

#### 6.3 Data & Storage

- `Download my data`
- `Request data deletion`
  - MVP: support-email backed request flow is acceptable
  - Later: authenticated self-serve deletion workflow
- Local cache/device reset for local/session data
- Last sync status when signed in

#### 6.4 Legal & Transparency

- Privacy Policy link
- Terms of Use link
- Affiliate disclosure reminder
- Support contact email

#### 6.5 Preferences (MVP-lite)

- Default Collection view selection (Watchbox / Cards / Photo)
- Currency display preference (when multi-currency support is introduced)
- Notification preferences (placeholder until notification system ships)

#### Settings MVP Priorities

| Feature | Priority |
|---|---|
| `/settings` route and sectioned settings layout | P0 |
| Account summary (email + auth method) | P0 |
| Privacy/sharing controls consolidated in settings | P0 |
| Legal links + support contact | P0 |
| Request data deletion (email-backed) | P0 |
| Download my data | P1 |
| Local cache/device reset | P1 |
| Self-serve account deletion + data purge | P2 |
| Sign out all sessions | P2 |
| Notification preferences | P2 |

---

### Feature 7 — The Strap Drawer

A first-class strap inventory within the collection. Collectors don't just own watches — they own straps, and the interplay between the two is a core part of the hobby. The Strap Drawer makes straps a real entity with their own collection, compatibility logic, and stats.

#### Why

Straps are currently commerce-only in the product (affiliate suggestions on Discover). But collectors accumulate straps, swap them between watches, and think about compatibility constantly. Making straps an inventory item turns a transactional surface into a collector tool — and makes the commerce suggestions dramatically more targeted because the system knows what the user already owns vs. what they're missing.

#### 7.1 Strap as a Data Entity

Unlike watches, straps don't come from a universal catalog. Users add them manually — there's no Chrono24 or WatchBase for straps. The data model is intentionally simple.

```typescript
export type StrapMaterial =
  | 'leather'
  | 'rubber'
  | 'nylon'         // NATO, ZULU, seatbelt
  | 'canvas'
  | 'fabric'        // perlon, sailcloth
  | 'metal'         // mesh, milanese, aftermarket bracelet
  | 'silicone'
  | 'ceramic'
  | 'exotic'        // alligator, ostrich, shark
  | 'other'

export type StrapStyle =
  | 'dressy'
  | 'sporty'
  | 'casual'
  | 'rugged'
  | 'vintage'

export interface UserStrap {
  id: string
  userId: string
  name?: string               // "Brown Hirsch Rally", "OEM Tudor fabric"
  brand?: string              // "Hirsch", "Barton", "OEM", etc.
  material: StrapMaterial
  color: string               // free text — "cognac", "navy", "olive"
  lugWidthMm: number          // THE compatibility key — required
  style?: StrapStyle
  tapieredToMm?: number       // buckle-end width if tapered (e.g. 20mm → 16mm)
  lengthMm?: number           // total length
  claspType?: string          // "pin buckle", "deployant", "hook"
  purchasePrice?: number
  purchaseUrl?: string        // where they bought it (for re-purchase)
  photoUrl?: string           // user photo of the strap
  notes?: string
  sortOrder: number
  createdAt: string
}
```

**Design choice — `lugWidthMm` is required.** Unlike watches where lug width is optional catalog data, a strap without a lug width is useless for compatibility. The add-strap flow makes this the only required field besides material.

#### 7.2 Strap-Watch Compatibility

**Auto-match rule:** A strap is compatible with a watch when `strap.lugWidthMm === watch.lugWidthMm`. Simple, correct for 95% of cases.

**Manual overrides:** Users can mark a strap as "also fits" a specific watch even when lug widths don't match (adapter, force-fit, tapered strap that works ±1mm). Conversely, they can exclude a pairing (proprietary integrated bracelet, aesthetic mismatch they don't want suggested).

```typescript
export interface StrapWatchOverride {
  id: string
  strapId: string
  watchId: string             // owned-watch id
  override: 'fits' | 'excluded'
  notes?: string
}
```

**Effective compatibility** for a given strap-watch pair:
1. If an override exists, use it (`fits` → compatible, `excluded` → incompatible)
2. If watch `braceletType === 'integrated'`, incompatible (integrated bracelet watches can't take aftermarket straps)
3. If both `lugWidthMm` values exist and match, compatible
4. If either `lugWidthMm` is missing, unknown (shown in a separate "check fit" state)

#### 7.3 Route & UI

**Route:** `/collection/straps`

A sub-route of `/collection` rather than a ViewSwitcher icon, so straps have room to breathe without crowding the watch views. Nav: the collection page header gets a secondary link or tab — "Watches" | "Straps" — making it clear both are part of the collection.

**Page layout:**

**Header**
- Title: "Strap Drawer"
- Subtitle: "{N} straps · {M} compatible watches · {P} possible combinations"
- `+ Add Strap` CTA

**Strap grid**
- Card-based grid (not a watchbox — straps aren't slot-based)
- Each card shows: color swatch or photo, name/brand, material badge, lug width, compatible watch count
- Sort: by material, by lug width, by color, by date added
- Filter chips: material type, lug width, style

**Strap detail sidebar** (reuses the sidebar pattern from watches)
- Strap photo or CSS-rendered material swatch (design prototype exists in `docs/design-system/`)
- Full specs: material, color, lug width, taper, clasp, brand
- **"Fits these watches"** section — list of compatible owned watches (auto-matched + manual overrides), each with a small watch thumbnail
- **"Also fits" / "Doesn't fit"** toggle to add manual overrides per watch
- Actions: Edit / Delete / `Buy another ↗` (affiliate link if `purchaseUrl` set, else generic search)

**Add Strap flow**
- Inline modal or sheet (not a dedicated route — straps are simpler than watches)
- Fields: material (required, pill selector), lug width (required, common widths as presets: 18, 19, 20, 21, 22, 24mm), color (required, text), name (optional), brand (optional), style (optional pill selector), photo (optional upload), notes (optional)
- Lug width presets highlight widths that match watches in the user's collection: "You have 3 watches with 20mm lugs"

#### 7.4 Compatibility Matrix

A visual surface showing which straps fit which watches — the "combo planner."

**Route:** `/collection/straps/combos` or a toggle on the Strap Drawer page

**Layout:** Grid/matrix with watches as columns and straps as rows (or vice versa on mobile). Cells show: green check (compatible), red X (excluded), gray question (unknown lug width). Clicking a cell could toggle override state.

**Stats bar** (always visible on the Strap Drawer):
- "Your {W} watches and {S} straps create **{C} possible combinations**"
- C = sum of compatible straps per watch (accounts for overrides and integrated-bracelet exclusions)
- Additional fun stats: "Most versatile strap: {name} (fits {N} watches)" · "Most options: {watch} ({N} straps)"

#### 7.5 Collection Stats Integration

The existing `/collection` stats section gains a strap dimension:
- **Lug width distribution** — chip row showing lug widths across owned watches with counts (already partially computed by `computeStrapSummary()` in `lib/discover.ts`)
- **Strap coverage** — "5 of 6 watches have at least one compatible strap"
- **Material breakdown** — what strap materials the user owns

#### 7.6 Discover Integration

Once the Strap Drawer exists, the deferred strap suggestions on `/discover` become dramatically more targeted:

- **"Missing strap" suggestions** — "You have 4 watches with 20mm lugs but no rubber strap in that size" → affiliate CTA
- **"New watch, no strap" alert** — when a watch is added to collection and the user has no compatible straps, surface a suggestion
- **Strap upgrade paths** — "Your leather strap is 2 years old — here are replacements" (if service tracking shows strap age)

This replaces the earlier planned § 04 "Upgrade This Strap" section on Discover with something grounded in the user's actual strap inventory rather than generic suggestions. The design prototype in `docs/design-system/` can be adapted — the swatch cards and material textures are reusable.

#### 7.7 Sidebar "Swap Strap" Action

The existing stub button in `WatchSidebar.tsx` (currently shows "Coming soon" toast) gets wired to:
1. If the user has straps: show a quick-pick list of compatible straps from their drawer, with "View all in Strap Drawer →" link
2. If the user has no straps: "Start your Strap Drawer →" CTA linking to `/collection/straps`
3. If the watch has an integrated bracelet: button is hidden or disabled with tooltip "Integrated bracelet — not strap-compatible"

#### 7.8 Playground Integration

Playground boxes could optionally show strap pairings — "this watch on this strap" — but this is a P2 stretch. The core feature is the owned-strap inventory on `/collection/straps`.

#### Persistence

New Supabase tables:

**`public.user_straps`**
- Columns mirror `UserStrap` type above
- RLS scoped to owner (same pattern as `watches`, `user_watch_photos`)
- Indexed on `user_id` and `lug_width_mm`

**`public.strap_watch_overrides`**
- Columns mirror `StrapWatchOverride` type above
- RLS scoped to owner
- Unique constraint on `(strap_id, watch_id)`
- Foreign keys to `user_straps(id)` and `watches(id)` with `ON DELETE CASCADE`

#### Functional Requirements

| Feature | Priority |
|---|---|
| `user_straps` Supabase table + RLS | P0 |
| Add Strap modal with material + lug width + color | P0 |
| `/collection/straps` page with card grid | P0 |
| Strap detail sidebar with specs + compatible watches | P0 |
| Auto-match compatibility by lug width | P0 |
| "Fits these watches" list in strap sidebar | P0 |
| Combo count in page header stats | P0 |
| Sort and filter (material, lug width, style) | P0 |
| Manual fit overrides (also fits / excluded) | P0 |
| `strap_watch_overrides` table | P0 |
| Strap photo upload | P1 |
| CSS-rendered material swatches (from design prototype) | P1 |
| Compatibility matrix view | P1 |
| Lug width distribution in collection stats | P1 |
| Discover "missing strap" suggestions | P1 |
| Sidebar "Swap Strap" quick-pick list | P1 |
| Playground strap pairing | P2 |
| Strap affiliate URL builders (WatchWarehouse, Etsy) | P2 |

#### 7.9 Strap Studio — Technical Architecture

The Strap Studio is the visual configurator that lets users see their watch with different straps. This is the premium, interactive counterpart to the Strap Drawer inventory surface.

**Rendering approach:** 2D layered compositing — the same technique Apple Watch Studio uses. Two transparent PNG layers stacked via CSS `position: absolute`: strap layer (z-bottom) + case-only layer (z-top). Strap swaps replace the bottom layer with a crossfade transition. No 3D models needed.

**Why 2D, not 3D:** The catalog has 4,000+ watches. Creating individual 3D models is prohibitive ($200-500 per model). The existing image pipeline already produces high-quality transparent PNGs at 900px height. 2D compositing leverages that investment, loads instantly (no multi-MB model downloads), and Apple Watch Studio proves it delivers premium results with this exact technique.

##### Asset Pipeline

**Case-only images** (one per watch):
- Source existing watch photos, find or download case-only images where available (many catalog/press photos exist without straps)
- For watches with straps in the photo: use **SAM 3** (Segment Anything Model 3) via Ultralytics to auto-segment case from strap, producing a case-only mask
- Apply mask via Sharp: `sharp(fullWatch).composite([{ input: caseMask, blend: 'dest-in' }])`
- Manual QA via `/admin/image-review` pattern — expect ~70-80% auto-segmentation success rate
- Store case-only images in Supabase Storage alongside existing `primary.png/webp`
- Start with top ~100 watches by heat score, expand progressively

**Strap images** (one per material x lug width x color):
- High-quality transparent PNGs photographed or rendered from a consistent top-down angle matching the watch catalog's perspective
- Standard canvas size aligned to lug attachment points
- Common lug widths: 18, 19, 20, 21, 22, 24mm — each strap template rendered at each width
- Material library (MVP):

| Category | Variants |
|---|---|
| Leather smooth | Black, dark brown, brown, cognac/honey, tan, navy, burgundy, olive, grey |
| Leather alligator | Black, dark brown, brown, cognac, navy, burgundy |
| Rubber | Black, navy, grey, olive, orange |
| NATO nylon | Solid: black, grey, navy, olive, khaki, orange, burgundy. Patterns: Bond (black/grey), RAF (grey/red/blue), French Marine (blue/white/red) |
| Sailcloth | Black, navy, grey |
| Metal bracelet | Oyster/3-link (steel, gold, two-tone), Jubilee (steel, gold, two-tone), President (gold), H-link/AP-style (steel), Milanese mesh (steel, gold, black), Engineer/beads-of-rice (steel) |

Total MVP strap asset count: ~60-80 unique straps x 6 lug widths = ~360-480 images

**Strap image creation approaches** (in priority order):
1. **Photography** — photograph real straps flat on controlled background, rembg for background removal, align to standard canvas. Highest quality.
2. **3D rendering** — model strap geometry in Blender, render top-down at each lug width with PBR materials (leather normal maps, metal roughness). Consistent, scalable, one-time setup.
3. **AI generation** — use Stable Diffusion with ControlNet to generate photorealistic strap images from a reference shape template. Good for expanding the color palette quickly once the shape is right.
4. **High-quality stock** — source strap photography from partner/affiliate strap vendors who may provide product images.

##### Rendering Stack

| Layer | Technology |
|---|---|
| Image compositing | CSS `position: absolute` + `z-index` in a fixed-dimension container |
| Strap swap transitions | Framer Motion `AnimatePresence` crossfade (200-400ms, ease-out) + subtle scale pulse (1.0 → 1.02 → 1.0) on case |
| Orchestrated animations | GSAP `Flip` plugin for multi-step sequences (strap slides out, new strap slides in) — optional premium tier |
| Material swatches | CSS-rendered textures (existing `STRAP_TEXTURES` prototype) for the picker UI; real photos for the studio view |
| Server-side compositing | Sharp `composite()` for pre-generating thumbnails and OG share images |
| Segmentation pipeline | SAM 3 (via Ultralytics/Replicate API) + Sharp for mask application |

##### Strap Studio UI

**Route:** `/collection/straps/studio` (or modal overlay from Strap Drawer)

**Layout — dark background, watch centered:**
- Dark ambient background (`brand.colors.dark` or deeper) with subtle radial glow behind the watch
- Watch + strap composite centered, large (500-600px on desktop)
- Strap picker tray below — horizontal scrollable strip of strap swatches grouped by material category
- Material category tabs above the tray: Leather / Rubber / NATO / Metal / Exotic
- Active strap highlighted with gold border
- Watch name + strap name displayed as elegant typography below the composite
- "Find this strap ↗" affiliate CTA when a strap is selected

**Interaction model:**
- Click/tap a strap swatch → strap layer crossfades to the new strap
- Swipe through straps on mobile (horizontal scroll with snap points)
- Watch picker at top — switch between owned watches or browse catalog
- Preload adjacent strap images for instant swap feel (no loading spinners)
- Keyboard: arrow keys to cycle straps, number keys to switch material categories

**Premium touches:**
- Spring physics on transitions (Framer Motion `type: "spring"`)
- Staggered timing: old strap fades 150ms before new strap appears
- Subtle ambient shadow shifts when strap material changes (leather = warm shadow, metal = cool shadow)
- Reduced motion media query respect
- Share button generates a pre-composited image (via Sharp API route) for social sharing

##### Fallback for watches without case-only images

When a case-only image doesn't exist (the long tail beyond the top ~100):
- Show the full watch photo alongside a strap swatch card (side-by-side layout)
- Strap swatch uses the CSS-rendered texture (from `STRAP_TEXTURES` prototype) at full size with specs
- "Fits this watch" compatibility badge based on lug width
- Still useful, just not the full studio composite experience
- Progressive: as more case-only images are created, watches graduate to the full studio view

---

### Feature 8 — Smart Suggestions Engine

The **personalized engine upgrade path** for the surfaces in Feature 14 (`/discover`). Today those surfaces use rule-based heuristics (gap analysis, brand-family upgrade paths, lug-width strap matches). The Smart Suggestions Engine replaces them with personalized recommendations driven by collection + followed + search history + future behavior signals.

Also feeds the AI weekly digest and any sidebar upsell surfaces that ship later.

---

### Feature 9 — AI Photo Identification ("Watchbox Concierge")

Upload a watch photo, identify it, and route it through the right next step — match-and-add, "discovered" not-in-catalog submission, or a tasteful "that's not a watch" panel. Branded as **Watchbox Concierge** in user copy.

#### User-Facing Behavior

**Entry**
- Camera icon in the `/collection/add` search bar
- File drop or live camera capture supported (`CameraCapture` component handles fallback to upload on platforms without `getUserMedia`)

**Loading UX**
- Staged labels: "Examining the dial…" → "Cross-referencing manufacturer catalog…"
- Animated CSS loupe traverses the user's photo during stage 1, settles on stage 2
- "✦ Watchbox Concierge" chip top-right of the photo tile (deep-ink background for legibility on any photo)
- Reduced-motion fallback (loupe stays centered, stage labels still rotate)

**Result paths** (driven by AI subject classification + catalog match tier)

| AI says | Catalog match | UI |
|---|---|---|
| `subject: 'watch'` | reference / brand+model match | "✓ Match found" primary card with inline `Add to my watchbox →` linking to `/collection/add/[watchId]` |
| `subject: 'watch'` | brand-only or no match | "Discovered by Concierge" card with the user's photo, brand/model headline, likely reference candidates, and `Add to my watchbox →` (creates a pending catalog row + adds to collection) |
| `subject: 'not_watch'` | n/a | "That looks like a {label}" panel — playful but tasteful copy, photo coaching tips, "upload a different photo" CTA. Skips the expensive web-search lookup entirely. |

**"Next best matches" / "Closest in catalog"** section appears below the primary result with rank-numbered tiles for ranked alternates. Brand-only fallback never masquerades as identified.

**Add-from-photo (not-in-catalog flow)**
- `AddFromPhotoSheet` modal: editable AI-prefilled fields (brand, model, reference, dial color, watch type, case size/material, est. value), condition picker, optional purchase details
- Submit creates a pending catalog row + uploads the cropped photo to Supabase Storage + adds the watch to the user's collection
- The watch appears in the user's collection immediately; admin moderation queue (Feature 13) reviews + approves the catalog row
- Disclosure: "Pending review. Your watch will appear in your collection right away. Our team reviews user-submitted watches before they show up in the public catalog."

#### Pipeline Architecture

The AI work is **two-step** by default; the admin path can short-circuit to a **third "verify" mode** (Feature 13).

**Step 1 — Vision (visual fingerprint)**
- OpenAI Responses API with `gpt-4.1-mini` (env-overridable)
- Image only, no tools
- Returns: subject classification, brand, model line, dial color/details, case material/size/lug width, bracelet, bezel, movement cues, watch type, confidence, optional notes
- **Returns `dialBbox`** — normalized 0..1 bounding box of the watch face, used to crop wrist shots to a dial-focused square server-side via Sharp before storage
- Does NOT attempt a manufacturer reference (refs aren't visible on dials; the lookup step handles them)

**Step 2 — Reference lookup (web grounded)**
- OpenAI Responses API with `gpt-4.1` + the `web_search` tool (env-overridable model)
- Uses the visual fingerprint to query the brand's official site + reputable dealers
- Returns up to 5 candidate references with confidence + sourceUrl + rationale
- Also returns `estimatedValueUsd` + `estimatedValueSource` so user-photo submissions land with a real market value (not $0)
- Skipped entirely when `subject = 'not_watch'`
- Filename-aware: SKU-like tokens are extracted from the upload filename (`l3-830-4-92-6`, `126610LN`, `IW327001`, dotted/hyphenated/AP-style) and surfaced to the lookup model as a strong prior. Visible specs still win on contradiction.

**Catalog matching**
- Strict reference match (exact normalized equality, no substring) → `reference` tier
- Brand + fuzzy model match → `brand_model` tier
- Brand-only → `brand_only` tier (UI collapses this into the no-match path)
- No match → no_match

#### Costs

| Path | Calls | Notes |
|---|---|---|
| User flow, watch identified | Vision + Lookup | ~$0.04–$0.06 |
| User flow, not a watch | Vision only | ~$0.001 (lookup skipped) |
| Admin verify (known watchId) | Verify only | ~$0.001 (Feature 13) |
| Admin intake (unknown watch) | Vision + Lookup | ~$0.04–$0.06 |

#### Image Handling

- Server-side dial-bbox crop via Sharp before storage (square output, dial-focused, 10% margin)
- Falls back to a centered square crop when bbox is missing or invalid (~5% miscrop rate on AI quirks)
- Caps at 1600px on the long edge
- AVIF / HEIC inputs are transcoded client-side via canvas before upload (Sharp's libheif doesn't support every bitstream variant)
- Photo persists on the user's owned watch as the primary gallery entry (Feature 2D)

#### Functional Requirements

| Feature | Priority |
|---|---|
| Camera icon entry in `/collection/add` | P0 |
| Vision call (visual fingerprint, subject classification, dialBbox) | P0 |
| Reference lookup with web search | P0 |
| Filename-aware SKU prior in lookup | P0 |
| Estimated market value capture | P0 |
| Concierge loading UX (staged labels + loupe) | P0 |
| Match-found primary card with inline Add | P0 |
| Discovered (not-in-catalog) card with Add-from-photo | P0 |
| Not-a-watch panel with photo coaching | P0 |
| Add-from-photo confirm sheet (editable AI fields) | P0 |
| Server-side dial-bbox crop via Sharp | P0 |
| Client-side AVIF/HEIC transcode | P0 |
| Pending catalog row + admin moderation hook | P0 |
| Spec-fingerprint cache for repeated lookups | P2 |
| User-confirmable bbox crop UI | P2 |

---

### Feature 10 — Virtual Try-On Room

Upload a wrist photo and preview a selected watch at approximate scale.

---

### Feature 11 — Watch Newsfeed (`/news`)

Editorial reading surface aggregating watch publications. The route is live and feature-complete in v1; future passes add personalization and AI-driven digests.

#### Architecture

- **Cloudflare Worker** behind `NEWS_WORKER_URL` polls upstream RSS / API sources, normalizes into the canonical `NewsItem` shape, and returns a single JSON array
- Next.js API route at `/api/news` proxies the Worker with 15-minute revalidation, applies category filtering, and surfaces a 503 with a friendly client fallback if the Worker is unreachable
- Worker keeps RSS-fetch logic, brand/reference tagging, and source-specific quirks off the Next.js runtime so the app stays fast at the edge

#### Surfaces

- **Hero featured article** at the top of the page with large image, source pill, headline, excerpt, and read-now affordance
- **News mode tabs** — Latest / Personalized for You / By Source (when collection signals exist)
- **Source pills** for filtering by publication (Hodinkee, Worn & Wound, WatchTime, etc.) with a visible "All" reset
- **Filter bar** with category and brand-of-interest filters
- **Card grid** with thumbnail, source, headline, excerpt, brand/reference tags
- **Sponsored slot** stub (currently a Chrono24 placeholder) — first paid surface in the editorial flow

#### Personalization

- When the user has a collection / followed watches, the "For You" mode prioritizes articles tagged with brands the user owns or follows
- Demo / guest mode falls back to a stable curated rotation derived from the seed catalog so the page never looks empty

#### Functional Requirements

| Feature | Priority |
|---|---|
| `/news` route + worker-backed feed | P0 (shipped) |
| Hero featured article | P0 (shipped) |
| Source pills + filter bar | P0 (shipped) |
| Mode tabs (Latest / For You / By Source) | P0 (shipped) |
| Brand / reference tagging on items | P0 (shipped) |
| Sponsored slot framework | P0 (shipped) |
| Personalized digest emails (auth users) | P1 |
| AI weekly digest based on collection + followed | P1 |
| Reading-history-driven prioritization | P2 |

---

### Feature 12 — Integrated Buying, Selling & Listing

Find For Sale deep-links, pricing suggestions, and listing helpers for key resale surfaces.

---

### Feature 13 — Admin Catalog & Submissions Tooling

Internal admin surfaces that keep the catalog clean, moderate user submissions, and let curators replace photos efficiently. Not user-facing, but a real product surface for the operating team.

#### 13.1 Catalog Manager (`/admin/catalog`)

- Sortable, filterable list of every watch in `lib/watches.ts` (static seed) + `public.catalog_watches` (dynamic)
- **Click any row** → opens `CatalogWatchModal` in **view mode** (image, full specs, dial color swatches)
- **`✎ Edit details`** in the modal switches to edit mode in place (every spec editable: brand, model, reference, watch type, est. value, case size/material, dial color, movement, complications, dial/marker/hand hex codes)
- **Save** upserts via `/api/admin/catalog`. Editing a static seed watch creates a Supabase override row; dynamic rows take precedence in catalog reads, so seed edits are effective everywhere
- **Replace photo →** routes to `/admin/images?watchId=…` (the verify-mode flow, 13.2)
- Photo Queue / Heat Score views surface watches that need photos, sorted by demand

#### 13.2 Image Intake (`/admin/images`)

Two modes driven by the URL.

**Verify mode** (`?watchId=…` present)
- Cheap single AI call (~$0.001), no web search
- "Currently replacing" banner before upload — shows the existing photo + brand/model/ref so the admin's intent is clear
- After upload: "Current → New upload" before/after strip + AI ✓/⚠ verification badge with `observed` line
- Approve uploads to the `watch-images` storage bucket and writes the `watch_images` row tied to the original catalog id
- Server stays in verify mode unconditionally when `expectedWatchId` is provided (no silent fall-through to intake even if the row can't be located)

**Intake mode** (no `watchId` in URL)
- Full Concierge pipeline (vision + web-search reference lookup) with chip-based reference candidates
- Heat-score-aware queue with editable AI-detected fields
- Approve creates a curated catalog row + uploads the photo

**Image processing**
- Sharp pipeline: alpha-aware background removal, edge cleanup, padding, resize to 900px output, PNG + WebP outputs
- Resilient fallback: if the rich pipeline fails, fall back to simple resize+flatten so the upload still succeeds
- Client-side AVIF/HEIC transcode before upload (Feature 9)

#### 13.3 Submissions Queue (`/admin/submissions`)

User-photo submissions land here for review.

- **Dedupe by signature** (`brand|model|reference`): multiple pending rows of the same watch collapse into a single primary card with a "+N duplicate submissions" indicator and a "Show duplicates" toggle (per-row reject, group-approve)
- **Approve all (N) →** approves the primary AND every duplicate in the group atomically
- **✎ Edit fields** opens an inline editor for brand, model, reference, dial color, watch type, case size/material, est. value, movement (PATCH `/api/admin/catalog/[id]`)
- **⤴ Replace photo** → `/admin/images?watchId={id}` (verify mode)

#### 13.4 Image Review (`/admin/image-review`)

Quality control surface for curated catalog images after processing.

- **Side-by-side comparison** — raw source image vs processed output
- **Failure-mode tag chips** — 10 tags grouped by pipeline stage:
  - Missing parts (crown, bracelet, case edge, etc.)
  - Edge quality (halo, fringing, rough edges)
  - Background (remnants, transparency issues)
- **One-click actions:** Approve / Needs Reprocess / Wrong Watch
- Ticking any failure tag auto-stages "Needs reprocess"
- Reviews persisted to `watch_image_reviews` table (migrations 021 + 022)
- Search and bulk operations supported
- Image exclusion mechanism via `data/excluded-image-ids.json` for wrong-watch entries

| Feature | Priority |
|---|---|
| Side-by-side raw vs processed comparison | P0 (shipped) |
| Failure-mode tag chips (10 tags, 3 categories) | P0 (shipped) |
| Approve / Needs Reprocess / Wrong Watch actions | P0 (shipped) |
| Search within review queue | P0 (shipped) |
| Image exclusion list | P0 (shipped) |

---

#### 13.5 Security Boundary

- All admin routes gated by `requireAdmin()` (email allowlist)
- Admin server routes use a **service-role Supabase client** (`SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`) to:
  - Read pending submissions owned by other users (RLS would otherwise scope them)
  - Bypass storage bucket RLS for curated photo uploads
- The session client is the fallback when the service role key isn't configured (only approved rows + admin's own pending visible)

| Feature | Priority |
|---|---|
| Catalog modal (view + edit) for static + dynamic rows | P0 |
| Verify-vs-intake split with cost-appropriate AI | P0 |
| Currently-replacing banner + before/after strip | P0 |
| Submissions dedupe by signature | P0 |
| Submissions inline edit + curated photo replacement | P0 |
| Service-role admin client | P0 |
| Bulk operations across submissions group | P1 |
| Submission moderation reasons / audit trail | P2 |

---

### Feature 14 — Discover (`/discover`)

Commerce + editorial hub. Personalized to the user's collection and followed watches when available, with a stable demo experience for guests. Collection-aware suggestions feed an affiliate revenue path.

#### Design

Magazine-style editorial layout replacing the earlier utility-stack design. Seven sections with a sticky section TOC for navigation.

#### Sections (top to bottom)

- **Hero** — LLM-personalized editorial headline and byline tailored to the user's collection; daily-rotated watch pick with large image, brand kicker, heart action in image well, and `Find on Market →` CTA. Mobile: compact dark "Discover" banner instead of tall light editorial hero
- **"Complete the Box" lead** — dark-background section surfacing collection gaps and next-slot recommendations with per-section refresh button
- **Box insight cards** — analytical read of the user's collection (gaps, dial-color skew, brand concentration). Designed to surface "what might round out the box"
- **Next slot recommendations** — watch cards keyed to the user's empty slot count + spend pattern, with `Find on Market →` deep links (Chrono24)
- **Upgrade suggestions** — from-to upgrade spreads per owned watch, surfacing plausible upgrade paths using model-family filtering for dedup/exclusion (no same-model upgrades, prefers different brands). LLM-generated per-pair rationale
- **My Targets / Grail** (§ 03) — user-curated aspirational watches. Shows up to 3 Next Targets with intent type, target price, desired condition, and per-target `Track Listings →` affiliate CTA. If a Grail is set, it appears as a featured card above the targets with crown-icon treatment and `Find on Market →` CTA. This section is the user-curated counterpart to the algorithmic suggestions in the surrounding sections. Only renders for logged-in users with at least one target or grail set. Entry point for setting targets: sidebar `Set as Target` action on any followed watch. The section includes an inline `+ Add a target` CTA linking to followed watches. This is the single highest-ROI affiliate surface — each target represents explicit purchase intent.
- **Alternate next watches** — three sections of daily-rotated recommendations from ranked top-10 pools, with per-section refresh buttons. Deterministic daily index (seeded by UTC day + section key) picks one watch per pool for stable intra-day viewing
- **Discover Reads strip** — curated editorial pulls (typically the top-tagged articles from the news feed for the user's brands of interest)

**Deferred sections** *(placeholders removed 2026-05, pending redesign):*
- **Strap suggestions** — lug-width-aware strap recommendations across the owned collection, with affiliate CTAs
- **Box upgrade card** — surface physical watchbox affiliate matches sized to the user's slot count (Wolf1834, Rapport, Holme & Hadfield)

#### Personalization

- Real users: pulls from `useCollectionSession()` — their owned + followed + targets feed every section
- Guests / demo: a stable seed anchored on Supabase catalog produces consistent suggestions so the page is never empty (no longer depends on static seed)
- All affiliate CTAs route through `buildChrono24URL` (or strap/box partner equivalents) with the user's brand/spec hints baked in
- Daily rotation uses a deterministic seed so recommendations are stable within a day but fresh across days

#### Functional Requirements

| Feature | Priority |
|---|---|
| `/discover` route shell | P0 (shipped) |
| Magazine-style editorial redesign | P0 (shipped) |
| LLM-personalized hero + lead section | P0 (shipped) |
| Daily-rotated recommendations with refresh buttons | P0 (shipped) |
| Box insight cards | P0 (shipped) |
| Next slot recommendations with Chrono24 deep links | P0 (shipped) |
| From-to upgrade spreads with model-family filtering | P0 (shipped) |
| My Targets / Grail section (§ 03) with affiliate CTAs | P0 |
| Mobile compact dark hero | P0 (shipped) |
| Sticky section TOC | P0 (shipped) |
| Strap suggestions (lug-width aware) | P0 (TODO — placeholder removed 2026-05, pending redesign) |
| Box upgrade affiliate card | P0 (TODO — placeholder removed 2026-05, pending redesign) |
| Discover Reads strip | P0 (shipped) |
| Smart Suggestions engine integration (Feature 8) | P1 |
| Live pricing on recommendations (WatchCharts) | P2 |
| Personalized digest emails | P2 |

---

## 4. Monetization Strategy

Free to all users. Revenue is embedded into discovery, aspiration, and ownership workflows.

### 4.1 Affiliate (Primary)

Every watch, strap, and box link can carry an affiliate tag.

| Partner | Category | Commission |
|---|---|---|
| Chrono24 | Watches | ~6.5% on completed sales |
| eBay Partner Network | Watches | Up to 4% |
| Amazon Associates | Accessories | 4% |
| Jomashop / Spinnaker | Specialty | 8–20%, 30-day cookie |
| WatchWarehouse (ShareASale) | Straps | 30-day cookie |
| SForce Watches | Straps | Up to 20% |
| Wolf1834 / Rapport / Holme & Hadfield | Physical boxes | Direct affiliate |
| Etsy via Awin | Artisan straps & boxes | 5–10% |

### 4.2 Physical Watch Box Commerce

When a user configures their virtual box, surface matching physical boxes and custom referrals.

### 4.3 Sponsored Placements

Featured spots in suggestion panels, news surfaces, or strap flows.

### 4.4 Sell-Side Lead Gen

Structured sell intent can be passed to dealer partners as qualified leads.

### 4.5 Future

White-label licensing, insurance partnerships, authentication/service referrals, anonymized market insight products.

---

## 5. Technical Stack & Integrations

### Frontend

- Next.js 14 (app router), TypeScript strict
- Inline styles as the dominant UI implementation pattern
- CSS variables: `--font-cormorant`, `--font-dm-sans`
- Core palette:
  - ink `#1A1410`
  - cream `#FAF8F4`
  - muted `#A89880`
  - gold `#C9A84C`
  - border `#EAE5DC`
- Drag interactions: `@dnd-kit/core` + `@dnd-kit/sortable` (used by the photo gallery)

### Data Model (current + near-term product model)

```typescript
export type OwnershipStatus = 'Owned' | 'For Sale' | 'Recently Added' | 'Needs Service'
export type WatchType =
  | 'Diver'
  | 'Dress'
  | 'Sport'
  | 'Chronograph'
  | 'GMT'
  | 'Pilot'
  | 'Field'
  | 'Integrated Bracelet'
  | 'Vintage'

export type WatchCondition = 'Unworn' | 'Like New' | 'Excellent' | 'Good' | 'Fair'

export type WatchTarget = {
  id: string
  watchId: string
  targetPrice?: number
  desiredCondition: WatchCondition
  intent: 'Addition' | 'Replacement'
  replacesWatchId?: string
  linkedPlaygroundBoxId?: string
  notes?: string
  targetDate?: string
}

export type PlaygroundWatchOverrides = Partial<Pick<
  Watch,
  | 'reference'
  | 'caseSizeMm'
  | 'caseMaterial'
  | 'dialColor'
  | 'movement'
  | 'complications'
  | 'condition'
  | 'estimatedValue'
  | 'notes'
  | 'watchType'
>>

export type PlaygroundBoxEntry = {
  id: string
  watchId: string
  overrides?: PlaygroundWatchOverrides
}

export type PlaygroundBox = {
  id: string
  name: string
  tags: string[]
  entries: PlaygroundBoxEntry[]
  frame: string
  lining: string
  slotCount: number
  createdAt: string
  shareSlug?: string
}

export type ProfileVisibilitySettings = {
  showCollectionStats: boolean
  showGrail: boolean
  showCollectionJewel: boolean
  showFollowedWatches: boolean
  showPlayground: boolean
}

export type FeaturedProfileWatch = 'grail' | 'jewel' | 'none'

export type PublicProfileState = {
  displayName: string
  handle?: string
  profileImageUrl?: string
  featuredProfileWatch: FeaturedProfileWatch
  visibility: ProfileVisibilitySettings
}

// Per-watch user photo (Feature 2D)
export interface UserWatchPhoto {
  id: string
  watchId: string         // owned-watch id
  photoUrl: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
  photoType?: PhotoType
  takenAt?: string
}

export type PhotoType =
  | 'wrist_shot' | 'dial' | 'case_back' | 'macro' | 'lifestyle'
  | 'receipt' | 'warranty_card' | 'service_record' | 'box_papers'
  | 'other'

// Per-watch service record (Feature 2F)
export interface WatchServiceRecord {
  id: string
  watchId: string
  serviceDate: string
  serviceType: ServiceType
  provider?: string
  cost?: number
  currency?: string
  notes?: string
  createdAt: string
}

export type ServiceType =
  | 'full_service' | 'partial_service' | 'battery_replacement'
  | 'crystal_replacement' | 'bracelet_service' | 'water_resistance_test'
  | 'polishing' | 'regulation' | 'other'

// Strap inventory (Feature 7)
export type StrapMaterial =
  | 'leather' | 'rubber' | 'nylon' | 'canvas' | 'fabric'
  | 'metal' | 'silicone' | 'ceramic' | 'exotic' | 'other'

export type StrapStyle = 'dressy' | 'sporty' | 'casual' | 'rugged' | 'vintage'

export interface UserStrap {
  id: string
  userId: string
  name?: string
  brand?: string
  material: StrapMaterial
  color: string
  lugWidthMm: number          // required — the compatibility key
  style?: StrapStyle
  taperedToMm?: number
  lengthMm?: number
  claspType?: string
  purchasePrice?: number
  purchaseUrl?: string
  photoUrl?: string
  notes?: string
  sortOrder: number
  createdAt: string
}

export interface StrapWatchOverride {
  id: string
  strapId: string
  watchId: string
  override: 'fits' | 'excluded'
  notes?: string
}

export type UserCollectionState = {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  collectionJewelWatchId: string | null
  playgroundBoxes: PlaygroundBox[]
  selectedWatchId: string | null
  publicProfile: PublicProfileState
  photosByWatchId: Map<string, UserWatchPhoto[]>
  straps: UserStrap[]
}
```

#### Watch intent rules

```typescript
const isOwned = collectionWatches.some(watch => watch.id === watchId)
const isFollowed = followedWatchIds.includes(watchId)

const canFollow = true
const canSetTarget = !isOwned && isFollowed
const canSetGrail = !isOwned && isFollowed
const canSetJewel = isOwned
```

Behavior requirements:
- Setting a Target auto-follows the watch if needed, but only when unowned.
- Setting a Grail auto-follows the watch if needed, but only when unowned.
- Setting a Jewel is allowed only for owned watches.
- Adding a Target or Grail watch to Collection removes it from `nextTargets` and clears `grailWatchId` if matched.
- Removing a Jewel watch from Collection clears `collectionJewelWatchId`.
- Removing a watch from Followed removes dependent Target/Grail state but does not affect Collection/Jewel state.

### Backend

- **Supabase** (PostgreSQL) for persistence — auth, user profiles, watches, watch_states, watchbox_config, playground_boxes (synced for logged-in users), catalog_watches, catalog_watch_market (heat scores), watch_images, watch_image_reviews, user_watch_photos, watch_service_records, user_straps, strap_watch_overrides
- **Supabase Auth** for accounts (Google OAuth + magic link)
- **Supabase Storage** for all user-uploaded imagery — buckets:
  - `watch-photos` (user uploads — gallery, profile, watchbox photos, AI flow uploads)
  - `watch-images` (admin-curated catalog photos via the intake pipeline)
- **Service-role admin client** for admin routes that need to bypass RLS (read pending submissions across users, write to storage)
- **Sharp** for server-side image processing (background removal pipeline, dial-bbox cropping, resize)

### AI / Vision

- **OpenAI Responses API** — vision identification + web-search reference lookup
  - `gpt-4.1-mini` for the vision pass (`OPENAI_VISION_MODEL`)
  - `gpt-4.1` for the reference lookup with the `web_search` tool (`OPENAI_REFERENCE_LOOKUP_MODEL`)

### APIs (future)

- WatchBase — watch reference data
- WatchCharts — market pricing
- Chrono24 — live listings / deep links

---

## 6. MVP Build Roadmap

### Phase 1 — Shipped

- Homepage watchbox with box customizer
- Collection page with watchbox, cards, and stats section
- Shared sidebar detail panel
- 5 default owned watches in collection
- Shared watchbox overflow handling (`+N more`, desktop flyout, mobile sheet)
- Watch catalog (35,659 references across 100+ brands; 4,000+ with curated images in Supabase Storage)
- Add-watch search route plus redesigned detail/confirm page
- Followed Watches heart interaction + toast
- `/playground` page with box switching, customization, cards view, stats, share action, delete flow, and per-entry editing
- Homepage hero carousel with seeded daily shuffle of the heat-score top 15
- `/news` editorial route + Cloudflare Worker RSS backend
- `/discover` commerce hub with collection-aware insights + recommendations
- `/settings` account/privacy controls (P0 scope)
- Unified share modal + dynamic OG image generation (`/api/og/box/[slug]`) for profile + box share links
- Edit Watch modal wired to the sidebar pencil for owned-watch metadata
- Real Watchbox Photo view (Feature 2A View C) — third icon in the ViewSwitcher with upload + camera + crop, persisting to `watchbox_config.watchbox_photo_url`
- Collection Jewel state — sidebar badge, WatchStateControl picker action for owned watches, FeaturedProfileWatch picker on `/profile` toggling between Grail and Jewel
- Collection empty state — watch silhouette CTA, layered auth-nudge for cross-device sync
- Catalog search — server-side full-text search via `pg_trgm` GIN index on `search_text` column, curated collector nicknames
- Heat score algorithm — 0–1000 scoring with brand-prestige flattening, market activity weighting; static bridge via `data/catalog-heat-scores.json`
- Admin image-review tool (`/admin/image-review`) — side-by-side comparison, 10 failure-mode tags, approve/reprocess/wrong-watch workflow

### Phase 2 — Shipped

- Supabase auth + user profiles + cloud persistence for collection / states / playground / watchbox config
- Resend transactional email + branded auth templates + DNS via Cloudflare
- **AI Photo Identification ("Watchbox Concierge")** — full pipeline (vision + web-search reference lookup), match / discovered / not-a-watch routing, dial-bbox cropping, filename-aware SKU prior, market-value capture
- **Per-watch user photo gallery** — sidebar + grid + lightbox + drag-to-reorder + captions + set-primary
- **Owned watch detail page** (`/collection/watch/[id]`) with bottom gallery
- **Duplicate-aware add page** with single + multi-instance treatments
- **Add-from-photo for not-in-catalog watches** with pending catalog row + admin moderation
- **Admin Catalog Manager** with view/edit modal that works for static seed + dynamic rows
- **Admin Image Intake** with verify-vs-intake split, current-photo banner, before/after strip
- **Admin Submissions Queue** with dedupe + inline edit + curated photo replacement
- **`/news`** — Cloudflare Worker–backed RSS feed with hero featured article, source pills, mode tabs, sponsored slot framework
- **`/discover`** — collection-aware commerce hub with box insights, slot recommendations, upgrade cards, strap suggestions, box upgrade affiliate card, and a curated reads strip
- **`/discover` editorial redesign** — magazine-style layout with LLM-personalized hero + lead, daily-rotated recommendations with per-section refresh, from-to upgrade spreads, model-family filtering for dedup/exclusion, mobile compact dark hero
- **Playground Supabase persistence** — playground boxes sync to Supabase for logged-in users via debounced auto-sync and reload on session start
- **Playground drag + import** — import collection on empty box via one-click CTA, drag watches from tray into slots, long-press reorder within slots, sparse slot support, drag-to-trash

### Phase 3 — Next Product Surface Work

- **Targets/Grail section on `/discover`** (§ 03) — user-curated aspirational watches with affiliate CTAs (Feature 14)
- **Photo type picker + document grouping** — surface `photoType` in upload/lightbox, "Papers & Provenance" section on detail page (Feature 2D/2E)
- **Ownership detail fields in EditWatchModal** — has_box, has_papers, acquisition_method, warranty_expires_at, last_serviced_at (Feature 2A)
- **Service History** — `watch_service_records` table, service timeline on detail page, next-due estimate (Feature 2F)
- `/collection` UI pass (header / stats / cards / mobile polish — Targets moved to Discover)
- Drag-to-reorder in Collection (Playground drag shipped in Phase 2)
- Save as Playground from Collection drafts
- `/profile` demo page backed by localStorage
- Public readonly box pages
- Followed → Next Targets → Grail/Jewel integration across surfaces
- Static My Collection section on profile
- Playground carousel on profile
- Followed Watches section on profile
- Clipboard profile and box share links

### Phase 4 — Public Identity + Discovery

- Account-backed `/u/[handle]` public profile routes
- Account-backed public box routes
- Strap customization
- Physical box affiliate matching

### Phase 5 — Intelligence + Advanced Commerce

- Smart Suggestions engine
- Virtual Try-On
- WatchCharts live pricing
- AI weekly digest
- Spec-fingerprint caching for the AI lookup pipeline

---

## 6.1 Current Implementation Status (Not Yet Implemented)

The items below are intentionally tracked as pending even if placeholders or toasts exist in the UI.

### Navigation & Surfaces
*(All primary routes shipped: `/news`, `/discover` (with editorial redesign), `/settings` at P0 scope, `/playground` with Supabase persistence and drag support. See open P1/P2 items below.)*

### Discover (next priority)
- **Targets/Grail section (§ 03)** — user-curated aspirational watches between Upgrade and Next Slot sections, with affiliate CTAs (Feature 14)
- Strap suggestions — lug-width-aware strap recommendations (placeholder removed 2026-05, pending redesign)
- Box upgrade affiliate card — physical watchbox matching (placeholder removed 2026-05, pending redesign)

### Collection — Ownership Depth
- **Photo type picker** in upload flow + lightbox (Feature 2D). DB columns exist (migration 018), UI not wired.
- **Papers & Provenance section** on detail page — filtered gallery view for document photos (Feature 2E)
- **Ownership detail fields in EditWatchModal** — has_box, has_papers, acquisition_method, warranty_expires_at, last_serviced_at, service_notes. Columns exist (migration 017), UI not wired.
- **Service History** — new `watch_service_records` table, timeline + next-due estimate on detail page (Feature 2F)
- `/collection` UI pass (header / stats / cards / mobile polish — see Feature 2A "Near-Term Expansion")
- Save as Playground from Collection drafts
- Drag-to-reorder in Collection (Playground drag-to-reorder is shipped)

### Settings (`/settings` shipped at P0; remaining items)
- `Download my data` (currently "Coming soon")
- Self-serve account deletion + data purge (deletion is currently mailto-backed)
- Sign out all sessions
- Notification preferences

### Profile & Public
- Account-backed public profile routes (`/u/[handle]`)
- Account-backed public box routes

### Intelligence & Commerce
- Smart Suggestions engine (Feature 8) — `/discover` ships with LLM-personalized + rule-based recommendations today; the fully personalized engine is the upgrade path
- Physical box affiliate matching at scale (the affiliate card on `/discover` is the entry point)
- Strap customization
- Virtual try-on
- WatchCharts live pricing

## 7. Success Metrics

### Engagement

- Time per session — target: >5 min
- Watches added in first session — target: >4
- Return visit rate — target: >40% within 7 days
- Profile share opens per active user — track once Feature 5 ships
- AI photo identifications per active user / month — track once Feature 9 has volume

### Revenue

- Affiliate CTR — target: >8% of impressions
- Affiliate conversion — target: 1–3%
- Revenue per user/month — target: $0.50–$2.00 at scale

### Growth

- Email list at launch — target: 1,000+
- MAU Month 3 — target: 2,500
- MAU Month 12 — target: 25,000

---

## 8. Competitive Differentiation

| Differentiator | Why It Matters |
|---|---|
| Realistic watchbox UI | No competitor has this as the core metaphor |
| Category system | Collection / Playground / Followed / Targets / Grail / Jewel is a full collector mental model |
| Profile-first sharing | Makes the product feel personal and identity-driven rather than utility-only |
| Grail treatment | Emotionally resonant, visually distinct, and highly shareable |
| AI photo identification ("Watchbox Concierge") | Two-step pipeline with web-grounded reference lookup, market-value capture, and filename-aware priors. Reduces add-friction to a single photo. |
| Per-watch photo gallery | Personal records (wrist shots, service receipts, "received it today") that survive admin curation. Standard in luxury collector apps; no commodity competitor has it. |
| Strap compatibility | Wearable suggestions, not just static affiliate links |
| Virtual try-on | Rare in watch products |
| Integrated sell listing support | Simplifies the hardest part of selling |
| Free entry point | Low friction, trust-first adoption |
| All-in-one collector surface | Collection + aspiration + discovery + commerce in one system |

---

*Virtual Watchbox · virtualwatchbox.com · PRD v1.14 · May 2026*
