# Handoff: Discover Page (`/discover`)

Editorial-style commerce + content hub for the Virtual Watchbox web app, personalized to the signed-in user's collection. The design is a magazine-style layout with a sticky section nav, one big "Complete the Box" lead recommendation against a dark panel, four upgrade-path comparison cards for owned watches, three alternate next-slot picks, lug-width-aware strap suggestions, physical watchbox affiliate cards, and an editorial news strip. All affiliate CTAs route through Chrono24 / partner builders.

The implementation should pull from the existing app's data layer (collection, followed watches, lug widths, etc.) — the JSX prototypes use hand-authored seed data which should be replaced with live data wherever marked.

## About the Design Files

The files in this bundle are **design references created in HTML + plain React (no JSX transform — uses `React.createElement` directly via Babel standalone)**. They are prototypes showing intended look and behavior — **not production code to copy directly**.

Your task is to **recreate these designs in the Virtual Watchbox codebase's existing environment** (Next.js + Tailwind + Supabase per the PRD), using established patterns: existing typography classes from `colors_and_type.css`, the `CollectionPage` / `Playground` page conventions, hover-card + sidebar interaction patterns (Section 2 of the PRD), Chrono24 URL builder (`buildChrono24URL`), Supabase row shapes, etc.

The HTML prototype renders the design inside a design-canvas (pan/zoom artboards) and a custom Tweaks panel for state toggling — neither of those ships to production. Strip them, render the page directly, and wire it to `useCollectionSession()` + live signals.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and section layouts. Every spec below is exact. Watch product images are placeholders (the catalog will supply real ones via the standard fallback chain — see PRD Feature 2D §Image Resolution Order).

## Route

- `/discover` — single page, the route is already shipped in the live codebase per PRD v1.12 (Feature 14). This handoff replaces the existing layout with the editorial design.

## Page Structure (top to bottom)

1. **Main nav** — existing site nav (sticky)
2. **Section nav** — sticky "In this issue" TOC strip (NEW)
3. **Hero** — Section title + subtitle
4. **§ 01 Lead — Complete the Box** — dark panel, single featured recommendation
5. **§ 02 Upgrade — Upgrade This Watch** — owned→consider comparison cards (4 cards)
6. **§ 03 Next Slot — For Your Next Slot** — 3 alternate picks
7. **§ 04 Straps — Upgrade This Strap** — 5 material cards with CSS texture swatches
8. **§ 05 Box — Upgrade This Box** — 3 physical watchbox cards
9. **§ 06 News — From the Watch World** — 4 news cards from the feed

Each numbered section has an `id` matching the slug (`lead`, `upgrade`, `next-slot`, `straps`, `box`, `news`) for the section nav's smooth-scroll anchors.

## Design Tokens

Full token set in `colors_and_type.css`. Most-used values:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#FAF8F4` | Page background (warm cream) |
| `--color-slot` | `#FFFCF7` | Card / sidebar fill |
| `--color-ink` | `#1A1410` | Primary text, dark buttons |
| `--color-ink-soft` | `#3F362C` | Body text (slightly softer) |
| `--color-muted` | `#A89880` | Secondary text, meta labels |
| `--color-muted-dark` | `#6F6353` | Subtitle body color |
| `--color-gold` | `#C9A84C` | Accent — prices, active state, brand labels, CTAs in dark panel |
| `--color-hero-dark-1` | `#1e1b16` | "Complete the Box" panel background |
| `--color-border` | `#EAE5DC` | Primary dividers |
| `--color-paper` | `#F4EFE6` | Watch image card backdrops |
| `--color-paper-warm` | `#F1ECE2` | Strap swatch / news thumb backdrops |
| `--font-serif` | `'Cormorant Garamond', Georgia, serif` | All headlines, prices, watch model names |
| `--font-sans` | `'DM Sans', system-ui, sans-serif` | All UI labels, body sans, kickers |

Typography scale at desktop:
- Hero h1: **72px Cormorant 300**, line-height 1.0, letter-spacing -0.022em
- Section h2: **30px Cormorant 400**, line-height 1.0, letter-spacing -0.008em
- Card h3 (watch model): **22px Cormorant 400** (italic for "Consider" upgrade target)
- Hero subtitle: **20px Cormorant italic 300**, line-height 1.5
- Section sub (right-aligned): **11.5px DM Sans**, color `--color-muted`
- Kicker (uppercase eyebrow): **10px DM Sans 600**, letter-spacing **0.18em**, uppercase
- Body: **13px DM Sans**, line-height 1.55
- Italic editorial body: **14–17px Cormorant italic**, line-height 1.5–1.6
- Italic section number (in nav + spreads): **13px Cormorant italic 400**, color gold

