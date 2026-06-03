# Handoff: The Service Room — Mobile Refactor + Document Attachments

## Overview
This is a **follow-up handoff** to the already-shipped "The Service Room" maintenance hub. It covers two things only:

1. **Mobile refactor** — making the (previously desktop-only) hub fully responsive down to phone widths.
2. **Document attachments in "Log a Service"** — letting the owner upload a receipt / warranty card / service record at the moment they log a service.

> The **desktop version is already implemented** — do not rebuild it. Treat this as a diff: add the responsive behavior and the attachment feature on top of the existing components.

The bundled `source/` files are **design references** (HTML/React-via-Babel prototypes) showing the intended behavior — recreate them in the production stack (React + Supabase) using the existing component library and patterns, not by copying the inline-style prototype.

---

## Part 1 — Responsive / Mobile

### Approach (how the prototype does it)
A single **viewport context** drives every breakpoint decision — no duplicate routes or separate mobile components. In production prefer a container/`useMediaQuery` hook from your design system, but keep the single-source-of-truth idea.

```jsx
// hub-core.jsx
const ViewportCtx = React.createContext({ isMobile: false, vw: 1320 });
const useViewport = () => React.useContext(ViewportCtx);

// MaintenanceHub.jsx (root)
const [vw, setVw] = useState(window.innerWidth);
useEffect(() => { /* window resize listener */ }, []);
const isMobile = vw < 760;           // single breakpoint
<ViewportCtx.Provider value={{ isMobile, vw }}> … </ViewportCtx.Provider>
```

**Breakpoint: `< 760px` = mobile.** Side gutters drop from 40px → 18px throughout.

### What changes at mobile, surface by surface

| Surface | Desktop | Mobile |
|---|---|---|
| **Nav** | VW mark + "The Service Room" + Collection/Discover/Playground/Service Room links | VW mark + "Service Room" + a **hamburger** button (links collapse); bar height 62→54 |
| **Header** | h1 52px, Export button top-right | h1 **34px**; Export button **moves down** next to the layout switch |
| **Summary strip** | 4 equal cells in a row | **2×2 grid** (top/left borders added between cells), big number 34→28px, sub-line truncates with ellipsis |
| **Layout switch row** | switch + helper sentence | switch + **Export** button (helper sentence hidden) |
| **Service Horizon** | full-width band, fits | wrapped in an **overflow-x:auto** scroller with a `min-width: 660px` inner canvas → **swipe horizontally**; dots still mark exact due-months; legend wraps, "Beyond" count shortens to "+N past two years" |
| **Agenda · On the bench card** | image 128px, stats in a row, buttons inline | see "Bench card" below |
| **Agenda · Resting easy row** | 5-column grid (thumb / name+lastfull / next due / upkeep / status+log) | compact **3-column** grid: thumb 52px / name + "Next {date} · {upkeep}" sub-line / right column stacks status chip over a log button |
| **Ledger** | sortable 7-column table + totals row | **stacked cards** (see "Ledger cards") + a `<select>` **SORT** control with a reverse-direction button; compact totals bar |
| **Gallery / Partner band** | multi-column grid | already fluid → collapses to 1 column |
| **Dossier drawer** | 456px side panel | `min(456px, 100vw)` → **full-screen** sheet |
| **Log-service modal** | centered dialog | `min(540px, 100%)` with 24px gutter → near-full-width sheet; type pills wrap |

### Bench card (mobile) — the most-edited piece
- **Watch image fills the full card height** (the image button is `height: 100%`, `align-self: stretch`, image `max-height: 100%`, vertically centered) instead of a fixed 84px thumbnail with empty space below it.
- **Stat row is a 3-column grid** with shortened labels — `LAST` · `EVERY` · `UPKEEP` (desktop uses `Last full` · `Interval` · `Lifetime upkeep`). This was required: the long "LIFETIME UPKEEP" label overflowed the ~227px column.
- **Action buttons stack vertically, full-width** (`Log a service` primary over `Find a center ↗` secondary). Side-by-side did not fit the narrow column and overflowed the card edge — **stacking is the fix, do not place them inline on mobile.**

