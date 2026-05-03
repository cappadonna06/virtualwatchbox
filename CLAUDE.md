# Virtual Watchbox — Agent Context

Read this file before writing any code for this project.

---

## Product

Virtual Watchbox is a luxury-tech web app for watch collectors to showcase, manage, and explore their collections through a realistic virtual watch box experience.

**Tagline:** *Showcase Your Timepieces. Discover What's Next.*
**Current PRD:** `docs/PRD-v1.8.md`

Read the PRD before implementing any feature. It defines the product vision, watch data model, feature scope, roadmap, and what is/isn't built yet. Do not implement roadmap features that aren't explicitly assigned.

---


## Supabase Persistence Coverage (Required)

When changing data models or user-facing state, keep Supabase backup/sync in parity with local state.

Current user-backed persistence includes:
- `public.user_profiles`
  - `display_name`, `bio`
  - `profile_image_url`, `profile_image_crop`
  - `cover_image_url`, `collection_hero_image_url`
  - `featured_profile_watch`, `visibility`
- `public.watches`
- `public.watch_states`
- `public.watchbox_config`
- `public.playground_boxes`

If a new user-based field is added in UI state (`ProfileDemoState`, collection session state, playground state, etc.), you must update all of:
1. Supabase migration(s)
2. Supabase load/hydration path
3. Supabase save/sync path
4. Any local snapshot/export logic that mirrors profile data

## Tech Stack

- **Framework:** Next.js 14, App Router, TypeScript
- **Styling:** Inline styles as the primary pattern. Tailwind used only for responsive grid utilities (`grid-cols-*`, `gap-*`, `md:` breakpoints).
- **Fonts:** Loaded via `next/font/google` in `app/layout.tsx`, exposed as CSS variables `--font-cormorant` (Cormorant Garamond) and `--font-dm-sans` (DM Sans)
- **State:** Collection/followed/select/watchbox state lives in `app/collection/CollectionSessionProvider.tsx`. Collection/followed/selection state is mirrored to `sessionStorage`; shared watchbox config is mirrored to `localStorage`. Playground boxes remain local-only via `localStorage`.
- **Data:** Watch data in `lib/watches.ts`, playground data in `lib/playgroundData.ts`

---

## Design System

**Always use the brand token layer. Never introduce new hardcoded hex values.**

### TypeScript tokens — `lib/brand.ts`
Import for all inline style values:
```ts
import { brand } from '@/lib/brand'
```

| Namespace | Contents |
|---|---|
| `brand.colors` | `bg`, `slot`, `ink`, `muted`, `gold`, `goldWash`, `goldLine`, `dark`, `white`, `border`, `borderMid`, `borderLight`, `borderSlot` |
| `brand.controls.dropdown` | `minWidth`, `triggerHeight`, `menuOffset`, `menuPadding`, `optionMinHeight` |
| `brand.status` | Ownership badge colors: `owned`, `forSale`, `recentlyAdded`, `needsService` |
| `brand.condition` | Condition badge colors: `unworn`, `likeNew`, `excellent`, `good`, `fair` |
| `brand.font` | `serif` = `var(--font-cormorant)`, `sans` = `var(--font-dm-sans)` |
| `brand.radius` | `btn` (4), `sm` (6), `md` (8), `lg` (10), `xl` (12), `pill` (20) |
| `brand.shadow` | `xs`, `sm`, `md`, `menu`, `lg`, `xl`, `drop`, `gold` |
| `brand.transition` | `fast`, `base`, `slide`, `sheet`, `smooth` |
| `brand.zIndex` | `nav`, `dropdown`, `sidebar`, `backdrop`, `overflow` |

### CSS custom properties — `app/globals.css`
`--color-bg`, `--color-ink`, `--color-muted`, `--color-gold`, `--color-border`, `--color-border-mid`, `--color-border-light`, `--color-slot`, `--color-dark`, `--color-white`, `--radius-btn/sm/md/lg/xl/pill`

Use CSS vars for global/class-based CSS; use `brand.*` for inline styles. Both reference the same values — do not create a third source.

### Design reference files
- `docs/design-system/claude-v1/README.md` — full brand spec (color, type, spacing, motion, copy rules, iconography)
- `docs/design-system/claude-v1/colors_and_type.css` — token definitions with comments
- `docs/design-system/claude-v1/design_handoff_add_watch/` — add-watch component specs
- `docs/design-system/claude-v1/preview/` — HTML swatches for colors, type scale, spacing, all components
- `docs/DESIGN_SYSTEM.md` — token usage rules and quick reference

---

