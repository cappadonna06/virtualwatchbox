# Handoff: Add Watch — Detail Page Redesign

## Overview
This is a redesign of the `/collection/add/[watchId]` detail page in Virtual Watchbox — the screen where a user confirms adding a watch to their collection or a playground box.

The key goals of the redesign:
- Make the intent choice feel like a **curatorial gesture**, not a utility form (no radio buttons)
- Move the **heart/follow button to top-right of the image** (product-detail convention)
- Surface the **estimated market value prominently** (large gold Cormorant numeral) rather than burying it below the form
- Place **watch specs above the action zone** so they inform the decision
- Add a subtle **flow context label** ("Add a Watch") without a heavy h1 that mimics Chrono24

---

## About the Design Files
The files in this bundle (`addwatch-redesign.html`) are **HTML design references** — interactive prototypes showing intended look and behavior. They are **not** production code to copy directly.

The task is to **recreate these designs in the existing Next.js codebase** at `app/collection/add/[watchId]/page.tsx`, using its established patterns (inline styles, `var(--font-cormorant)` / `var(--font-dm-sans)` CSS variables, Next.js `Image`, `useRouter`, the `useCollectionSession` hook, etc.).

Do not port the React createElement syntax — translate the design into JSX using the codebase's existing component structure.

---

## Fidelity
**High-fidelity.** The prototype uses the exact VWB color palette, typography, spacing, and interaction states. Recreate pixel-accurately using the existing codebase patterns.

---

## Screen: Add Watch Detail (`/collection/add/[watchId]`)

### Layout
Two-column grid, max-width 1280px, 56px horizontal padding, `48px` column gap:
- **Left column:** `minmax(300px, 1fr)` — watch image, sticky at `top: 88px`
- **Right column:** `minmax(340px, 520px)` — all form content, scrolls naturally

---

### Left Column — Watch Image

**Container:**
- `background: #F5F2EC` (slightly warmer than `#FAF8F4` — feels like a light-box)
- `border: 1px solid #EAE5DC`
- `border-radius: 16px`
- `aspect-ratio: 1/1`, `overflow: hidden`
- `position: relative` (anchors absolute overlays)

**Image:**
- Next.js `<Image fill>`, `objectFit: contain`, `padding: 32px`
- `filter: drop-shadow(0 16px 32px rgba(26,20,16,0.18))`

**Heart / Follow button** (top-right overlay):
- `position: absolute`, `top: 14px`, `right: 14px`
- `width: 38px`, `height: 38px`, `border-radius: 50%`
- **Unfollowed:** `background: rgba(250,248,244,0.80)`, `border: 1px solid rgba(212,203,191,0.7)`, icon stroke `#1A1410`
- **Followed:** `background: rgba(201,168,76,0.18)`, `border: 1px solid rgba(201,168,76,0.55)`, icon fill + stroke `#C9A84C`
- `backdropFilter: blur(8px)`
- `boxShadow: 0 2px 8px rgba(26,20,16,0.07)`
- SVG heart icon, 16×16px, `strokeWidth: 1.6`
- `onClick`: calls existing `followWatch(watch.id)` — no change to logic
- `transition: all 0.18s ease`

**"In Collection" badge** (bottom-left, conditional):
- `position: absolute`, `bottom: 14px`, `left: 14px`
- `fontSize: 9px`, `fontWeight: 600`, `letterSpacing: 0.06em`, `textTransform: uppercase`
- `padding: 4px 10px`, `borderRadius: 20px`
- `background: rgba(232,244,232,0.92)`, `color: #2D6A2D`
- `backdropFilter: blur(4px)`
- Show when `alreadyInCollection === true`

---

### Right Column — Form

#### Flow Eyebrow
```
— Add a Watch
```
- `fontSize: 9px`, `fontWeight: 500`, `letterSpacing: 0.14em`, `textTransform: uppercase`, `color: #A89880`
- Prefixed with a 16px wide `×1px` horizontal line (`background: #D4CBBF`)
- `marginBottom: 14px`
- This replaces the old `<h1>Add a watch</h1>` — the watch name IS the headline

