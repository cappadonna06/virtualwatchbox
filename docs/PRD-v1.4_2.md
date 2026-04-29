# Virtual Watchbox PRD — v1.4

**Site:** virtualwatchbox.com  
**Tagline:** *Showcase Your Timepieces. Discover What's Next.*  
**Updated:** April 2025 — v1.5

| Version | Change |
|---|---|
| v1.0 | Initial PRD |
| v1.1 | Added Core Interaction Pattern (hover card + slide-out sidebar) |
| v1.2 | Added Physical Watch Box Commerce to monetization |
| v1.3 | Added Feature 2A — My Collection Page (views, stats, draft workflow) |
| v1.4 | Added Feature 2B — Watch Categories (Collection, Playground, Liked, Next Targets, Grail). Added watch catalog data model. Updated types. |
| v1.6 | Expanded Feature 4 — Playground Mode to full spec. Named boxes, box switcher, seeded demo data, playground sidebar mode, share flow, add watch integration via dest=playground param. |

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

Virtual Watchbox is a luxury-tech web platform that brings watch collections to life. Built for collectors, dreamers, and horological explorers — a dynamic, fully customizable virtual watch box where users can display, organize, and interact with their timepieces in stunning detail.

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

1. **Hover** — floating mini-card appears above the slot: brand, name, ref, size, estimated value, "Click to expand ↗"
2. **Click** — right-hand sidebar slides open with full detail: dial visualization, specs, ownership data, quick actions
3. **Dismiss** — re-click the slot or press ✕

**Design rules:**
- Hover card never obscures adjacent slots
- Sidebar slides in without reflowing the grid
- Only one sidebar open at a time — clicking a different watch swaps content in place
- Empty slots show Add Watch state on hover (no card, just `+` CTA)
- Active slot highlighted with gold border while sidebar is open
- Watchboxes auto-expand to the next supported slot count as watch count grows
- At max visible capacity, the final slot becomes a `+N more` overflow slot
- Clicking overflow opens a hidden-watch list: desktop flyout, mobile bottom sheet

**Applies to:** Feature 1 (homepage box), Feature 2A (collection page), Feature 4 (Playground), shared/embedded box views

---

## 3. Core Features

### Feature 1 — Virtual Watch Box Display

The homepage centerpiece. A high-fidelity grid layout replicating the look of a real watch box.

**Functional Requirements**
- Grid with configurable slot count (6, 8, 10, 12)
- Box customization: frame material (oak, walnut, carbon, leather), lining color, padding
- Box config persisted to localStorage
- Hover card + click sidebar (Section 2)
- Empty slot → Add Watch flow (Feature 3)
- Overflow handling: auto-expand through supported slot counts, then show `+N more` in the final slot
- Drag-and-drop slot reordering (P1)
- Responsive layout

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

Triggered by clicking any watch slot. The single detail surface across all views.

**Displays:** dial visualization, brand, reference, case size, material, dial color, movement, complications, condition badge, purchase date, purchase price, estimated value, notes

**Quick actions:** Find For Sale ↗ / Sell This Watch / Swap Strap

---

### Feature 2A — My Collection Page (`/collection`)

Dedicated working surface for owned watches. Three views, shared data with homepage box.

#### Views
- **Watchbox** — reuses homepage component + box customizer toolbar
- **Cards** — dial crop, brand, model, ref, type badge, value, ownership status badge
- **Stats** — factual counts only, no editorial commentary

**Watchbox overflow behavior**
- Watchbox view remains complete up to the max visible box size through auto-expansion
- If owned watches exceed the max visible capacity, the final slot becomes `+N more`
- Cards view is always the full-list surface for every watch in the collection

#### Stats (factual, no taste judgements)
- Portfolio value (total, cost basis, gain/loss)
- Dial colors — chip row with counts including zeros
- Watch types — badge grid with counts including zeros
- Complications — badge grid with counts including zeros  
- Brand breakdown — pill list

#### Draft Workflow
Any change creates a local draft. My Collection is never mutated without explicit confirmation.

Unsaved changes bar: `You have X unsaved changes` → Save to My Collection / Save as Playground / Discard

#### MVP Scope (Phase 1)
Page header, view switcher, watchbox view (reuse component), cards view, all 5 stat modules, unsaved changes bar, save/discard actions, sidebar reuse

