# Claude Code Prompt — Feature 4: Playground Page

Paste this entire prompt into a fresh Claude Code session.

---

## Read before writing any code

- `/docs/PRD-v1.4.md` — **Feature 4 (Playground Mode)** and **Feature 2B Category 2 (Playground Watches)**. Full product spec.
- `/types/watch.ts` — Watch interface and existing types including `PlaygroundBox`
- `/lib/watches.ts` — the full watch catalog. Playground watches are resolved from here by ID.
- `/app/collection/page.tsx` — reference for page structure and state patterns
- `/app/collection/add/page.tsx` — you will extend this to handle `?dest=playground`
- `/components/watchbox/WatchBox.tsx` — reuse this, do not rebuild it
- `/components/watchbox/WatchSidebar.tsx` (or equivalent) — you will add a `mode` prop
- `/components/watchbox/DialSVG.tsx` — reuse in any new watch cards

Do not write code until you have read all of these.

---

## Context

**Virtual Watchbox** — Next.js 14, TypeScript strict, inline styles primary pattern.

Font vars: `--font-cormorant` (serif), `--font-dm-sans` (sans)  
Colors: ink `#1A1410`, cream `#FAF8F4`, muted `#A89880`, gold `#C9A84C`, border `#EAE5DC`, white `#FFFFFF`

**What already exists — do not rebuild:**
- `WatchBox` component — the 3×N slot grid
- `DialSVG` — SVG dial renderer
- Hover card interaction — built into WatchBox
- `WatchSidebar` — the detail panel (you will extend it, not rebuild)
- `/collection/add` routes — you will extend with a `dest` param
- `PlaygroundBox` type — already defined in `types/watch.ts`
- Watch catalog in `lib/watches.ts`

**Key distinction:**  
Playground boxes store `watchIds: string[]` — references into the catalog, not full Watch objects. Resolve watches at render time: `catalog.find(w => w.id === id)`.

---

## Step 0 — Seeded demo data

Create `/lib/playgroundData.ts`:

```typescript
import { PlaygroundBox } from '@/types/watch'

export const SEEDED_PLAYGROUND_BOXES: PlaygroundBox[] = [
  {
    id: 'pg-dream-1',
    name: 'Dream Collection',
    tags: ['Dream Box'],
    watchIds: [
      // use real IDs from lib/watches.ts — pick 5 across brands
      // e.g. patek-nautilus-5711, ap-royal-oak-15500, 
      //      lange-1-191, grand-seiko-snowflake, rolex-daytona-116500
      // Replace with actual IDs from the catalog
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pg-budget-1',
    name: 'Under $10K',
    tags: ['Under $10K'],
    watchIds: [
      // pick 4 watches from catalog with estimatedValue < 10000
      // e.g. tudor-black-bay-79230, omega-speedmaster, 
      //      grand-seiko-sbgw231, tag-heuer-carrera
    ],
    createdAt: new Date().toISOString(),
  },
]
```

**Before filling in watchIds:** read `lib/watches.ts` to find actual IDs. Use real catalog IDs — do not guess.

---

## Step 1 — `/app/playground/page.tsx`

### State

```typescript
import { watches as catalogWatches } from '@/lib/watches'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'

const [boxes, setBoxes] = useState<PlaygroundBox[]>(SEEDED_PLAYGROUND_BOXES)
const [activeBoxId, setActiveBoxId] = useState<string>(SEEDED_PLAYGROUND_BOXES[0].id)
const [newBoxModalOpen, setNewBoxModalOpen] = useState(false)
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
const [shareToast, setShareToast] = useState(false)
const [editingName, setEditingName] = useState(false)

const activeBox = boxes.find(b => b.id === activeBoxId) ?? boxes[0]
const activeWatches = activeBox.watchIds
  .map(id => catalogWatches.find(w => w.id === id))
  .filter(Boolean) as Watch[]
```

### Page header

```
padding: '32px 32px 0'

Title: "Playground"
  fontFamily: 'var(--font-cormorant)', fontSize: 36
  color: '#1A1410'

Subtitle: "Build your dream collection. No limits."
  fontFamily: 'var(--font-dm-sans)', fontSize: 13
  color: '#A89880', marginTop: 4
```

