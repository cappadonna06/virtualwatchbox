# Virtual Watchbox — Design System

**Brand:** Virtual Watchbox  
**Tagline:** *Showcase Your Timepieces. Discover What's Next.*  
**Site:** virtualwatchbox.com  
**Version:** 1.0 — April 2026

---

## Sources

| Source | Path / Link |
|---|---|
| Next.js codebase | `virtualwatchbox/` (mounted via File System Access API) |
| Product Requirements | `virtualwatchbox/docs/PRD-v1.4_2.md` |
| Watch images | `assets/watches/` |
| OG image | `assets/og-image.png` |

---

## Product Overview

Virtual Watchbox is a **luxury-tech web platform** for watch collectors to showcase, manage, and expand their collections through a realistic virtual watch box experience. It is free-to-use, monetized through affiliate links, sponsored placements, and sell-side lead generation.

### Core Products / Surfaces

| Surface | Route | Description |
|---|---|---|
| **Homepage** | `/` | Hero + virtual watch box display + features + news |
| **My Collection** | `/collection` | Manage owned watches — Watchbox / Cards / Stats views |
| **Add Watch** | `/collection/add` | Search catalog, confirm ownership, add to collection |
| **Playground** | `/playground` | Fantasy dream boxes — no ownership required |
| **Discover** | (future) | Browse the watch catalog |
| **News** | (future) | Aggregated horological content |

### Watch Categories (Data Model)
1. **In My Collection** — owned watches, full metadata, source of truth
2. **Playground** — fantasy boxes, no ownership metadata
3. **Liked Watches** — bookmarked, heart icon
4. **Next Targets** — up to 3 acquisition shortlist items
5. **Grail** — single aspirational dream watch

### Tech Stack
- Next.js 14 (App Router), TypeScript
- Inline styles as primary pattern; Tailwind only for responsive grid utilities
- CSS variables: `--font-cormorant`, `--font-dm-sans`
- Session state only (no persistence yet; Supabase planned for Phase 2)

---

## CONTENT FUNDAMENTALS

### Voice & Tone
Virtual Watchbox speaks like an **informed, discerning collector** — calm, confident, editorial. Think Hodinkee's authority crossed with Linear's precision. Never salesy; never breathless; never casual.

### Casing
- **Headlines:** Sentence case with deliberate capitalization of proper watch names (brand, model, ref)
- **UI labels:** ALL CAPS with wide letter-spacing (0.08–0.12em) for meta labels, section eyebrows, and status indicators
- **Body copy:** Sentence case, natural punctuation
- **Brand names:** Exact manufacturer casing: *A. Lange & Söhne*, *Patek Philippe*, *Rolex*

### Pronouns & POV
- **Second person ("you / your")** for interface copy: "Your collection", "Your source of truth", "Build your box"
- **First person** avoided — the product is a tool, not a companion
- **No editorial opinions** on watches — factual data only (no "gorgeous", "stunning", etc.)

### Punctuation & Style
- Em dashes (—) for parenthetical clauses, not hyphens
- Arrows (→ ↗) used literally as affordance indicators, not decoration
- Italic emphasis used sparingly in headlines: *Timepieces.*, *Collector Needs.*, *Intelligence.*
- Affiliate CTAs: "Find For Sale ↗" / "Track Listings →" — arrow indicates external link

### Copy Examples
```
"Showcase Your Timepieces. Discover What's Next."       ← tagline
"Your source of truth."                                  ← collection page subtitle
"Build dream boxes with any reference."                  ← feature description
"The Digital Home for Every Collector"                   ← hero eyebrow
"Free for Collectors. Always."                           ← footer tagline
"Click any slot to view details"                         ← empty sidebar state
"You have X unsaved changes"                             ← draft workflow
"Everything a Collector Needs."                          ← section heading
```

### Emoji & Icons
- **No emoji** in UI copy or headings
- Arrow glyphs (→ ↗ ✕) used as text characters for affordances
- SVG icons for UI actions (edit, delete, hamburger, close) — minimal, 1.5px stroke, no fill

### Numbers & Values
- Currency: `$1,350` (no decimals) via `Intl.NumberFormat`
- Sizes: `42mm` (no space before unit in UI)
- References: `Ref. L3.764.4.16.6` (with period)

---

## VISUAL FOUNDATIONS

