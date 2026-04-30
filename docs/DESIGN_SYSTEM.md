# Virtual Watchbox — Design System

## Source of truth

| Artifact | Path | Purpose |
|---|---|---|
| Design system reference | `docs/design-system/claude-v1/` | Canonical visual reference from initial design pass |
| CSS token definitions | `docs/design-system/claude-v1/colors_and_type.css` | Full CSS custom property definitions |
| Add Watch design handoff | `docs/design-system/claude-v1/design_handoff_add_watch/` | Component specs for the add-watch flow |
| Preview files | `docs/design-system/claude-v1/preview/` | HTML swatches for colors, type, spacing, components |
| TypeScript token module | `lib/brand.ts` | Shared token constants for inline styles |
| Global CSS vars | `app/globals.css` | CSS custom properties for theme hooks |

---

## `lib/brand.ts`

The primary token layer for this codebase. Import it in any component that uses inline styles:

```ts
import { brand } from '@/lib/brand'
```

Exports a single `brand` object with:

- **`brand.colors`** — all palette values (`bg`, `ink`, `muted`, `gold`, `border`, etc.)
- **`brand.controls.dropdown`** — dropdown sizing and spacing tokens (`minWidth`, `triggerHeight`, `menuOffset`, `menuPadding`, `optionMinHeight`)
- **`brand.status`** — ownership status badge `{ bg, text }` pairs
- **`brand.condition`** — condition badge `{ bg, text }` pairs
- **`brand.font`** — `serif` (`var(--font-cormorant)`) and `sans` (`var(--font-dm-sans)`)
- **`brand.radius`** — border radius scale in px (`btn`, `sm`, `md`, `lg`, `xl`, `pill`)
- **`brand.shadow`** — box shadow strings (`xs`, `sm`, `md`, `menu`, `lg`, `xl`, `drop`, `gold`)
- **`brand.transition`** — transition shorthands (`fast`, `base`, `slide`, `sheet`, `smooth`)
- **`brand.zIndex`** — z-index stack (`nav`, `dropdown`, `sidebar`, `backdrop`, `overflow`)

---

## When to use TS tokens vs CSS vars

**Use `brand.*` in component inline styles** (the primary pattern in this codebase):
```tsx
style={{ color: brand.colors.ink, fontFamily: brand.font.serif }}
```

**Use CSS vars in `app/globals.css`** for global defaults, scrollbar styling, and any class-based CSS that can't use the TS module:
```css
body { background-color: var(--color-bg); color: var(--color-ink); }
```

Both layers reference the same underlying values. Do not introduce a third source.

---

## Rules for future work

1. **No new one-off hex values.** Any color added to a component must be in `brand.ts` first. If extending the palette (e.g. a new semantic status), add it to `brand` and then use it.

2. **No new one-off font strings.** Always use `brand.font.serif` or `brand.font.sans` instead of hardcoding `var(--font-cormorant)` or `var(--font-dm-sans)`.

3. **Radius, shadow, transition values must come from `brand`.** The scale exists — use it rather than introducing arbitrary pixel values.

4. **Status and condition badge colors are in `brand.status` and `brand.condition`.** Do not re-declare them inline in new components.

5. **Design reference files in `docs/design-system/` are read-only history.** Update `lib/brand.ts` and `app/globals.css` as the living source; the reference files capture the v1 design intent.

6. **Do not use browser-native `<select>` controls on premium product surfaces.** Collection and Playground ordering controls should use the branded dropdown pattern instead.

---

## Dropdown Spec

The canonical product dropdown is the shared sort control in `components/collection/SortDropdown.tsx`.

- **Use case** — luxury control surfaces like ordering, sorting, and compact product filters.
- **Trigger copy** — use a semantic label like `Order`, then show the active value. Do not repeat prefixes like `Sort: Brand`, `Sort: Value`, etc.
- **Option copy** — use plain domain labels. For collection ordering, the canonical set is `Watchbox`, `Brand`, `Value`, `Type`.
- **Trigger surface** — white fill, light border, soft shadow, 40px height, right-aligned chevron.
- **Menu surface** — white card, 8px offset below trigger, rounded corners, elevated shadow, compact inner padding.
- **Selected option** — subtle gold wash, soft gold outline, gold check, ink text.
- **Hover state** — warm slot-toned fill, not browser blue.

This control should feel like jewelry-case hardware, not OS chrome.

---

## Color palette at a glance

| Token | Hex | Role |
|---|---|---|
| `brand.colors.bg` | `#FAF8F4` | Page background — warm cream |
| `brand.colors.slot` | `#FFFCF7` | Watch slot / card fill |
| `brand.colors.ink` | `#1A1410` | Primary text, dark buttons |
| `brand.colors.muted` | `#A89880` | Secondary text, labels |
| `brand.colors.gold` | `#C9A84C` | Accent — prices, active, brand labels |
| `brand.colors.dark` | `#2A2520` | Dark badge background |
| `brand.colors.white` | `#FFFFFF` | Pure white card surfaces |
| `brand.colors.border` | `#EAE5DC` | Primary dividers |
| `brand.colors.borderMid` | `#E8E2D8` | Card borders |
| `brand.colors.borderLight` | `#D4CBBF` | Secondary borders, light buttons |
