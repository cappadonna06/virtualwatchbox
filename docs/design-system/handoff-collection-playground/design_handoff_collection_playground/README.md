# Handoff: My Collection & Playground (Virtual Watchbox)

## Overview

This bundle contains design references for two pages of a virtual watchbox app:

- **My Collection** — a watch collector's source-of-truth view: every watch they own, with a Watchbox grid (visual layout) and Cards grid (data-dense), plus a redesigned single-column **Collection Stats** data sheet below the fold.
- **Playground** — a "dream collection" sandbox: multiple boxes of wishlist watches, each renamable, taggable, and shareable.

The two pages share a header anatomy, a sidebar panel, the WatchBox/Cards grid system, the Share Box modal, and several primitives. They diverge where the domain demands — the Playground adds a **box selector** (tabs), a **per-box meta strip**, and a **New Box modal**.

## About the Design Files

The HTML/JSX files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. They use React + Babel + inline `React.createElement` calls so they could run in an isolated preview environment.

Recreate these designs in the target codebase's existing environment (React, Vue, SwiftUI, native, etc.) using its established patterns and component library. Don't ship the JSX as-is. If the project doesn't yet have a frontend, pick the most appropriate framework and implement there.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are pixel-accurate. The design tokens listed below are exact values pulled from the source.

---

## Pages

### 1. My Collection (`collection/My Collection.html`)

**Purpose:** the user's source of truth. Every watch they own.

**Header anatomy (top to bottom):**

1. **Title row.** Serif `H1` "My Collection" (Cormorant Garamond, 48px / 400 / line-height 1.1) + sans tagline "Your source of truth." (DM Sans, 14px, color `#A89880`). Baseline-aligned, separated by an 18px gap.
2. **Meta row.** Below the title row, separated by a `1px solid #EAE5DC` divider:
   - **Left:** dark `+ Add Watch` primary button — bg `#1A1410`, text `#FAF8F4`, 11px DM Sans, 0.08em tracking, uppercase, padding `9px 22px 9px 18px`, radius 4px.
   - **Center cluster:** three meta chips separated by `1px × 14px` vertical dividers (`#EAE5DC`):
     - `WATCHES` micro-label + count value
     - `EST. VALUE` micro-label + formatted USD value
     - `STATS ↓` link — smooth-scrolls to `#stats` section
   - **Right (margin-left auto):** `{n} unsaved` indicator (color `#C9A84C`, `opacity: 0.85`), only shown when `unsaved > 0`.
3. **Toolbar.** View switcher on the left (Watchbox / Cards / Photo). On the right: the **Order dropdown** (Cards-only) + **Share Box** outline button.

**Body:** two-column grid `1fr 320px`, 32px gap, 1280px max-width, 56px horizontal padding.
- Left: WatchBox grid (visual rows of watches in gold compartments) or Cards grid.
- Right: `<WatchSidebar mode="collection">` — sticky; full detail or empty state.

**Below the fold:** `<CollectionStats>` — the redesigned single-column data sheet (see "Collection Stats" section below).

**Bottom:** when `unsaved > 0`, a fixed dark bar at the bottom of the viewport with "Discard" and "Save" buttons. Background `#1A1410`, top border `#3A3028`, padding `14px 56px`.

---

### 2. Playground (`playground/Playground.html`)

**Purpose:** dream-collection sandbox. Users have multiple "boxes," each a themed wishlist (e.g. "Dream Collection," "Under $10K," "Travel Trio").

**Header anatomy (top to bottom):**

1. **Title row.** Serif `H1` "Playground" + tagline "Build your dream collection. No limits." Same typographic treatment as Collection.
2. **Box tabs.** A row of tab buttons (one per box) terminated by a `+` button to create a new box.
   - Each tab: box name (12px DM Sans) + small `· N` count (10px, dimmed).
   - **Active tab:** bg `#FAF8F4`, `border: 1px solid #EAE5DC`, top corners rounded 8px, bottom border merges into the strip's border (overlap trick: `marginBottom: -1`).
   - **Inactive tab:** transparent, color `#A89880`.
   - **+ button:** 30×30 dashed-border square, color `#A89880`, gap 4px after the last tab.
   - The whole strip is `border-bottom: 1px solid #EAE5DC` and is horizontally scrollable when there are many boxes.