### Ledger cards (mobile)
Each watch becomes a card with a **status-colored left border**: header row (48px thumb + brand/model + status chip), a **2×2 data grid** (Last serviced / Next due · Lifetime upkeep / Warranty), and a footer (docs-on-file count + "no papers" flag + a **Log** button). Sorting is a native `<select>` (Next due / Last serviced / Lifetime upkeep / Interval / Papers / Brand & model) plus a reverse toggle.

### Mobile preview harness (optional reference)
`source/` does not include it, but the prototype ships a `The Service Room — Mobile.html` that renders the live app inside an iPhone bezel via a 402px-wide iframe — handy for QA. Not needed in production.

---

## Part 2 — Document attachments in "Log a Service"

**Why:** when you log a service you usually have the paperwork in hand (receipt, service certificate) — capture it in the same step so it lands in the watch's **Papers & Provenance** automatically.

### Behavior
- A new **"Attach documents"** field at the bottom of the Log-a-Service form: a full-width dashed **upload button** ("Upload receipt, warranty card or service record") backed by a hidden `<input type="file" multiple accept="image/*,application/pdf">`, plus a one-line helper.
- Each chosen file becomes an **attachment row**: a gold document tile, the filename (truncated), a **document-type `<select>`**, and a remove (×) button.
- **Type is auto-guessed from the filename** and editable. Heuristics: `receipt|invoice|bill → receipt`, `warrant|guarantee → warranty_card`, `box|paper|tag → box_papers`, `apprais|valu → appraisal`, `manual|guide → manual`, else `service_record`. Options come from the existing `DOC_TYPES` taxonomy (receipt · warranty_card · service_record · box_papers · appraisal · manual).
- The footer summary line reflects the count (`… · 2 docs`).

### Data flow
The form's save now emits **two** payloads — the service record **and** the documents:

```jsx
onSave(watch,
  { id, date, type, provider, cost, notes },                       // the service record
  docs.map(d => ({ id: d.id, type: d.type, label: d.name, date })) // attached documents (dated to the service)
);
```

Root handler merges both into the watch immutably:

```jsx
const onSaveService = (watch, record, documents = []) => {
  setCollection(cs => cs.map(w => w.id === watch.id
    ? { ...w, records: [record, ...w.records], documents: [...documents, ...w.documents] }
    : w));
  flash(`${serviceType(record.type).label} logged…${documents.length ? ` · ${documents.length} docs filed` : ''}`);
};
```

In production: upload the files to storage (e.g. Supabase Storage), insert rows into `watch_documents` (type, label/filename, storage path, dated to the service), and insert the `watch_service_records` row — ideally in one transaction. The attached docs should then appear in the detail page's **Papers & Provenance** section (and bump the Ledger "Papers" count). Carry over the existing `photoType`/document handling already in the app.

### Also fixed here
The service-type **"Resets the service clock — next due recalculates to N years out."** note was wrapping awkwardly (the year number broke onto its own line because the text sat directly in a flex row). Wrap the whole sentence in a single inline element so it flows as one block beside the spark icon.

---

## Design tokens
Unchanged from the original handoff (warm-parchment palette `#FAF8F4` bg / `#1A1410` ink / `#C9A84C` gold; Cormorant Garamond + DM Sans; status reds/ambers/greens). The mobile work introduces no new colors — only layout, sizing, and the single 760px breakpoint.

## Files (`source/`) — changed components only
- `hub-core.jsx` — adds `ViewportCtx` + `useViewport`.
- `MaintenanceHub.jsx` — viewport state/provider; responsive nav, header, summary strip, gutters; `onSaveService` now merges attached documents.
- `ServiceHorizon.jsx` — mobile horizontal-scroll wrapper.
- `HubAgenda.jsx` — responsive AttentionCard (full-height watch, 3-col stats, stacked buttons) + OnTrackRow.
- `HubLedger.jsx` — mobile stacked-card variant + sort `<select>`.
- `LogServiceModal.jsx` — document attachment UI + dual save payload + resets-note fix.

## Screenshots (`screenshots/`) — captured at 402px
`01-agenda-top` (compact nav, 2×2 summary, switch + Export) · `02-agenda-bench` (full-height watch, LAST/EVERY/UPKEEP stats, stacked full-width buttons) · `03-ledger-cards` (sort select + stacked status-bordered cards). The Log-a-Service attachment UI is an overlay that screenshot tooling can't capture cleanly — see Part 2 and `LogServiceModal.jsx` for the exact spec.
