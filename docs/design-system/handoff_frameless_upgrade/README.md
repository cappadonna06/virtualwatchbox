# Handoff: Upgrade This Watch — Frameless Treatment

A focused redesign of the §02 Upgrade This Watch section on `/discover`. The rest of the page is built; this handoff is **only** for that section.

## What changed

Earlier iterations had the from→to watches inside paper-warm inner boxes, plus a "Stretch" pill in the top-right corner of aspirational cards. Both have been replaced:

- **Inner image cards killed.** Watches sit directly on the cream slot surface.
- **Stretch pill killed.** Aspirational targets are signaled by a soft gold radial-gradient halo behind the "Consider" watch + italic serif model name. No clipped pills, no extra chrome.
- **Step Up column promoted.** The center column between the two watches is now the editorial peak: small `STEP UP` kicker on top, italic 26px Cormorant gold delta, then a wider 44px arrow.
- **Watch images normalized.** Each watch sits in a fixed **260×260** box with `object-fit: contain`. Mass is identical across cards regardless of source image aspect ratio.

## About the Design Files

`FramelessUpgrade.html` renders just this section in isolation — open it in a browser to see the live design.

`DiscoverEditorial.jsx` contains the production `UpgradeRow` component (lines around the `// ─── 3 · Upgrade This Watch` block). That's the source of truth.

`discover-data.jsx` exports `UPGRADES` — the seed data shape.

These are **design references**, not production code to drop in. Translate to your codebase's stack (Next.js + Tailwind per the PRD), keeping the spec below exact.

## Fidelity

**High-fidelity.** All values below are exact.

## Component Spec

### Outer card

- Element: `<article>`
- Background: `#FFFCF7` (slot)
- Border: `1px solid #EAE5DC`
- Border radius: **0** (intentional — the editorial design uses sharp rectangles)
- Padding: `32px 36px 28px`
- Position: relative

### From → To pair

3-column CSS grid: `1fr auto 1fr`, gap 12px, `align-items: center`, margin-bottom 18px.

On mobile (`<= 768px`): collapse to single column; the center arrow column should become a horizontal row between the stacked images (`flex-direction: row` + rotate arrow SVG 90°).

### FROM column (left)

- Container: full-width div, `text-align: center`, height 300px (desktop), flex-center
- Image: **260×260** fixed box, `object-fit: contain`
- Drop shadow: `filter: drop-shadow(0 16px 28px rgba(26,20,16,0.22))`
- Below image:
  - Kicker `YOU OWN` — 10px DM Sans 600, letter-spacing 0.18em, uppercase, color `#A89880`, margin-bottom 6px
  - Model name — 21px Cormorant Garamond 400, line-height 1.1, color `#1A1410`
  - Meta `<value> · <size> mm` — 11.5px DM Sans, letter-spacing 0.04em, color `#A89880`, margin-top 4px

### Step Up column (center)

The featured center column. Flex column, items center, gap 6px, padding `0 8px`.

In top-to-bottom order:

1. **`STEP UP` kicker** — 8.5px DM Sans 600, letter-spacing **0.22em** (wider than other kickers for emphasis), uppercase, color `#A89880`, margin-bottom 2px
2. **Delta** — `+$1,700` style. **26px Cormorant Garamond italic 400**, line-height 1, color `#C9A84C` (gold), letter-spacing -0.005em. This is the visual peak.
3. **Arrow SVG** — 44px wide × 10px tall, gold stroke (`#C9A84C`, 1px). 32px line + a 5-point chevron at the right end. Shape:

```jsx
<svg width={44} height={10} viewBox="0 0 44 10" fill="none">
  <line x1={0} y1={5} x2={40} y2={5} stroke="#C9A84C" strokeWidth={1} />
  <polyline points="35,1 40,5 35,9" fill="none" stroke="#C9A84C" strokeWidth={1} />
</svg>
```

### TO column (right)

Same structure as FROM, with three modifications:

1. **Gold radial halo** behind the image. Positioned absolutely centered behind the image, sized **320×320**, no border, pointer-events none:

```css
position: absolute;
top: 50%; left: 50%; transform: translate(-50%, -50%);
width: 320px; height: 320px;
background: radial-gradient(
  ellipse at center,
  rgba(201,168,76,0.28) 0%,
  rgba(201,168,76,0.12) 40%,
  rgba(201,168,76,0) 72%
);
pointer-events: none;
```

