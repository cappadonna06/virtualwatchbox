# Handoff: My Collection — Empty State (First-Run)

## Overview
This package specifies the redesigned **empty state** for the homepage "My Collection" watchbox — the screen a signed-in user sees before they've added any watches. It replaces a first-run screen that showed an empty gold frame (which read as "broken/forgotten") with one that **sells the box**: a focal "add" slot, faded sample watches that preview the payoff, a clear value proposition, and a single primary action. Desktop and mobile layouts are both included.

The empty state also carries the project's **Readability Pass** tokens (darkened secondary text, split gold, lifted type floor) so it matches the rest of the refreshed app.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that demonstrate the intended look, layout, and behavior. **They are not production code to paste in.** The task is to **recreate these designs in the Virtual Watchbox codebase using its existing environment and patterns** (the live app is React/Next.js per the project notes). Reuse the app's existing components, design tokens, routing, and state — map the HTML structure onto those, don't fork a parallel styling system.

If a token already exists in the app's theme, use it; the hex/size values here are the source of truth for what those tokens should resolve to after the readability pass.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interaction affordances are final. Recreate pixel-faithfully using the codebase's component library. The phone bezel in the mock is presentation chrome only — implement the *screen contents* responsively; don't build a device frame.

---

## Screens / Views

### 1. Empty State — Desktop (≥ 1080px)

**Purpose:** Invite a first-time / empty user to add their first watch, while previewing what a filled collection looks like and conveying the product's value.

**Layout:**
- Section uses the **same two-column grid as the populated watchbox** so adding the first watch does not reflow the page:
  `grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); gap: 48px; align-items: stretch;`
- **Left column** — the gold tray (watch box).
- **Right column** — the welcome / onboarding panel.
- Above the grid: section header — eyebrow (`Your Collection →`) + serif H2 (`Your Virtual Watch Box.`, last words italic).

**Left column — Tray**
- Outer frame: `background: linear-gradient(155deg, #C99A5B 0%, #B6863F 100%); border-radius: 18px; padding: 20px;` with `box-shadow: inset 0 2px 6px rgba(255,255,255,.25), 0 14px 36px rgba(26,20,16,.16);`
- Inner grid: `repeat(3, 1fr); gap: 14px;` → 6 slots, each `aspect-ratio: 3/4; border-radius: 10px;`
- **Slot 1 = focal "add" affordance** (the single clear entry point):
  - `background: #FFFFFF; border: 1.5px dashed var(--color-gold-deep);`
  - Centered ring: `46×46px; border-radius: 50%; border: 1.5px solid var(--color-gold-deep);` containing a `＋` (26px, weight 300, color `--color-gold-deep`).
  - Label below ring: `Add your first watch` — 12px, weight 600, letter-spacing .1em, uppercase, color `--color-ink`.
  - **Hover:** `background:#fff; border-color: var(--color-gold); box-shadow: 0 0 0 3px rgba(201,168,76,.18), 0 10px 28px rgba(201,168,76,.16); transform: translateY(-2px);` and the ring fills (`background: --color-gold-deep; color:#fff`).
- **Slots 2–6 = phantom "sample" watches** (preview of potential, intentionally faded):
  - `background: var(--color-surface-2) (#FFFCF7); border: 1px solid var(--color-line);`
  - Watch image: `filter: grayscale(1) brightness(1.08); opacity: .16; max-height: 80%;`
  - Slot number top-left (`02`–`06`): 11px, weight 600, color `--color-faint`, opacity .7.
  - These are **non-interactive** in the empty state (decorative). See "Assets" for the exact images.
- Tray foot caption (below frame): `The faded watches are a sample box — yours fills these slots as you add.` — 14px, color `--color-muted`.