Thin gold top accent line at very top of page content area:
```
height: 2, background: '#C9A84C'
width: '100%', marginBottom: 0
```
This gives Playground a subtle visual identity distinct from /collection.

### Box switcher tab strip

Below header, above the box:

```
display: flex, gap: 6
padding: '20px 32px 0'
overflowX: auto
borderBottom: '1px solid #EAE5DC'
```

Each box tab:
```
padding: '8px 16px', borderRadius: '8px 8px 0 0'
fontFamily: 'var(--font-dm-sans)', fontSize: 12
cursor: pointer, whiteSpace: 'nowrap'
border: '1px solid transparent'
borderBottom: 'none'
transition: all 0.15s

Active:
  background: '#FAF8F4'
  border: '1px solid #EAE5DC'
  borderBottom: '1px solid #FAF8F4'  ← hides bottom border
  color: '#1A1410', fontWeight: 500

Inactive:
  background: 'transparent'
  color: '#A89880'
  :hover → color: '#1A1410'
```

Tab label: `"[Box Name] · [watchCount]"` e.g. "Dream Collection · 5"

"+" tab at the end:
```
Same tab style as inactive but:
color: '#C9A84C', fontWeight: 600
onClick: () => setNewBoxModalOpen(true)
label: "+"
```

### Box area

```
padding: '24px 32px 32px'
```

**Box name — inline editable:**

```
// Display mode
fontFamily: 'var(--font-cormorant)', fontSize: 24, color: '#1A1410'
cursor: 'text'
display: 'inline-block'
onClick: () => setEditingName(true)

// Edit mode — replace with input
input:
  fontFamily: 'var(--font-cormorant)', fontSize: 24, color: '#1A1410'
  border: 'none', borderBottom: '1.5px solid #C9A84C'
  background: 'transparent', outline: 'none'
  onBlur / onKeyDown Enter: save name, setEditingName(false)
```

Save name handler:
```typescript
function handleRenameBox(newName: string) {
  setBoxes(prev => prev.map(b =>
    b.id === activeBoxId ? { ...b, name: newName.trim() || b.name } : b
  ))
  setEditingName(false)
}
```

**Box tag chips** (below the name, small):
```
display: flex, gap: 6, marginTop: 6, marginBottom: 16
Each tag chip:
  fontSize: 9, padding: '2px 8px', borderRadius: 20
  border: '1px solid #EAE5DC', color: '#A89880'
  fontFamily: 'var(--font-dm-sans)'
```

**Toolbar** (right-aligned, same row as name or just below):
```
display: flex, gap: 8, alignItems: center

Share Box button:
  fontSize: 10, padding: '6px 12px', borderRadius: 6
  border: '1px solid #EAE5DC', color: '#A89880'
  background: 'transparent', cursor: pointer
  fontFamily: 'var(--font-dm-sans)'
  onClick: handleShareBox

Delete Box button (only show if more than 1 box):
  Same style, color: '#C4A882' (muted warning, not red)
  onClick: () => setDeleteConfirmId(activeBoxId)
```

Share handler:
```typescript
function handleShareBox() {
  const url = `${window.location.origin}/playground/share/${activeBoxId}`
  navigator.clipboard.writeText(url)
  setShareToast(true)
  setTimeout(() => setShareToast(false), 2500)
}
```

**WatchBox component:**

Pass `activeWatches` to the existing WatchBox.

For empty slots — pass:
```typescript
onEmptySlotClick={() => 
  router.push(`/collection/add?dest=playground&boxId=${activeBoxId}`)
}
```

Pass a `mode="playground"` prop (or a separate `onWatchClick` handler) so that clicking a filled slot opens the Playground sidebar variant.

**Playground sidebar — see Step 2.**

---

## Step 2 — Extend WatchSidebar for Playground mode

Open the existing sidebar component. Add a `mode` prop:

```typescript
interface WatchSidebarProps {
  // ...existing props
  mode?: 'collection' | 'playground'  // defaults to 'collection'
  onRemoveFromPlayground?: () => void
}
```

When `mode === 'playground'`:

**Show:**
- Dial visualization (same)
- Brand, model, reference (same)
- All specs: case size, material, dial color, movement, complications (same)
- Watch type badge (same)
- "Est. Market Value: $XX,XXX" — using `watch.estimatedValue`