Mobile typography (overrides in `vwb-mobile` class):
- Hero h1: **44px**
- Section h2: **26px**
- Complete-the-Box h2: **30px**

Spacing:
- Desktop section padding: **56px top, 56px bottom, 56px horizontal**
- Mobile section padding: **40px top, 24px bottom, 18px horizontal**
- Max content width: **1280px**

Borders + radii: cards use **1px solid `--color-border`** with **no radius** (the editorial design intentionally uses sharp rectangles, not rounded cards). Buttons use **2px radius**. Strap swatch / news thumb backdrops also no-radius. The "Best Fit" badge on the 6-slot box uses a 20px pill.

## Components & Sections

### Main Nav

Existing site nav. **The Discover link should be the active item** with a 1px ink underline. Right side: signed-in user's avatar (gold gradient circle with first initial) — `linear-gradient(135deg, #C9A84C, #8B6B30)`. Guest state shows a "Sign In" button (`#1A1410` background, `#FAF8F4` text, 4px radius).

### Section Nav (NEW)

A sticky strip below the main nav. **Desktop only** on mobile; the leading "In this issue" label is hidden via CSS but the 6 anchor items remain in a horizontal-scrolling row with a fade gradient on the right edge to signal more content.

- Container: `position: sticky; top: <nav height>`, `z-index: 90`, `background: rgba(250,248,244,0.94)`, `backdrop-filter: blur(8px)`, `border-bottom: 1px solid var(--color-border)`
- Inner: max-width 1280, 44px tall on desktop / 40px on mobile, horizontal flex with 28px gap (desktop) / 16px gap (mobile), `overflow-x: auto`, scrollbar hidden
- Leading label: **"In this issue"** in 13px Cormorant italic, `--color-muted`, separated by a 1px vertical rule (hidden on mobile)
- Each anchor: italic serif number (`01`–`06`, 13px Cormorant italic) + uppercase tracked sans label, click smooth-scrolls to `#<id>`
- Active state: ink text, gold 1.5px bottom border, italic number turns gold. Active section is tracked via `IntersectionObserver` with `rootMargin: '-30% 0px -55% 0px'`

### Hero

- Compact byline (desktop only) above the title:
  - Flex row, justify-between, 28px below
  - Left: `DISCOVER` ink kicker · em-dash · `For Marc` (muted, or `Editor's curation` for guests) — both 9.5px tracked uppercase
  - Right: `Tuesday, 20 May 2026` muted kicker
  - Hidden on mobile (`.vwb-mobile .vwb-masthead { display: none }`)
- h1: **"Your next move."** 72px Cormorant 300, single line
- Subtitle: 20px italic Cormorant 300, color `--color-muted-dark`, max-width 640px, `text-wrap: pretty`. Body:
  - Personalized: *"Your box reads `<insight.read>` [lowercased, italic em]. Recommendations, upgrades, and reads shaped around the holes in it."*
  - Guest: *"Recommendations, upgrades, and reads for any thoughtful collector. Sign in to make these your own."*

`insight.read` is a one-line analytical read of the collection — for the demo collection it's `"Sport-led, blue–black, sub-$10K"`. This needs to be computed from real signals (brand concentration, dial colors, price tiers) — for v1 a simple rules-based string is fine, the PRD lists this under Feature 8 / Smart Suggestions as the longer-term replacement.

### §01 Complete the Box — Lead Recommendation

A full-bleed dark panel — the headline pick.

- Section wrapper: `background: var(--color-hero-dark-1)` (`#1e1b16`), `color: var(--color-slot)`
- Two-column grid (desktop): `1.1fr 1fr`, 64px gap, items centered
- Stacks to one column on mobile (text first, then watch image)

**Left column:**
- Gold kicker row: `COMPLETE THE BOX` · short gold rule (24px wide, 1px tall, `rgba(201,168,76,0.6)`) · `<gapLabel>` (e.g. "Dress")
- h2: serif 44px (desktop) / 30px (mobile), weight 300, line-height 1.05, color `--color-slot`. Format: *"A `<dress watch>` [italic], for the formal anchor your box is missing."* — the italic portion describes the category gap
- Insight body: 17px Cormorant italic, color `rgba(250,248,244,0.78)`, max-width 480, `text-wrap: pretty`
- Spec strip — three labeled columns separated by a top rule (`rgba(250,248,244,0.18)`):
  - `BRAND` / brand name in 18px serif
  - `REFERENCE` / ref in 18px serif
  - `MARKET MEDIAN` / formatted price in 18px serif
