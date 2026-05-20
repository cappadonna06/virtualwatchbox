# Watch Image Pipeline

Two flows live here:

1. **Intake** — adding a new watch image to the catalog from a raw source file.
2. **Review & reprocess** — fixing bad cutouts on watches already in the catalog.

Plus the underlying architecture (Storage, manifest, cache-bust) that both flows depend on.

---

## Architecture

**Supabase Storage is the canonical source for processed catalog images.** Every processed PNG and WebP lives at:

```
https://<project>.supabase.co/storage/v1/object/public/watch-images/<catalog_watch_id>/primary.{png,webp}
```

The path is deterministic from `catalog_watch_id`. `watch_images.png_url` / `watch_images.webp_url` in the DB point at these objects.

**Local-disk processed files are scratch space, not source of truth.** The directory `public/watch-assets/processed/` is gitignored (except `manifest.json`) — what's on your disk is whatever your last `images:process` run produced. Production never sees those bytes; it reads from Storage.

**The build-time manifest decides what the hero/seed surfaces.** `public/watch-assets/processed/manifest.json` is tracked in git. `lib/watches.ts` reads it at module-load time, maps each entry's local path to its Storage URL via `lib/watchImages/storageUrl.ts`, and exposes the result as the seed catalog's image URLs. The homepage hero carousel filters down to seed entries with a non-empty `imageUrl` ([lib/renderableWatches.ts](../lib/renderableWatches.ts)), sorts by heat score, and rotates through the top 15 via a date-seeded shuffle. **If a watch isn't in the manifest, it can't appear in the hero pool.**