The image itself sits at `z-index: 1; position: relative` so it lifts above the halo.

2. **Image drop shadow** is slightly heavier — `filter: drop-shadow(0 20px 32px rgba(26,20,16,0.26))`

3. **Below image**:
  - Kicker `CONSIDER` — color **gold** (`#C9A84C`), other params same as YOU OWN
  - Model name is **italic** — 21px Cormorant Garamond italic 400. Italics signal "aspirational target."
  - Meta: same shape as FROM

### Rationale (below the pair)

- `<p>` element, 14.5px Cormorant Garamond italic 400, line-height 1.55, color `#3F362C`
- Padding-top 18px, top-border `1px solid #EAE5DC`, margin-bottom 14px
- `text-wrap: pretty`

### Footer row (below rationale)

Flex row, `justify-content: space-between`, `align-items: center`.

- Left: `<fromBrand> → <toBrand>` kicker — 9px DM Sans 600, letter-spacing 0.18em, uppercase, color `#A89880`
- Right: flex group, gap 18px:
  - `SET AS TARGET` link — 10.5px DM Sans 500, letter-spacing 0.12em, uppercase, color `#6F6353` (muted dark), button reset
  - `FIND ON MARKET ↗` link — same shape, color `#1A1410` (ink)

## Data Shape

```ts
interface UpgradePath {
  id: string;
  from: {
    brand: string;
    model: string;
    ref: string;
    value: number;       // dollars
    image: string;       // path or URL
    size: number;        // mm
  };
  to: {
    brand: string;
    model: string;
    ref: string;
    value: number;
    image: string;
    size: number;
  };
  rationale: string;     // italic editorial body
  delta: string;         // pre-formatted "+$1,700"
  aspirational?: boolean;// REMOVED from UI but kept on the data
                         // in case you want to filter/sort
}

// fmt helper for value display
const fmt = (n: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
}).format(n);
```

See `discover-data.jsx → UPGRADES` for the seed shape.

## Section header (above the cards)

For context, the section is wrapped in this header layout:

- 2-column grid `1fr auto`, gap 24px, baseline aligned, margin-bottom 28px, padding-bottom 16px, bottom border `1px solid #EAE5DC`
- Left: kicker `§ 02` (gold, 10px DM Sans 600 0.18em uppercase, margin-bottom 10px) + h2
- h2: `Upgrade this watch.` — **30px Cormorant Garamond 400 italic**, line-height 1, letter-spacing -0.008em, color `#1A1410`
- Right: subtitle — *"Step-up paths that preserve your box balance. Brand-family logic; grounded and aspirational picks."* — 11.5px DM Sans, color `#A89880`, letter-spacing 0.04em, max-width 320, `text-align: right`, alignSelf end

## Grid

2-column grid on desktop, `gap: 16px`. Single column on mobile (`<= 768px`).

Per-card on mobile: stack the from→to pair vertically (single column), keep image height 300px so each watch gets full card width. Rotate the arrow column to a horizontal row (`flex-direction: row` + transform rotate 90deg on the arrow SVG).

## Tokens reference

Pulling only the tokens used in this section:

```css
--color-bg: #FAF8F4;        /* page bg */
--color-slot: #FFFCF7;      /* card fill */
--color-ink: #1A1410;       /* primary text */
--color-ink-soft: #3F362C;  /* rationale italic body */
--color-muted: #A89880;     /* meta + kickers */
--color-muted-dark: #6F6353;/* "Set as target" link */
--color-gold: #C9A84C;      /* delta + halo + kicker */
--color-border: #EAE5DC;    /* card + section borders */

--font-serif: 'Cormorant Garamond', Georgia, serif;
--font-sans: 'DM Sans', system-ui, sans-serif;
```

## Files in this bundle

- `FramelessUpgrade.html` — open in browser to preview
- `FramelessUpgrade.jsx` — section wrapper
- `DiscoverEditorial.jsx` — the production `UpgradeRow` component is here (find by the `// ─── 3 · Upgrade This Watch` comment around line 340)
- `discover-data.jsx` — `UPGRADES` seed shape
- `colors_and_type.css` — design tokens
- `watches/` — placeholder watch images
- `screenshots/desktop.png` + `screenshots/mobile.png` — visual ground truth
- `CLAUDE_CODE_PROMPT.md` — the prompt to paste