- Action row (flex with gap 12, mobile stacks vertically full-width):
  - Primary CTA: **`FIND ON CHRONO24 ↗`** — `background: var(--color-gold)`, `color: var(--color-ink)`, 11px tracked uppercase, padding 11px 22px, radius 2px
  - Secondary: **`ADD TO PLAYGROUND`** — transparent, white text, 1px `rgba(250,248,244,0.28)` border
  - Tertiary: `♡ Follow` — muted plain text

**Right column:**
- Decorative `¶ 01` watermark behind the watch image — 100px Cormorant italic 300, `rgba(201,168,76,0.10)`, positioned top-left
- Watch image: max 340×420, `object-fit: contain`, `filter: drop-shadow(0 18px 32px rgba(0,0,0,0.45))`
- Below image: italic serif model name (22px, `--color-slot`) and `<size> mm · <type>` meta in 11px muted

### §02 Upgrade This Watch

Step-up paths per owned watch. **2-column grid on desktop, 1-column on mobile.** Each card stacks the from→to comparison vertically on mobile so each watch image takes full card width.

**Card structure:**
- White slot background, 1px ink border (`#EAE5DC`), padding 28px 32px 24px
- "Stretch" badge top-right when `u.aspirational === true` — 9px gold uppercase letters in a gold-bordered pill with `rgba(201,168,76,0.06)` fill
- From→To pair (3-col grid `1fr auto 1fr` on desktop, stacks on mobile):
  - **From** (left): paper-warm aspect-1 box with 1px border + 24px padding, drop-shadowed watch image inside. Below: `YOU OWN` muted kicker, 19px serif model name, value + size in 11px muted meta.
  - **Arrow** (center): italic gold delta (e.g. `+$1,700`), 36px gold arrow SVG, `STEP UP` kicker. On mobile this row goes horizontal across the gap between the stacked images.
  - **To** (right): same shape as From but with a 1px **gold** border + inset gold ghost shadow on the image box. `CONSIDER` gold kicker, italic serif model name.
- Italic serif rationale below (14.5px, color `#3F362C`, top-border separator)
- Footer row: `<fromBrand> → <toBrand>` kicker + two link actions: `SET AS TARGET` (muted) + `FIND ON MARKET ↗` (ink)

Real implementation: feed this from per-owned-watch upgrade logic (PRD Feature 8 / Smart Suggestions roadmap). For v1 the rules can be a curated brand-family map.

### §03 For Your Next Slot

3-column grid on desktop, 1-column on mobile.

**Card structure** (`NextSlotCard`):
- Top: paper-warm backdrop, aspect 4/3, drop-shadowed watch image at 70% max-width / 90% max-height
- Top-left overlay: italic gold `No. 01` (rank)
- Top-right overlay: type (e.g. "Chronograph") in muted kicker
- Body padding 20px 22px:
  - Gold kicker: `<addressesLabel>` — short string describing the gap this fills (e.g., "Fills your chronograph gap")
  - 10px DM Sans 600 uppercase brand name
  - 22px Cormorant italic model name
  - 11px muted meta: `Ref. <ref> · <size> mm`
  - Italic serif thesis paragraph (13.5px, color `#3F362C`)
  - Footer (top-border separator): price band `<low> – <high>` + `Median <median>` muted, right-aligned `FIND ON MARKET ↗` link

### §04 Upgrade This Strap

5-column grid on desktop, **2-column on mobile**. Each card is a strap material with a CSS-textured swatch — no real strap photo.

**Strap swatch** (`StrapSwatch`):
- Container: 128px tall, `background: var(--color-paper-warm)`, 1px bottom border, with a subtle 135° repeating-linear-gradient paper hatch for ambient texture
- The strap form: 82% wide × 52px tall, `border-radius: 7px`, drop shadow + inset highlights. Background is composed of:
  - Base color
  - One or more `repeating-linear-gradient` / `radial-gradient` layers giving the material its signature (see `STRAP_TEXTURES` in `DiscoverEditorial.jsx` for the exact stack per material)
- Two dashed stitch lines top/bottom (when material is leather/sailcloth)
- Three pin holes near the right end

