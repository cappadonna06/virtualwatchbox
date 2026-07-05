# Strap Studio MVP — Build Playbook

**Goal:** Ship a polished, premium strap visualization experience where users can see their watch with different straps and swap between them in real-time.

**Quality bar:** Apple Watch Studio level of interaction polish. Not a prototype — the MVP should feel like a luxury product feature.

---

## Phase 1 — Case-Only Image Pipeline

> **Superseded:** the SAM-3/Replicate-first plan below was never actually run
> (no `REPLICATE_API_TOKEN` was ever configured for this project — zero real
> segmentations came out of it). It's kept for history. The current pipeline
> is a free, deterministic width-profile detector with a Claude-vision
> escalation tier — see
> [case-segmentation-strategy.md](case-segmentation-strategy.md), which also
> covers what the Delugs reference actually demonstrates (real per-model
> photography, not automated segmentation) and why that doesn't transfer
> directly to a 40k-SKU catalog.

**Objective:** Create transparent case-only images (watch head without strap) for the top 100 watches by heat score.

### Step 1A: Source case-only images

Before doing any ML segmentation, check if case-only images already exist:

1. **Search watch manufacturer press kits** — brands like Rolex, Omega, Tudor, IWC often publish press images of just the watch head (no strap) for editorial use. Check brand press portals, Hodinkee editorial archives, and watch journalism image databases.

2. **Search stock photography** — Shutterstock, Getty, and Adobe Stock have product photography of watch heads without straps. Search for "[brand] [model] watch head" or "[brand] [model] case only".

3. **Check affiliate partner assets** — Chrono24, Jomashop, and other affiliate partners may provide product images with transparent or studio backgrounds showing case-only views.

4. **Catalog the results** in a tracking sheet: `watchId`, `source`, `sourceUrl`, `hasStrap` (boolean), `quality` (1-5).

For watches where a case-only image is found:
- Download at highest available resolution
- Run through the existing `lib/imageProcessing.ts` pipeline for background removal and normalization to 900px height
- Store as `{catalog_watch_id}/case-only.png` in Supabase Storage `watch-images` bucket

### Step 1B: ML segmentation for remaining watches

For watches where only a full-watch image exists (watch + strap together):