**Cache-bust is global.** `lib/watchImages/cacheBust.ts` exports `withVersion(url)` which appends `?v=<IMAGE_VERSION>` to image URLs. `CatalogProvider`, `WatchImagesProvider`, and the hero all use it. Supabase Storage URLs are stable (the path doesn't change on re-upload), so without this every browser would serve the old bytes from disk cache after a reprocess. `IMAGE_VERSION` can be overridden per-deploy via `NEXT_PUBLIC_IMAGE_VERSION` env.

---

## Flow 1 — Intake (adding a new watch image)

1. Drop unknown watch image files into `public/watch-assets/inbox`.
2. Run `npm run images:intake`.
3. Review `public/watch-assets/intake-review.csv`.
4. Mark valid rows as `approved` in the `status` column.
5. Run `npm run images:apply-intake`.
6. Run `npm run images:process`.
7. For approved new watches, run `npm run images:catalog-candidates` and use `public/watch-assets/catalog-candidates.json` to add reviewed rows to `lib/watches.ts`.
8. Upload to Storage: `npm run images:upload-storage`.
9. Commit `public/watch-assets/processed/manifest.json` (and any catalog edits in `lib/watches.ts`).

Approved source images move into `public/watch-assets/raw`.

When `OPENAI_API_KEY` is set, intake sends a normalized JPEG preview of each inbox image to the OpenAI Responses API for visual identification — it reads dial text, reference clues, case/dial traits, and either chooses an existing `lib/watches.ts` catalog ID or proposes a new one. New watches are written with `catalogAction: new-catalog-candidate`; review before approving and add the corresponding catalog row when you want the app to render that processed image.

Useful flags:

- `npm run images:intake -- --no-vision` — filename/catalog matching only.
- `npm run images:apply-intake -- --force` — replaces existing raw files.
- `npm run images:apply-intake -- --keep-originals` — copies into `raw` and leaves inbox files in place.
- `npm run images:process -- --trim-background` — stricter Sharp trimming for already-transparent source images.
- `npm run images:catalog-candidates` — exports approved new-catalog rows for manual catalog insertion.

Optional env:

- `OPENAI_API_KEY` — enables visual identification during intake.
- `OPENAI_VISION_MODEL` — overrides the default vision model (currently `gpt-4.1-mini`).

---

## Flow 2 — Review & reprocess (fixing bad cutouts)

**Admin tool:** `/admin/image-review` (requires admin email allowlist). Side-by-side raw vs processed WebP for every watch with a `watch_images.primary` row. Filter by status: pending / needs reprocess / approved / wrong watch.

**Tag chips** — clicking any tag auto-stages "Needs reprocess" as the primary save action. Each tag maps to a specific pipeline knob:

| Group | Tag | Implicates | Knob bumped on `--only-flagged` |
|---|---|---|---|
| Missing parts | `bracelet_top`, `bracelet_bottom`, `band`, `case` | ML segmentation under-shoot | `maskDilationPasses` 1 → 2 |
| Missing parts | `small_detail` | `removeSmallAlphaComponents` too aggressive | *(not auto-bumped yet)* |
| Edge quality | `halo` | Alpha-edge halo (imgly fringe) | `featherSigma` ≈ 1.0 *(currently disabled — see footnote)* |
| Edge quality | `edge_eroded` | `dissolveShadowGradient` too aggressive | Already tightened globally |
| Edge quality | `bottom_clipped` | `removeBottomStudioPlatform` misfiring | *(not auto-bumped yet)* |
| Background | `shadow_remnant` | Shadow walker too conservative | *(not auto-bumped yet)* |
| Background | `bg_remnant` | Edge-bg flood-fill missed seeds | *(not auto-bumped yet)* |

Tag → knob mappings live in `overridesForTags()` in [scripts/process-watch-images.ts](../scripts/process-watch-images.ts). Add new mappings there when adding processor knobs.

**Required migrations** (apply against Supabase before using the admin tool):

- `supabase/migrations/021_watch_image_reviews.sql` — the table + admin-only RLS via existing `public.is_admin()`.
- `supabase/migrations/022_watch_image_reviews_tags.sql` — adds the `tags text[]` column + GIN index.

**Reporting state:**

```bash
npx tsx scripts/image-review-report.ts                       # stdout summary
npx tsx scripts/image-review-report.ts --status=needs_reprocess
npx tsx scripts/image-review-report.ts --json
```

### The reprocess workflow

After flagging a batch in the admin UI:

1. **Reprocess just the flagged subset** (uses per-tag knob overrides automatically):
   ```bash
   npx tsx scripts/process-watch-images.ts --only-flagged
   ```
   Or reprocess everything that isn't already approved:
   ```bash
   npx tsx scripts/process-watch-images.ts --skip-approved
   ```

2. **Upload to Storage** (overwrites existing objects so the public URLs serve the new bytes):
   ```bash
   npm run images:upload-storage -- --overwrite
   ```

3. **Bump the cache-bust version** so every browser re-fetches:
   - Edit `IMAGE_VERSION` in [lib/watchImages/cacheBust.ts](../lib/watchImages/cacheBust.ts) (e.g. `'20260520'` → `'20260521'`).
   - Or set `NEXT_PUBLIC_IMAGE_VERSION` in `.env.local` / Vercel env.

4. **Commit the manifest + cache-bust bump:**
   ```bash
   git add public/watch-assets/processed/manifest.json lib/watchImages/cacheBust.ts
   git commit -m "reprocess: <one-line summary of what was fixed>"
   ```

Push, deploy. Production picks up the new bytes (from Storage) and forces a re-fetch (via the bumped version).

### Validation before mass reprocessing

If you're tuning the processor (e.g. changing thresholds in `lib/imageProcessing.ts`), validate on the flagged subset first without touching the live `processed/` dir:

```bash
npx tsx scripts/process-watch-images.ts --only-flagged --out-suffix=preview
npx tsx scripts/build-preview-compare.ts
# Open http://localhost:3000/image-review-preview.html — side-by-side raw / old / new
```

Only after a visual pass run the full `--skip-approved` then upload.

---

## What to commit, what not to commit

| Path | Committed? |
|---|---|
| `lib/**`, `app/**`, `components/**`, `scripts/**` | YES |
| `supabase/migrations/*.sql` | YES |
| `public/watch-assets/processed/manifest.json` | **YES** (small JSON; production reads it) |
| `public/watch-assets/processed/*.png` | NO (gitignored; Storage is canonical) |
| `public/watch-assets/processed/webp/*.webp` | NO (gitignored; Storage is canonical) |
| `public/watch-assets/raw/*` | NO (gitignored; local-only) |
| `public/watch-assets/processed-preview/` | NO (gitignored; scratch dir for validation runs) |
| `public/image-review-preview.html` | NO (gitignored; generated by build-preview-compare.ts) |

If you find yourself wanting to commit a PNG or WebP under `public/watch-assets/processed/`, stop — the right move is to upload it to Storage via `images:upload-storage` and commit the manifest update.

---

## Processor knobs (reference)

In [lib/imageProcessing.ts](../lib/imageProcessing.ts), exposed via `ProcessOptions`:

- `maskDilationPasses` *(default 1)* — color-guided alpha-mask dilation to rescue ML under-shoot at strap/lug/bracelet edges. Each pass dilates ~1 pixel; uses a snapshot-per-pass to prevent chain feedback.
- `featherSigma` *(default 0)* — Gaussian blur on alpha channel only, softens halos. **Currently disabled by default** — interacts badly with the libvips dylib version mismatch between `sharp` and `@imgly/background-removal-node` (produced catastrophic horizontal silhouette inflation in testing). Re-enable per-watch only if the dylib conflict gets resolved.

Tightened global defaults in `dissolveShadowGradient`:

- Added absolute distance-from-background budget (`130²` per channel) so the walker can't chain gradients all the way into watch interiors.
- `maxDepth` 70 → 32
- `saturationCap` 14 → 9
- `lightenTolerance` 6 → 4
- Required `darkRemoved` ≥ 450 (was 200) before committing removal
- `maxRemoved` area cap 12% → 8%

Per-watch overrides flow through `--only-flagged` / `--skip-approved` runs via `overridesForTags()` in the batch script.
