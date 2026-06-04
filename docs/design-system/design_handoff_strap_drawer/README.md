# Handoff: Strap Drawer

## Overview

The **Strap Drawer** is a section of the Virtual Watchbox app where a collector tracks
the watch straps and bracelets they own (leather, rubber, NATO, sailcloth, metal
bracelets, etc.) and sees, at a glance, **which of their watches each strap fits**.

It complements the existing **My Collection** (watches) and **Playground** (try-on)
areas. The core value is the **compatibility engine**: every strap has a lug width,
every watch has a lug width (or an integrated bracelet), and the drawer computes
fit automatically — with manual overrides for the edge cases the collector knows
better than the algorithm.

Two primary surfaces are covered:
1. **Web** (`Strap Drawer.html`) — a responsive layout, ~1280px max content width.
2. **Mobile** (`Strap Drawer — Mobile.html`) — a presentation page that embeds the
   same responsive app inside iPhone frames to show the small-screen layout. The app
   itself is fully responsive; the breakpoint is **760px**.

---

## About the Design Files

The files in `prototype/` are **design references built in HTML + React (via in-browser
Babel)**. They are prototypes that demonstrate the intended **look, layout, copy, and
interaction behavior** — they are **not** production code to copy directly.

The task is to **recreate these designs in the target codebase's existing environment**,
using its established framework, component library, state management, and data layer.
The Virtual Watchbox production app is referenced in the tokens file as a **Next.js**
project (note the `--font-cormorant` / `--font-dm-sans` aliases), so React/Next is the
likely target — but follow whatever the actual repo uses.

- The prototype renders React via `React.createElement` (no JSX build step) only because
  it runs in a single static HTML file. In production, write idiomatic JSX/TSX components.
- The strap "swatch" CSS-art system (`StrapSwatch.jsx`) is a clever fallback for straps
  without photos. Recreate it faithfully — it's part of the product's character — but
  port it to your styling system (CSS modules / Tailwind / styled-components).
- All state in the prototype is local React state with optimistic updates and seed data.
  In production this is backed by your API / database (see **State Management** and
  **Data Model**).

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, copy, and interactions
are final and intentional. Recreate the UI pixel-accurately using the design tokens in
`design-tokens.css` (and reproduced in **Design Tokens** below). Where the prototype uses
raw hex/px inline, the canonical source of truth is the token file — prefer the tokens.

---

## Design System Context

This feature lives inside the **Virtual Watchbox** design system. Use the existing
system; do not invent new colors or fonts.

- **Fonts:** `Cormorant Garamond` (serif — display/headings/titles) and `DM Sans`
  (sans — all UI text, labels, body). Load weights: Cormorant 300/400/500/600 +
  italic 300/400; DM Sans 400/500/600.
- **Voice:** editorial, restrained, collector-grade. Serif headlines, small uppercase
  tracked labels, italic serif for soft/secondary notes. Gold (`#C9A84C`) is the only
  accent and is used sparingly (prices, active state, brand labels).
- **Surface:** warm cream page (`#FAF8F4`), slightly lighter card/panel fill (`#FFFCF7`),
  dark ink (`#1A1410`) for primary text and dark buttons.

---

## Data Model

These shapes drive the whole feature. Field names match the prototype
(`prototype/strap_drawer/strap-data.jsx`).

### Watch (owned)
```ts
interface Watch {
  id: string;
  brand: string;                 // "Tudor"
  model: string;                 // "Black Bay GMT"
  reference: string;             // "M79830RB-0001"
  caseSizeMm: number;            // 41
  lugWidthMm: number | null;     // 22  — null when integrated bracelet
  braceletType: 'spring-bar' | 'integrated';
  dialColor: string;
  imageUrl: string | null;       // product image; null → initial-letter fallback
}
```

