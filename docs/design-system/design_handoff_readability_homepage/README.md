# Handoff: Readability Pass + Homepage Redesign

## Overview
Two related pieces of work for **Virtual Watchbox**:

1. **A global readability pass on the design system** — darken secondary text, split the gold accent into "bright (dark surfaces)" + "antique (light surfaces)", and lift the type scale to a hard 11px floor. All changes clear **WCAG AA** while preserving the warm, editorial, parchment-and-leather character.
2. **A redesigned homepage** that applies the pass as a proof of concept, with a bigger, more editorial hero.

The readability changes are expressed as **design tokens** in `colors_and_type.css` and should be treated as the source of truth — they ripple to Collection, Discover, sidebars, badges, and every price across the app, not just the homepage.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS** — a prototype showing the intended look and behavior, **not production code to copy verbatim**. The task is to **recreate these designs in the Virtual Watchbox codebase** (Next.js 14 / App Router / TypeScript, inline-styles-first per the existing patterns) using its established components and conventions. Where the codebase already has a component (NavBar, WatchBox, WatchSidebar, WatchCard), apply the new token values to it rather than rebuilding from scratch.

The single most important deliverable is **the token changes** — apply those first; the homepage layout is the showcase.

> ⚠️ The prototype's first full-width block is a **"Design Language Review"** (before/after rationale with cards and an "Show AA contrast" button). That is **documentation, not a homepage section** — do **not** ship it. The production homepage starts at the hero.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions. Recreate pixel-faithfully using the codebase's libraries/patterns. Exact values are below and in `colors_and_type.css`.

---

## THE READABILITY PASS (apply to design tokens first)

### Color token deltas

| Token | Before | After | Notes |
|---|---|---|---|
| `--color-muted` | `#A89880` (~2.5:1, **fails**) | `#6A5B48` (**6.2:1 AA**) | Secondary/meta/body text. The single biggest fix. |
| `--color-gold` | `#C9A84C` used everywhere | `#C9A84C` **dark surfaces & decorative accents only** | ~2:1 on cream — never use as text on light. 7.7:1 on the dark panel (great). |
| `--color-gold-deep` | *(new)* | `#876A12` (**4.9:1 AA** on cream, 5.1:1 on white) | **Antique gold** for prices, brand/meta labels, links & accents on light backgrounds. |
| `--color-faint` | *(new)* | `#9A8B73` | Decorative ONLY (slot numbers, hairlines). **Never** load-bearing text. |

Unchanged: `--color-bg #FAF8F4`, `--color-slot #FFFCF7` (cards may use `#FFFFFF` for max contrast), `--color-ink #1A1410`, borders `#E8E2D8` / `#D9D0C4`, dark panels `#1C1814`→`#2A2520`.

**On dark surfaces:** body text `#F5F1E9`, muted text `#B8AB95` (7.8:1 on `#1C1814`), accents/prices bright gold `#C9A84C` (7.7:1).

**Decision log:** prices were briefly trialed in ink; final call is **antique gold `#876A12`** (keeps the value/luxury cue, passes AA).

### Type scale deltas (hard 11px floor for any real text)

| Role | Before | After |
|---|---|---|
| Hero H1 | `clamp(48px,5vw,78px)` | `clamp(54px,6vw,90px)`, w300, ls −0.015em, lh ~0.98 |
| Section H2 | `38px` | `clamp(33px,3.6vw,46px)`, w400, lh ~1.08 |
| H3 | `26px` | `26px`, w400–500 |
| Card title | `16–20px` | `21px`, w400 |
| Lead / intro | `13px` | `18px`, lh ~1.55, color `--color-ink` softened (`#43392E`) or muted |
| Body | `13px` | **`15px`**, lh ~1.6, color `--color-muted` |
| Caption | `12px` | **`14px`** (paragraph floor) |
| UI label (uppercase) | `10px` | **`12px`**, w600, ls 0.10–0.14em |
| Smallest label | `9px` | **`11px` hard floor**, tertiary only |
| Price | `19px` | `20px`; large price `24px → 27px`; antique gold; `tabular-nums` |
| Button | `11px` w500 | `12px` w600, ls 0.08em |