## Key File Map

```
app/
  layout.tsx                    — Root layout, font loading, NavBar, CollectionSessionProvider
  globals.css                   — Global styles, CSS token vars, mobile overrides
  page.tsx                      — Homepage shell (hero, canonical collection preview, features, followed radar)
  collection/
    page.tsx                    — My Collection route shell (watchbox/cards/stats composition)
    layout.tsx                  — Collection layout wrapper
    CollectionSessionProvider.tsx — Session-scoped collection provider
    add/
      page.tsx                  — Add Watch search page
      [watchId]/page.tsx        — Add Watch confirm page
  playground/
    page.tsx                    — Playground (fantasy boxes, no ownership required)
    edit/[boxId]/[entryId]/     — Playground entry editor

components/
  NavBar.tsx                    — Sticky nav, mobile drawer
  collection/
    CollectionWatchboxSurface.tsx — Canonical collection/home watchbox surface
    CollectionSection.tsx       — Homepage wrapper around the canonical collection surface
    SortDropdown.tsx            — Canonical luxury dropdown for collection/playground ordering
    WatchBox.tsx                — Canonical watchbox implementation (home, collection, playground)
    WatchCard.tsx               — Collection card view item
    WatchSidebar.tsx            — Watch detail sidebar (sticky right panel)
    CollectionHeader.tsx        — Page title, value pill, action buttons
    CollectionStats.tsx         — Portfolio stats (overview + graphical views)
    UnsavedChangesBar.tsx       — Draft changes save/discard bar
    ViewSwitcher.tsx            — Watchbox / Cards / Stats toggle
  watchbox/
    HoverCard.tsx               — Floating hover card on watch slot
    DialSVG.tsx                 — SVG dial renderer for playground mode

lib/
  brand.ts                      — Design token module (import this)
  watches.ts                    — Watch catalog data
  playgroundData.ts             — Playground box data
  frameConfig.ts                — Frame/lining/slot configuration
  watchboxOverflow.ts           — Overflow logic for boxes with more watches than slots

types/
  watch.ts                      — Watch, WatchType, WatchCondition, OwnershipStatus types

docs/
  PRD-v1.8.md                   — Current product requirements (read before building features)
  DESIGN_SYSTEM.md              — Design token rules
  design-system/claude-v1/      — Visual reference files
```

---

## Current Collection Architecture

- **Canonical watchbox path:** `components/collection/WatchBox.tsx`
- **Canonical collection/home surface:** `components/collection/CollectionWatchboxSurface.tsx`
- **Homepage wrapper:** `components/collection/CollectionSection.tsx`
- **Collection route shell:** `app/collection/page.tsx`
- **Canonical session provider:** `app/collection/CollectionSessionProvider.tsx`
- **Canonical aspirational save state:** `followedWatchIds`
- **Canonical add-watch flow:** routed only via `app/collection/add/page.tsx` and `app/collection/add/[watchId]/page.tsx`

The homepage and `/collection` should share watchbox behavior through `CollectionWatchboxSurface.tsx`. Route-level files may differ in presentation, but watchbox config, layout math, overflow behavior, selection/sidebar behavior, and reorder behavior should not be reimplemented in multiple places.

`CollectionSessionProvider.tsx` owns:
- `collectionWatches`
- `followedWatchIds`
- `selectedWatchId`
- `watchboxConfig`

Do not recreate a second collection context or a second homepage-only saved/liked state.

---

## Coding Conventions

- **Inline styles only** — no Tailwind for component-level styling, no CSS modules, no styled-components
- **No new hardcoded hex values** — everything through `brand.colors.*`
- **No new font var strings** — use `brand.font.serif` / `brand.font.sans`
- **No browser-native `<select>` on premium product surfaces** — use `components/collection/SortDropdown.tsx` for luxury ordering controls
- **No comments explaining what code does** — only comment non-obvious WHY (constraints, workarounds)
- **No emoji in UI copy or headings** — arrow glyphs (→ ↗ ✕) used as text characters only
- **Currency formatting** via `Intl.NumberFormat` — `$1,350` no decimals
- **Client-only state for now** — `CollectionSessionProvider` + localStorage/sessionStorage only, no auth/API/database yet; Supabase is Phase 2
- **Max content width:** 1280px, `margin: 0 auto`
- **Sticky nav height:** ~61px — sidebar `top: 88` accounts for this

---

## Current Build State

`npm run build` must pass. The project is statically pre-rendered except `/collection/add/[watchId]` and `/playground/edit/[boxId]/[entryId]` which are dynamic. Do not break static generation of other routes.