### Strap
```ts
interface Strap {
  id: string;
  name: string;                  // "Signature Alligator" (may equal material)
  brand: string;                 // "Delugs"
  material: 'leather'|'rubber'|'nylon'|'canvas'|'fabric'|'metal'|'silicone'|'ceramic'|'exotic'|'other';
  subMaterial: string;           // "Alligator", "NATO", "Oyster", ...
  color: string;                 // "Mahogany"
  colorHex: string;              // "#5A2A2E" — used for the color chip
  lugWidthMm: number | null;     // 20 — REQUIRED to compute fit
  style: 'dressy'|'sporty'|'casual'|'rugged'|'vintage' | null;
  taperedToMm: number | null;
  lengthMm: number | null;
  clasp: string;                 // "Steel pin buckle"
  priceCents: number | null;     // store cents; format with Intl.NumberFormat USD, 0 fraction digits
  purchaseUrl: string | null;    // external buy link
  photoUrl: string | null;       // real photo; null → render CSS swatch from swatchId
  swatchId: string;              // e.g. "leather-alligator-black" (see StrapSwatch recipes)
  notes: string;                 // collector's freeform note (rendered as italic serif)
  sortOrder: number;             // for "recently added"
}
```

### CompatibilityOverride
```ts
interface CompatibilityOverride {
  strapId: string;
  watchId: string;
  override: 'fits' | 'excluded';
}
```

### Compatibility logic (port exactly — `strap-data.jsx`)
`effectiveCompatibility(strap, watch, overrides) → 'fits' | 'excluded' | 'unknown'`,
evaluated in this order:
1. If an override exists for (strapId, watchId) → return it.
2. Else if `watch.braceletType === 'integrated'` → `'excluded'`.
3. Else if `strap.lugWidthMm == null || watch.lugWidthMm == null` → `'unknown'`.
4. Else if `strap.lugWidthMm === watch.lugWidthMm` → `'fits'`.
5. Else → `'excluded'`.

Derived helpers:
- `compatibleWatches(strap, watches, overrides)` → watches where state === 'fits'.
- `compatibleStraps(watch, straps, overrides)` → straps where state === 'fits'.
- `totalCombos(...)` → sum of fitting straps across all watches.
- `watchesAtWidth(watches, mm)` → count of owned watches at a lug width (powers the
  `20 mm (4)` affordance in filters and the add form).
- `fitBasis(strap, watch, overrides)` → short reason string for a card footer in
  Fit Finder mode: `"20 mm — lug match"`, `"Needs 22 mm"`, `"Integrated bracelet"`,
  `"Width unknown"`, `"Marked as fits"`, `"Marked excluded"`.

---

## Screens / Views

### 1. Strap Drawer — main page (populated)
**Purpose:** Browse the strap collection, filter/sort it, run the Fit Finder, and open
any strap for detail.

**Layout (top → bottom), centered column `max-width: 1280px`, padding `0 40px` desktop / `0 18px` mobile:**

1. **Top nav** (sticky, `z-index: 100`)
   - Translucent cream bar (`rgba(250,248,244,0.92)` + `backdrop-filter: blur(8px)`),
     bottom border `1px var(--color-border)`.
   - Left: wordmark "Virtual Watchbox" — Cormorant 20px / weight 500.
   - Center: nav links (My Collection, Playground, **Straps** [active], Discover, News) —
     DM Sans 12px; active is ink with a 1px underline, others `--color-muted`.
     **Hidden below 760px.**
   - Right: "Sign In" — primary dark button, DM Sans 11px uppercase, tracking 0.08em,
     padding 9×20, radius 4, `white-space: nowrap`.