3. **Box meta strip.** Below the tabs, separated by a divider:
   - **Left cluster:**
     - Serif `H2` box name (Cormorant Garamond, 24px / 400). Click → inline rename (input replaces the H2; same font/size, gold underline `1.5px solid #C9A84C`; Enter or blur commits, Esc cancels).
     - Pencil-icon button next to it (24×24, 6px radius, white bg, `#EAE5DC` border).
     - Tag pills follow — small rounded-full chips, `border: 1px solid #EAE5DC`, color `#A89880`, font-size 9.5px, padding `2px 9px`.
   - **Right cluster:**
     - `{n} Watches` lightweight uppercase label.
     - **+ Add Watch** primary button (slightly tighter than Collection's: padding `8px 14px`).
     - **Delete Box** outline button — `border: 1px solid #EAE5DC`, color `#A89880`, white bg. **Only when `boxes.length > 1`.** Click → inline confirm: text "Delete?" + Cancel + dark Delete button. No modal.
4. **Toolbar.** Identical to Collection: View switcher + Order (Cards-only) + Share Box.

**Body:** identical layout to Collection. `<WatchSidebar mode="playground">` — action button is "Remove from box" instead of edit/notes.

**Empty state:** when a box has no watches, replace the grid with a dashed-border placeholder:
- bg `#FFFCF7`, border `1px dashed #D4CBBF`, radius 12px, padding `64px 24px`, centered.
- "EMPTY BOX" eyebrow → serif "Add a watch to start dreaming." → primary `+ Add Watch` button.

**Diff vs Collection:**
- Playground does **not** show Est. Value or a Stats jump in the header chrome (those are portfolio-analysis features that belong with the real collection).
- Playground replaces Collection's page-level meta row with the **box meta strip**.
- Box-scoped affordances (rename, delete, tags, add watch) live with the box, not the page.

---

## Collection Stats — the redesign

The original CollectionStats was a **two-column card grid** with separate cards for value, brand breakdown, dial color, complications, etc. The heights never balanced and scanning was awkward. We rebuilt it as a **single-column data sheet**.

### Section anatomy (top to bottom)

1. **Section header.** Serif H2 "Collection Stats" (Cormorant Garamond, 32px / 400) + tagline "A factual breakdown of what you own." On the right, a **mode toggle pill**.
2. **Mode toggle pill.** Dark rounded-full container (bg `#1A1410`, padding 4px, radius 999px). Two options: `Overview` / `Graphical`. Active = white pill on dark; inactive = `rgba(250,248,244,0.55)`. Pill itself has a subtle shadow `0 2px 10px rgba(26,20,16,0.10)`.
3. **Body** — two modes:

### Overview mode

A **Portfolio Value Row** card stacked above a **Data Sheet** card.

**Portfolio Value Row.** Single card (`#FFFCF7`, `1px solid #EAE5DC`, radius 12px, padding `20px 24px`). Inside: 4–5 cells laid out as `flex-wrap` with each cell `flex: 1 1 0; min-width: 140px`:

| Cell | Label | Value (serif Cormorant 26px / 500) | Color | Notes |
|---|---|---|---|---|
| 1 | `TOTAL EST. VALUE` | sum of `estimatedValue` | `#1A1410` | |
| 2 | `COST BASIS` | sum of `purchasePrice` | `#1A1410` | |
| 3 | `GAIN / LOSS` | `±$N,NNN` with `↑`/`↓` glyph | green `#2D6A2D` if ≥0 else red `#8A2020` | |
| 4 | `MEDIAN VALUE` | sorted middle | `#1A1410` | |
| 5 | `HIGHEST` | max value | gold `#C9A84C` | sub-line: `{brand} {model}` truncated |

Each cell: micro-label `marginBottom: 6` then the serif value.

**Data Sheet card.** Single card (same surface as above, padding `0 24px`) containing **4 stacked rows** separated by `1px solid #EAE5DC` hairlines.

Each row uses a **3-column grid**:

```
gridTemplateColumns: "180px 1fr auto"
gap: 24
padding: "18px 0"
```

- **Column 1** — `MICRO-LABEL` (10px DM Sans, 0.14em, uppercase, `#A89880`)
- **Column 2** — wrapping flex of values (the chips/swatches)
- **Column 3** — optional **reveal toggle** ("Show all (+N)" / "Show fewer" with a chevron that rotates 180°). Only present when there are zero-count items hidden.

The 4 rows:

1. **Dial Colors.** Inline pill-swatches: 18px circle of the color hex (`Black #1A1410`, `White #F5F0E8`, `Blue #1B2A4A`, `Grey #7A7A7A`, `Green #2A4A2E`, `Silver #D4CDC0`, `Champagne #E8D9B0`, `Salmon #E8C8B8`, `Brown #7A5A3A`, `Red #A83838`) + name + count. Light colors (White, Champagne, Silver) get a `1px solid #D4CBBF` ring around the swatch so they're visible. Zero-count rows are dimmed `opacity: 0.45`.
2. **Watch Types.** `StatChip` row from `ALL_WATCH_TYPES` (Diver, Dress, Sport, Chronograph, GMT, Pilot, Field, Integrated Bracelet, Vintage). Filled chip = `#1A1410` bg / `#FAF8F4` text. Dim chip = transparent / `1px solid #EAE5DC` / `#C8BCA9` text.
3. **Complications.** Same chip vocabulary, sourced from `ALL_COMPLICATIONS` (Date, Day-Date, GMT, Chronograph, Moonphase, Annual Calendar, Perpetual Calendar, Power Reserve, Tourbillon).
4. **Brands.** Sourced dynamically from `watches`. Different chip style: `bg: rgba(201,168,76,0.10)`, color `#8A6A10`, with `×N` count in a small dim suffix. This is the "last row" — `borderBottom: none`.

### Graphical mode

Replaces the Data Sheet (Portfolio Value Row stays). Single card (same surface) with a value-by-brand bar chart.

- **Header.** `VALUE BY BRAND` micro-label on the left; "{N} brands · ${total} total" sub on the right.
- **Each row.**
  - Top line: brand name (12px / 500) on left, "${value} · {pct}%" on right (`#A89880`).
  - Bar track: 6px tall, `bg #F0EBE3`, radius 3px.
  - Bar fill: gold gradient `linear-gradient(90deg, #C9A84C 0%, #B89535 100%)`, animated width `transition: width 0.4s ease`.

### Reveal-toggle pattern (key interaction)

`Show all (+N)` is a deliberate component used in three of the four data-sheet rows. Behavior:

- When closed (default): only zero-count items are hidden. A button labeled `Show all (+N)` appears in column 3.
- When open: zero-count items render dimmed. Button label flips to `Show fewer`. A chevron rotates 180°.
- Hidden when `hiddenCount === 0`.

Style: 10px DM Sans, 0.10em tracking, uppercase, `#A89880`, no border/bg, gap 4px to a 10px chevron.

---

## Modals

There are **three modal-shaped surfaces** in the system. The third is technically inline-confirm — included here for completeness.

### Modal 1 — Share Box (`ShareBox.jsx`, used by both pages)

**Trigger:** "Share Box" outline button in the toolbar (white bg, `1px solid #EAE5DC`, share-arrow icon, hover turns border + text gold `#C9A84C`/`#8A6A10`).

**Backdrop:** `position: fixed; inset: 0; z-index: 200; background: rgba(26,20,16,0.5); backdropFilter: blur(4px);` — clicking the backdrop closes.

**Container:** `max-width: 620px`, full-width, bg `#FFFCF7`, `1px solid #EAE5DC`, radius 14px, shadow `0 24px 60px rgba(26,20,16,0.32)`, `overflow: hidden`. `e.stopPropagation()` on the container so backdrop click doesn't fire when interacting inside.

**Anatomy (top to bottom):**

1. **Header band.** Padding `18px 22px`, bottom border `1px solid #EAE5DC`. `flex space-between`:
   - Left: `SHARE` eyebrow → serif H3 "Your Public *Watchbox.*" (22px / 400; second word italic via `<em>`).
   - Right: 14px close-X icon button (transparent, color `#A89880`).
2. **OG-image preview.** Padding `22px 22px 14px`. Above the preview: micro-label split row — left "Preview · 1200 × 630", right "Auto-generated" in gold `#C9A84C`.

   The preview itself is an actual rendered approximation of the share image:
   - Container: `aspectRatio: 1200/630`, radius 10, `background: linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)`, `1px solid #2A2520`.
   - Gold radial glow overlay: `background: radial-gradient(ellipse 60% 55% at 30% 50%, rgba(201,168,76,0.12) 0%, transparent 70%)`.
   - Two columns: `38%` left meta + `62%` right mini-watchbox.
   - **Left column** (padding `7% 6%`, justify-between):
     - Top: `VIRTUAL WATCHBOX` eyebrow (`rgba(201,168,76,0.85)`, clamp font), serif handle "{handle}'s" + italic serif "Watchbox." both `clamp(20px, 4cqw, 38px)`, color `#FAF8F4`.
     - Bottom: `{N} WATCHES · EST.` micro-label, then formatted total in DM Sans Bold gold `#C9A84C`, `clamp(14px, 2.6cqw, 24px)`.
   - **Right column** (padding `4% 5% 4% 0`):
     - 3:2 mini watchbox: gold gradient bg `linear-gradient(180deg, #C9A04C 0%, #B58836 100%)`, `1px solid #A87A2E`, radius 6, padding 3%, shadow `0 8px 28px rgba(0,0,0,0.4)`.
     - Inside: `display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 3%`. 6 cells; filled cells show `<img>` (or `<DialSVG>` fallback) on `#FFFCF7` with `1px solid #E0DAD0`; empty cells are `#F5EFE5` with `1.5px dashed #D0C9BE`.
3. **Public profile link row.** Padding `0 22px 14px`. Micro-label `PUBLIC PROFILE LINK`. Then a flex container: `bg #FAF8F4, 1px solid #EAE5DC, radius 6, padding 8px 8px 8px 14px`. Contains:
   - Truncating URL display (12px DM Sans).
   - **Copy button**: dark `#1A1410`, white text, 4px radius, copy icon. On click → `navigator.clipboard.writeText(url)`, switches to green state (`bg #E8F4E8`, color `#2D6A2D`, check icon, label "Copied") for 1.8s.
4. **Share targets row.** Padding `0 22px 22px`. `flex gap 8`. Four equal `flex: 1` outline buttons:
   - X / Twitter — `https://twitter.com/intent/tweet?text={text}&url={enc}`
   - Threads — `https://www.threads.net/intent/post?text={text}%20{enc}`
   - Email — `mailto:?subject={text}&body={enc}`
   - Download — placeholder; in production, exports the rendered 1200×630 OG image as PNG.
   - Style: white bg, `1px solid #D4CBBF`, color `#1A1410`, 10.5px DM Sans 0.08em uppercase, padding `9px 12px`, radius 4.
5. **Footer band.** Padding `10px 22px`, top border `1px solid #EAE5DC`, bg `#FAF8F4`. Left text: "Shared links open your public profile." (11px `#A89880`). Right link: gold `#C9A84C` "Profile settings →".

### Modal 2 — New Box (Playground only)

**Trigger:** the dashed `+` button at the end of the box-tab strip.

**Backdrop:** same as Share Box.

**Container:** `max-width: 460px`, padding `24px`, same surface treatment as Share Box.

**Anatomy:**

1. `NEW BOX` eyebrow.
2. Serif H3 "Start a new playground box." (Cormorant Garamond, 28px / 400).
3. **Box Name** label + input. Input: full-width, padding `10px 12px`, `1px solid #EAE5DC`, radius 6, white bg, 13px DM Sans, no outline. Auto-focuses on open. Submits on `Enter`.
4. **Tags · optional** label + chip toggle row. Presets:
   ```
   Dream Box, Under $10K, Travel, Dress,
   GMT Only, Vintage, Color Study, Upgrade Path
   ```
   Toggle off: 11px DM Sans `#A89880`, `1px solid #EAE5DC`, radius 20.
   Toggle on: dark fill `#1A1410`, text `#FAF8F4`, `1px solid #1A1410`.
5. **Footer.** Two-column grid (`1fr 1fr`, gap 8):
   - Cancel: outline secondary (`bg transparent, 1px solid #D4CBBF, color #1A1410`).
   - Create Box: primary dark, **disabled** (cursor: not-allowed, bg `#D4CBBF`) until `name.trim()` is non-empty.

On submit: creates a box with id `box-{Date.now()}`, the entered name, selected tags, empty `watchIds`, default `slotCount: 6`. Closes modal, switches to the new box, fires "Box created" toast.

### Modal 3 — Inline Delete confirm (Playground; not a real modal)

**Trigger:** "Delete Box" outline button in the box meta strip.

**Behavior:** the button replaces itself in-place with an inline row:

- Text "Delete?" (11px DM Sans, color `#A89880`).
- **Cancel** outline button — 10px / 500 / 0.06em uppercase, `bg transparent, 1px solid #EAE5DC, color #A89880`, padding `6px 10px`, radius 6.
- **Delete** dark button — 10px / 600 / 0.06em uppercase, `bg #1A1410, color #FAF8F4`, padding `6px 10px`, radius 6.

On confirm: removes the box, switches to the first remaining box, fires "Box deleted" toast. We deliberately avoided a modal here because deletion is reversible (we'd undo via toast in production) and a full modal felt heavy.

---

## Toast pattern

Used by both pages for ephemeral feedback. `position: fixed; bottom: 28; left: 50%; transform: translateX(-50%); z-index: 300`. Bg `#1A1410`, color `#FAF8F4`, padding `10px 22px`, radius 8, 12px DM Sans. Auto-dismiss 1.8s.

Triggers seen in prototype:
- Box renamed
- Box deleted
- Box created
- Removed from box
- "Add Watch flow opens" (placeholder — wire to the real Add Watch flow)

---

## Shared Components

These are used by both pages and should be implemented once.

### NavBar (`NavBar.jsx`)
Top app bar. Links to Home, My Collection, Playground.

### WatchBoxGrid (`WatchBoxGrid.jsx`)
Visual "watchbox" — rows of compartments in a gold-gradient case (same color stops as the OG preview's mini box). Each compartment holds a watch image. Click a slot to select; clicking the active slot deselects. Empty slots are dashed-border placeholders. `props: { watches, slotCount, activeIdx, onSlotClick }`.

### WatchCardGrid (lives in `CollectionPage.jsx`)
Data-dense grid card per watch: image, brand, model, reference, key stats. Click to select. `props: { watches, activeId, onSelect }`.

### WatchSidebar (`WatchSidebar.jsx`)
Sticky right-rail panel showing the active watch's full detail. Two modes:
- `mode: 'collection'` — shows owned-watch fields (purchase price, condition, notes) with edit affordances.
- `mode: 'playground'` — shows wishlist fields with a "Remove from box" action.

Empty state: "Select a watch to see its details."

### CollectionStats (`CollectionStats.jsx`)
The full data-sheet section described above. Anchored to `#stats` (used by the header's `STATS ↓` link). `props: { watches }`.

### ShareBox (`ShareBox.jsx`)
Outline button + share modal described above. `props: { watches, totalValue }`.

### OrderDropdown / sortWatches
Dropdown labeled "Order" with options: Recently Added, Brand A→Z, Value High→Low, Value Low→High. Helper `sortWatches(list, key)` exported from `WatchData.jsx`.

---

## Design Tokens

### Colors (warm-paper palette)

| Token | Hex | Usage |
|---|---|---|
| Page background | `#FAF8F4` | App background, dark-bar contrast surface |
| Card background | `#FFFCF7` | Modals, stats cards, empty states |
| Surface white | `#FFFFFF` | Toolbar buttons, active tab fill, inputs |
| Ink | `#1A1410` | Primary text, primary buttons, active chips |
| Ink-soft | `#3A3028` | Borders inside dark surfaces (unsaved bar) |
| Ink-muted | `#A89880` | Secondary text, tagline, meta labels, inactive tabs |
| Mute-light | `#C8BCA9` | Disabled glyphs, dimmed chip text |
| Mute-faint | `#D4CBBF` | Dashed borders, scrollbar thumb, secondary outline |
| Hairline | `#EAE5DC` | All 1px dividers, card borders, tag pills |
| Inverse text | `#FAF8F4` | Text on dark surfaces |
| Accent gold | `#C9A84C` | Edit underline, "unsaved" indicator, "Highest" stat, share auto-gen tag, OG handle, Profile settings link |
| Gold deep | `#B89535` / `#A87A2E` | Gradient stops on bars and the watchbox case |
| Gold tint bg | `rgba(201,168,76,0.10)` | Brands chip background |
| Gold tint text | `#8A6A10` | Brands chip text, share button hover text |
| Success green | `#2D6A2D` | Gain stat, copy-success state |
| Success bg | `#E8F4E8` | Copy-success button bg |
| Loss red | `#8A2020` | Loss stat |

### Typography

- **Display / serif** — Cormorant Garamond (Google Fonts `0,300;0,400;0,500;1,300;1,400`)
  - H1 (page title): 48 / 400 / 1.1
  - H2 (stats section, box name): 24–32 / 400 / 1.1
  - H3 (modal title): 22–28 / 400 / 1.1
  - Stat value: 26 / 500 / 1
  - Empty-state copy: 22 / 400
- **Sans / UI** — DM Sans (Google Fonts `400;500;600`)
  - Body: 13–14 / 400
  - Tagline: 14 / 400 / 0.02em / `#A89880`
  - Button label: 11 / 500 / 0.08em / uppercase
  - Compact button label: 10–10.5 / 500–600 / 0.06–0.08em / uppercase
  - Meta micro-label: 9.5–10 / 500 / 0.14em / uppercase / `#A89880`
  - Meta value: 14 / 500 / `#1A1410`
  - Tag pill: 9.5 / 400
  - StatChip: 11 / 500 / count suffix 10 / opacity 0.65
  - Tab label: 12 / 400–500
  - Mode toggle label: 11 / 500 / 0.10em / uppercase

### Spacing

- Page max-width: **1280px**; horizontal padding **56px**.
- Body grid: `1fr 320px`, gap **32px**.
- Section vertical rhythm: 20–28px between header sub-rows; `1px solid #EAE5DC` between meta-row segments and section transitions.
- Meta-chip: gap 16; chip-internal label/value gap 6; vertical chip-divider `1px × 14`.
- Stats Data-Sheet row: `gridTemplateColumns: 180px 1fr auto`, gap 24, padding `18px 0`.
- Modal padding: `18–24px` outer, `22px` inner sides.

### Radii

- Primary button: **4px**
- Outline / secondary button: **6px**
- Inputs: 6px
- Card / modal: **12–14px**
- Tab tops: 8px
- Tag pill / StatChip / mode-toggle pill: **20–999px** (full-round)
- Bar-chart track: 3px

### Shadows

- Active view-switcher tab: `0 1px 3px rgba(26, 20, 16, 0.08)`
- Mode-toggle pill: `0 2px 10px rgba(26, 20, 16, 0.10)`
- Mini-watchbox in OG preview: `0 8px 28px rgba(0, 0, 0, 0.4)`
- Modal: `0 24px 60px rgba(26, 20, 16, 0.32)`

### Iconography

All inline SVG, 1.5–1.8 stroke, `currentColor`. Set used: plus, photo, trash, pencil, watchbox grid, cards grid, arrow-down (Stats↓), chevron, share, copy, check, close. See the small `Icon*` helpers at the top of each Root file.

---

## Interactions & Behavior

### Selection
- WatchBoxGrid slot click or Card click → opens it in the sidebar; clicking active deselects.
- Switching boxes (Playground) clears selection.

### Inline rename (Playground box name)
- Click H2 or pencil → input replaces H2 (gold underline).
- Enter or blur commits; Esc cancels.

### Delete box (Playground)
- "Delete Box" → inline "Delete? [Cancel] [Delete]" (no modal). Only when `boxes.length > 1`.

### View switcher
- Three options: Watchbox, Cards, Photo (disabled with "SOON" badge).
- Active state: white fill + small shadow.
- Switching to Cards reveals the Order dropdown.

### Stats reveal toggle
- Closed (default): hides zero-count items in Dial Colors / Watch Types / Complications rows.
- Open: shows zero-counts dimmed; chevron rotates 180°.

### Stats mode toggle
- Overview (default) ↔ Graphical. Graphical replaces the Data Sheet card with a brand value bar chart. Portfolio Value Row stays.

### Smooth scroll
`html { scroll-behavior: smooth; }` plus the `STATS ↓` link calls `getElementById('stats').scrollIntoView({ behavior: 'smooth', block: 'start' })`.

### Unsaved changes (Collection only)
When `unsaved > 0`, a fixed bottom bar appears with "You have N unsaved change(s)" + Discard / Save. Both reset the count in the prototype; in production they hit the persistence layer.

### Hover states
- Meta links (Stats↓): color transitions `#A89880` → `#1A1410`.
- Share Box trigger: border + text shift to gold `#C9A84C`/`#8A6A10`.
- Copy URL: success state lasts 1.8s.
- No jumpy transforms; subtle background/color transitions only.

---

## State Management

Per-page state shape:

```ts
type Box = { id: string; name: string; tags: string[]; watchIds: string[]; slotCount: number };
type View = 'watchbox' | 'cards' | 'photo';
type Sort = 'recent' | 'brand' | 'valueHigh' | 'valueLow';
type StatsMode = 'overview' | 'graphical';

// Playground page
{
  boxes: Box[];
  activeBoxId: string;
  view: View;
  activeWatch: Watch | null;
  activeIdx: number | null;   // selected slot index in WatchBoxGrid
  sort: Sort;
  newBoxOpen: boolean;
  toast: string;
}

// Collection page
{
  view: View;
  activeWatch: Watch | null;
  activeIdx: number | null;
  sort: Sort;
  unsaved: number;
}

// CollectionStats internal
{
  mode: StatsMode;
  // Per-row reveal state (Dial Colors, Watch Types, Complications)
  showAllDialColors: boolean;
  showAllWatchTypes: boolean;
  showAllComplications: boolean;
}
```

Watch model (in `WatchData.jsx`):

```ts
type Watch = {
  id: string;
  brand: string;
  model: string;
  reference: string;
  caseSizeMm: number;
  caseMaterial: string;
  dialColor: string;
  movement: string;
  complications: string[];
  condition: 'Unworn' | 'Like New' | 'Excellent' | 'Good' | 'Fair';
  purchaseDate: string;        // ISO date or '' for playground
  purchasePrice: number;       // 0 for playground
  estimatedValue: number;
  notes: string;
  imageUrl: string | null;
  dialConfig: { dialColor: string; markerColor: string; handColor: string };
  watchType: string;           // matches one of ALL_WATCH_TYPES
  ownershipStatus: 'Owned' | 'For Sale' | 'Recently Added' | 'Needs Service';
};
```

### Data fetching
Prototype uses static arrays (`WATCHES`, `PLAYGROUND_WATCHES`, `PLAYGROUND_BOXES`). Replace with API calls. The `unsaved` counter is a stand-in for a dirty-tracking layer; pair with optimistic updates and a save endpoint.

### Constants (in CollectionStats)
- `ALL_WATCH_TYPES`: `Diver, Dress, Sport, Chronograph, GMT, Pilot, Field, Integrated Bracelet, Vintage`
- `ALL_COMPLICATIONS`: `Date, Day-Date, GMT, Chronograph, Moonphase, Annual Calendar, Perpetual Calendar, Power Reserve, Tourbillon`
- `ALL_DIAL_COLORS`: 10 named colors with hex values (see palette table above).
- `matchDialColor(raw)` — fuzzy-matches `watch.dialColor` strings (e.g. "Blue Horizontal", "Black Ceramic") to a canonical name. Reuse this helper.
- `STATUS_STYLES` and `CONDITION_STYLES` are token maps used by sidebar/cards for badge color pairs.

---

## Responsive Behavior

The prototypes target desktop (≥1024px). When reimplementing:

- **≥1024px:** two-column with sidebar (current layout).
- **768–1023px:** stack the sidebar below the grid; or convert it into a slide-over sheet triggered by selection.
- **<768px:** full-width body; sidebar becomes a bottom sheet; box tabs become a horizontally scrolling chip row (already does); toolbar wraps; stats Data Sheet rows stack the label above the values (drop the `180px` first column).

Box tabs and meta-chip rows already use `flex-wrap: wrap` so they degrade reasonably.

---

## Assets

Watch product photography is referenced by URL on each Watch's `imageUrl`. Replace with your own CDN. Bundled `assets/watches/` contains the prototype images so the captures render.

Icons are inline SVG — no asset files needed.

Fonts are pulled from Google Fonts — replace with self-hosted woff2 in production.

---

## Files in This Bundle

```
collection/
  My Collection.html        — entry HTML, mounts <CollectionPageRoot>
  CollectionPageRoot.jsx    — root: header, body grid, stats anchor, unsaved bar
  CollectionPage.jsx        — view switcher, OrderDropdown, WatchCardGrid, icons
  CollectionStats.jsx       — single-column data sheet + mode toggle + graphical view
  WatchBoxGrid.jsx          — visual gold-case grid
  WatchSidebar.jsx          — right-rail detail panel (modes: collection | playground)
  ShareBox.jsx              — share button + modal with OG preview
  NavBar.jsx                — top app nav
  HomePage.jsx              — sibling page (context only)
  WatchData.jsx             — static data + sortWatches helper + DialSVG + style maps

playground/
  Playground.html           — entry HTML, mounts <PlaygroundRoot>
  PlaygroundRoot.jsx        — root: header, BoxTabs, BoxMetaStrip, NewBoxModal, body grid
  CollectionPage.jsx        — same view-switcher / cards grid (shared)
  CollectionStats.jsx       — same stats section
  WatchBoxGrid.jsx          — same component
  WatchSidebar.jsx          — same component (used in 'playground' mode)
  ShareBox.jsx              — same component
  NavBar.jsx                — same component
  WatchData.jsx             — extended with PLAYGROUND_WATCHES + PLAYGROUND_BOXES

assets/watches/             — prototype watch imagery
screenshots/                — page captures referenced by this README
```

Open either HTML file in a browser to see the prototype running.

---

## Implementation Order Suggested

1. Lift design tokens (colors, type, spacing, radii, shadows) into your design system.
2. Build shared primitives: PrimaryButton, OutlineButton, MicroLabel, Divider, TagPill, StatChip, ModeTogglePill, Toast, Modal shell (backdrop + container), Input, RevealToggle.
3. Implement WatchSidebar with both modes.
4. Implement WatchBoxGrid + WatchCardGrid + the View Switcher.
5. Implement **CollectionStats**:
   - PortfolioValueRow card.
   - DataRow primitive (3-column grid with reveal slot).
   - Dial Colors / Watch Types / Complications / Brands rows on top of DataRow.
   - GraphicalView bar chart.
   - StatsModeToggle pill.
6. Implement **ShareBox** (button + modal + OGPreview + clipboard + share-target intents).
7. Wire up **My Collection** (header + body + stats + unsaved bar).
8. Implement **BoxTabs** + **BoxMetaStrip** + **NewBoxModal** + inline delete confirm.
9. Wire up **Playground** on top of the same body.

Each step has a corresponding file in this bundle to reference 1:1.