**Hide:**
- Condition badge
- Purchase date
- Purchase price / cost basis
- Notes field

**Replace action buttons with:**

```
// Primary — Find For Sale
Full-width button
background: '#1A1410', color: '#FAF8F4'
padding: '11px', borderRadius: 7
fontFamily: 'var(--font-dm-sans)', fontSize: 11
fontWeight: 500, letterSpacing: '0.08em'
label: "Find For Sale →"
href: `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand + ' ' + watch.model)}`
target: '_blank', rel: 'noopener'

// Secondary — Add to My Collection
Full-width button, marginTop: 7
background: 'transparent'
border: '1px solid #EAE5DC', color: '#1A1410'
padding: '11px', borderRadius: 7
label: "Add to My Collection"
onClick: () => router.push(`/collection/add/${watch.id}`)

// Tertiary — Remove from Box
Text link, marginTop: 12, textAlign: center
fontSize: 11, color: '#A89880'
cursor: pointer
label: "Remove from box"
onClick: onRemoveFromPlayground
```

**Remove from playground handler** (in page.tsx):
```typescript
function handleRemoveFromPlayground(watchId: string) {
  setBoxes(prev => prev.map(b =>
    b.id === activeBoxId
      ? { ...b, watchIds: b.watchIds.filter(id => id !== watchId) }
      : b
  ))
  // close sidebar
}
```

---

## Step 3 — New Box modal

Small centered modal. Match the style of existing modals in the app.

```
Backdrop: position fixed, inset 0
  background: 'rgba(26,20,16,0.4)', backdropFilter: 'blur(2px)'
  zIndex: 200

Panel: position fixed, top '50%', left '50%'
  transform: 'translate(-50%, -50%)'
  background: '#FAF8F4', borderRadius: 12
  padding: 28, width: 380
  boxShadow: '0 16px 60px rgba(26,20,16,0.18)'
  zIndex: 201
```

**Content:**

Title: "New Playground Box"
```
fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#1A1410'
marginBottom: 20
```

Name input:
```
label: "BOX NAME" (section label style)
input: placeholder "e.g. Dream Collection, Travel Box..."
required
```

Tag picker:
```
label: "TAGS (OPTIONAL)"

Tag options as chips (multi-select):
Dream Box / Under $10K / Travel / Dress / GMT Only / 
Vintage / Color Study / Upgrade Path / Lottery Box

Chip selected: background '#1A1410', color '#FAF8F4', border '1px solid #1A1410'
Chip inactive: transparent, border '1px solid #E0DAD0', color '#A89880'
fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: pointer
```

Buttons row:
```
display: flex, gap: 8, marginTop: 24, justifyContent: 'flex-end'

Cancel: transparent, border '1px solid #EAE5DC', color '#A89880'
Create Box: background '#1A1410', color '#FAF8F4'
  disabled if name is empty
Both: padding '8px 16px', borderRadius 7, fontSize 11
```

Create handler:
```typescript
function handleCreateBox(name: string, tags: string[]) {
  const newBox: PlaygroundBox = {
    id: `pg-${Date.now()}`,
    name: name.trim(),
    tags,
    watchIds: [],
    createdAt: new Date().toISOString(),
  }
  setBoxes(prev => [...prev, newBox])
  setActiveBoxId(newBox.id)
  setNewBoxModalOpen(false)
}
```

---

## Step 4 — Delete box confirmation

Inline confirmation — do not use browser `confirm()`.

When `deleteConfirmId` is set, replace the delete button with:
```
Small inline confirmation strip near the button:
"Delete this box?"  [Cancel]  [Delete]

Cancel: clears deleteConfirmId
Delete:
  setBoxes(prev => prev.filter(b => b.id !== deleteConfirmId))
  setActiveBoxId(remaining boxes[0].id)
  setDeleteConfirmId(null)
```

---

## Step 5 — Extend `/collection/add` search page

The add watch search page already exists. Extend it to handle Playground destination.

Read URL search params at the top of the page:
```typescript
const searchParams = useSearchParams()
const dest = searchParams.get('dest')       // 'playground' | null
const boxId = searchParams.get('boxId')     // playground box ID | null
const isPlayground = dest === 'playground'
```