2. **Header block** (`padding-top: 36px` desktop / 22px mobile)
   - Back link "← COLLECTION" → links to `collection_redesign/My Collection.html`.
     DM Sans 11px, 600, uppercase, tracking 0.06em, muted.
   - Kicker "THE STRAP DRAWER" — DM Sans 9px, 600, uppercase, tracking 0.16em, gold.
   - H1 "Strap Drawer" — Cormorant **54px desktop / 38px mobile**, weight 300,
     line-height 1, letter-spacing -0.02em, `white-space: nowrap`.
   - Right-aligned on same baseline: "Add Strap" primary button with a plus icon
     (hidden on mobile — replaced by a fixed bottom bar, see below).
   - **Stats pill** (`margin-top: 20px`): one rounded card (`--color-slot`, border
     `--color-border-mid`, radius 10, padding `13px 22px`, `--shadow-xs`,
     `width: fit-content`, `flex-wrap: nowrap` desktop). Three stats separated by tiny
     dot dividers (3px circle, `--color-border-light`):
     - `{N}` straps · `{M}` compatible watches · `{P}` combinations
     - Numbers: Cormorant 22px (19px mobile) weight 500; labels: DM Sans 11px muted,
       `white-space: nowrap`.
     - `N` = strap count; `M` = owned watches with ≥1 fitting strap; `P` = `totalCombos`.

3. **Fit Finder rail** (the hero sort/filter — see Screen 5)

4. **Focus banner** — only when a watch is selected in Fit Finder (see Screen 5)

5. **Filter + Sort bar** (see Screen 4)

6. **Strap grid** (see Screen 2)

7. **Mobile only:** a **fixed bottom "Add Strap" bar** (`position: fixed; bottom 20; left/right 18`),
   dark, radius 10, padding 15, `--shadow-xl`, only visible when no sheet/modal is open.

---

### 2. Strap Card + Grid
**Grid:** CSS Grid, `repeat(auto-fill, minmax(220px, 1fr))`, `gap: 18px`. On mobile it
naturally collapses to 1–2 columns.

**Card** (`<article>`):
- Fill `--color-slot`, border `1px --color-border-mid`, radius 10, `--shadow-xs` at rest.
- **Hover:** `translateY(-3px)`, `box-shadow: 0 8px 24px rgba(26,20,16,0.10)`; inner image
  scales to 1.035 (only when a photo). Transition 0.2s ease.
- **Active/selected** (its detail sheet is open): border `1.5px rgba(201,168,76,0.85)`,
  `box-shadow: 0 0 0 1px rgba(201,168,76,0.4), 0 8px 28px rgba(201,168,76,0.14)`,
  `translateY(-2px)`.
- **Image area:** `aspect-ratio: 4/5`, bottom border `1px --color-border-mid`.
  - If `photoUrl`: centered `object-fit: contain` on a soft radial cream background
    (`radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF, #FBF8F2, #F4EFE6)`),
    `padding: 14px 6px`.
  - Else: render the **CSS swatch** (see Screen 6).
  - Top-right tag: "PHOTO" or "SWATCH" — DM Sans 8px, 600, uppercase, tracking 0.12em,
    on `rgba(255,252,247,0.82)` + blur, radius 3.
- **Text block** (`padding: 14px 16px 15px`, flex column, `flex: 1`):
  - Brand kicker — gold brand label (9px, 600, uppercase, tracking 0.16em).
  - Title — Cormorant 19px / weight 400 / line-height 1.12. Title is `strap.name`
    unless it equals the material, then `"{color} {Material}"`.
  - Subtitle — DM Sans 11px muted: `"{color} · {subMaterial}"`.
  - **Spec badges** row (flex-wrap, gap 5): lug width (gold tone), material (plain),
    style (plain). Badge = DM Sans 10px, 500, padding 3×8, radius 4.
    - width tone: bg `#FBF6EA`, text `#A8862F`, border `rgba(201,168,76,0.35)`.
    - plain tone: bg `#F6F1E9`, text `#6F6353`, border `--color-border-mid`.
  - **Footer** (margin-top auto, padding-top 11, top border `1px --color-border`):
    - **Default mode:** 6px dot (gold if fits>0 else border-light) + "Fits {n} of your
      watches" / "No matching watches yet".
    - **Fit Finder mode** (a watch is focused): dot colored by state (fits=green
      `#3A6A2D`, unknown=gold, excluded=border-light) + the `fitBasis(...)` string.