#### Brand Label
- `fontSize: 10px`, `fontWeight: 600`, `letterSpacing: 0.14em`, `textTransform: uppercase`, `color: #C9A84C`
- `marginBottom: 8px`

#### Model Name
- `fontFamily: var(--font-cormorant)`, `fontSize: 44px`, `fontWeight: 400`, `lineHeight: 0.95`
- `color: #1A1410`, `marginBottom: 10px`

#### Reference
- `fontSize: 13px`, `color: #A89880`, `letterSpacing: 0.02em`, `marginBottom: 16px`

#### Quick Spec Strip (inline)
```
Stainless Steel  |  Dial: Black  |  43 mm
```
- `fontSize: 13px`, `color: #1A1410`, `lineHeight: 1.5`
- Pipe separators: `color: #D4CBBF`, `margin: 0 10px`

#### Estimated Market Value
- `fontFamily: var(--font-cormorant)`, `fontSize: 38px`, `fontWeight: 400`, `color: #C9A84C`, `lineHeight: 1`
- Followed inline by: `fontSize: 10px`, `fontWeight: 500`, `letterSpacing: 0.1em`, `uppercase`, `color: #A89880` — "Est. Market Value"
- `display: flex`, `alignItems: baseline`, `gap: 10px`
- `paddingBottom: 20px`, `marginBottom: 20px`, `borderBottom: 1px solid #EAE5DC`

#### Watch Specifications (above intent selector)
Six rows — Watch Type, Movement, Complications, Case Material, Dial Color, Case Size:
- `display: flex`, `justifyContent: space-between`, `alignItems: baseline`
- `padding: 8px 0`, `borderBottom: 1px solid #F0EBE3`
- Label: `fontSize: 11px`, `color: #A89880`
- Value: `fontSize: 11px`, `color: #1A1410`, `fontWeight: 500`, `textAlign: right`
- Notes (if present): `fontSize: 11px`, `color: #C9A84C`, `fontStyle: italic`, `paddingTop: 10px`

`marginBottom: 24px` after the specs block.

#### Divider
`height: 1px`, `background: #EAE5DC`, `marginBottom: 20px`

#### Intent Selector Label
- `fontSize: 9px`, `fontWeight: 600`, `letterSpacing: 0.12em`, `textTransform: uppercase`, `color: #A89880`
- Copy: **"Where does it go?"**
- `marginBottom: 10px`

#### Intent Cards (replaces radio buttons)
Two equal cards in a 2-column grid, `gap: 10px`:

**Card structure:**
- `padding: 16px 18px`, `borderRadius: 10px`, `textAlign: left`, `cursor: pointer`
- **Inactive:** `border: 1px solid #E8E2D8`, `background: #FFFFFF`, `boxShadow: 0 1px 4px rgba(26,20,16,0.04)`
- **Active:** `border: 1.5px solid #1A1410`, `background: #1A1410`, `boxShadow: 0 4px 16px rgba(26,20,16,0.12)`
- `transition: all 0.15s ease`

**Card content:**
- Headline: `fontFamily: var(--font-cormorant)`, `fontSize: 18px`, `fontWeight: 400`, `lineHeight: 1.2`, `marginBottom: 4px`
  - Inactive: `color: #1A1410` / Active: `color: #FAF8F4`
- Sub-label: `fontSize: 10px`, `letterSpacing: 0.06em`
  - Inactive: `color: #A89880` / Active: `color: rgba(250,248,244,0.55)`

| Option id | Headline | Sub-label |
|---|---|---|
| `'owned'` | Add to My Collection | You own this watch |
| `'playground'` | Add to Playground | Dream box, no ownership |

`marginBottom: 20px` after the cards.

---