#### Phase 2
What's Next panel with affiliate CTAs, Save as Playground modal, Review Changes drawer, card filters, Shop This Box CTA

---

### Feature 2B — Watch Categories

**This is the data model and UI system that governs how watches are classified across the entire product.**

Every watch in the system belongs to exactly one category at a time (except Grail which is a singleton). Categories determine which page/surface a watch appears on and what actions are available.

---

#### Category 1 — In My Collection

The source of truth. These are watches the user actually owns.

- Populates the homepage watchbox and `/collection` page
- Homepage and `/collection` watchbox may show a `+N more` overflow slot when owned watches exceed max visible capacity
- Stats are computed only from this category
- Managed via the Add Watch flow (Feature 3)
- Full ownership metadata: condition, purchase date, price paid, estimated value, notes
- Adding a duplicate shows a confirmation modal before proceeding

**Data:** `collectionWatches: Watch[]` in page state (session) → database in Phase 2

---

#### Category 2 — Playground Watches

Fantasy/dream collections. Not owned. Each watch is tagged to a named Playground box.

- Lives on a separate `/playground` page (not yet built)
- Multiple named boxes: "Dream Collection", "Under $10K", "Travel Box", etc.
- Playground boxes may contain more watches than the visible grid; overflow is managed in-box with a `+N more` slot
- Same hover card + sidebar interaction but sidebar shows market price, not purchase price
- Sidebar CTAs: Find For Sale ↗ / Add to My Collection
- Created via "Save as Playground" from draft changes, or built from scratch on /playground

**Data:** `playgroundBoxes: PlaygroundBox[]` where each box has a name, tag, and `watches: Watch[]`

---

#### Category 3 — Liked Watches

Watches the user has hearted. A simple save/bookmark layer.

- Heart icon visible on hover card, watch cards, and search results
- No ownership metadata required
- Shown in a `/liked` tab or section (Phase 2)
- Used as a signal for Smart Suggestions engine (Feature 6)
- Can be promoted to Next Target or added to Collection

**Data:** `likedWatchIds: string[]`

---

#### Category 4 — Next Targets

Up to 3 watches the user plans to acquire next. A focused acquisition shortlist.

**Fields per target:**
- Watch (from catalog)
- Target price (optional)
- Desired condition
- Intent type: `Addition` | `Replacement`
- If Replacement: which owned watch it would replace
- Linked playground box (optional) — "this is the box I'd have if I got this"
- Notes
- Target date (optional)

**UI:**
- Displayed as a dedicated panel or small card strip on `/collection` 
- Each target shows "Track Listings →" CTA linking to affiliate search
- Max 3 enforced — forces intentional curation

**Monetization:** affiliate CTAs on every target listing

**Data:** `nextTargets: WatchTarget[]` (max 3)

```typescript
type WatchTarget = {
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
```

---

#### Category 5 — Grail

One watch. The dream piece. Often unattainable. The emotional north star of the collection.

- Single watch slot — not a list
- Displayed prominently: on the `/collection` page as a dedicated "Your Grail" section
- Can be any watch from the catalog
- No ownership metadata — this is aspiration, not ownership
- Shows: brand, model, reference, estimated market price
- External link to manufacturer page if available
- CTA: "Find on Market →" (affiliate)

**Default Grail (hardcoded for demo):**  
A. Lange & Söhne 1815 Up/Down in 750 White Gold (Ref. 234.026)  
URL: https://www.alange-soehne.com/us-en/timepieces/1815/1815-updown/1815-updown-in-750-white-gold-234-026

**Data:** `grailWatchId: string | null`

---

#### Category Summary Table

| Category | Max | Page | Metadata | Stats | Sidebar CTAs |
|---|---|---|---|---|---|
| In My Collection | Unlimited | Homepage + /collection | Full ownership | Yes | Find For Sale, Sell, Swap Strap |
| Playground Watches | Unlimited | /playground (P2) | None | No | Find For Sale, Add to Collection |
| Liked Watches | Unlimited | /liked (P2) | None | No | Add to Collection, Add as Target |
| Next Targets | 3 | /collection panel | Target price, intent | No | Track Listings |
| Grail | 1 | /collection section | None | No | Find on Market |

---

#### Watch Catalog vs. Collection

**The catalog (`lib/watches.ts`) is not the collection.**