---

### 3. Strap Detail Sheet (sidebar / bottom sheet)
**Purpose:** Full detail for one strap; manage which watches it fits.

**Container** (`Sheet`):
- **Desktop:** right-anchored panel, `width: min(412px, 100vw)`, full height, left border
  `1px --color-border-mid`, `box-shadow: -12px 0 40px rgba(26,20,16,0.12)`, slides in from
  the right (`translateX(24px)→0`, 0.26s `cubic-bezier(0.22,1,0.36,1)`).
- **Mobile (≤760px):** bottom sheet, full width, `height: 90vh`, radius `16px 16px 0 0`,
  slides up (`translateY(40px)→0`), with a 38×4 grab handle centered at top.
- Scrim behind: `rgba(26,20,16,0.42)` + `blur(2px)`, click to dismiss.
- Panel content scrolls (`overflow-y: auto`).

**Content (top → bottom):**
1. Sticky header: kicker "STRAP DETAIL" + close (✕) button.
2. Hero image — photo on radial cream (height 280) or swatch (height 260), full-bleed
   to the panel edges with a bottom border.
3. Title block: gold brand kicker, Cormorant 28px title, muted subtitle
   `"{color} · {subMaterial} {material}"`. If `notes`: italic Cormorant 14.5px with a
   2px gold left border, padding-left 12.
4. **Spec list** — label/value rows, each `padding: 8px 0`, bottom border `1px border`:
   Material · subMaterial, Color, Lug width, Tapered to, Length, Clasp, Style.
   Labels DM Sans 11.5px muted; values DM Sans 12px, 500, ink. (Rows hide if value null.)
5. **Purchase block** (if `priceCents`): cream box, radius 10, padding `14×16`. Left:
   kicker "BOUGHT FROM {host}" (or "PAID") + price (DM Sans 18px, 600, **gold**). Right:
   "Buy another ↗" outline link (if `purchaseUrl`) opening in a new tab.
6. **"Fits these watches"** (Cormorant 19px, 500, + gold count). Each row:
   - **56px** watch thumbnail (image `object-fit: contain` on cream, or initial-letter
     fallback), brand kicker, model (Cormorant 16px), meta line
     (`"{lug} mm lugs · {reason}"`).
   - **Segmented override control** (right): two buttons "FITS" / "EXCLUDE" inside a
     pill (bg `--color-bg`, border, radius 6, padding 2). Selected "Fits" = green
     `#3A6A2D` bg / white; selected "Exclude" = dark `#2A2520` bg / white; unselected =
     transparent / muted text. Clicking sets a `CompatibilityOverride`.
   - If an override is active, a small circular ✕ "reset to automatic" button appears
     after the control (removes the override).
   - Empty: italic "None of your current watches match this strap."
7. **"Other watches"** (collapsible; collapsed by default). Header is a toggle with a
   rotating chevron + count. Expanded reveals all non-fitting watches with the same row
   UI + override controls, plus a helper line "Override the automatic call when you know
   better."
8. **Actions** (margin-top 26): "Edit" outline button (full width, edit icon) + a
   square trash button (`#8A2020` icon, outline). Trash opens a **centered confirm
   overlay** ("Delete this strap?" + Cancel / Delete[`#8A2020`]).

---

### 4. Filter + Sort bar
A 2-row control block, `padding: 16px 0 18px`, bottom border `1px --color-border`,
`margin-bottom: 24px`.

- **Row 1:** Material group + Style group (left), Sort control (right).
- **Row 2:** Lug width group (left), "Clear filters" link + result count (right).
- **Group label:** DM Sans 9px, 600, uppercase, tracking 0.14em, muted.
- **Chip:** DM Sans 11.5px; inactive = `--color-slot` bg, `--color-border-mid` border,
  ink-soft text; active = ink bg, slot text, 600 weight; radius 20 (pill), padding 7×13.