### Colors

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#FAF8F4` | Page background — warm cream |
| `--color-slot` | `#FFFCF7` | Watch slot / card / sidebar background |
| `--color-ink` | `#1A1410` | Primary text, dark buttons |
| `--color-muted` | `#A89880` | Secondary text, labels, meta |
| `--color-gold` | `#C9A84C` | Accent — prices, active states, brand labels |
| `--color-dark` | `#2A2520` | Dark badge background |
| `--color-border` | `#EAE5DC` | Primary dividers and borders |
| `--color-border-mid` | `#E8E2D8` | Card borders |
| `--color-border-light` | `#D4CBBF` | Light borders, secondary button borders |
| `--color-hero-bg` | `#1e1b16` → `#2a2420` | Hero dark panel gradient |

**Semantic / Status Colors** (used only in badges):
- Owned: `#E8F4E8` / `#2D6A2D`
- For Sale: `#FFF8E6` / `#8A6A10`
- Recently Added: `#E8F0FA` / `#1A4A8A`
- Needs Service: `#FFF3E0` / `#8A5010`
- Unworn: `#E8F4E8` / `#2D6A2D`
- Excellent: `#FFF8E6` / `#8A6A10`
- Good: `#FDF0E0` / `#8A5010`
- Fair: `#FAE8E8` / `#8A2020`

**Color vibe:** Warm parchment and leather — no cool grays, no blues in the base palette. Gold is the ONLY chromatic accent. Backgrounds are never pure white.

### Typography

**Display / Headings:** Cormorant Garamond
- Hero H1: 48–78px, weight 300, letter-spacing -0.01em, line-height 1.0
- Section H2: 38px, weight 400, line-height 1.15
- Card title: 20–26px, weight 400
- Feature/article title: 15–20px, weight 400
- Used italic form (`<em>`) for last word of display headlines

**UI / Body:** DM Sans
- Body text: 12–14px, weight 400, line-height 1.7–1.9
- Meta labels: 9–12px, weight 500–600, letter-spacing 0.08–0.12em, ALL CAPS
- Prices: 18–24px, weight 600–700 (DM Sans numeric)
- Buttons: 11px, weight 500, letter-spacing 0.08em
- `-webkit-font-smoothing: antialiased` always applied

**Font sources:** Google Fonts (Cormorant Garamond, DM Sans) — note: production may use self-hosted versions via `--font-cormorant` and `--font-dm-sans` Next.js CSS variables.

### Spacing
- Page padding: `56px` horizontal (desktop), `20–24px` (mobile)
- Section padding: `80px` vertical (desktop), `48px` (mobile)
- Component padding: `24px` (cards), `16px` (compact cards)
- Gap system: 8, 12, 16, 20, 24, 28, 32, 40, 56, 80px

### Cards
- Background: `#FFFFFF` (or `#FFFCF7` for watch slots)
- Border: `1px solid #E8E2D8`
- Border radius: `10–12px` (cards), `6–8px` (small), `4px` (buttons), `20px` (pills/badges)
- Box shadow resting: `0 1px 4px rgba(26,20,16,0.04)`
- Box shadow hover: `0 4px 16px rgba(26,20,16,0.08)` + `translateY(-2px)`
- Box shadow active (gold): `0 0 0 1px rgba(201,168,76,0.4), 0 6px 24px rgba(201,168,76,0.12)`
- Active border: `2px solid rgba(201,168,76,0.8)`

### Buttons
- **Primary:** `background #1A1410`, `color #FAF8F4`, `border-radius 4px`, `padding 9–12px 22–28px`
- **Secondary:** `background transparent`, `border 1px solid #D4CBBF`, `color #1A1410`
- **Ghost/text:** `color #A89880`, no border
- Font: DM Sans 11px, weight 500, letter-spacing 0.08em

### Borders & Dividers
- Section dividers: `1px solid #EAE5DC`
- Card/component borders: `1px solid #E8E2D8`
- Secondary: `1px solid #D4CBBF`
- Slot border dashed (empty): `1.5px dashed #D0C9BE`
- Active slot: `1.5px solid #C9A84C`

### Animations & Motion
- Sidebar slide-in: `transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)` from right
- Mobile sheet slide-up: `0.28s cubic-bezier(0.32, 0.72, 0, 1)`
- Hover transitions: `0.15–0.18s ease` (border, shadow, transform)
- Carousel fade: `opacity 0.3s ease, transform 0.3s ease`
- Nav drawer: `0.2s ease` (opacity + translateY)
- Ticker: `28s linear infinite`
- No bouncy/springy animations — all easing is calm and smooth