- Catalog: the full database of available watches (50+ references). These are search results. None are "owned" by default. Used in search/add flows.
- Collection: the user's personal list of owned watches. Starts with the 5 default Longines. Managed via Add Watch flow.
- A catalog watch becomes a collection watch when the user explicitly adds it.

**Catalog watches must never show "In Collection" status unless that specific watch has been added to the user's collection.** If a catalog watch matches an ID in `collectionWatches`, show an "In Collection" badge and a duplicate warning on add.

---

### Feature 3 — Watch Search & Add Watch Flow

The add watch experience is a dedicated helper route, not a modal and not a reflowing slide-in panel. Adding a watch is a high-intent, deliberate action — it should feel focused and durable.

---

#### Routes

- `/collection/add` — search and select a watch
- `/collection/add/[watchId]` — confirm and add the selected watch

Both routes maintain the nav bar. Navigating away or pressing ← returns to `/collection`.

---

#### Entry Points

- "Add Watch" button in CollectionHeader → `router.push('/collection/add')`
- Clicking an empty slot in any watchbox → `router.push('/collection/add')`

---

#### `/collection/add` — Search Page

**On load:** search bar only. No filters, no results. Clean starting state.

A small helper line below the search bar:
> "Search by brand, model, or reference number"

**As the user types:**
- Live results appear — each result card shows the **SVG dial render** prominently, brand, model, reference, case size + material, estimated value
- Filter chips appear contextually below the search bar, computed from the current result set
- Each chip shows a match count: `Stainless Steel (12)` `Black (8)` `≤38mm (5)`
- Zero-count chips shown but grayed out — never hidden
- Filters: **Case Material** → **Dial Color** → **Case Size** (in this order)
- Watch Type chips are NOT shown in this flow — they belong in discovery/Playground, not reference matching
- Multiple filters combine with AND logic
- "In Collection" badge on watches already owned

**Result cards** — vertical list:
- SVG dial render (prominent, left side)
- Brand (gold, uppercase, small)
- Model (serif, medium)
- Reference + case size + material (muted, one line)
- Estimated value (serif)
- "In Collection" badge if applicable

**Clicking a result:**
- Not in collection → `router.push('/collection/add/[watchId]')`
- Already in collection → inline duplicate warning expands on the card:
  > "You already own this watch. Add another?"
  > [Cancel] [Add Duplicate]
  - Add Duplicate → proceeds to `/collection/add/[watchId]`

---

#### `/collection/add/[watchId]` — Confirm Page

Watch preview at top: SVG dial, brand, model, reference.

**Single required decision:**

```
"Do you own this watch?"

[ Yes — add to My Collection ]
[ No — follow this watch     ]
```

**If Yes — I own this:**

- **Condition** (required): Unworn / Like New / Excellent / Good / Fair
- "Add purchase details" — collapsed by default, expands to show:
  - Purchase Price (optional)
  - Purchase Date (optional)
  - Notes (optional)
- Button: "Add to My Collection" — enabled once condition is selected

On confirm:
- Watch added to collection state with `ownershipStatus: 'Owned'`
- Redirect to `/collection`
- Brief success toast: "[Brand] [Model] added to your collection"
- **No unsaved changes bar** — this is a committed action, not a draft

**If No — I'm following it:**

- No condition required
- No purchase details
- Button: "Save to Followed Watches"

On confirm:
- Watch ID added to `followedWatchIds` state
- Redirect to `/collection`
- Toast: "Saved to your Followed Watches"

Followed watches feed future Playground, price alerts, and affiliate "Find for Sale" flows. No further options needed at add time.

---

#### Ownership Metadata (post-add, not at add time)

The following are collection metadata fields editable from the watch sidebar after adding — they are NOT part of the add flow:

- For Sale
- Needs Service
- Recently Added
- Condition changes
- Purchase price / date edits
- Notes

The sidebar "Edit" mode exposes these. The add flow only asks the binary own/follow question plus condition if owned.

---

#### Design Rules

- Dedicated routes, not modal, not reflowing panel
- SVG dial renders in every result card — no blank placeholders
- Filters only appear after search term is entered
- Filter order: Case Material → Dial Color → Case Size
- Watch Type chips not used in this flow
- Filter chips always show match counts, zero-count grayed not hidden
- Step 2 is one question — binary, minimal form
- Condition is the only required field when adding to collection
- Adding is a committed action — no unsaved changes bar

---

