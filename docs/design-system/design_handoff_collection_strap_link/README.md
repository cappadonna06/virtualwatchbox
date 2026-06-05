# Handoff: My Collection → Strap Drawer linkage

## Scope (read this first)

This package covers **only two things**, both of which sit on top of pages you've
already built:

1. **The Strap Drawer entry points added to the existing My Collection page** — web
   and mobile.
2. **The navigation linkage between My Collection and the Strap Drawer page.**

It does **not** re-spec the Strap Drawer page (already built) or the My Collection page
(already exists). Everything here is additive: a couple of new components dropped into
the collection page, plus routing/links that tie the two pages together.

The relevant watch + collection components in `prototype/collection_redesign/` are
included **for context only** (so the prototype runs) — they represent your existing
collection page; don't re-implement them.

---

## About the Design Files

Files in `prototype/` are **design references** in HTML + React (in-browser Babel),
demonstrating look, layout, copy, and behavior. Recreate the new pieces in your real
codebase (Next.js/React per the token file's `--font-*` aliases) using its components,
routing, and data layer. The prototype uses `React.createElement` only because it runs
as static HTML — write idiomatic JSX/TSX in production.

**What's genuinely new (implement these):**
- `strap_drawer/StrapDrawerEntry.jsx` — the **desktop** entry points: `StrapHeaderLink`
  (header chip) and `StrapDrawerBand` (editorial band).
- The **mobile** entry treatment inside `strap_drawer/MobileCollectionReal.jsx` — the
  bold "12 straps ›" stats chip and the editorial band (`StrapBand`). *(That file also
  contains a faithful mobile rebuild of the whole collection page for presentation; in
  production you're only adding the chip + band to your existing mobile collection — see
  "Mobile" below. The `StrapDrawerTray` / app-bar-icon variants in that file were
  alternatives we explored and are **not** the chosen design.)*
- `strap_drawer/CollectionPageRootStraps.jsx` — shows exactly **where** the two desktop
  entry points mount inside the collection page root (header meta row + below the
  watchbox). Use it as a placement diff against your real collection root.

---

## Fidelity

High-fidelity. Colors, type, spacing, copy, and interactions are final — match the
tokens in `design-tokens.css`. The entry points use only existing Virtual Watchbox
tokens (warm cream surfaces, Cormorant Garamond + DM Sans, gold `#C9A84C` accent).

---

## The chosen design

After exploring options (a watchbox-style "drawer" tray, an app-bar icon, and an
editorial band), the **selected direction is the editorial band + a bold stats chip**:

- **Desktop:** a compact **Strap Drawer chip** in the header meta row (right after
  "Stats"), **plus** an **editorial band** between the watchbox and Collection Stats.
- **Mobile:** a bold, tappable **"12 straps ›" pill** beside the value stats, **plus**
  the **same editorial band** below the watchbox.

---

## Data the entry points need

All of it derives from data you already have (owned watches + the strap collection).
No new endpoints required beyond what the Strap Drawer page already consumes.

| Value | Meaning | Derivation |
|---|---|---|
| `strapCount` | total straps in the drawer | `straps.length` |
| `comboCount` | total fitting strap↔watch pairings | sum over watches of `compatibleStraps(watch).length` |
| `featured` | the 5 straps shown in the band | curation rule below |
| per-strap `fitCount` | "Fits N" on a band card | `compatibleWatches(strap).length` |
| per-strap `remaining` | the "+N / View all" tile | `strapCount - featured.length` |

**Featured curation rule:** lead with the **photographed straps** (real product photos
read stronger than CSS swatches), capped at 5:
```js
const featured = [...straps]
  .sort((a, b) => (b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0))
  .slice(0, 5);
```
This is a deliberate product choice — swap to "most recently added" (`sortOrder` desc)
if you'd rather the band stay fresh as straps are added. Either way, the trailing
**"+N · View all" tile** must always reflect the true total so nothing is silently hidden.

The fit math (`compatibleWatches`, `compatibleStraps`, `totalCombos`) is the same
compatibility engine the Strap Drawer page already uses (mirrored in
`strap_drawer/strap-data.jsx` for the prototype). Reuse your existing implementation;
don't duplicate it.

---

## Desktop entry points

Source: `strap_drawer/StrapDrawerEntry.jsx`; placement in
`strap_drawer/CollectionPageRootStraps.jsx`.

### A. Header chip — `StrapHeaderLink`
Mounts in the collection header's **meta row**, immediately after the "Stats" link,
separated by the existing 1px vertical divider:

```
[ Add Watch ]   Watches 5 | Est. Value $14,130 | Stats ↓   | [ |||  Strap Drawer  (12)  → ]
```

- A pill `<a href="/straps">`: hairline border `#E0D8CC`, fill `#FFFCF7`, radius 8,
  padding `8px 8px 8px 14px`.
- Contents: four mini "strap spine" bars (4.5×19, rounded) · label **"Strap Drawer"**
  (DM Sans 12 / 600, ink) · a **gold count chip** (`#C9A84C` bg, ink text, 700, pill,
  min-width 22) · an arrow icon.
- **Hover:** border → gold `#C9A84C`, fill → `#FBF6EA`, `translateY(-1px)`, soft gold
  shadow, arrow nudges +2px. It must read as obviously clickable.

### B. Editorial band — `StrapDrawerBand`
Mounts as a full-width section **between the watchbox/cards block and Collection Stats**,
inside the 1280px content column (`padding: 0 56px`), with a 1px top divider.

Structure:
- **Header row** (space-between):
  - Left: gold kicker **"ALSO IN YOUR COLLECTION"** → serif **"The Strap Drawer"** (34px)
    → muted one-liner *"The leathers, rubbers and bracelets you swap between — and which
    of your watches each one fits."*
  - Right (bottom-aligned): the **stat line** `12 straps · 32 combinations` (serif
    numerals + muted labels, dot divider) over an **"Open the drawer →"** primary button
    (dark ink, uppercase).
- **Cards row** (flex, gap 16): five `BandCard`s + a trailing **"+7 / more straps /
  View all 12 →"** opener tile.
  - `BandCard` `<a href="/straps#strap={id}">`: portrait 4:5 image (photo on radial-cream,
    or CSS swatch fallback), brand kicker, serif title, a `{lug} mm` gold badge + `Fits N`.
    Hover lifts `translateY(-3px)` with a soft shadow.
  - The opener tile `<a href="/straps">`: stacked strap-spine glyph, `+7`, "more straps",
    "View all 12 →"; gold-tinted hover.

---

## Mobile entry points

In production you are adding **two elements** to your existing mobile collection page.
Reference implementation: `StrapBand` + the stats-chip in
`strap_drawer/MobileCollectionReal.jsx` (the rest of that file is a faithful rebuild of
your mobile collection used only to present the additions in context).

### A. Stats chip — the bold "12 straps ›" pill
Sits on the **stats line** (`5 watches · $14,130 est.`), pushed to the right
(`margin-left: auto`):
- `<a href="/straps">`, gold-tinted pill: bg `#FBF6EA`, border `1px rgba(201,168,76,0.5)`,
  radius 20, padding `7px 7px 7px 13px`, subtle gold shadow.
- Contents: **"12 straps"** (DM Sans 13 / **700**, `#8A6A10`, `white-space: nowrap`) + a
  **filled gold circle** (20px, `#C9A84C`) holding a dark chevron. Reads as a button, not
  a text link.

### B. Editorial band — `StrapBand`
Same idea as desktop, tuned for touch, mounted **below the watchbox, above Collection
Stats** (1px top divider):
- Header: gold kicker "Also in your collection" → serif "The Strap Drawer" (26px) →
  `12 straps · 32 combinations`; a quiet **"Open →"** link (gold underline) on the right.
- **Swipe shelf:** horizontally scrolling row (`overflow-x: auto`, hidden scrollbar,
  `-webkit-overflow-scrolling: touch`) of fixed-width (140px) strap cards + the
  **"+7 / View all"** tile. Horizontal scroll is intentional here — it's the one place on
  a phone where a side-scroll shelf beats vertical stacking.

> Not chosen (included in the file for reference only): a gold/walnut **drawer tray**
> that echoes the watchbox (`StrapDrawerTray`, hash `#drawer`), and an **app-bar strap
> icon** with a badge (hash `#icon`). Ignore these for production.

---

## Linkage between the two pages

This is the second half of the work — wiring the navigation both directions.

### 1. Straps is NOT a top-level nav item
Treat the Strap Drawer as a **sub-area of My Collection**, not a sibling destination.
- Do **not** add "Straps" to the global top nav (My Collection · Playground · Discover ·
  News).
- On the **Strap Drawer page**, the active top-nav item is **"My Collection"** (the
  drawer lives "under" collection), and the page shows a **"← Collection"** back-link in
  its header that routes to the collection page.

### 2. Collection → Strap Drawer
Every entry point routes to the drawer:
- Header chip, band "Open the drawer", and the opener tile → **`/straps`** (drawer root).
- A band card → **`/straps#strap={strapId}`** (deep-link: open the drawer with that
  strap's detail sheet open).
- Mobile chip + band "Open" → **`/straps`**.

In the prototype these are `href="Strap Drawer.html"` and
`href="Strap Drawer.html#strap={id}"`. Map to your real route (e.g. `/straps`,
`/straps?strap={id}` or a hash) when you implement.

### 3. Strap Drawer → Collection (already in your drawer page)
The drawer's back-link and "My Collection" nav item route back to the collection page.
The drawer also already supports deep-link params used by these links:
- `#strap={id}` — open a strap's detail sheet on load.
- `#watch={id}` — focus the "Fit Finder" on a specific watch (reserved for the future
  watch-detail "Straps that fit →" cross-link; not used by the collection entry points
  yet, but the param exists).

### 4. Routing summary

| From | Element | To |
|---|---|---|
| Collection (web) | header chip | `/straps` |
| Collection (web) | band "Open the drawer" / opener tile | `/straps` |
| Collection (web) | a band card | `/straps#strap={id}` |
| Collection (mobile) | "12 straps ›" chip | `/straps` |
| Collection (mobile) | band "Open" / card | `/straps` · `/straps#strap={id}` |
| Strap Drawer | "← Collection" back-link / "My Collection" nav | `/collection` |

---

## Implementation notes

- **Asset paths:** the prototype's watch images are authored relative to
  `collection_redesign/` (`../assets/…`); the integrated page lives at the project root,
  so `CollectionPageRootStraps.jsx` normalizes `imageUrl` (`../` stripped). In your repo,
  just use your real watch image URLs — this normalization is a prototype artifact.
- **Swatch fallback:** straps without a `photoUrl` render via the CSS swatch system
  (`StrapSwatch.jsx`) — included because the band reuses it. If your Strap Drawer page
  already has a swatch component, reuse that instead.
- **Counts stay live:** `strapCount`, `comboCount`, and per-card `Fits N` should update
  when straps or fit-overrides change, so the band and chip never go stale.
- **Reduced motion:** hover lifts and transitions should respect
  `prefers-reduced-motion`.

---

## Files in this bundle

```
design_handoff_collection_strap_link/
├── README.md                         ← this file
├── design-tokens.css                 ← Virtual Watchbox tokens (reference)
└── prototype/
    ├── My Collection.html            ← desktop collection WITH entry points (open first)
    ├── My Collection Mobile App.html ← mobile collection app (chip + band); #band is the chosen state
    ├── My Collection — Mobile.html   ← mobile presentation (iPhone frames)
    ├── strap_drawer/
    │   ├── StrapDrawerEntry.jsx       ★ NEW — desktop header chip + editorial band
    │   ├── CollectionPageRootStraps.jsx ★ NEW — where the entry points mount in the root
    │   ├── MobileCollectionReal.jsx   ★ NEW — mobile chip + band (+ unused alt variants)
    │   ├── strap-data.jsx             — compatibility engine + data (mirror of drawer page)
    │   ├── StrapSwatch.jsx            — CSS swatch fallback (shared)
    │   ├── ui-atoms.jsx               — shared tokens/atoms
    │   └── ios-frame.jsx              — iPhone bezel (presentation only)
    ├── collection_redesign/          — your EXISTING collection components (context only)
    ├── straps/                       — 5 strap photos used by the band
    └── assets/watches/               — watch thumbnails (stand-ins)
```

★ = the actual new work. Start at `prototype/My Collection.html`, then read
`StrapDrawerEntry.jsx` and the placement in `CollectionPageRootStraps.jsx`.
