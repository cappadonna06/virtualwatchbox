# Handoff: Add Watch — Destination Control Redesign

> Supersedes the **Intent Cards** section of `README.md`. Everything else in that
> file (image column, header, est. value, specs, condition pills, box picker,
> purchase accordion, primary CTA logic) still applies unchanged.

## Overview
Fixes a usability defect on `/collection/add/[watchId]`. The page previously had
**two affordances that both read as "Add to My Collection"**: the intent selector
card at the top (which only *toggles* a mode) and the real submit button at the
bottom. Because the selector borrowed the button's verb, users tapped it expecting
the add to complete, nothing visibly happened, and they got stuck.

**The fix:** the destination selector now describes *what the watch is to the user*
(an identity/state) — never an action. The word **"Add" appears on exactly one
element: the final CTA.** A sliding-thumb switch + radio dots make it unmistakably
a *choice*, not a button. Optional step numbers reinforce the sequence
(① choose destination → ② fill details → Add).

## About the Design Files
The file in this bundle (`addwatch-redesign-v2.html`) is a **design reference built
in HTML/React** — an interactive prototype showing intended look and behavior, not
production code to ship. Recreate it in the existing Next.js codebase at
`app/collection/add/[watchId]/page.tsx`, using its established patterns (inline
styles, `var(--font-cormorant)` / `var(--font-dm-sans)`, Next.js `Image`,
`useRouter`, the `useCollectionSession` hook, existing `followWatch` /
`addToCollection` / playground handlers). Do not port React `createElement` /
JSX literally — translate into the codebase's component structure.

The prototype exposes three explored directions via a Tweaks panel
(`Switch` / `Quiet` / `Field`). **Ship the `Switch` direction** — the other two are
recorded for context only.

## Fidelity
**High-fidelity.** Exact VWB tokens, type, spacing, and interaction states. Build
pixel-accurately.

---

## The Selector — "Switch" (ship this)

A two-segment control with a sliding dark thumb and a radio dot per option. Replaces
the old two-card `IntentCards` component.

### Track (container)
- `display: grid; gridTemplateColumns: 1fr 1fr; gap: 0`
- `position: relative`
- `background: #F0EBE3` (spec-divider tone)
- `border: 1px solid #E8E2D8`
- `borderRadius: 12px`
- `padding: 4px`

### Sliding thumb (the selected indicator)
- `position: absolute; top: 4px; bottom: 4px`
- `left: calc(4px + <idx> * (50% - 4px))` where `idx` = 0 for owned, 1 for playground
- `width: calc(50% - 4px)`
- `background: #1A1410`
- `borderRadius: 9px`
- `boxShadow: 0 4px 16px rgba(26,20,16,0.18)`
- `transition: left 0.22s cubic-bezier(.4,0,.2,1)`

### Option button (×2, transparent, sits above thumb at `zIndex: 1`)
- `background: transparent; border: none; cursor: pointer; textAlign: left`
- `padding: 13px 16px` (desktop) · `12px 13px` (mobile)
- `borderRadius: 9px`
- Row 1 = radio dot + title (`display: flex; alignItems: center; gap: 7px; marginBottom: 3px`)
- Row 2 = sub-label (`paddingLeft: 20px`)

**Radio dot** — `13×13px`, `borderRadius: 50%`, `flexShrink: 0`, `transition: all 0.18s ease`
- Inactive: `border: 1.5px solid #D4CBBF; background: transparent`
- Active: `border: 4px solid #C9A84C; background: #1A1410` (gold ring, dark center)

**Title** — `fontFamily: var(--font-cormorant); fontWeight: 400; lineHeight: 1.1`
- `fontSize: 19px` desktop · `17px` mobile
- Active color `#FAF8F4` (on dark thumb) · Inactive `#1A1410`

**Sub-label** — `fontSize: 10.5px; letterSpacing: 0.03em`
- Active color `rgba(250,248,244,0.6)` · Inactive `#A89880`

| Option id | Title | Sub (desktop) | Sub (mobile) |
|---|---|---|---|
| `'owned'` | **I Own This** | Goes to My Collection | My Collection |
| `'playground'` | **Just Dreaming** | Saves to a Playground box | Playground box |

### Helper caption (directly under the track)
- `fontSize: 11px; color: #A89880; lineHeight: 1.5; marginTop: 9px`
- Copy: *"Pick where it lives — you'll confirm with the button below."*

---

## Wayfinding — Step headings (recommended ON)

Each section is introduced by a numbered eyebrow so the toggle clearly isn't the end
of the flow.