| Feature | Priority |
|---|---|
| `/collection/add` search route | P0 |
| `/collection/add/[watchId]` confirm route | P0 |
| SVG dial render in search results | P0 |
| Progressive filter reveal (Material, Color, Size only) | P0 |
| Filter chips with match counts, zeros grayed | P0 |
| In Collection badge + inline duplicate warning | P0 |
| Binary own/follow decision | P0 |
| Condition required field (own path only) | P0 |
| Collapsed optional purchase details | P0 |
| Committed add — no unsaved changes bar | P0 |
| Followed watches state | P0 |
| Empty watchbox slot → /collection/add | P0 |
| Success toast | P0 |
| Ownership metadata editable in sidebar post-add | P1 |

---

### Feature 4 — Playground Mode (`/playground`)

Dream boxes unconstrained by ownership. The creative, aspirational counterpart to My Collection. Users build named fantasy boxes from the full watch catalog, save multiple configurations, and share them publicly.

---

#### Core concept

Playground is where a collector answers: *"What would my collection look like if..."*

- No ownership required — any watch from the catalog can go in any box
- Multiple named boxes, each with its own watchbox grid
- Boxes auto-expand through supported slot counts as they grow; beyond max size they use a `+N more` overflow slot
- Same hover card → click → sidebar interaction as everywhere else, but sidebar content is different (market price, not purchase price)
- Boxes are saved, named, and optionally shared via public link

---

#### Page layout

**Header:**
- Title: "Playground" (serif, large)
- Subtitle: "Build your dream collection. No limits."
- Primary CTA: "New Box +"
- Active box tabs or dropdown switcher if multiple boxes exist

**Box switcher** (below header):
- Horizontal scrollable tab strip, one tab per saved box
- Active box: dark background, cream text
- Inactive: transparent, muted
- "+" tab at the end to create a new box
- Each tab shows box name + watch count: "Dream Collection · 4"

**Main area:**
- Watchbox grid (reuse existing WatchBox component)
- Box name editable inline — click to edit, press Enter or blur to save
- Box tag(s) below name: "Dream Box" / "Under $10K" / "Travel" / "Dress" / "Color Study"
- If a box exceeds max visible capacity, the final slot becomes `+N more`; clicking it reveals the hidden watches

**Toolbar** (above the box, same pattern as /collection):
- Slot count selector
- Sort: Manual / Brand / Value / Type
- Share Box — copies public link to clipboard
- Delete Box — with confirmation

---

#### Creating a new box

Triggered by "New Box +" tab or button.

**New Box modal** — small, centered, simple:
- Name input (required): placeholder "Name your box..."
- Tag picker (optional, multi-select chips): Dream Box / Under $10K / Travel / Dress / GMT Only / Vintage / Color Study / Upgrade Path / Lottery Box
- "Create Box" button

On create: new empty box appears, becomes the active tab.

**Seeded boxes for demo (hardcoded initial state):**
```
Box 1: "Dream Collection" — tag: Dream Box
  Watches: Patek Nautilus 5711, AP Royal Oak 15500, 
           Lange 1, Grand Seiko Snowflake, Rolex Daytona 116500

Box 2: "Under $10K" — tag: Under $10K
  Watches: Tudor Black Bay 79230N, Omega Speedmaster,
           Grand Seiko SBGW231, TAG Heuer Carrera
```

---

#### Sidebar — Playground context

The same `WatchSidebar` component, but rendered in Playground mode. Pass a `mode="playground"` prop (or similar) to switch content.

**Playground sidebar shows:**
- Dial visualization (same)
- Brand, model, reference (same)
- Case size, material, dial color, movement, complications (same)
- **Market price** instead of purchase price: "Est. Market Value: $34,000"
- Watch type badge
- **No** condition, purchase date, purchase price, notes — this watch isn't owned

**Playground sidebar CTAs (replacing the collection actions):**
- "Find For Sale →" — primary, dark button — links to Chrono24 search for that reference (affiliate)
- "Add to My Collection" — secondary, outline — triggers `/collection/add/[watchId]` flow
- "Remove from Box" — text link, muted — removes watch from this playground box

---

#### Adding watches to a Playground box

Same entry points as collection:
- Click an empty slot → navigates to `/collection/add?dest=playground&boxId=[id]`
- The add watch search page detects `dest=playground` and skips the own/follow question entirely — just search, select, and add directly to the box