**Materials (5 cards):**
- Black Leather (`leather-black`) — calfskin, classic. Smooth dark gradient + diagonal grain hatches.
- Brown Suede (`suede-brown`) — suede, casual. Warm tan with directional nap.
- Rubber Sport (`rubber`) — FKM rubber, diver. Dark stippled dot pattern.
- NATO (`nato`) — nylon weave, military. Iconic green/gold/red stripe (the actual NATO color repeat).
- Sailcloth (`sailcloth`) — technical weave, sport. Dark navy with cross-hatch + diagonal weave.

**Card body** (below swatch): serif label + `20 mm` lug-width kicker on the right, material/use meta in muted sans, gold `EXPLORE STRAP SWAP ↗` text-only CTA.

Section sub-line under the header: `<STRAP_SUMMARY>` describing the user's lug widths — e.g. *"5 of your 6 watches share 20 mm lugs. Swap-friendly across most of your box."*

Footer caveat italic: *"Compatibility filtered by your owned lug widths. Affiliate partners coming soon."*

### §05 Upgrade This Box

3-column grid on desktop, 1-column on mobile. Each card is a physical watchbox option, rendered as a top-down "lid removed" view.

**Box render** (`BoxRender`):
- 188px tall, `background: <finish>.wood` gradient + `<finish>.grain` pattern, top + bottom 1px frame-color border, inset shadow for depth
- Inner grid: `repeat(<cols>, 1fr)` × `<rows>`, 8px gap, padded 8px, dark inset (`rgba(0,0,0,0.18)`) with inset 2px-8px shadow — simulates the inside of the box
- Each slot is a **pillow**: rounded rectangle, 160° linear gradient (`pillow` → `pillowDark`), highlight on top edge + dark shadow on bottom edge, with a subtle elliptical dimple at center (where a watch would rest)

**Three finishes** (`BOX_FINISHES`):
- `Suede` — warm tan, no wood grain, pillow `#F0E2C2`
- `Oak` — honey brown wood with horizontal grain pattern, pillow `#ECDDB6`
- `Walnut` — deep dark wood with horizontal grain pattern, pillow `#D6C49A`

**Three boxes:**
- Travel Roll — Wolf 1834, 3 slots, Suede, $165
- 6-Slot Display Box — Rapport London, 6 slots, Oak, $425 — **carries the gold "Best fit" badge** (top-left, 4px 10px pill, gold background, ink text, 9px tracked uppercase)
- 10-Slot Collector — Holme & Hadfield, 10 slots, Walnut, $680

The "Best fit" badge should be assigned to whichever box matches the user's current slot count. The middle 6-slot is hard-coded as fit in the demo; in production, pick by slot count.

**Card body** (below render): partner kicker · capacity + finish kicker; 22px serif label; 12px muted sans description; bottom row separates price (20px serif) from `SHOP ↗` link.

Footer caveat italic: *"Virtual Watchbox may earn a commission on box purchases."*

### §06 From the Watch World

4-column grid on desktop, 1-column on mobile.

**News card:**
- Thumbnail: aspect 4/3, paper-warm background, drop-shadowed inline image
- `NEW` badge top-right when `isNew` — gold background, ink text, 8.5px 0.18em-tracked uppercase
- Source + when row: gold kicker source name, muted small sans timestamp
- 18px serif headline, weight 400, line-height 1.18, `text-wrap: balance`
- 12px muted-dark sans excerpt, 1.55 line-height, `text-wrap: pretty`

Section footer: right-aligned `VIEW ALL NEWS →` link, which deep-links to `/news`.

Live data: pulled from the same `/api/news` proxy the news page uses (PRD Feature 11). On Discover, surface only those tagged for the user's brands of interest.

## Data Shapes

All shapes live in `discover-data.jsx` for the prototype. In production, replace with calls into `useCollectionSession()` and the existing catalog / news / strap / box partner sources.