Fonts unchanged: **Cormorant Garamond** (display, `--font-serif`) + **DM Sans** (UI, `--font-sans`). Italic `<em>` on the last word of display headlines is retained. `-webkit-font-smoothing: antialiased` everywhere.

### Contrast verification (WCAG)
- `--color-muted` `#6A5B48` on `#FAF8F4` → **6.2:1** (AA, body)
- `--color-gold-deep` `#876A12` on `#FAF8F4` → **4.9:1** (AA, text)
- `--color-gold` `#C9A84C` on `#1C1814` → **7.7:1** (AAA)
- `#B8AB95` on `#1C1814` → **7.8:1** (AAA)

---

## HOMEPAGE — Screens / Views

All sections are centered in a `max-width: 1240px` container with `56px` horizontal padding (`20–32px` on small screens). Sections are separated by `1px solid #E8E2D8` and use `~96px` vertical padding (`64px` on tablet).

### 1. Nav (sticky)
- 76px tall, `rgba(250,248,244,.86)` + `backdrop-filter: blur(12px)`, bottom hairline.
- Left: `VW` ink square mark (38px, radius 7) + "Virtual Watchbox" in Cormorant 23px.
- Center: links (My Collection / Service Room / Playground / Discover / News), DM Sans 14px, `--color-muted`, hover → ink.
- Right: circular 40px search button (1px border) + 40px ink avatar "M".

### 2. Hero — editorial (the focus of the redesign)
- Two columns: `minmax(0,1.05fr)` (text) / `minmax(0,0.95fr)` (dark featured panel), `min-height: 640px`.
- **Left:** eyebrow with a 28px antique-gold rule + "The Digital Home for Every Collector" (12px, w600, ls .14em, `--color-muted`). Headline "Showcase Your *Timepieces.*" Cormorant `clamp(54,6vw,90)` w300, lh .98, ls −.015em ("Timepieces." italic). Lead 18px. Buttons: primary (ink fill, `15px 30px`, radius 5, 12px w600 label) + secondary (transparent, 1px `#D9D0C4` border). Footer line: 5px gold dot + "Free to build. No account required." (14px muted).
- **Right (dark featured panel):** radial gradient `120% 90% at 70% 18%, #2c2620 → #1C1814` plus a faint gold radial glow. Top row: brand eyebrow (**bright gold**), model in Cormorant 30px (`#F5F1E9`), ref line (11px, `#B8AB95`); right-aligned "Estimated Value" label + value in DM Sans 27px **bright gold**. Centered watch PNG (`max-height 430px`, `drop-shadow(0 26px 44px rgba(0,0,0,.55))`). Bottom: carousel dots (active = 22px gold pill) + two 44px circular nav buttons. Heart toggle top-right. Auto-advances every 6s; rotates Rolex Datejust → A. Lange 1 → AP Royal Oak Offshore → Patek Nautilus.

### 3. Your Virtual Watch Box
- Two columns `minmax(0,1.35fr)` / `minmax(0,1fr)`, `gap 44px`, `align-items: start`.
- **Tray:** oak gradient (`155deg, #C99A5B → #B6863F`), radius 18, padding 20, inner glow + drop shadow. Inside, a `repeat(3, minmax(0,1fr))` grid (gap 14) of slots: `aspect-ratio 3/4`, `#FFFCF7`, 1px border, radius 10; **`min-width:0`** and slot `img { max-height:86%; max-width:84% }` (critical — watch PNGs have large intrinsic width and will blow out the grid otherwise). Slot number top-left (11px `--color-faint`). Hover → gold border + lift; active → gold ring. Last slot is a dashed "+ Add Watch" empty state. Tray footer: "Light Oak · Cream lining · 6 slots" + ghost "Customize Watchbox" button.
- **Detail sidebar:** white card, radius 16, 1px border. Empty state = dashed ring "+", "Select a watch", helper line. Populated = dark watch hero (radial gradient) + brand eyebrow + Cormorant 26px name + 2×2 spec grid (Reference / Case / Dial / Movement — label 11px uppercase muted, value 15px ink) + footer with "Estimated Value" + price (27px **antique gold**) + ghost "Find For Sale ↗".