On the `/collection/add` search page, if `dest=playground` is in the URL:
- Header changes to: "Add to [Box Name]"
- No Step 2 ownership question — clicking a result card adds it directly to the playground box and returns
- No condition required — playground watches have no ownership metadata

---

#### Sharing a box

"Share Box" in toolbar:
- Generates a URL: `/playground/share/[boxId]` (or a slug)
- Copies to clipboard with a brief toast: "Link copied to clipboard"
- Shared view is read-only — shows the box with hover cards but no edit controls
- Shared page shows: box name, tag, watch count, the grid, a "Build Your Own →" CTA at the bottom

For now, share links are session-only (no persistence). The URL format is defined but doesn't need to resolve in Phase 1.

---

#### Drag to reorder

Within a playground box, watches can be dragged between slots to reorder. No draft workflow needed here — Playground changes are not "source of truth" data so they can mutate directly without confirmation.

---

#### Design rules

- Same cream/gold/ink design language as /collection
- Playground gets a subtle visual distinction from /collection — consider a slightly warmer or more playful feel without breaking the design system. A thin gold top border on the page, or a slightly different empty slot treatment.
- Box name is always editable inline — single click to activate, no separate edit mode
- Empty slots in Playground use the same Add Watch state but with slightly different copy: "Add a watch" not "Add to collection"
- Cards view remains the full-list surface even when watchbox view is overflowing
- No unsaved changes bar — Playground changes commit immediately

---

#### Data model (session state)

```typescript
// Already defined in types/watch.ts from Feature 2B:
type PlaygroundBox = {
  id: string
  name: string
  tags: string[]
  watchIds: string[]  // references into catalog
  createdAt: string
}

// In page state:
const [playgroundBoxes, setPlaygroundBoxes] = useState<PlaygroundBox[]>(SEEDED_BOXES)
const [activeBoxId, setActiveBoxId] = useState<string>(SEEDED_BOXES[0].id)
```

Watches in a playground box are resolved from the catalog by `watchId` at render time — the box stores IDs, not full Watch objects.

---

#### MVP Scope (Phase 1 — build now)

| Feature | Priority |
|---|---|
| /playground page with header and box switcher | P0 |
| Seeded demo boxes with real catalog watches | P0 |
| WatchBox component reused with playground data | P0 |
| Hover card + sidebar in Playground mode | P0 |
| Playground sidebar CTAs (Find For Sale, Add to Collection, Remove) | P0 |
| Inline box name editing | P0 |
| New Box modal with name + tag picker | P0 |
| Add watch to playground (via empty slot → /collection/add?dest=playground) | P0 |
| Share button with clipboard copy toast | P0 |
| Delete box with confirmation | P0 |
| Watchbox overflow handling | P0 |
| Slot count toolbar control | P1 |
| Drag to reorder within box | P1 |
| Public share page (/playground/share/[id]) | P2 |
| Save as Playground from /collection draft changes | P2 |

---

### Feature 5 — Strap Customization & Matchmaking

Virtually swap straps with compatibility filtering by lug width. Affiliate-linked purchase CTAs. Phase 2.

---

### Feature 6 — Smart Suggestions Engine

Personalized watch and strap recommendations based on collection, likes, search history. Phase 3.

---

### Feature 7 — Upload from Photo & Image Recognition

Upload a watch photo → AI identifies brand/model → add to collection. Phase 3.

---

### Feature 8 — Virtual Try-On Room

Upload wrist photo → overlay selected watch at correct scale. Phase 3.

---

### Feature 9 — Watch Newsfeed

RSS-aggregated content from Hodinkee, Fratello, Monochrome, etc. Phase 2.

---

### Feature 10 — Integrated Buying, Selling & Listing

Find For Sale deep-links, AI pricing suggestion, listing generator for Chrono24/eBay/Reddit. Phase 2.

---

## 4. Monetization Strategy

Free to all users. Revenue embedded in the experience.

### 4.1 Affiliate (Primary)

Every watch, strap, and box link carries an affiliate tag.

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

When a user configures their virtual box (slot count, material, color), a "Shop This Box" CTA surfaces affiliate links to physically matching boxes. Custom order flow for configurations with no off-the-shelf match.

Revenue: 8–15% affiliate on off-the-shelf (~$150–$800 AOV), or flat referral fee on custom orders.