```ts
// Insight — the analytical read driving the hero subtitle + Lead pick
interface BoxInsight {
  read: string;          // short headline phrase, e.g. "Sport-led, blue–black, sub-$10K"
  thesis: string;        // longer italic paragraph
  stats: { label: string; value: string; meta: string }[];
  gaps: { id: string; label: string; detail: string }[];
}

// Next-slot recommendation (Complete the Box + Next Slot all use this)
interface NextSlotRec {
  rank: string;          // "01" | "02" | "03"
  id: string;
  brand: string;
  model: string;
  ref: string;
  size: number;          // mm
  type: string;          // "Chronograph" | "Dress" | "Integrated · Chronograph" etc.
  image: string;         // path or URL
  priceLow: number;
  priceHigh: number;
  marketMedian: number;
  addresses: string;     // gap id (chrono/dress/integrated/precious)
  addressesLabel: string;// short phrase displayed on the card
  thesis: string;        // italic editorial body
  why: string[];         // 2-4 bullets — "Why it fits your box"
  findOn: string;        // "Chrono24" (deep-link target)
}

// Lead pick — gap-tied headline for the Complete the Box panel
interface Lead {
  gapLabel: string;      // "Dress" | "Featured this week" (guest)
  insight: string;       // italic editorial paragraph for the dark panel
  watch: NextSlotRec;    // the recommended watch
}

// Upgrade path (per owned watch)
interface UpgradePath {
  id: string;
  from: { brand: string; model: string; ref: string; value: number; image: string; size: number };
  to:   { brand: string; model: string; ref: string; value: number; image: string; size: number };
  rationale: string;     // italic editorial body
  delta: string;         // pre-formatted, e.g. "+$1,700"
  aspirational?: boolean;// shows the "Stretch" badge
}

// Strap option
interface StrapOption {
  id: 'leather-black' | 'suede-brown' | 'rubber' | 'nato' | 'sailcloth';
  label: string;
  material: string;
  use: string;
}

// Watchbox option
interface WatchboxOption {
  id: string;
  label: string;
  desc: string;
  partner: string;
  price: string;            // pre-formatted, "$165"
  capacity: string;         // "3 slots" | "6 slots" | "10 slots"
  finish: 'Suede' | 'Oak' | 'Walnut';
  cta: string;              // "Shop"
}

// News item
interface NewsItem {
  kicker: string;           // "Field Report" | "First Look" etc.
  source: string;
  when: string;             // "1h ago"
  isNew: boolean;
  headline: string;
  excerpt: string;
  brand: string;
  img: string;
}
```

## Interactions & Behavior

