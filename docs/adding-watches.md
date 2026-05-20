# Adding watches — no-CSV runbook

The fastest path for "I found N image URLs / files and want them live."
No `intake-review.csv`, no batch script, no reprocessing the existing
catalog.

For bigger imports (50+) see [docs/runbook.md](runbook.md) instead — the
intake pipeline handles bulk identification better when you don't know
the catalog id for each file.

---

## Prerequisites — one-time

In `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=eyJhbGc...
```

Required for the upload + seed steps. The processor itself runs without
Supabase but `--only-flagged` / sync scripts need it.

---

## The five-step loop

This is the loop for each batch of N watches. Designed so step 4 only
touches the new images — the existing 2,900+ are left untouched.

### 1. Find the catalog id for each watch you're adding

Two ways:

**By reference number (one-liner):**
```bash
node -e "
const refs = ['79030B', 'SLGH005', '91210N'];   // <- your refs
const { mintCatalogId } = require('./lib/catalogId');
for (const r of refs) console.log(r.padEnd(15), '→', mintCatalogId('Tudor', r));
"
```
Pass the right brand per ref. For mixed brands, run a couple of times
or eyeball the existing `data/catalog-seed-full.csv`.

**By Supabase lookup (when you only know "the Tudor BB58 blue dial"):**
```bash
SUPABASE_URL=<…> KEY=<…>
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$SUPABASE_URL/rest/v1/catalog_watches?brand=eq.Tudor&model=ilike.*Black%20Bay%2058*&select=id,reference,dial_color"
```
Pick the right row's `id`.

### 2. Drop the raw image into `public/watch-assets/raw/`

The filename stem MUST be the catalog id. Image format can be JPG, PNG,
HEIC, or WebP — the processor handles all of them.

```bash
# Examples
cp ~/Downloads/tudor-bb58-blue.jpg public/watch-assets/raw/tudor-79030b.jpg
cp ~/Downloads/gs-white-birch.png  public/watch-assets/raw/grand-seiko-slgh005.png
```

**Source quality matters.** Aim for:
- Vertical orientation, watch upright
- White or solid neutral background (lets the cutout breathe)
- Full bracelet visible (not cropped at the lugs)
- No retail hangtags, fingers, or styling props

Manufacturer press images are best. If the only available image is a
wrist shot or has a hangtag, skip it — the processor will produce a bad
cutout, and you'll be back here.

### 3. Process only the new ones

```bash
npx tsx scripts/process-watch-images.ts --only-new
```

The `--only-new` flag (added in this PR) reads
`public/watch-assets/processed/manifest.json` and processes only raw
files whose stem isn't already in the manifest. Output is appended to
the manifest, leaving every existing entry untouched.

Dry-run first if you want to see what it'll do:
```bash
npx tsx scripts/process-watch-images.ts --only-new --dry-run
```

If the output looks bad (halos, clipped bracelet, etc.) — see the
"Reprocess one watch" section below.

### 4. Upload the new bytes to Supabase Storage

The full `images:upload-storage --overwrite` works but re-PUTs all
2,900+ images for 10 minutes. For N new watches, hit them directly:

```bash
# Set these once per shell
SUPABASE_URL=$(grep -E '^(NEXT_PUBLIC_)?SUPABASE_URL=' .env.local | tail -1 | cut -d= -f2)
KEY=$(grep '^SUPABASE_SECRET_KEY=' .env.local | cut -d= -f2)

# For each new watch
for id in tudor-79030b grand-seiko-slgh005 tudor-91210n; do
  for ext in png webp; do
    [ "$ext" = "png" ] && local="public/watch-assets/processed/${id}.png" \
                       || local="public/watch-assets/processed/webp/${id}.webp"
    curl -s -o /dev/null -w "%{http_code} ${id}/${ext}\n" \
      -X PUT \
      -H "Authorization: Bearer $KEY" \
      -H "apikey: $KEY" \
      -H "Content-Type: image/$ext" \
      -H "x-upsert: true" \
      --data-binary "@$local" \
      "$SUPABASE_URL/storage/v1/object/watch-images/${id}/primary.${ext}"
  done
done
```

Expect `200` per line. `403`/`401` means the key is wrong; `404` means
the watch-images bucket doesn't exist (one-time setup).

### 5. Refresh DB rows + bump cache-bust

```bash
# Bump IMAGE_VERSION in lib/watchImages/cacheBust.ts (any string change works)
# Example: '20260520' → '20260521'

# Then push catalog + watch_images rows. Reads the manifest and inserts
# fresh watch_images rows for the new ids; existing rows are no-ops.
npm run catalog:seed-full
```