**Next Targets** and **Grail** surfaces also carry "Track Listings →" and "Find on Market →" affiliate CTAs respectively.

### 4.3 Sponsored Placements

Flat monthly fee or CPC. Featured spots in suggestions panel, newsfeed, strap picker.

### 4.4 Sell-Side Lead Gen

Structured sell intent (watch + condition + price paid) passed to dealer partners as qualified leads. $50–$200/lead.

### 4.5 Future

White-label licensing, insurance partnerships (Chubb/Hodinkee), authentication/service referrals, anonymized data product.

---

## 5. Technical Stack & Integrations

### Frontend
- Next.js 14 (app router), TypeScript strict
- Inline styles as primary pattern (no Tailwind except responsive grid utilities)
- CSS variables: `--font-cormorant`, `--font-dm-sans`
- Colors: ink `#1A1410`, cream `#FAF8F4`, muted `#A89880`, gold `#C9A84C`, border `#EAE5DC`

### Data Model (current — session state, no persistence yet)

```typescript
// types/watch.ts — add these if not present
export type OwnershipStatus = 'Owned' | 'For Sale' | 'Recently Added' | 'Needs Service'
export type WatchType = 
  | 'Diver' | 'Dress' | 'Sport' | 'Chronograph' 
  | 'GMT' | 'Pilot' | 'Field' | 'Integrated Bracelet' | 'Vintage'
export type WatchCondition = 'Unworn' | 'Like New' | 'Excellent' | 'Good' | 'Fair'

// Add to Watch interface if not present
// ownershipStatus: OwnershipStatus
// watchType: WatchType

// New types for watch categories
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

export type PlaygroundBox = {
  id: string
  name: string
  tags: string[]
  watchIds: string[]
  createdAt: string
}

// lib/userState.ts — user's personal state (all session-only for now)
export type UserCollectionState = {
  collectionWatches: Watch[]    // Category 1 — In My Collection
  likedWatchIds: string[]       // Category 3 — Liked
  nextTargets: WatchTarget[]    // Category 4 — Next Targets (max 3)
  grailWatchId: string | null   // Category 5 — Grail
  playgroundBoxes: PlaygroundBox[] // Category 2 — Playground
}
```

### Backend (Phase 2)
- Supabase (PostgreSQL) for persistence
- Supabase Auth for accounts
- Cloudinary for watch photos
- Redis (Upstash) for caching

### APIs (Phase 3)
- WatchBase — watch database
- WatchCharts — market pricing
- Chrono24 — live listings
- Google Vision AI — photo recognition
- OpenAI — suggestions + AI digest

---

## 6. MVP Build Roadmap

### Phase 1 — Shipped
- Homepage watchbox with box customizer
- Collection page (watchbox, cards, stats views)
- Sidebar detail panel
- 5 default Longines in collection

### Current Sprint — Feature 3
- Watch catalog (50+ references across 10 brands)
- Add Watch modal (search → configure → add)
- Empty slot → Add Watch flow
- Duplicate warning modal
- In Collection badge in search results
- Watch categories data model (types defined)
- Grail section on /collection (hardcoded A. Lange demo)
- Liked watch heart interaction (UI only)
- Next Targets panel on /collection (UI stub)

### Phase 2
- /playground page
- Persistent state (Supabase)
- User accounts
- Save as Playground from draft changes
- Newsfeed (RSS)
- Physical box affiliate matching
- Strap picker

### Phase 3
- Smart Suggestions engine
- Photo recognition
- Virtual Try-On
- WatchCharts live pricing
- AI weekly digest

---

## 7. Success Metrics

### Engagement
- Time per session — target: >5 min
- Watches added in first session — target: >4
- Return visit rate — target: >40% within 7 days

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
| Realistic visual box UI | No competitor has this as the core metaphor |
| Watch category system | Collection / Playground / Liked / Targets / Grail — a complete collector mental model |
| Grail feature | Emotionally resonant, unique, viral sharing potential |
| Strap compatibility | Wearable suggestions, not just pretty affiliate links |
| AI photo recognition | Zero data-entry friction |
| Virtual try-on | Unique in watch space |
| Integrated sell listing | Simplifies the hardest part of selling |
| 100% free | Frictionless entry, trust-first |
| Everything in one place | Collection + Discovery + News + Commerce |

---

*Virtual Watchbox · virtualwatchbox.com · PRD v1.4 · April 2025*