- **Material chips:** only materials present in the data (multi-select).
- **Style chips:** only styles present (single-select toggle).
- **Lug width chips:** each present width, with a count suffix `(n)` = owned watches at
  that width (gold when >0, muted when 0); multi-select. Widths the user owns are the
  meaningful ones — keep the count visible.
- **Result line:** italic Cormorant 14px muted — `"{N} straps"` or `"{shown} of {total} straps"`.
- **Sort control:** outline button "SORT {label}" with a chevron; opens a dropdown
  (`--color-slot`, radius 8, `box-shadow 0 8px 24px rgba(26,20,16,0.12)`). Options:
  Recently added (default), Lug width, Material, Color, Most compatible. Active row has a
  cream bg + gold check.
- **Mobile:** chip rows scroll horizontally (`overflow-x: auto`, hidden scrollbar);
  groups stack vertically.

**Sorting (`applySort`):** recent = `sortOrder` desc; width = lug asc; material =
alpha; color = alpha; fits = `compatibleWatches` count desc.

---

### 5. Fit Finder (hero "select watch → show fitting straps")
**Purpose:** The reverse lens — pick one of your watches and the drawer narrows to just
the straps that fit it. This is the headline interaction.

- **Section header:** kicker "FIT FINDER" (gold) + italic Cormorant 15px muted:
  `"Pick a watch to see only what fits it"` (or `"Showing straps for one watch"` when active).
- **Rail:** horizontal flex, `gap: 16`, `overflow-x: auto; overflow-y: hidden`,
  `padding-bottom: 6`. Scrollbar hidden. **IMPORTANT:** keep `overflow-y: hidden` — if
  you let it default, `overflow-x: auto` forces `overflow-y: auto` and a stray vertical
  scrollbar/jump appears.
- **First tile = "All straps"** (clears focus): a small abstract group of colored strap
  bars instead of a watch image, label "EVERYTHING / All straps / {n} in drawer".
- Then a 1px vertical divider, then one **WatchTile** per owned watch.
- **WatchTile** (`width: 168px`, transparent button, no inner card):
  - Image frame: height 150, radius 12. Inactive: flat `--color-paperWarm` (`#F1ECE2`)
    bg, `1px --color-border-mid` border. **Active:** radial cream bg, `1.5px gold`
    border, `box-shadow: 0 0 0 1px rgba(201,168,76,0.35)` (a clean gold ring — **no lift
    transform**, intentionally, to avoid a click-jump), plus a 20px gold check badge
    top-right. The watch image is the hero: `height: 94%`, `object-fit: contain`,
    `drop-shadow(0 8px 16px rgba(26,20,16,0.2))`.
  - Text below the frame (`padding: 11px 2px 0`): brand kicker (gold), model
    (Cormorant 17px), count line (`"{n} straps fit"` — gold number, or `"{n} in drawer"`
    for All).
- **Selecting a watch:** sets `focusId`; the grid filters to `compatibleStraps(watch)`,
  card footers switch to `fitBasis` mode, and the **Focus banner** appears.
- **Focus banner** (above the filter bar): dark ink bar, radius 10, padding `13×18`.
  52px watch thumb (on `rgba(255,255,255,0.07)`), then a gold kicker
  (`"{lug} mm lugs"` or `"Integrated bracelet"`) + Cormorant 18px line
  `"{n} straps fit your {model}"` (model in italic) / `"Nothing fits your {model} yet"`.
  Right: "CLEAR" outline button (light border on dark) → clears focus.
- **Empty within focus:** if the watch has zero fitting straps, show italic guidance
  rather than the grid ("No straps in your drawer fit the {model} yet…").
- **Deep links (prototype convenience):** the app reads `location.hash` on load —
  `#add` opens the add modal, `#strap={id}` opens a detail sheet, `#empty` shows the
  empty state, `#watch={id}` focuses a watch. In production, model these as routes/query
  params as appropriate.