- Number badge: `18×18px`, `borderRadius: 50%`, `border: 1px solid #D4CBBF`,
  `fontSize: 10px; fontWeight: 600; color: #A89880`, centered, `flexShrink: 0`
- Gap to label: `9px`
- Label: `fontSize: 9px; fontWeight: 600; letterSpacing: 0.12em; textTransform: uppercase; color: #A89880`

Sequence:
1. **① Where does it go?** → the Switch
2. **② Condition** (owned path) *or* **② Choose a Playground Box** (playground path)

(If a project prefers no numbers, render the same eyebrow text without the badge —
the prototype's `Step numbers` toggle demonstrates both.)

---

## Contextual detail (below the switch) — unchanged logic
- `choice === 'owned'` → **Condition** pills (Unworn / Like New / Excellent / Good /
  Fair) + the existing **"+ Add purchase details"** accordion.
- `choice === 'playground'` → **Box picker** (vertical cards) + existing
  **"+ Create New Box"** inline input.
- Specs, condition pills, box cards, and accordion styling are exactly as in
  `README.md`. The contextual block fades in on switch (`@keyframes` opacity 0→1 +
  4px rise, `0.25s ease`, keyed on `choice`).

## Primary CTA — the ONE action
- `width: 100%; padding: 15px 20px; borderRadius: 6px; border: none`
- `fontSize: 11.5px; fontWeight: 600; letterSpacing: 0.1em; textTransform: uppercase`
- Enabled: `background: #1A1410; color: #FAF8F4; cursor: pointer` + trailing `→` glyph
- Disabled: `background: #C8BFAF; color: #FAF8F4; cursor: not-allowed` (no arrow)
- Label: `"Add to My Collection"` (owned) · `"Add to Playground"` (playground)
- Disabled when `choice === 'owned' && !condition` **or** `choice === 'playground' && !selectedBoxId`
- Helper line under it (`fontSize: 10.5px; color: #A89880; textAlign: center; marginTop: 10px`):
  - ready → "Ready when you are."
  - owned, no condition → "Select a condition to continue."
  - playground, no box → "Pick a box to continue."

---

## Responsive — Mobile

Single-column. The image stacks on top; the form scrolls; **the CTA is pinned to a
sticky footer** so the one action is always visible and unmistakable.

- Page is one column (no two-column grid below ~860px).
- Switch uses the **compact** title size (`17px`) and shortened sub-labels (table above).
- Step headings, condition pills, and box cards are identical to desktop.
- **Sticky footer** (`borderTop: 1px solid #EAE5DC; background: #FAF8F4`): holds the
  primary CTA + helper line + a home-indicator bar. On real devices use
  `position: sticky; bottom: 0` (the prototype uses a fixed-height phone frame with an
  internal scroll region to simulate this).

The prototype's phone frame (390×788, status bar, home indicator) is **presentation
chrome only** — do not build it. Implement the content as a normal responsive page;
the production app supplies the device.

---

## Design Tokens
| Token | Value |
|---|---|
| bg | `#FAF8F4` |
| image bg | `#F5F2EC` |
| ink (thumb, active text bg, CTA) | `#1A1410` |
| muted | `#A89880` |
| gold (active dot ring, prices) | `#C9A84C` |
| border | `#EAE5DC` |
| border-mid (track/card border) | `#E8E2D8` |
| track fill / spec divider | `#F0EBE3` |
| border-light (inactive dot, num badge) | `#D4CBBF` |
| disabled CTA | `#C8BFAF` |
| on-dark text | `#FAF8F4` |
| serif | `var(--font-cormorant)` (Cormorant Garamond) |
| sans | `var(--font-dm-sans)` (DM Sans) |
| switch radii | track `12px` · thumb/option `9px` · CTA `6px` |
| switch motion | `left 0.22s cubic-bezier(.4,0,.2,1)` |

## State
Same as current: `choice` (`'owned' | 'playground'`, default `'owned'`),
`condition` (default `null`), `selectedBoxId` (default first box). No new state is
introduced — only the destination control's markup/labels change.

## Assets
Watch image is the existing `Image` from the watch record. The heart/follow overlay,
"In Collection" badge, and watch imagery are unchanged from `README.md`.

## Files
| File | Purpose |
|---|---|
| `addwatch-redesign-v2.html` | Interactive reference — set Tweaks → Style: **Switch**; toggle Preview: Both / Desktop / Mobile |
| `README.md` | Original full-page spec (still authoritative for everything except the intent selector) |
| `../../colors_and_type.css` | Full token reference |

Production file to update: `app/collection/add/[watchId]/page.tsx`
