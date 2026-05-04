# Virtual Watchbox PRD — v1.11

**Site:** virtualwatchbox.com  
**Tagline:** *Showcase Your Timepieces. Discover What's Next.*  
**Updated:** May 2026 — v1.11

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

---

## 3. Core Features

### Feature 1 — Virtual Watch Box Display

The homepage centerpiece. A high-fidelity grid layout replicating the feel of a real watch box.

**Functional Requirements**
- Grid with configurable slot count: `4`, `6`, `8`, `10`
- Box customization: frame material, lining, slot count
- Box config persisted locally
- Hover card + click sidebar (Section 2)
- Empty slot → Add Watch flow (Feature 3)
- Overflow handling: auto-expand through supported slot counts, then show `+N more` in the final slot
- Responsive layout
- Drag-and-drop slot reordering (P1)

| Feature | Priority |
|---|---|
| Box grid display | P0 |
| Hover card + sidebar | P0 |
| Box customizer (frame, lining, slot count) | P0 |
| Empty slot Add Watch flow | P0 |
| Watchbox overflow handling | P0 |
| Drag & drop reorder | P1 |

---

### Feature 2 — Watch Detail Sidebar

Triggered by clicking any watch slot. This is the shared detail surface across owned, aspirational, and public watchbox experiences.

**Displays:** dial visualization or product image, brand, model, reference, case size, material, dial color, movement, complications, condition/value badges, estimated value, and supporting notes/specs depending on surface.

**Quick actions vary by surface:**
- **Collection:** Find For Sale ↗ / Sell This Watch / Swap Strap / Edit / Delete
- **Playground:** Find For Sale ↗ / Add to My Collection / Edit / Delete
- **Public readonly surfaces:** Find For Sale ↗ plus any non-mutating public CTA

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
- Next Targets panel with affiliate CTAs
- Grail section
- Mobile `...` overflow should eventually include `Add from Photo` as a lightweight collection entry point
- Save as Playground flow
- Review Changes drawer
- Card filters
- Shop This Box CTA

#### View C — Real Watchbox Photo (camera icon)

A third Collection view that represents the collector’s **actual physical watchbox** as a photo surface, separate from the virtual slot UI and card list.

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
- Account mode (future): cloud object storage

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
- Managed via the Add Watch flow (Feature 3)
- Full ownership metadata: condition, purchase date, price paid, estimated value, notes
- Adding a duplicate is allowed; duplicate context is surfaced in the add flow detail step

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
- Dedicated panel or strip on `/collection`
- Public profile surfacing is possible later, but `/collection` is the primary working surface
- Each target includes `Track Listings →` affiliate CTA

**Data:** `nextTargets: WatchTarget[]` (max 3)

---

#### Category 5 — Grail

Exactly one followed watch designated as the user’s emotional north star.

**Rules**
- Must be a followed watch
- Must not be in My Collection
- Exactly one at a time
- Special crown-icon treatment and dedicated visual emphasis

**UI**
- Surfaced prominently in the profile card
- Also eligible for dedicated future surfacing on `/collection`
- Shows brand, model, reference, and estimated market price
- CTA: `Find on Market →`

**Data:** `grailWatchId: string | null`

---

#### Category 6 — Collection Jewel

Exactly one owned watch designated as the centerpiece or pride of the user’s actual collection. This is the owned counterpart to Grail.

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
| In My Collection | Unlimited | Homepage + `/collection` | Full ownership | Yes | Find For Sale, Sell, Swap Strap |
| Playground Watches | Unlimited | `/playground` | Per-box config + optional per-entry overrides | Box-level only | Find For Sale, Add to Collection, Edit, Delete |
| Followed Watches | Unlimited | Dedicated surface pending; profile section later | None | No | Add to Collection, Promote to Target, Set as Grail |
| Next Targets | 3 | `/collection` panel | Target metadata on followed watches | No | Track Listings |
| Grail | 1 | Profile card + future collection section | Special designation on unowned followed watch | No | Find on Market |
| Collection Jewel | 1 | Collection watchbox/cards + profile hero | Special designation on owned watch | No | View in Collection, Swap Strap, Service, Insure |