### Hover & Press States
- Cards: `translateY(-2px)` + shadow deepens on hover; gold border on active/selected
- Buttons: no transform; subtle opacity shift acceptable
- Feature rows: arrow color changes to `#C9A84C` on hover
- Nav links: color shifts from `#A89880` toward `#1A1410`

### Backgrounds & Imagery
- Page bg: solid `#FAF8F4` — no textures, no gradients
- Hero dark panel: subtle `linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)` — the ONLY gradient
- Hero dark panel: radial gold glow overlay (`rgba(201,168,76,0.08)`) — very subtle
- Watch images: product photos with `drop-shadow`, `objectFit: contain` on cream bg
- News thumbnails: `#EDE9E2` → `#E0DAD0` placeholder gradient (Phase 2: real images)
- No full-bleed images, no background patterns/textures in current codebase

### Iconography
See ICONOGRAPHY section below.

### Layout
- Max content width: `1280px`, `margin: 0 auto`
- Sticky nav: `top: 0, z-index: 100`
- Sidebar: fixed right, `360px` wide, `z-index: 40`, backdrop `z-index: 30`
- Watch box grid: 3 columns (6-slot), aspect-ratio `3/4` per slot
- Collection cards grid: responsive (`1fr` mobile, multi-col desktop)
- Scrollbar: custom `6px` width, `#D4CBBF` thumb

### Blur & Transparency
- Backdrop filter: `blur(2px)` on mobile sidebar backdrop, `blur(6px)` on hero like button, `blur(10px)` on price pill
- Used sparingly — only on overlapping floating elements

---

## ICONOGRAPHY

Virtual Watchbox uses **minimal inline SVG icons** drawn at 11–22px with `1.5px` stroke weight, no fill, rounded linecaps. No external icon library or icon font is used. Icons are purpose-drawn per component.

### Current Icon Inventory
| Icon | Component | Description |
|---|---|---|
| Hamburger menu | NavBar | 3 horizontal lines, 22×16px |
| Close (×) | NavBar, Sidebar | 2 diagonal lines, 20×20px |
| Edit (pencil) | WatchSidebar | 12×12px path |
| Delete (trash) | WatchSidebar | 12×12px path |
| Heart (♡ / ♥) | HeroCarousel | Unicode char, toggled |
| Arrow → | Features, footer | Text character |
| Arrow ↗ | CTAs | Text character — external link |
| Dots carousel | HeroCarousel | CSS-rendered circles |
| Plus (+) | WatchBox | Text character for empty slots |

### Usage Rules
- No emoji in UI elements
- Arrow text glyphs (`→` `↗` `‹` `›`) are used for directional affordances
- All SVG icons are inline — no sprite, no font
- Icon color matches surrounding text (inherits `currentColor` or uses `#A89880`)
- No icon-only buttons without `aria-label`

---

## File Index

```
README.md                      ← This file
SKILL.md                       ← Agent skill manifest
colors_and_type.css            ← CSS custom properties (colors, type, spacing)
assets/
  watches/                     ← Watch product images (Longines Legend Diver, .avif)
  og-image.png                 ← OpenGraph / social share image
  favicon.ico                  ← Favicon
preview/
  colors-base.html             ← Base color palette swatches
  colors-semantic.html         ← Status / semantic color tokens
  type-display.html            ← Cormorant Garamond display scale
  type-ui.html                 ← DM Sans UI type scale
  spacing-tokens.html          ← Spacing / radius / shadow tokens
  components-buttons.html      ← Button variants
  components-badges.html       ← Badges, pills, status indicators
  components-cards.html        ← Watch card + watch slot
  components-sidebar.html      ← Watch detail sidebar
  components-nav.html          ← NavBar
  brand-logo.html              ← Logotype specimen
ui_kits/
  web_app/
    README.md                  ← UI kit notes
    index.html                 ← Interactive prototype (Homepage → Collection → Playground)
    NavBar.jsx                 ← Navigation component
    WatchBox.jsx               ← Watch box grid + hover card + sidebar
    WatchCard.jsx              ← Collection card view
    WatchSidebar.jsx           ← Detail sidebar component
    CollectionPage.jsx         ← My Collection page
    PlaygroundPage.jsx         ← Playground page
```