---

### 6. Strap Swatch (CSS-art fallback)
When a strap has no photo, render a **portrait CSS swatch** (matches the 4:5 photo
orientation) — see `prototype/strap_drawer/StrapSwatch.jsx`. This is bespoke, layered
CSS gradient art and is part of the product identity.

- A soft paper backdrop (radial cream + a faint 135° hatch) with a blurred contact
  shadow under the strap.
- **Non-metal materials** render as a vertical tapered band (~27% width, 88% height,
  rounded ends) with: a base color + layered gradient `overlay` for texture, edge
  **stitching** (dashed lines, skipped for rubber/NATO), a keeper loop, and pin holes.
  - **Alligator:** square-scale tiling via repeating linear gradients.
  - **Rubber:** matte micro-dot texture + a center channel, no stitching.
  - **NATO:** woven horizontal/vertical lines (the `nato-bond` recipe adds the
    green/red/gold stripe pattern), no pin holes.
  - **Suede:** soft vertical nap. **Sailcloth:** 45°/-45° twill weave.
- **Metal materials** render as a segmented **bracelet** (~30% width): Oyster (3-link),
  Jubilee (5-link), Milanese/Mesh (fine diagonal weave), each with link highlights.
- `swatchId` selects the recipe (e.g. `leather-alligator-black`, `rubber-olive`,
  `nato-navy`, `sailcloth-grey`, `metal-oyster-steel`). The add/edit modal derives a
  best-guess `swatchId` from material + subMaterial + color name (`deriveSwatchId`).

---

### 7. Add / Edit Strap modal
**Purpose:** Create a new strap or edit an existing one, with a live preview.

**Container:** centered modal `width: min(880px, 100%)`, `max-height: 92vh`, radius 14,
`box-shadow: 0 24px 70px rgba(26,20,16,0.34)`, scrim `rgba(26,20,16,0.5)` + blur. Pops in
(`scale(0.97)→1`). **Mobile:** full-width bottom sheet (`align-items: flex-end`,
radius `16px 16px 0 0`, slides up).

**Layout:** header / body (two columns) / footer.
- **Header:** gold kicker ("ADD STRAP" / "EDIT STRAP") + Cormorant 23px title
  ("New strap" / "Update the details"), close ✕.
- **Body — left preview rail** (`width: 270px`, `--color-bg`, right border; on mobile
  becomes a horizontal strip at top): a live card showing the swatch (or uploaded photo,
  height 230), the brand kicker + title, spec badges, and a gold helper line
  `"{n} of your watches use {lug} mm lugs."`.
- **Body — right form** (scrolls):
  - **Material** — pill row of all 10 materials. Changing it resets subMaterial.
  - **Sub-material** — pill row (options depend on material; see `SUB_MATERIALS`).
  - **Color** *(required)* — text input + a row of common color chips (each a colored
    14px dot + name; selecting sets `color` + `colorHex`).
  - **Lug width** *(required)* — pill row of `[18,19,20,21,22,24]` with `(n)` owned-watch
    counts (gold when >0).
  - **Details** (collapsible; expanded when editing): Name, Brand, Style (pill toggle),
    Tapered to, Length, Clasp, Price paid (USD — shown in dollars, stored as cents),
    Purchase URL, Notes (textarea), Photo (drag-drop affordance — visual only in the
    prototype; wire to real upload + image processing in production).
  - Inputs: DM Sans 13px, `--color-slot` bg, `1px --color-border-mid` border, radius 6,
    padding `9×11`; **focus border = gold**.
- **Footer:** left = italic status ("Ready to save" / "Material, color and lug width
  required"); right = "Cancel" (ghost) + primary ("Add strap" / "Save changes",
  disabled+40% opacity until material + color + lugWidth are set).

---