### 4. Discover (dark band)
- Full dark section (`#1C1814`), two columns `gap 56px`, `align-items: center`.
- Left: eyebrow (bright gold) "Discover · Personalized for You", Cormorant `clamp(33,3.6vw,46)` "A *chronograph* to round out the box.", paragraph (`#B8AB95`, 15px), spec row (Brand / Reference / Market — market in **bright gold**) bounded by hairlines, then gold-fill "View on Discover →" + outline "View Details" buttons.
- Right: watch PNG on a gold radial glow with a centered caption (brand 12px uppercase muted + model italic Cormorant 18px).

### 5. What Collectors Are Reading (news)
- Eyebrow "From the Watch World" + Cormorant H2 "What Collectors *Are Reading.*".
- Two columns `minmax(0,1.1fr)` / `minmax(0,1fr)`, `gap 52px`.
- **Feature card:** 16:11 tinted placeholder (`135deg, #E7E0D4 → #D8CFC0`) holding a watch PNG, ink "Featured" pill top-left; source line (muted), Cormorant 30px headline, 15px muted excerpt.
- **List:** three rows, `92px / 1fr` grid, square tinted thumb + source (11px uppercase muted) + Cormorant 21px headline (hover → antique gold). Then "See all articles →" link (antique gold, uppercase 12px).

### 6. On Your Radar (horizontal scroll)
- Header row: eyebrow "Followed · 8 watches" + Cormorant H2 "On Your *Radar.*" on the left, "Open Playground →" link on the right.
- Horizontal scroller (`scroll-snap-type: x mandatory`), cards `flex: 0 0 226px`, white, radius 14: square tinted photo area (PNG + heart button), then brand (11px uppercase muted), Cormorant 21px model, dial (14px muted), and a price row — price 20px **antique gold** + "Market" (11px faint). Hover → lift + shadow.

### 7. Footer
- 40px padding, space-between: "Virtual Watchbox" (Cormorant 21px) · "© 2026 · virtualwatchbox.com" (14px muted) · "Free for Collectors. Always." (12px uppercase antique gold).

---

## Interactions & Behavior
- **Hero carousel:** prev/next + clickable dots + 6s auto-advance; image cross-fades (opacity, ~180ms). Heart toggles ♡/♥ (bright gold when active).
- **Watchbox slots:** click selects (gold ring) and populates the detail sidebar; clicking the active slot does not deselect in the PoC (codebase may add toggle). Hover = gold border + `translateY(-2px)`.
- **Radar:** horizontal scroll with snap; per-card heart toggle (stopPropagation).
- **Transitions:** borders/shadows/transch ~0.15–0.16s ease; no springy motion (matches existing system).
- **"Show AA contrast" button:** PoC-only devtool that reveals live, tweak-aware contrast badges. Not for production.
- **Responsive:** grids collapse to single column ≤1080px; nav links hide and tray becomes 2-col ≤640px.

## State Management
- `heroIndex` (carousel), `liked` set, `selectedSlotId` (drives detail sidebar). In the real app, wire the detail sidebar and radar/hero data to the existing watch data source.

## Design Tokens
Authoritative list is in **`colors_and_type.css`** (this bundle). Spacing scale (4/8/12/16/20/24/28/32/40/56/80), radii (btn 4–5, sm 6, md 8, lg 10, xl 12, pill 20, circle), and shadows are unchanged from the existing system. The PoC's local `--c-*` names in `redesign.css` map 1:1 to the canonical `--color-*` / `--text-*` tokens (see comments in both files).

## Assets
Watch product PNGs (transparent) live in `redesign_assets/` — sourced from the project's `uploads/`. These are stand-ins (Rolex, Patek, AP, A. Lange, Omega, Oris, Vacheron); the screenshot's original IWC references aren't in the project. Swap for the real catalog imagery in production. Fonts: Cormorant Garamond + DM Sans (the design system declares self-hosted `@font-face` in `colors_and_type.css`; upload the woff2s to `fonts/`, or keep Google Fonts as in the prototype).

## Files
- `Homepage Redesign.html` — the hifi prototype (open in a browser to interact). Includes the non-shippable "Design Language Review" block and a Tweaks panel.
- `redesign.css` — all prototype styles (token deltas annotated `WAS …`).
- `colors_and_type.css` — **canonical, updated design tokens** (the source of truth for the readability pass).
- `tweaks-panel.jsx` — supports the prototype's Tweaks panel only.
- `redesign_assets/` — watch imagery used by the prototype.
