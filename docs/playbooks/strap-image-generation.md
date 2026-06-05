# Strap Image Generation — Playbook

How to (re)generate the photorealistic, Delugs-style strap template library used by the Strap
Drawer's "Quick pick from common straps" picker and the future Strap Studio.

**Pipeline:** `scripts/generate-strap-images.ts`
**Catalog:** `data/strap-templates.json` (committed manifest) → `lib/strapTemplates.ts` (loader)
**Storage:** Supabase bucket `strap-images`, path `strap-templates/<name>.webp` (migration `031`).
Local scratch stays PNG (for the inpaint step); the upload converts to a compact WebP (quality 88, ~65 KB vs ~900 KB PNG).
**References:** real maker photos in `public/demo-bands/`

---

## Output spec

Each template is ONE transparent **1000×1200 PNG** in the Delugs vertical layout:

- **Two-piece straps** (leather, rubber, sailcloth): two halves laid flat — long tongue on the
  left, shorter buckle end on the right with a polished steel pin buckle at the top.
- **Pass-through straps** (NATO) and **bracelets** (metal): a single continuous vertical piece,
  buckle/clasp near the top.
- Pure transparent background + a soft contact shadow beneath. Stitching and material texture
  must read clearly. No logos, no wrist, no watch case.

The Strap Drawer renders the master vertically; Strap Studio rotates it 90° via CSS. Lug width
is handled by CSS width-scaling at render time — one master per (material, sub, color).

---

## Generation backend: Google Gemini 2.5 Flash Image ("Nano Banana")

Called via raw `fetch` to `generativelanguage.googleapis.com` (no SDK).

> ⚠️ **The image model is NOT on the Gemini free tier** (`free_tier_requests` limit = 0).
> The Google Cloud project behind your `GEMINI_API_KEY` must have **billing enabled**.
> Cost is ~**$0.039 / image** (~$0.78 for the full 20-strap Tier 1 set; ~$0.20 for the 5-image
> preview). The text models work on the free tier, but image generation does not.

### Env (`.env.local` / `.env`)

```
GEMINI_API_KEY=...                 # or GOOGLE_API_KEY — billing-enabled project
NEXT_PUBLIC_SUPABASE_URL=...        # (or SUPABASE_URL)
SUPABASE_SECRET_KEY=...             # or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY
```

Override the model with `GEMINI_IMAGE_MODEL` if Google renames it.

---

## Run it

```bash
# 0. Apply migration 031 first so the strap-images bucket exists (see below).

# Preview the prompts only — no API calls, no cost:
npx tsx scripts/generate-strap-images.ts --tier 1 --dry-run

# Generate the 5-image review sample locally (no upload):
npx tsx scripts/generate-strap-images.ts --sample --no-upload
#   → writes public/strap-assets/processed/<name>.png

# Generate + upload the full Tier 1 set (skip-if-exists by default):
npx tsx scripts/generate-strap-images.ts --tier 1

# Regenerate a specific strap (overwrite):
npx tsx scripts/generate-strap-images.ts --only leather-smooth-cognac --force
```

**Flags:** `--tier N` · `--only a,b,c` · `--sample` · `--dry-run` · `--no-upload` ·
`--process-only` · `--force`

The script is **idempotent**: by default it skips straps whose Storage object already exists, so
a rate-limit interruption is safe to resume by re-running the same command. The free/paid tier is
still rate-limited per minute — the script paces serially and backs off on HTTP 429.

After a successful upload, `data/strap-templates.json` is updated with the public `imageUrl`.
**Commit `data/strap-templates.json`** (the PNGs themselves are gitignored — Storage is the
source of truth). If you re-upload over existing paths, bump `IMAGE_VERSION` in
`lib/watchImages/cacheBust.ts` so browsers re-fetch (the loader cache-busts via `withVersion()`).

### Buckle-logo handling (no AI credits)