**Right column — Welcome panel**
- Card: `background:#FFFFFF; border:1px solid var(--color-line); border-radius:16px; box-shadow:0 4px 24px rgba(26,20,16,.05); padding:40px 38px;` flex column.
- Eyebrow: `Welcome` — 12px, weight 600, letter-spacing .14em, uppercase, color `--color-gold-deep`, no leading rule.
- H3: `Start your collection.` (last word italic) — Cormorant Garamond, 34px, weight 400, color `--color-ink`, line-height 1.08.
- Intro: 15px, line-height 1.6, color `--color-ink-soft` (#43392E), max-width ~42ch.
  - Copy: `Add a watch to open the box. Everything you own, kept in one considered place — and ready wherever you are.`
- **Benefits list** (3 items, `gap: 18px`), each = 38×38px rounded icon tile (`background: var(--color-bg-2) #F2EEE5; border-radius:9px; color: --color-gold-deep;`) + stacked title/desc:
  1. **Synced everywhere** — `Your box on desktop, tablet and phone — always current.` (icon: refresh/sync)
  2. **Share a public box** — `One link shows your collection exactly as you've arranged it.` (icon: share nodes)
  3. **Own your record** — `Values, references and service history — kept privately, for you.` (icon: shield)
  - Title: 15px weight 600 `--color-ink`; desc: 14px `--color-muted`, line-height 1.5.
- **CTA group** (pinned to panel bottom via `margin-top:auto`):
  - Primary button (full width): `background: var(--color-ink); color: var(--color-bg); border-radius:5px; padding:15px 30px;` text `＋ Add your first watch` (12px, weight 600, letter-spacing .08em). Hover: `translateY(-1px); background:#2a2018;`
  - Secondary text link (full width, centered): `Build a dream box first →` — 12px, weight 600, letter-spacing .08em, uppercase, color `--color-gold-deep`. Hover widens the arrow gap + darkens to `--color-ink`.

### 2. Empty State — Mobile (< 640px)

**Purpose:** Same as desktop, restructured for a single column with a pinned action bar.

**Layout (top → bottom):**
- **App header:** hamburger (3 lines) · brand `Virtual Watchbox` (serif, 18px, `white-space:nowrap`) · avatar (30px ink circle, `M`). Bottom border `1px var(--color-line)`.
- **Scroll body** (`flex:1; overflow:hidden; padding:18px 20px 0`):
  - Eyebrow `My Collection` (11px, gold-deep, leading rule).
  - H3 `Your Virtual Watch Box.` (Cormorant, 29px, last words italic).
  - Sub: `Add a watch to open the box — kept in one place, ready on every device.` (14px, `--color-ink-soft`).
  - **Tray** — identical language to desktop, compacted: frame `border-radius:15px; padding:13px;` inner `repeat(3,1fr); gap:9px;`. Slot 1 = add affordance (ring 30px, label `Add watch` 9px). Slots 2–6 = phantom watches. Slot numbers 9px.
  - Caption (12px `--color-muted`).
  - Benefits — 3 items, compact: 32px icon tiles, title 13.5px, desc 12px.
- **Sticky CTA bar** (pinned, not scrolling): `background:#FFFFFF; border-top:1px solid var(--color-line); box-shadow:0 -8px 24px rgba(26,20,16,.06); padding:14px 20px;`
  - Primary full-width ink button `＋ Add your first watch` (13px).
  - Below it: `Build a dream box first →` text link (11px uppercase, gold-deep).

**Reference frame:** designed at 390×844 (iPhone logical size). Status bar / dynamic island / home indicator in the mock are illustrative only.

---

## Interactions & Behavior
- **Add slot (slot 1) click** → opens the existing "Add a watch" flow/modal (same entry point as the primary CTA button). Both the focal slot and the primary button trigger the identical action.
- **Primary CTA `Add your first watch`** → same as above.
- **`Build a dream box first →`** → routes to the Playground / "dream box" builder (low-commitment path; no sign-in friction). This is now a real secondary action, not a buried tertiary link.
- **Phantom slots (2–6)** → non-interactive in empty state. (Optional enhancement: a phantom click could also open the add flow — confirm with product before adding.)
- **Hover (desktop only):** the add slot lifts + gold-glows and its ring fills; primary button lifts 1px; dream-box link widens arrow gap and darkens.
- **Transition into populated state:** because the empty layout uses the same two-column grid, after the first watch is added the tray simply replaces the focal slot with the real watch and the right panel swaps from "Welcome" to the watch-detail sidebar — no layout jump.
- **Reduced motion:** all transforms/transitions are decorative; honor `prefers-reduced-motion: reduce` by disabling the hover translate/shadow animations.

## State Management
- `watches: Watch[]` — when `watches.length === 0`, render this empty state; otherwise render the populated watchbox.
- No data fetching is specific to this screen beyond the collection query already used by the populated view.
- The "sample box" phantom watches are **static design assets**, not user data — do not persist or count them as owned.

## Design Tokens
These are the **Readability Pass** values (post-review). They live globally in `colors_and_type.css` / `redesign.css`; this screen only consumes them.

**Color**
| Token | Hex | Use here |
|---|---|---|
| `--color-ink` | `#1A1410` | Headlines, primary text, primary button bg, **add-slot label** |
| `--color-ink-soft` | `#43392E` | Intro / lead paragraph |
| `--color-muted` | `#6A5B48` | Captions, benefit descriptions (≈6:1 on cream — AA) |
| `--color-faint` | `#9A8B73` | Slot numbers only (decorative — never load-bearing text) |
| `--color-gold` | `#C9A84C` | Bright gold — hover glow / accents only (fails as text on light) |
| `--color-gold-deep` | `#876A12` | Antique gold — eyebrow, add-slot border/ring, dream-box link (AA on light) |
| `--color-bg` | `#FAF8F4` | Page / button text on ink |
| `--color-bg-2` | `#F2EEE5` | Benefit icon tiles |
| `--color-surface` | `#FFFFFF` | Panel + add slot |
| `--color-surface-2` | `#FFFCF7` | Phantom slot fill |
| `--color-line` | `#E8E2D8` | Dividers, card borders |
| Tray gradient | `#C99A5B → #B6863F` | Gold frame (155deg) |

**Typography** (Cormorant Garamond = display/serif, DM Sans = UI/sans)
| Role | Size (desktop / mobile) | Weight | Notes |
|---|---|---|---|
| Section H2 | clamp 33–46px / 29px | 400 | serif, last words italic, ls -.01em |
| Panel H3 | 34px / 29px | 400 | serif, last word italic |
| Intro/lead | 15px | 400 | line-height 1.6 |
| Benefit title | 15px / 13.5px | 600 | sans, ink |
| Body/caption | 14px | 400 | line-height ~1.5 |
| Eyebrow / UI label | 12px / 11px | 600 | uppercase, ls .14em |
| Button | 12–13px | 600 | uppercase-ish, ls .08em |
| Slot number | 11px / 9px | 600 | faint |
| **Floor** | **11px** | — | no real text below this |

**Radii / shadow / spacing**
- Radii: tray 18px (mobile 15px), slot 10px (mobile 8px), panel 16px, button 5px, icon tile 9px.
- Tray shadow: `inset 0 2px 6px rgba(255,255,255,.25), 0 14px 36px rgba(26,20,16,.16)`.
- Panel shadow: `0 4px 24px rgba(26,20,16,.05)`.
- Grid gaps: desktop columns 48px, tray slots 14px (mobile 9px); benefits 18px (mobile 12px).

## Assets
Watch images (PNG, transparent) used as the faded "sample box". Source: project `redesign_assets/` (bundled here). In production, reuse the app's existing watch image assets for these references — any recognizable, iconic models work; the set below is the recommended "dream box":
- `rolex-datejust-wimbledon.png` (slot 02)
- `ap-royaloak-offshore.png` (slot 03)
- `patek-nautilus-5990.png` (slot 04)
- `omega-speedmaster.png` (slot 05)
- `vacheron-overseas.png` (slot 06)

Icons are inline stroke SVGs (sync, share-nodes, shield) at 1.7 stroke — swap for the codebase's existing icon set (e.g. Lucide: `refresh-cw`, `share-2`, `shield`).

No brand logo asset is included — the prototype uses a placeholder "VW" mark. **Use the real Virtual Watchbox brand mark** (`brand/` in the design system) in production.

## Files
Bundled in this folder:
- `Empty State Redesign.html` — the prototype (desktop + mobile mock + critique + rationale).
- `redesign.css` — token + component styles the prototype consumes (readability pass).
- `colors_and_type.css` — canonical global design tokens (source of truth).
- `redesign_assets/` — the 5 watch images used in the sample box.

The relevant markup is the `.es` (desktop) and `.es-mobile` (mobile) sections; the tray is built in the inline `<script>` at the end (`PHANTOMS` array + `#esTray` / `#mobTray`).