**When `isPlayground === true`:**

- Page title: "Add to [Box Name]" (look up box name from boxId — pass via localStorage or URL)
- Back link: "← Back to Playground"
- Helper text: "Search the full catalog and add to your box"
- **Skip the `/collection/add/[watchId]` confirmation step entirely**
- Clicking a result card directly adds the watch to the playground box and returns
- No ownership question, no condition, no purchase details

**Direct add handler** (when isPlayground):
```typescript
function handlePlaygroundAdd(watch: Watch) {
  // Read existing playground state from localStorage or pass via param
  // Add watchId to the specified box
  // router.push('/playground')
}
```

**Simple localStorage bridge** (cleanest solution for session state):
```typescript
// On /playground page, persist boxes to localStorage on every change:
useEffect(() => {
  localStorage.setItem('playgroundBoxes', JSON.stringify(boxes))
}, [boxes])

// On /collection/add page, when isPlayground:
function handlePlaygroundAdd(watch: Watch) {
  const stored = localStorage.getItem('playgroundBoxes')
  if (!stored || !boxId) return
  const boxes: PlaygroundBox[] = JSON.parse(stored)
  const updated = boxes.map(b =>
    b.id === boxId
      ? { ...b, watchIds: [...b.watchIds, watch.id] }
      : b
  )
  localStorage.setItem('playgroundBoxes', JSON.stringify(updated))
  router.push('/playground')
}
```

On playground page, initialize from localStorage if available:
```typescript
const stored = typeof window !== 'undefined'
  ? localStorage.getItem('playgroundBoxes')
  : null
const [boxes, setBoxes] = useState<PlaygroundBox[]>(
  stored ? JSON.parse(stored) : SEEDED_PLAYGROUND_BOXES
)
```

---

## Step 6 — Toast notifications

Reuse the same toast pattern from the add watch flow if it exists, or implement:

```typescript
// Share toast
{shareToast && (
  <div style={{
    position: 'fixed', bottom: 28, left: '50%',
    transform: 'translateX(-50%)',
    background: '#1A1410', color: '#FAF8F4',
    padding: '10px 22px', borderRadius: 8,
    fontFamily: 'var(--font-dm-sans)', fontSize: 12,
    zIndex: 300, whiteSpace: 'nowrap'
  }}>
    Link copied to clipboard
  </div>
)}
```

---

## What NOT to change

- `types/watch.ts` existing fields — only add if TypeScript requires it
- `lib/watches.ts` — no changes
- `app/globals.css` — no changes
- `WatchBox` component core behavior — only add `mode` or callback props
- `/collection` page — no changes
- The existing 5 default Longines

---

## Verification checklist

- [ ] `npm run build` — zero TypeScript errors, zero `any`
- [ ] `/playground` loads with seeded demo boxes
- [ ] Box switcher tabs show both seeded boxes
- [ ] Clicking a tab switches the active box and updates the watchbox
- [ ] Box name is editable inline — click to edit, Enter/blur to save
- [ ] Box tag chips render below the name
- [ ] WatchBox renders the active box's watches via DialSVG
- [ ] Hovering a watch shows the hover card (existing behavior)
- [ ] Clicking a watch opens the sidebar in Playground mode
- [ ] Playground sidebar shows: specs, market value, Find For Sale, Add to My Collection, Remove
- [ ] "Find For Sale →" opens Chrono24 search in new tab
- [ ] "Add to My Collection" navigates to /collection/add/[watchId]
- [ ] "Remove from box" removes the watch and closes sidebar
- [ ] Empty slot click navigates to /collection/add?dest=playground&boxId=[id]
- [ ] On /collection/add with dest=playground: title changes, clicking a result adds directly and returns to /playground
- [ ] Share Box copies URL to clipboard and shows toast
- [ ] "New Box +" opens the new box modal
- [ ] New box modal: name required, tags optional, creates and switches to new box
- [ ] Delete box shows inline confirmation, removes box, switches to first remaining box
- [ ] Delete button hidden when only 1 box remains
- [ ] Playground state persists across navigation via localStorage
- [ ] Gold top accent line distinguishes Playground from /collection visually
- [ ] Mobile (375px): tab strip scrolls horizontally, sidebar works, modal is usable
