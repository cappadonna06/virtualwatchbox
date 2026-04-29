  # Claude Code Prompt — Feature 3: Add Watch Flow (Revised)

  Paste this entire prompt into a fresh Claude Code session.

  ---

  ## Read first — before writing any code

  - `/docs/PRD-v1.4.md` — **Feature 3** (Watch Search & Add Watch Flow). This is your spec.
  - `/types/watch.ts` — existing Watch interface. Understand every field before touching it.
  - `/lib/watches.ts` — the full watch catalog (50+ watches should exist from prior session).
  - `/app/collection/page.tsx` — the collection page you are extending.
  - `/components/collection/CollectionHeader.tsx` — contains the "Add Watch" button stub.
  - `/components/watchbox/WatchBox.tsx` — understand how empty slots are rendered.
  - `/components/watchbox/DialSVG.tsx` — you will reuse this in search results.

  Do not write code until you have read all of these.

  ---

  ## Context

  **Virtual Watchbox** — Next.js 14, TypeScript strict.

  Styling: inline `style` props as primary pattern. No new CSS classes.  
  Font vars: `--font-cormorant` (serif), `--font-dm-sans` (sans)  
  Colors: ink `#1A1410`, cream `#FAF8F4`, muted `#A89880`, gold `#C9A84C`, border `#EAE5DC`, white `#FFFFFF`

  **Catalog vs. collection — critical distinction:**
  - `watches` from `lib/watches.ts` = the searchable catalog. Not owned by default.
  - `collectionWatches` state in `collection/page.tsx` = the user's owned watches (starts as first 5 Longines).
  - These are different. A catalog watch becomes a collection watch only when explicitly added.

  ---

  ## What you are building

  Two new routes that implement the Add Watch flow as a focused, dedicated experience — not a modal, not a reflowing side panel.

  ```
  /collection/add            ← search and select
  /collection/add/[watchId]  ← confirm and add
  ```

  ---

  ## Type safety rule

  Do not remove or rename any existing fields in `types/watch.ts`.

  Only add optional fields if TypeScript strictly requires them for this flow. Likely additions:

  ```typescript
  // Add to Watch interface only if not already present:
  ownershipStatus?: 'Owned' | 'Followed'
  condition?: WatchCondition
  purchasePrice?: number
  purchaseDate?: string
  notes?: string
  ```

  Prefer using existing types where possible. No `any`.

  ---

  ## Route 1 — `/app/collection/add/page.tsx`

  ### Layout

  Page-level layout matching `/collection`:
  - Same nav bar
  - Page title area: "Find a Watch" (serif, `--font-cormorant`, ~28px)
  - Back link top-left: `← My Collection` → `router.push('/collection')`
  - Helper text below title: `"Search by brand, model, or reference number"` — muted, small sans

  ### Search input

  ```
  Full-width input
  placeholder: "Search brand, model, or reference..."
  padding: '12px 16px'
  border: '1px solid #E0DAD0', borderRadius: 8
  fontFamily: 'var(--font-dm-sans)', fontSize: 15
  color: '#1A1410', background: '#FFFFFF', outline: none
  ```

  Searches `brand`, `model`, `reference` fields — case insensitive, live as user types.

  ### Filters — only appear when `searchTerm.length > 0`

  Render three filter groups in this exact order:
  1. **Case Material**
  2. **Dial Color**  
  3. **Case Size**

  Do NOT include Watch Type filters in this flow. Watch Type is a discovery filter for Playground — not useful for reference matching.

  **Filter options:**

  Case Material: Stainless Steel, Yellow Gold, Rose Gold, White Gold, Titanium, Ceramic, Bronze  
  Dial Color: Black, White, Blue, Green, Grey, Silver, Champagne, Brown, Red, Salmon  
  Case Size: ≤38mm, 39–41mm, ≥42mm  

  **Match count logic:**

  For each filter option, count how many current search results match that option, given all OTHER currently active filters (excluding the filter group being computed). This tells the user what tapping the chip would yield.

  ```typescript
  // Pseudocode — implement properly in TypeScript
  function getMatchCount(option: string, group: 'material' | 'color' | 'size', currentResults: Watch[]): number {
    return currentResults.filter(w => matchesOption(w, option, group)).length
  }
  ```

  **Chip style:**

  ```
  // Base
  display: inline-flex, alignItems: center, gap: 6
  padding: '5px 11px', borderRadius: 20
  fontFamily: 'var(--font-dm-sans)', fontSize: 10
  cursor: pointer, border: '1px solid #E0DAD0'
  transition: all 0.15s

  // Inactive with count > 0
  color: '#A89880', background: 'transparent'

  // Active (selected)
  color: '#FAF8F4', background: '#1A1410', border: '1px solid #1A1410'

  // Zero count — show but disable
  opacity: 0.38, cursor: 'default', pointerEvents: 'none'
  ```

  **Count badge inside each chip:**

  ```
  // On inactive chip
  fontSize: 9, padding: '1px 5px', borderRadius: 10
  background: '#F0EBE3', color: '#A89880'

  // On active chip
  background: 'rgba(255,255,255,0.2)', color: '#FAF8F4'
  ```

  Multiple filters combine with AND logic across groups.

  ### Results

  **Empty state (no search term):** nothing — just the input and helper text.

  **Zero results:** `"No watches found. Try a different search or adjust filters."` — centered, muted.

  **Result cards — vertical list (not grid):**

  ```
  background: '#FFFFFF'
  border: '1px solid #EAE5DC', borderRadius: 10
  padding: '14px 16px', marginBottom: 8
  cursor: pointer
  display: flex, alignItems: center, gap: 16
  transition: border-color 0.15s
  :hover → borderColor: '#C9A84C'
  ```

  **Left: DialSVG component**
  ```
  width: 56, height: 56, flexShrink: 0
  Pass watch.dialConfig as props
  ```

  **Right: watch info**
  ```
  Brand:
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase'
    color: '#C9A84C', fontFamily: 'var(--font-dm-sans)'

  Model:
    fontSize: 17, fontFamily: 'var(--font-cormorant)', color: '#1A1410'
    marginTop: 2

  Ref line:
    fontSize: 10, color: '#A89880', fontFamily: 'var(--font-dm-sans)'
    "Ref. 126610LN · 41mm · Stainless Steel"

  Value:
    fontSize: 15, fontFamily: 'var(--font-cormorant)', color: '#1A1410'
    marginTop: 4
  ```

  **Bottom row of card (flex, space-between, marginTop: 8):**

  Watch type badge:
  ```
  fontSize: 9, padding: '2px 7px', borderRadius: 20
  background: '#1A1410', color: '#FAF8F4'
  fontFamily: 'var(--font-dm-sans)'
  ```

  "In Collection" badge (only if watch.id is in `collectionWatchIds` — pass this as a prop or compute from URL state):
  ```
  fontSize: 9, padding: '2px 8px', borderRadius: 20
  background: '#E8F0E8', color: '#3A6A2D'
  fontFamily: 'var(--font-dm-sans)'
  ```

  ### Clicking a result card

  **Not in collection:** `router.push('/collection/add/' + watch.id)`

  **Already in collection:** expand the card inline — do not navigate:

  ```
  // Expanded state
  borderColor: '#C9A84C'

  // Appended below existing card content:
  paddingTop: 10, marginTop: 10
  borderTop: '1px solid #F0EBE3'

  Text: "You already own this watch. Add another?"
  fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)'
  marginBottom: 10

  Two buttons side by side:
  [Cancel] — border '1px solid #E0DAD0', color '#A89880', background transparent
  [Add Duplicate] — background '#1A1410', color '#FAF8F4'
  Both: fontSize: 10, padding: '5px 12px', borderRadius: 6, cursor: pointer
  ```

  Cancel → collapse to normal card state.  
  Add Duplicate → `router.push('/collection/add/' + watch.id + '?duplicate=true')`

  ---

  ## Route 2 — `/app/collection/add/[watchId]/page.tsx`

  This page receives `params.watchId`. Find the watch in the catalog:

  ```typescript
  const watch = catalogWatches.find(w => w.id === params.watchId)
  if (!watch) redirect('/collection/add')
  ```

  ### Layout

  Back link: `← Back to search` → `router.back()`

  **Watch preview — top of page:**

  ```
  textAlign: center, padding: '32px 20px 24px'

  DialSVG: width: 88, height: 88, margin: '0 auto 16px'

  Brand:
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase'
    color: '#C9A84C', fontFamily: 'var(--font-dm-sans)'

  Model:
    fontSize: 28, fontFamily: 'var(--font-cormorant)', color: '#1A1410'
    marginTop: 4

  Reference:
    fontSize: 11, color: '#A89880', fontFamily: 'var(--font-dm-sans)'
    marginTop: 4
  ```

  Divider below preview: `height: 1, background: '#EAE5DC', margin: '0 0 28px'`

  ### The single question

  ```
  fontFamily: 'var(--font-dm-sans)'
  fontSize: 11, fontWeight: 600
  letterSpacing: '0.1em', textTransform: 'uppercase'
  color: '#A89880', marginBottom: 16
  text: "DO YOU OWN THIS WATCH?"
  ```

  **Two option buttons — stacked:**

  ```
  // Option 1 — I own this
  width: '100%', padding: '15px 20px'
  background: '#1A1410', color: '#FAF8F4'
  border: none, borderRadius: 8, cursor: pointer, marginBottom: 8
  display: flex, justifyContent: space-between, alignItems: center

  Left: "Yes — add to My Collection"
  Right: "→" (muted gold #C9A84C99)
  fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500

  // Option 2 — I'm following it
  width: '100%', padding: '15px 20px'
  background: '#FFFFFF', color: '#1A1410'
  border: '1px solid #EAE5DC', borderRadius: 8, cursor: pointer
  display: flex, justifyContent: space-between, alignItems: center

  Left: "No — save to Followed Watches"
  Right: "→" (muted #A89880)
  fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500
  ```

  ### If "Yes — add to My Collection" is selected

  Show form below the buttons (slide/reveal, or just conditional render):

  **Condition (required):**

  ```
  Section label: "CONDITION" — same label style as above
  ```

  Segmented control — 5 options: Unworn / Like New / Excellent / Good / Fair

  ```
  Container: display flex, border '1px solid #E0DAD0', borderRadius 7, overflow hidden

  Each option:
    flex: 1, padding: '9px 0', textAlign: center
    fontSize: 11, fontFamily: 'var(--font-dm-sans)', fontWeight: 500
    cursor: pointer, border: none

  Active: background '#1A1410', color '#FAF8F4'
  Inactive: background 'transparent', color '#A89880'
  ```

  **"Add purchase details" — collapsed section:**

  ```
  Toggle link:
    fontFamily: 'var(--font-dm-sans)', fontSize: 11
    color: '#A89880', cursor: pointer
    "＋ Add purchase details" / "－ Hide details"
    marginTop: 16, marginBottom: 8
  ```

  When expanded, show:

  ```
  Purchase Price (USD):
    label: "PURCHASE PRICE"
    input: type number, placeholder "0"

  Purchase Date:
    label: "PURCHASE DATE"
    input: type date

  Notes:
    label: "NOTES"
    textarea: rows 3, placeholder "AD purchase, complete set..."

  All inputs:
    fontFamily: 'var(--font-dm-sans)', fontSize: 13
    padding: '9px 12px', border: '1px solid #E0DAD0'
    borderRadius: 6, width: '100%', color: '#1A1410'
    background: '#FFFFFF', outline: none
    marginTop: 4
  ```

  **"Add to My Collection" button:**

  ```
  width: '100%', padding: '13px', marginTop: 24
  border: none, borderRadius: 8, cursor: pointer
  fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500
  transition: background 0.15s

  Enabled (condition selected):
    background: '#1A1410', color: '#FAF8F4'

  Disabled (no condition):
    background: '#C8BFAF', color: '#FAF8F4', cursor: 'not-allowed'
  ```

  **On confirm:**
  - Build new watch object (see handler below)
  - Call add handler
  - `router.push('/collection')`
  - Show success toast (see below)

  ### If "No — save to Followed Watches" is selected

  Show below the buttons:

  ```
  Descriptive text:
    fontSize: 12, color: '#A89880', fontFamily: 'var(--font-dm-sans)'
    "We'll save this to your Followed Watches. You can track listings and add it to a Playground box later."
    marginTop: 12, marginBottom: 20
  ```

  **"Save to Followed Watches" button:**

  ```
  width: '100%', padding: '13px'
  background: '#1A1410', color: '#FAF8F4'
  border: none, borderRadius: 8, cursor: pointer
  fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500
  ```

  **On confirm:**
  - Add `watch.id` to followed watches state/storage
  - `router.push('/collection')`
  - Toast: "Saved to your Followed Watches"

  ---

  ## State management — `app/collection/page.tsx`

  Switch from static import to state:

  ```typescript
  import { watches as catalogWatches } from '@/lib/watches'

  const DEFAULT_COLLECTION = catalogWatches.slice(0, 5)

  const [collectionWatches, setCollectionWatches] = useState<Watch[]>(DEFAULT_COLLECTION)
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  ```

  **Add to collection handler:**

  ```typescript
  function handleAddToCollection(
    watch: Watch,
    condition: WatchCondition,
    purchaseDetails?: { price?: number; date?: string; notes?: string }
  ) {
    const newWatch: Watch = {
      ...watch,
      id: `${watch.id}-${Date.now()}`,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: purchaseDetails?.price ?? 0,
      purchaseDate: purchaseDetails?.date ?? new Date().toISOString().split('T')[0],
      notes: purchaseDetails?.notes ?? '',
    }
    setCollectionWatches(prev => [...prev, newWatch])
  }
  ```

  **Important:** adding a watch does NOT trigger the unsaved changes bar. It is a committed action.

  **Passing state to routes:**

  The two new routes need access to `collectionWatches` (to know which watches are already owned) and the add handler. Options:
  - Use URL search params to pass the watch ID, look up in catalog on the confirm page
  - Use React context or a lightweight store if you prefer

  Keep it simple. URL params + catalog lookup is fine for now. Persistence comes in Phase 2 (Supabase).

  ---

  ## Success toast

  After any add action (both routes), show a brief toast:

  ```
  position: fixed, bottom: 28, left: '50%'
  transform: 'translateX(-50%)'
  background: '#1A1410', color: '#FAF8F4'
  padding: '10px 22px', borderRadius: 8
  fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500
  zIndex: 300, whiteSpace: 'nowrap'
  pointerEvents: 'none'
  ```

  Animate: fade in over 150ms, display for 2.5s, fade out over 300ms. Use `setTimeout` + state. No library.

  Toast messages:
  - Collection: `"[Brand] [Model] added to your collection"`
  - Followed: `"Saved to your Followed Watches"`

  ---

  ## Wire up entry points

  **CollectionHeader:**

  Add `onAddWatch: () => void` to props. Wire "Add Watch" button onClick:
  ```typescript
  onClick={() => router.push('/collection/add')}
  ```

  **Empty watchbox slots:**

  Add `onEmptySlotClick?: () => void` to WatchBox props (if not already there). In collection page pass:
  ```typescript
  onEmptySlotClick={() => router.push('/collection/add')}
  ```

  ---

  ## What NOT to change

  - Existing fields in `types/watch.ts` — do not remove or rename any
  - `app/globals.css` — no changes
  - `components/collection/WatchCard.tsx` — no changes
  - `components/collection/CollectionStats.tsx` — no changes (just ensure it receives `collectionWatches`)
  - `components/watchbox/WatchBox.tsx` — only add `onEmptySlotClick` prop if absent, nothing else
  - The 5 default Longines in `lib/watches.ts`

  ---

  ## Verification checklist

  Go through every item before finishing:

  - [ ] `npm run build` — zero TypeScript errors, zero `any`
  - [ ] "Add Watch" button navigates to `/collection/add`
  - [ ] Clicking an empty watchbox slot navigates to `/collection/add`
  - [ ] `/collection/add` loads with search input only, no filters, no results
  - [ ] Typing shows live results with DialSVG renders in each card
  - [ ] Filter chips appear only after search term entered
  - [ ] Filter chips are in order: Case Material → Dial Color → Case Size
  - [ ] No Watch Type chips anywhere in this flow
  - [ ] Each chip shows correct match count badge
  - [ ] Zero-count chips are visible but grayed and non-interactive
  - [ ] Multiple active filters combine with AND logic
  - [ ] Watches already in collection show "In Collection" badge
  - [ ] Clicking an "In Collection" watch expands inline duplicate warning
  - [ ] Duplicate warning: Cancel collapses, Add Duplicate navigates to confirm page
  - [ ] `/collection/add/[watchId]` loads with correct watch preview
  - [ ] Selecting "Yes" reveals condition segmented control
  - [ ] "Add to My Collection" button disabled until condition selected
  - [ ] "Add purchase details" toggle collapses/expands optional fields
  - [ ] After adding to collection: redirects to `/collection`, toast appears, new watch in Cards view
  - [ ] Adding does NOT trigger unsaved changes bar
  - [ ] Est. value pill in collection header updates after add
  - [ ] Selecting "No" shows follow description and "Save to Followed Watches" button
  - [ ] After following: redirects to `/collection`, toast appears
  - [ ] Back link on `/collection/add/[watchId]` returns to search
  - [ ] Mobile (375px): both routes are usable, search scrolls, buttons are tappable