---

#### Watch Catalog vs. Collection

**The catalog (`lib/watches.ts`) is not the collection.**

- Catalog: all available references used in search/add/discovery flows
- Collection: the user’s owned watches
- A catalog watch becomes an owned watch only when explicitly added to Collection

Catalog watches must never show owned status unless the user has actually added that watch to the collection state.

---

### Feature 3 — Watch Search & Add Watch Flow

The add-watch experience is a dedicated helper route, not a modal and not a reflowing slide-in panel. Adding a watch is a focused, durable action.

#### Routes

- `/collection/add` — search and select a watch
- `/collection/add/[watchId]` — detail + confirm

Both routes maintain the nav bar.

#### Entry Points

- Add Watch button in CollectionHeader → `/collection/add`
- Empty slot in Collection watchbox → `/collection/add`
- Empty slot in Playground box → `/collection/add?dest=playground&boxId=[id]`

#### Search Page (`/collection/add`)

**On load:** search bar only, no filters, no results.

Helper line:
> Search by brand, model, or reference number

**As the user types:**
- Live results appear
- Each result card shows SVG dial render, brand, model, reference, case size/material, estimated value
- Filter chips appear contextually below search
- Chips show match counts
- Zero-count chips are grayed out, not hidden
- Filters:
  - Case Material
  - Dial Color
  - Case Size
- Watch Type chips are intentionally excluded from this flow
- Already owned watches show `In Collection`

**Clicking a result:**
- always routes to `/collection/add/[watchId]`
- preserves relevant context such as `dest`, `boxId`, and future `from`
- if already owned, duplicate context is surfaced on the detail page rather than as the main search branching interaction

#### Detail + Confirm Page (`/collection/add/[watchId]`)

The second step is a product-detail screen, not a plain confirm form.

**Surface content:**
- Large watch image
- Heart/follow action over the image
- Brand, model, reference
- Quick spec strip
- Estimated market value
- Watch specifications block
- Duplicate/owned note when applicable

**Primary decision:**

`Where does it go?`

- Add to My Collection
- Add to Playground

**Collection path**
- Condition required
- Optional purchase details accordion
- CTA: Add to My Collection
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

| Feature | Priority |
|---|---|
| `/collection/add` search route | P0 |
| `/collection/add/[watchId]` detail + confirm route | P0 |
| SVG dial render in search results | P0 |
| Progressive filter reveal | P0 |
| Filter chips with match counts | P0 |
| `In Collection` badge + duplicate note | P0 |
| Collection vs Playground intent selector | P0 |
| Condition required field (Collection path only) | P0 |
| Inline Playground box picker/creation | P0 |
| Contextual `from` parameter for eyebrow/back link | P0 |
| Followed watches state | P0 |
| Ownership metadata editable later | P1 |

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

#### Sharing a Box

Playground sharing is part of the broader profile/share system, not a standalone temporary link mechanic.

- Box shares should resolve to the public box surface
- Clipboard share links are P0
- OG image generation is P1
- Desktop can use hover affordances
- Mobile must expose a visible share action

#### Drag to Reorder

Still planned. No draft workflow is required for Playground reorder interactions.

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
| Drag to reorder within box | P1 |

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
- `Marc’s Profile`
- `Marc’s Collection`
- `Marc’s Dream Collection`

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
| Future `/u/[handle]` route model | P1 |
| OG image generation for share cards | P1 |
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

### Feature 7 — Strap Customization & Matchmaking

Virtually swap straps with compatibility filtering by lug width. Affiliate-linked purchase CTAs.

---

### Feature 8 — Smart Suggestions Engine

Personalized watch and strap recommendations based on collection, followed watches, search history, and future behavior signals.

---

### Feature 9 — Upload from Photo & Image Recognition

Upload a watch photo, identify it, and add it to the app.

---

### Feature 10 — Virtual Try-On Room