- **Section nav anchors**: smooth-scroll to section, with a 110px (desktop) / 100px (mobile) offset above the target to clear the sticky main + section nav. Use `window.scrollTo({ top, behavior: 'smooth' })`, not `Element.scrollIntoView()` (see the design environment's notes on scrollIntoView).
- **Section nav active tracking**: `IntersectionObserver` with `rootMargin: '-30% 0px -55% 0px'`. The topmost intersecting section wins.
- **CTAs**:
  - `Find on Chrono24 ↗` (Lead) and `Find on market ↗` (cards) — `buildChrono24URL` deep links with brand/spec hints baked in
  - `Add to Playground` (Lead) — opens the existing playground destination picker, defaulting to Lead pick
  - `♡ Follow` — adds to `followedWatchIds`
  - `Set as target` — adds to `nextTargets[]` (max 3, see PRD Feature 2B)
  - `Shop ↗` (boxes), `Explore strap swap ↗` (straps) — partner deep links via affiliate URL builders
  - `View all news →` — link to `/news`
- **Personalized vs guest**: when no signed-in collection, use a stable demo seed (`DISCOVER_DEMO_COLLECTION_IDS` per PRD). The page never looks empty. The compact byline switches to `Editor's curation`, and the Lead's `gapLabel` becomes `Featured this week`.
- **Hover states**: cards lift subtly (existing `--shadow-md`), CTAs darken text and the gold-on-CTA gets a +5% lightness shift. The strap card's `EXPLORE STRAP SWAP ↗` gains an underline on hover.

## Responsive Behavior

Desktop primary at 1280px max content width. Mobile reflow rules live in `<style>` block at the top of `Discover.html` and are scoped under `.vwb-mobile`:

- Hero compact byline hidden on mobile
- Hero stat strip (now removed from the design — keep noted in case re-introduced) was a 2×2 inline grid
- Complete the Box panel stacks to single column; spec row collapses from 3 columns to 2; action row goes column with full-width buttons
- Upgrade pairs stack vertically; arrow column rotates 90° to point down
- Next Slot, Box, News grids collapse to 1 column
- Strap grid collapses to 2 columns
- Section nav: 40px tall, gap 16px, leading "In this issue" label hidden, right-edge fade gradient signals horizontal scroll
- Section padding: 18px horizontal, 40px top / 24px bottom

Breakpoint: in the prototype these are applied only when the page tree carries the `.vwb-mobile` class. In production, translate to standard media queries — `@media (max-width: 768px)` or whatever the codebase uses.

## Assets

The handoff bundle includes 20 watch product photos in `watches/`:
- 5 Longines `.avif` files (re-used as stand-ins for varied catalog watches: Tudor BB-GMT, Omega Aqua Terra, Oris Big Crown Pointer Date, Sinn 556, Hamilton Khaki Field)
- 15 real product photos covering AP Royal Oak Frosted, AP Royal Oak Offshore, Omega Constellation diamond, Omega Aqua Terra gold, Omega Speedmaster Broad Arrow, Omega Speedmaster MOP, Oris Big Crown Pointer (red + grey), Oris Aquis GMT, Patek Nautilus 5990, Patek Calatrava 6000G, Rolex Datejust (chocolate + Wimbledon rose + Wimbledon two-tone), Vacheron Overseas

In production these are placeholders — the catalog provides real images via the standard fallback chain per PRD Feature 2D §Image Resolution Order.

The strap textures and watchbox renderings are entirely CSS — no image assets needed.

## Files in this bundle

- `Discover.html` — entry point with `<style>` mobile-reflow rules
- `DiscoverEditorial.jsx` — all editorial section components (Hero, SectionNav, CompleteTheBox, UpgradeRow, NextSlotCard, StrapCard + StrapSwatch + STRAP_TEXTURES, BoxCard + BoxRender + BOX_FINISHES, NewsCard, FromTheWatchWorld)
- `DiscoverRoot.jsx` — host shell (nav + page composition + design-canvas wrap). **Strip the design_canvas + tweaks wiring for production**; the real Discover route just needs `DiscoverNav + SectionNav + DiscoverEditorial`
- `discover-data.jsx` — seed data + computed lead/insight. **Replace with live queries.**
- `colors_and_type.css` — design tokens
- `watches/` — placeholder watch images
- `design-canvas.jsx`, `tweaks-panel.jsx` — design-tool infra, **do not ship**
- `PRD.md` — full product PRD for reference; Feature 14 covers Discover

## Open questions to settle before shipping

1. How to compute `insight.read` from real signals — for v1 a simple rules-based map keyed on (dominant brand, dial color mode, median price tier, lug-width mode) is fine.
2. Lug-width compatibility logic — straps presumably already have lug-width data; pre-filter the displayed materials based on owned watches' lug-width modes.
3. Strap affiliate partners — the design has CTAs stubbed; copy is *"Affiliate partners coming soon."* — keep that until partners land.
4. Box "Best Fit" rule — should match the user's current Collection slot count to the closest box capacity, ties go to the smaller box.
5. Live news data — re-use `/api/news` and filter by `brandsOfInterest` from collection signals. Limit to 4 cards on Discover.

## Screenshots

Bundled in `screenshots/`. Each section captured at desktop and mobile widths. Use these as the visual ground truth alongside the live HTML.

**Desktop (paired with the prototype's desktop artboard at 1320 max-width):**
- `01-desktop-hero.png` — main nav, sticky section nav, hero (compact byline + h1 + italic subtitle), and the top of the dark Complete the Box panel
- `02-desktop-complete-the-box.png` — full Complete the Box panel with the Patek Calatrava 6000G as the dress-gap lead
- `03-desktop-upgrade-this-watch.png` — 2-column upgrade grid with the from→to comparison cards
- `04-desktop-next-slot.png` — 3-column alternates grid
- `05-desktop-straps.png` — 5 CSS-textured strap material cards
- `06-desktop-box.png` — 3 physical watchbox cards with wood-grain top-down renderings
- `07-desktop-news.png` — 4 news cards from the watch world

**Mobile (paired with the prototype's mobile artboard at iPhone 402):**
- `01-mobile-hero.png` — hamburger nav, horizontally-scrolling section nav with fade gradient, hero, top of Complete the Box panel. Note: byline is hidden.
- `02-mobile-complete-the-box.png` — stacked Complete the Box panel (text above, watch image below)
- `03-mobile-upgrade-this-watch.png` — single-column upgrade cards with vertically-stacked from→to images (each watch image is full-card-width)
- `04-mobile-next-slot.png` — 1-column alternates grid
- `05-mobile-straps.png` — 2-column strap grid
- `06-mobile-box.png` — 1-column box grid
- `07-mobile-news.png` — 1-column news cards

> Heads up: the screenshot capture viewport is ~900px wide, so the desktop shots render the design at 900px rather than the design's true 1280px max-width. The proportions, typography scale, and section heights are correct, but the section-header right-sub line wraps slightly tighter than it will at full 1280. Use the live HTML prototype for pixel-perfect reference at 1280+.