**Tools:**
- **SAM 3** (Segment Anything Model 3) via [Ultralytics](https://docs.ultralytics.com/models/sam-3) or [Replicate API](https://replicate.com/)
- **rembg** for background removal preprocessing (already handled by existing pipeline)
- **Sharp** for mask application and compositing (already in project)

**Pipeline script:** Create `scripts/segment-watch-cases.ts`

```
Input: transparent full-watch PNG from existing pipeline
Process:
  1. Send to SAM 3 with prompt: segment the watch case/head only, exclude strap/bracelet
  2. Receive binary mask (case = white, strap = black)
  3. Apply mask to original image via Sharp:
     sharp(fullWatch).composite([{ input: caseMask, blend: 'dest-in' }])
  4. Crop to alpha bounds, normalize to 900px height
  5. Export case-only PNG
Output: case-only transparent PNG
```

**QA process:**
- Extend `/admin/image-review` with a "Case Segmentation" review mode
- Show full-watch original alongside case-only result
- Tag failures: "strap residue", "case clipped", "crown missing", "lug cut"
- Failures get manual mask correction in Figma/Photoshop, then re-run through Sharp

**Expected success rate:** 70-80% auto-segmentation success. Budget manual correction time for 20-30 watches out of the initial 100.

### Step 1C: Lug geometry metadata

For precise strap positioning, each case-only image needs lug attachment coordinates:

```typescript
interface CaseLugGeometry {
  watchId: string
  // Pixel coordinates on the case-only image where straps attach
  topLugLeft: { x: number; y: number }
  topLugRight: { x: number; y: number }
  bottomLugLeft: { x: number; y: number }
  bottomLugRight: { x: number; y: number }
  lugWidthPx: number  // pixel width between lug tips (matches lugWidthMm scaled to image)
}
```

Options for populating:
1. **Manual annotation tool** — simple canvas overlay in `/admin/` where you click the 4 lug points per watch. Takes ~30 seconds per watch.
2. **Heuristic detection** — since case-only images have alpha, the lug tips are the topmost/bottommost non-transparent pixels on the left and right edges of the image. Automatable for most round cases.
3. **Store in Supabase** — new `case_lug_geometry` table or JSON column on `watch_images`.

---

## Phase 2 — Strap Image Library

> **Implemented:** the strap-template generation pipeline now lives in
> [docs/playbooks/strap-image-generation.md](strap-image-generation.md)
> (`scripts/generate-strap-images.ts` → Supabase `strap-images` bucket →
> `data/strap-templates.json`). It uses Gemini 2.5 Flash Image with the Delugs reference photos
> in `public/demo-bands/`, and outputs ONE 1000×1200 transparent master per (material, sub,
> color) — lug width is CSS-scaled at render time. Read that playbook for the current workflow.

**Objective:** Create a comprehensive library of photorealistic strap images that composite cleanly with the case-only images.

### Strap image requirements

Each strap image must:
- Be a transparent PNG at the same 900px height as watch images
- Show the strap from the same top-down angle as catalog watch photos
- Include the buckle/clasp in the appropriate position
- Be rendered at each common lug width (18, 19, 20, 21, 22, 24mm)
- Have consistent canvas dimensions so all straps align when composited with any case

### MVP material library

**Tier 1 — Must have for MVP (ship with these):**

| Material | Colors | Count |
|---|---|---|
| Leather (smooth, calf) | Black, dark brown, brown, cognac/honey, tan | 5 |
| Leather (alligator grain) | Black, dark brown, brown | 3 |
| Rubber (tropical/FKM style) | Black, navy, orange | 3 |
| NATO (nylon, pass-through) | Black, grey, olive, navy, Bond (black/grey stripe) | 5 |
| Metal (oyster/3-link) | Steel, gold | 2 |
| Metal (jubilee 5-link) | Steel | 1 |
| Metal (milanese mesh) | Steel | 1 |

**Total Tier 1:** 20 straps x 6 lug widths = **120 strap images**

**Tier 2 — Fast follow:**

| Material | Colors | Count |
|---|---|---|
| Leather (smooth) | Navy, burgundy, olive, grey | 4 |
| Leather (alligator) | Cognac, navy, burgundy | 3 |
| Leather (suede) | Brown, tan, grey | 3 |
| Rubber | Grey, olive, white | 3 |
| NATO patterns | RAF, French Marine, red stripe | 3 |
| Sailcloth | Black, navy, grey | 3 |
| Metal (president) | Gold | 1 |
| Metal (H-link/AP) | Steel | 1 |
| Metal (beads of rice) | Steel | 1 |
| Perlon | Black, navy, grey | 3 |

**Total Tier 2:** 25 additional straps

### Creating the strap images

**Recommended approach: 3D rendering in Blender** (most consistent, scalable)

Why Blender over photography:
- One strap model can be rendered at any lug width by adjusting geometry parameters
- Material/color variants are a texture swap, not a re-shoot
- Consistent lighting, angle, and perspective across all straps
- Free and open source

**Blender workflow:**

1. **Model base strap geometries** — 5 shapes needed:
   - Two-piece strap (leather, rubber, sailcloth, perlon)
   - NATO pass-through strap
   - 3-link oyster bracelet
   - 5-link jubilee bracelet
   - Mesh/milanese bracelet

2. **Create PBR materials** per texture:
   - Smooth leather: use real leather texture maps (diffuse, normal, roughness) from [Poly Haven](https://polyhaven.com/textures/leather) or [ambientCG](https://ambientcg.com/) (both CC0)
   - Alligator: source alligator leather texture maps, apply via UV mapping
   - Rubber: simple matte material with subtle surface texture
   - Nylon: woven fabric texture with appropriate thread direction
   - Metal: PBR metallic with correct roughness (polished vs brushed)

3. **Parameterize lug width** — the strap model should accept lug width as an input, adjusting the attachment end width while keeping the strap body proportional.

4. **Render setup:**
   - Camera: top-down, matching the ~15° angle of most catalog watch photos
   - Lighting: soft HDRI matching the warm neutral tone of the watch catalog
   - Background: transparent (RGBA)
   - Resolution: 900px height (matching watch images)
   - Render engine: Cycles for PBR realism (or EEVEE for faster iteration)

5. **Batch render script** — render all (material x color x lug_width) combinations:
   ```
   for material in [leather_smooth, leather_alligator, rubber, nato, ...]:
     for color in material.colors:
       for lugWidth in [18, 19, 20, 21, 22, 24]:
         render(material, color, lugWidth) → strap-{material}-{color}-{lugWidth}mm.png
   ```

**Alternative approach: AI-assisted generation**

If Blender modeling is too time-intensive:

1. Create ONE reference strap photo per shape (photograph or find a high-quality stock image)
2. Use Stable Diffusion + ControlNet to generate color/material variants:
   - ControlNet preserves the strap shape and perspective
   - Prompt variations control material and color: "photorealistic black alligator leather watch strap, top-down product photo, transparent background"
3. Post-process with rembg for clean alpha
4. Scale to each lug width via Sharp (proportional resize)

This is faster but less consistent. Good for expanding the color palette after the base shapes are established.

**Alternative approach: Photography**

If you have access to physical straps:

1. Photograph each strap flat on a white/green surface from directly above
2. Use a fixed camera rig for consistent angle and lighting
3. Include a ruler in frame for precise lug width calibration
4. Run through rembg for background removal
5. Align to standard canvas size using the ruler measurements

### Strap image naming convention

```
straps/
  {material}-{color}-{lugWidth}mm.png
  
Examples:
  leather-smooth-black-20mm.png
  leather-alligator-cognac-22mm.png
  rubber-black-20mm.png
  nato-bond-20mm.png
  metal-oyster-steel-20mm.png
  metal-jubilee-steel-20mm.png
  metal-milanese-steel-20mm.png
```

### Strap metadata

```typescript
interface StrapTemplate {
  id: string                    // "leather-smooth-black"
  material: StrapMaterial       // "leather"
  subMaterial?: string          // "smooth", "alligator", "suede"
  color: string                 // "black"
  colorHex: string              // "#1A1410" — for swatch UI
  style: StrapStyle             // "dressy"
  availableLugWidths: number[]  // [18, 19, 20, 21, 22, 24]
  affiliateUrl?: string         // deep link to purchase a real version
  affiliatePartner?: string     // "WatchWarehouse", "Barton", etc.
}
```

Store in `data/strap-templates.json` (similar pattern to `data/catalog-nicknames.json`).

---

## Phase 3 — Strap Studio UI

**Objective:** Build the interactive configurator experience at `/collection/straps/studio`.

### Layout specification

**Desktop (>1024px):**
```
┌─────────────────────────────────────────────────┐
│  ← Back to Strap Drawer    [Watch Picker ▾]     │
├─────────────────────────────────────────────────┤
│                                                 │
│              ┌───────────────┐                  │
│              │               │                  │
│              │  CASE LAYER   │ ← z-index: 2     │
│              │  (on top)     │                  │
│              │               │                  │
│              │  STRAP LAYER  │ ← z-index: 1     │
│              │  (behind)     │                  │
│              │               │                  │
│              └───────────────┘                  │
│         Rolex Submariner 124060                 │
│         on Black Rubber                         │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Leather │ Rubber │ NATO │ Metal │ Exotic│    │ ← category tabs
│  ├─────────────────────────────────────────┤    │
│  │ [■] [■] [■] [■] [■] [■] [■] [■] →      │    │ ← scrollable strap swatches
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Find this strap ↗]        [Share ↗] [♡]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Mobile (<768px):**
- Watch composite fills viewport width with padding
- Category tabs are horizontal scroll chips
- Strap tray is a bottom sheet (40% viewport height) with swipe-up to expand
- Share and affiliate CTAs pinned below the composite

### Component architecture

```
StrapStudio/
  StrapStudioPage.tsx          — route shell, data loading, state
  StrapComposite.tsx           — the layered case + strap image renderer
  StrapPicker.tsx              — category tabs + swatch strip
  StrapSwatchButton.tsx        — individual strap swatch with material preview
  WatchPicker.tsx              — dropdown to switch watch
  StrapStudioHeader.tsx        — back link + watch picker
  StrapStudioFooter.tsx        — affiliate CTA + share + follow
```

### Key interactions

**Strap swap animation (Framer Motion):**
```tsx
<AnimatePresence mode="wait">
  <motion.img
    key={activeStrap.id}
    src={strapImageUrl}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  />
</AnimatePresence>
```

**Case pulse on swap:**
```tsx
<motion.img
  src={caseImageUrl}
  animate={{ scale: isSwapping ? 1.015 : 1 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
/>
```

**Image preloading:**
- On mount: preload all strap images in the active category
- On category switch: preload all straps in the new category
- Use `new Image()` in a `useEffect` to warm the browser cache
- Result: zero loading spinners, instant swap feel

### State management

```typescript
interface StrapStudioState {
  watchId: string                // currently displayed watch
  activeStrapId: string          // currently displayed strap template
  activeCategoryId: string       // active material category tab
  isSwapping: boolean            // true during transition (for case pulse)
}
```

Minimal state — no persistence needed for the studio view itself. The Strap Drawer handles strap ownership; the Studio is a visualization tool.

### Fallback for watches without case-only images

When `caseOnlyImageUrl` is null:
- Render a side-by-side layout instead of the composite
- Left: full watch image (existing)
- Right: strap swatch card (CSS-rendered texture at large size, or strap photo) with specs
- "Compatible — {lugWidth}mm" badge
- Same strap picker tray below
- Same affiliate/share CTAs

### Dark ambient styling

```typescript
const studioBackground = {
  background: `radial-gradient(ellipse 60% 40% at 50% 45%, 
    rgba(201, 168, 76, 0.06) 0%, 
    rgba(26, 20, 16, 0.98) 50%, 
    #0D0B09 100%)`,
}
```

Subtle warm gold glow behind the watch. Not a spotlight — an ambient presence.

### Share functionality

"Share" button generates a pre-composited image via an API route:

```
POST /api/strap-studio/composite
Body: { watchId, strapTemplateId, lugWidthMm }
Response: { imageUrl: "https://..." }
```

Server-side Sharp composites the case + strap layers into a single image, uploads to Supabase Storage with a temp path, returns the URL. Used for:
- Social sharing (OG image)
- Download
- Clipboard copy

---

## MVP Build Sequence

Execute in this order:

1. **Strap template data model** — `data/strap-templates.json` + TypeScript types. No images yet, just the metadata (material, color, lug widths, style).

2. **Strap Drawer inventory** (Feature 7 core) — `/collection/straps` page, `user_straps` Supabase table, add/edit/delete strap flow, compatibility list. This ships independently of the Studio.

3. **Case-only image pipeline** — `scripts/segment-watch-cases.ts`, SAM 3 integration, admin review mode. Process top 100 watches.

4. **Strap image creation** — Blender models or AI-generated, 20 Tier 1 straps at 6 lug widths = 120 images. Upload to Supabase Storage.

5. **Strap Studio UI** — `/collection/straps/studio` route, composite renderer, strap picker, animations. Wire to case-only images and strap templates.

6. **Wire sidebar "Swap Strap" button** — link to Studio with the current watch preselected.

7. **Affiliate CTAs** — WatchWarehouse, Barton, Etsy deep links per strap template.

8. **Tier 2 strap expansion** — 25 additional straps, more colors, more materials.

---

## Definition of Done (MVP)

- [ ] 100 watches have case-only images reviewed and approved
- [ ] 20 strap templates rendered at 6 lug widths (120 strap images)
- [ ] `/collection/straps/studio` renders case + strap composite with crossfade transitions
- [ ] Strap picker with material category tabs and swatch strip
- [ ] Watch picker to switch between owned watches
- [ ] Fallback side-by-side layout for watches without case-only images
- [ ] Dark ambient background with warm gold glow
- [ ] Mobile-responsive with bottom sheet strap tray
- [ ] Image preloading — zero loading spinners on strap swap
- [ ] "Find this strap ↗" affiliate CTA per strap
- [ ] Share button generates composited image
- [ ] Framer Motion spring transitions on all swap interactions
- [ ] Reduced motion media query support
- [ ] `npm run build` passes