That's it. The new watches are live in dev (`npm run dev`) and will be
live in prod on the next deploy.

---

## Reprocess one watch (the cutout is bad)

When `--only-new` produced a bad output (halo, clipped bracelet, etc.):

1. Open `/admin/image-review` (admin email allowlist required).
2. Find the watch, tag the failure mode (e.g. `bracelet_bottom`,
   `halo`), click "Needs reprocess."
3. Run the full reprocess cycle:
   ```bash
   npm run images:reprocess-cycle
   ```
   This processes only the flagged watches, uploads only those bytes,
   and flips status back to `approved` if everything succeeded.

Manual fallback if you don't want the auto-approve flip:
```bash
npm run images:reprocess-cycle -- --no-approve
```

### Bulk-approve

Two modes:

```bash
# After a manual --only-flagged run, clear just the needs_reprocess queue:
npm run images:bulk-approve -- --dry-run
npm run images:bulk-approve

# After clicking through the full admin catalog and only marking the bad
# ones (everything else is GTG), approve the entire 'pending' pile too:
npm run images:bulk-approve -- --include-pending --dry-run
npm run images:bulk-approve -- --include-pending
```

Or surgically:
```bash
npm run images:bulk-approve -- --ids=rolex-126710blro,rolex-16713
```

## Deleting an image (the "Wrong watch" button)

Clicking **Wrong watch / delete** in `/admin/image-review`:

1. **Immediately deletes the `watch_images` row** (server-side, in the
   POST handler). The image stops rendering on the catalog within seconds.
2. **Inserts a `status='deleted'` review row** for the audit trail.

To make the deletion **permanent across deploys** (otherwise the next
`catalog:seed-full` would recreate the `watch_images` row from
`manifest.json`):

```bash
npm run images:sync-deletions    # pulls deleted ids → data/excluded-image-ids.json
git add data/excluded-image-ids.json
git commit -m "exclude N bad images"
```

The JSON is the source of truth that `seed-from-enriched.ts` consults.
Skip the sync only if you're OK with the deletion being temporary.

---

## Delete an image (image is wrong / two-watches-in-one / hangtag visible)

Two paths:

**One-off (manual edit, immediate):**

Edit `data/excluded-image-ids.json`:
```json
{
  "ids": [
    {
      "id": "rolex-126710blnr",
      "reason": "diagonal wrist shot with hangtag",
      "flaggedAt": "2026-05-21"
    }
  ]
}
```
Then run `npm run catalog:seed-full` — it deletes the `watch_images`
row for excluded ids. Watch renders the SVG dial fallback.

**Via admin tool (preferred for ongoing curation):**

1. Open `/admin/image-review`, find the watch, click "Wrong watch /
   delete."
2. Run:
   ```bash
   npm run images:sync-deletions
   ```
   This pulls latest `watch_image_reviews` from Supabase, merges any
   `status='deleted'` ids into `data/excluded-image-ids.json`, and
   removes ids that were un-flagged.
3. Commit the JSON, run `npm run catalog:seed-full` to purge the
   `watch_images` row.

---

## Common mistakes

| Problem | Cause | Fix |
|---|---|---|
| Processor says "Processing 2934 image(s)…" | You forgot `--only-new` | Ctrl-C, re-run with `--only-new` |
| `--only-new` says "0 new" but you just dropped files | Filename stem doesn't match catalog id | `ls public/watch-assets/raw/tudor*` and compare to expected id format `tudor-79030b.jpg` (lowercase, single dash, no spaces) |
| Upload returns 401/403 | Wrong service key | Use SUPABASE_SECRET_KEY (service role), not the anon key |
| New image doesn't show in dev after seed | Browser cached the old URL | Hard refresh OR bump `IMAGE_VERSION` |
| `npm run catalog:seed-full` reports "no manifest matches" for some ids | The raw filename didn't generate a catalog row | The watch may not exist in `catalog_watches` yet — add it via the catalog seeding flow (see [docs/runbook.md](runbook.md)) |

---

## When NOT to use this runbook

- **You have an unidentified photo dump** (don't know which watch each
  file is). Use the intake pipeline in [docs/runbook.md](runbook.md) §2
  — it identifies images via OpenAI vision and produces a review CSV.
- **You're adding new catalog rows entirely (not just images for
  existing rows).** See [docs/runbook.md](runbook.md) §2 — that
  scrapes specs from WatchBase and enriches before imaging.
- **You're refreshing 100+ images at once.** The intake/process/upload
  full-catalog flow is more efficient at that scale than per-watch
  curls.