### 8. Empty state
Shown when the drawer has zero straps. Centered card (`max-width: 460`, slot bg, border,
radius 14, padding `52×40`): a circular icon badge with a single strap-bar glyph, H2
"Your strap drawer is empty" (Cormorant 28px), a muted explanatory paragraph, and a
primary "Add your first strap" button.

---

## Interactions & Behavior

- **Open detail:** click a strap card → opens the detail sheet; card enters active state.
- **Fit Finder select:** click a WatchTile → filters grid, shows banner; click again or
  "All straps"/"Clear" → resets. Selecting a watch does **not** clear active filters; the
  width/material/style filters compose on top of the focused subset.
- **Override fit:** in the detail sheet, FITS/EXCLUDE toggles write a
  `CompatibilityOverride`; the ✕ removes it (back to automatic). Each change updates the
  grid counts, stats pill, and Fit Finder counts live.
- **Add/Edit/Delete:** optimistic local updates in the prototype; in production these are
  create/update/delete mutations. Delete also removes any overrides referencing the strap.
- **Toast:** a small dark toast (bottom-center, gold check, radius 8) confirms actions
  ("Strap added to your drawer", "Override saved", "Reset to automatic", "Strap deleted").
  Auto-dismisses after ~2.4s.
- **Transitions:** sheet slide 0.26s `cubic-bezier(0.22,1,0.36,1)`; modal pop 0.22s;
  scrim fade 0.2s; card hover 0.2s ease. Respect `prefers-reduced-motion`.

### Responsive behavior (breakpoint 760px)
- Nav links hide; nav padding tightens.
- "Add Strap" header button → fixed bottom bar.
- Filter chip rows scroll horizontally; filter groups stack vertically.
- Detail sheet → bottom sheet (90vh, grab handle).
- Add/Edit modal → bottom sheet; preview rail becomes a horizontal strip; 2-col form
  fields go single-column.
- Stats pill may wrap and span full width below ~460px.

---

## State Management

Local UI state needed (names from the prototype root `StrapDrawer.jsx`):
- `straps: Strap[]` — the collection (from API).
- `overrides: CompatibilityOverride[]` — user fit overrides (from API).
- `filters: { material: string[], width: number[], style: string|null }`.
- `sort: 'recent'|'width'|'material'|'color'|'fits'`.
- `focusId: string | null` — currently focused watch in Fit Finder.
- `selected: Strap | null` — strap open in the detail sheet (re-read from `straps` so it
  stays live after edits/overrides).
- `modal: null | {} | Strap` — `{}` = add, a strap = edit.
- `toast: string`.
- Derived: `focusWatch`, `baseStraps` (focus-filtered), `visible` (filter+sort applied).

Data requirements (production): fetch owned watches (with lug width + bracelet type),
fetch straps, fetch overrides. Mutations: create/update/delete strap, set/clear override.
All compatibility is computed client-side from these three sources — no separate "fits"
table is needed beyond the override records.

---

## Design Tokens

The complete token set is in **`design-tokens.css`** (copy of the system's
`colors_and_type.css`). Key values used by this feature:

**Colors**
| Token | Hex | Use |
|---|---|---|
| bg | `#FAF8F4` | page background |
| slot | `#FFFCF7` | card / panel / sheet fill |
| ink | `#1A1410` | primary text, dark buttons, banner |
| inkSoft | `#3F362C` | secondary text |
| muted | `#A89880` | meta labels, secondary |
| mutedDark | `#6F6353` | denser body text |
| gold | `#C9A84C` | accent: price, active, brand labels |
| goldDeep | `#A8862F` | width-badge text |
| dark | `#2A2520` | dark badge / selected "exclude" |
| border | `#EAE5DC` | dividers |
| borderMid | `#E8E2D8` | card borders |
| borderLight | `#D4CBBF` | secondary button borders, scrollbar |
| paperWarm | `#F1ECE2` | swatch backdrop / inactive tile |