Upload a wrist photo and preview a selected watch at approximate scale.

---

### Feature 11 — Watch Newsfeed

RSS-aggregated content from leading watch publications.

---

### Feature 12 — Integrated Buying, Selling & Listing

Find For Sale deep-links, pricing suggestions, and listing helpers for key resale surfaces.

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

export type UserCollectionState = {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  collectionJewelWatchId: string | null
  playgroundBoxes: PlaygroundBox[]
  selectedWatchId: string | null
  publicProfile: PublicProfileState
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

### Backend (later phase)

- Supabase (PostgreSQL) for persistence
- Supabase Auth for accounts
- Cloudinary for watch photos
- Redis / edge caching as needed

### APIs (future)

- WatchBase — watch reference data
- WatchCharts — market pricing
- Chrono24 — live listings / deep links
- Google Vision AI — photo recognition
- OpenAI — suggestion generation and AI digest surfaces

---

## 6. MVP Build Roadmap

### Phase 1 — Shipped

- Homepage watchbox with box customizer
- Collection page with watchbox, cards, and stats section
- Shared sidebar detail panel
- 5 default owned watches in collection
- Shared watchbox overflow handling (`+N more`, desktop flyout, mobile sheet)
- Watch catalog (50+ references across multiple brands)
- Add-watch search route plus redesigned detail/confirm page
- Followed Watches heart interaction + toast
- `/playground` page with box switching, customization, cards view, stats, share action, delete flow, and per-entry editing

### Phase 2 — Next Product Surface Work

- `/profile` demo page backed by localStorage
- Public readonly box pages
- Followed → Next Targets → Grail/Jewel integration
- Static My Collection section on profile
- Playground carousel on profile
- Followed Watches section on profile
- Clipboard profile and box share links
- Save as Playground from Collection drafts
- Drag-to-reorder in Collection and Playground

### Phase 3 — Persistence + Public Identity

- Persistent state
- User accounts
- `/u/[handle]` public profile routes
- Account-backed public box routes
- Newsfeed (RSS)
- Physical box affiliate matching
- Strap customization

### Phase 4 — Intelligence + Advanced Commerce

- Smart Suggestions engine
- Photo recognition
- Virtual Try-On
- WatchCharts live pricing
- OG image generation for profile and box share surfaces
- AI weekly digest

---

## 6.1 Current Implementation Status (Not Yet Implemented)

The items below are intentionally tracked as pending even if placeholders or toasts exist in the UI.

### Navigation & Surfaces
- Dedicated `Discover` destination route/surface (beyond search handoff)
- Dedicated `News` route and RSS-fed reading surface

### Collection
- Full edit workflow for owned-watch detail metadata from sidebar
- Save as Playground from Collection drafts
- Drag-to-reorder parity across all Collection surface modes
- **Feature 2A View C:** Real Watchbox Photo (camera icon mode)
- Collection Jewel state, badges, sidebar actions, and profile hero selector

### Profile & Public
- Account-backed public profile routes (`/u/[handle]`)
- Account-backed public box routes
- OG image generation for profile/box share surfaces

### Persistence & Identity
- User accounts and cloud persistence (beyond local/session demo state)

### Intelligence & Commerce
- Newsfeed production integration
- Physical box affiliate matching
- Strap customization
- Photo recognition
- Virtual try-on
- WatchCharts live pricing

## 7. Success Metrics

### Engagement

- Time per session — target: >5 min
- Watches added in first session — target: >4
- Return visit rate — target: >40% within 7 days
- Profile share opens per active user — track once Feature 5 ships

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
| Strap compatibility | Wearable suggestions, not just static affiliate links |
| AI photo recognition | Reduces data-entry friction |
| Virtual try-on | Rare in watch products |
| Integrated sell listing support | Simplifies the hardest part of selling |
| Free entry point | Low friction, trust-first adoption |
| All-in-one collector surface | Collection + aspiration + discovery + commerce in one system |

---

*Virtual Watchbox · virtualwatchbox.com · PRD v1.10 · May 2026*