The maker reference photos carry a small engraved logo on the buckle. Two defenses, both
zero-credit:
1. **Prompt** — `buildPrompt()` explicitly forbids reproducing any buckle logo/engraving.
2. **Surgical inpaint** — after each image is post-processed, the pipeline shells out to
   `scripts/inpaint_buckle_logo.py` (classical OpenCV `cv2.inpaint`, local, free) which detects
   the small engraving on the metallic buckle and fills it from surrounding metal. Requires
   `python3 -m pip install opencv-python-headless numpy`; if absent, the step is skipped with a
   warning (generation still succeeds).

Run it standalone on existing PNGs: `python3 scripts/inpaint_buckle_logo.py <file.png ...>`
(or soften instead with `scripts/soften-strap-buckles.ts`).

> Limitation: classical inpaint reduces the logo to a faint ghost (invisible at card size) but
> can't fully erase it on reflective metal without softening the buckle. For a guaranteed
> logo-free buckle, scrub the logo off the reference images in `public/demo-bands/` once, then
> regenerate — the prompt + clean references then produce clean buckles.

### `--process-only` (Bring-Your-Own images)

Skip generation entirely and post-process pre-made raw images (vendor/affiliate photography,
ChatGPT exports, physical photos). Drop files named `<name>.{png,jpg,webp}` into
`public/strap-assets/raw/`, then:

```bash
npx tsx scripts/generate-strap-images.ts --tier 1 --process-only
```

The same bg-removal → trim → contact-shadow → 1000×1200 canvas → upload → manifest path runs.

---

## Migration prerequisite

`supabase/migrations/031_strap_images_bucket.sql` creates the public `strap-images` bucket
(public read, service-role write only). Apply it before uploading:

```bash
supabase db push          # or run the SQL in the Supabase dashboard
```

User strap *photos* still go to the existing `watch-photos` bucket — `strap-images` is for
admin-curated templates only.

---

## Adding more straps (Tier 2+)

1. Add the row(s) to the `STRAPS` table in `scripts/generate-strap-images.ts` (set `tier: 2`).
   `material` / `subMaterial` / `color` MUST match the taxonomy in
   `lib/strapDrawer/constants.ts` (`MATERIALS`, `SUB_MATERIALS`, `COMMON_COLORS`).
2. Add a matching entry to `data/strap-templates.json` (empty `imageUrl`).
3. If a `KindKey` doesn't exist yet (e.g. suede, perlon, president), add it to `KINDS` with a
   descriptor/texture/stitch/singlePiece, and add the color literal to `COLOR_LITERAL`.
4. Wire a reference photo if one exists in `public/demo-bands/` (e.g. `pn-02-20-01.jpg` perlon,
   `Kollokium_straps_Anthracite…webp` elastic are already available for Tier 2).
5. Run `npx tsx scripts/generate-strap-images.ts --tier 2`.

---

## QA checklist

- [ ] Transparent background reads cleanly on the Drawer's cream surface **and** on a dark
      surface (rotate-test for Strap Studio).
- [ ] Both halves + buckle present for two-piece; single continuous piece for NATO/metal.
- [ ] Stitching and material texture (grain, scales, weave, links) are readable.
- [ ] No buckle logo / engraved letters (the demo references carry an embossed maker "D" — the
      prompt steers away, but spot-check).
- [ ] Color matches the intended literal.

---

## Alternative approaches (not built — for future contributors)

- **ALT 1 — Vendor partner photography (best quality).** Affiliate programs (Delugs, Barton,
  Crown & Buckle) often provide product images. Real photography beats AI for catalog quality;
  feed it through `--process-only`.
- **ALT 2 — Blender 3D rendering (best consistency).** Model 5 base geometries (two-piece, NATO,
  oyster, jubilee, milanese) with parametric lug width; render every material × color combo.
  One-time setup, infinite variants; needs a 3D artist.
- **ALT 3 — Physical photography (best authenticity).** Shoot real straps flat on a controlled
  background, rembg for cutout. Also the basis for a future user-contributed strap-photo feature.