**Status (fit) colors**
| State | bg | text |
|---|---|---|
| fits | `#EDF4E8` | `#3A6A2D` |
| excluded | `#F3EEE7` | `#A89880` |
| unknown | `#FBF3DC` | `#8A6A10` |
| destructive | — | `#8A2020` |

**Type:** Cormorant Garamond (display) + DM Sans (UI). Scale highlights: hero/H1
54px (38 mobile)/300; card title 19px/400; sidebar title 24px/500; body 12–13px;
uppercase labels 9–10px/600 tracking 0.12–0.16em; price 18px/600 gold.

**Radii:** btn 4 · sm 6 · md 8 · card/pill-container 10 · panel/modal 12–14 · pill 20.

**Shadows:** xs `0 1px 4px rgba(26,20,16,0.04)` (rest) · hover `0 8px 24px rgba(26,20,16,0.10)`
· gold-active `0 0 0 1px rgba(201,168,76,0.4), 0 6px 24px rgba(201,168,76,0.12)`
· sheet `-12px 0 40px rgba(26,20,16,0.12)` · modal `0 24px 70px rgba(26,20,16,0.34)`.

**Spacing:** 4/8/12/16/20/24/28/32/40/56/80. Page padding 40px desktop / 18px mobile;
max-width 1280px. Grid gap 18px; card minmax 220px.

---

## Assets

In `prototype/`:
- `straps/` — 5 real strap product photos (4:5, white background, ~1220×1525 WEBP):
  `alligator-black`, `alligator-mahogany`, `rubber-black`, `rubber-olive`,
  `sailcloth-olive`. These are the user's uploaded product shots.
- `assets/watches/` — `longines-01..05.avif` used as **stand-in** watch thumbnails. In
  production, use the collector's actual watch images from the My Collection data. One
  demo watch (Tissot PRX) intentionally has no image to exercise the initial-letter
  fallback **and** the "integrated bracelet → excluded everywhere" path.
- The other 7 straps have **no photo** and render via the CSS swatch system on purpose,
  to show both states. Real users will mix photos and swatches.
- **Icons** are inline 1.5px-stroke SVGs defined in `ui-atoms.jsx` (`Icon` component) —
  plus, close, chevrons, arrows, check, trash, edit, sliders, photo, search, grid.
  Replace with your codebase's icon set if you have one.

No external image dependencies beyond Google Fonts (Cormorant Garamond, DM Sans).

---

## Files (in this bundle)

```
design_handoff_strap_drawer/
├── README.md                       ← this file
├── design-tokens.css               ← full Virtual Watchbox token system
└── prototype/
    ├── Strap Drawer.html           ← web app entry (open this first)
    ├── Strap Drawer — Mobile.html  ← mobile presentation (iPhone frames)
    ├── strap_drawer/
    │   ├── strap-data.jsx          ← data model, seed data, compatibility engine, constants
    │   ├── ui-atoms.jsx            ← tokens (T), Kicker, SpecBadge, FitPill, WatchThumb, Icon, buttons
    │   ├── StrapSwatch.jsx         ← CSS-art swatch system (textures + bracelet recipes)
    │   ├── StrapCard.jsx           ← card, grid, empty state
    │   ├── StrapFilters.jsx        ← filter bar, sort control, filter/sort logic
    │   ├── StrapFocus.jsx          ← Fit Finder rail + focus banner
    │   ├── StrapSidebar.jsx        ← detail sheet + override controls + delete confirm
    │   ├── StrapModal.jsx          ← add/edit modal + deriveSwatchId
    │   ├── StrapDrawer.jsx         ← page root: nav, header, stats, sheet/modal containers, state
    │   └── ios-frame.jsx           ← iPhone bezel (used only by the mobile presentation)
    ├── straps/                     ← 5 real strap photos
    └── assets/watches/             ← stand-in watch thumbnails
```

**Start here:** open `prototype/Strap Drawer.html` in a browser to see the live design,
then read `strap-data.jsx` (the engine) and `StrapDrawer.jsx` (how it all composes).