#### Owned Path — Condition Picker
Label: `fontSize: 9px`, `fontWeight: 600`, `letterSpacing: 0.12em`, `uppercase`, `color: #A89880`, `marginBottom: 10px` — **"Condition"**

Pills in a flex-wrap row, `gap: 6px`:
- **Inactive:** `padding: 8px 14px`, `borderRadius: 20px`, `border: 1px solid #E8E2D8`, `background: #FFFFFF`, `color: #1A1410`
- **Active:** `border: 1.5px solid #1A1410`, `background: #1A1410`, `color: #FAF8F4`
- `fontSize: 11px`, `fontWeight: 500`, `transition: all 0.15s ease`
- Conditions: Unworn / Like New / Excellent / Good / Fair

Purchase details accordion (unchanged from current — keep existing "+ Add purchase details" toggle and inputs).

---

#### Playground Path — Box Picker
Label: `fontSize: 9px`, uppercase, muted — **"Choose a Playground Box"**, `marginBottom: 10px`

Box cards (vertical stack, `gap: 6px`, `marginBottom: 10px`):
- **Inactive:** `border: 1px solid #E8E2D8`, `background: #FFFFFF`
- **Active:** `border: 1.5px solid #C9A84C`, `background: rgba(201,168,76,0.06)`
- `padding: 12px 14px`, `borderRadius: 8px`, `transition: all 0.15s ease`
- Box name: `fontFamily: var(--font-cormorant)`, `fontSize: 20px`, `color: #1A1410`, `lineHeight: 1.1`
- Count: `fontSize: 10px`, `color: #A89880`, `marginTop: 2px`
- "Selected" badge when active: `fontSize: 9px`, `fontWeight: 600`, `letterSpacing: 0.1em`, `uppercase`, `color: #C9A84C`

"+ Create New Box" toggle (unchanged from current — keep existing inline input).

---

#### Primary CTA
- `width: 100%`, `padding: 14px 20px`, `borderRadius: 6px`, `border: none`
- `fontSize: 11px`, `fontWeight: 600`, `letterSpacing: 0.1em`, `textTransform: uppercase`
- **Enabled:** `background: #1A1410`, `color: #FAF8F4`, `cursor: pointer`
- **Disabled:** `background: #C8BFAF`, `color: #FAF8F4`, `cursor: not-allowed`
- `transition: background 0.15s ease`
- Label: `"Add to My Collection"` or `"Add to Playground"` depending on `choice`
- Disabled when: `choice === 'owned' && !condition` OR `choice === 'playground' && !selectedBoxId`

---

## Interactions & Behavior (unchanged from current logic)
- `followWatch(watch.id)` — existing hook, called on heart click
- `addToCollection(watch, condition, { price, date, notes })` → `router.push('/collection')`
- `handleAddToPlayground()` → `router.push('/playground?boxId=...')`
- `handleCreateBoxAndAdd()` → create box, persist, `router.push('/playground?boxId=...')`
- Duplicate warning: show inline note when `alreadyInCollection === true` (below quick spec strip is fine)
- Playground context (`dest=playground`, `incomingBoxId`): default `choice` to `'playground'`, preselect box — no change

---

## Design Tokens Used
| Token | Value |
|---|---|
| bg | `#FAF8F4` |
| image bg | `#F5F2EC` |
| ink | `#1A1410` |
| muted | `#A89880` |
| gold | `#C9A84C` |
| border | `#EAE5DC` |
| border-mid | `#E8E2D8` |
| spec divider | `#F0EBE3` |
| border-light | `#D4CBBF` |
| disabled | `#C8BFAF` |
| serif | `var(--font-cormorant)` |
| sans | `var(--font-dm-sans)` |

---

## Files
| File | Purpose |
|---|---|
| `addwatch-redesign.html` | Full interactive prototype — reference this for visual layout and all states |
| `../../colors_and_type.css` | Full token reference (open from design system root) |

The existing production file to update: `app/collection/add/[watchId]/page.tsx`
The search page (`app/collection/add/page.tsx`) does not need changes.
