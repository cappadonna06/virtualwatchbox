# Catalog Runbook

How to grow, refresh, and extend the watch catalog without hallucinating
specs. This is the operational complement to:

- [docs/WATCH_IMAGE_PIPELINE.md](WATCH_IMAGE_PIPELINE.md) — image flows in depth
- [docs/pricing-model.md](pricing-model.md) — the four-layer price stack
- [docs/CATALOG_SEEDING.md](CATALOG_SEEDING.md) — initial schema + seed layout

All commands are run from the repo root. Anything that touches Supabase
needs `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) plus
`SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in `.env.local`.

---

## 1. Common operations

| Operation | Command(s) |
|---|---|
| **Build/refresh the enriched JSON** from all sources currently on disk | `npm run catalog:enrich` (defaults to `data/catalog-seed-200.csv`; pass `--seed=data/catalog-seed-full.csv --out=data/catalog-enriched-full.json` for the full run) |
| **Regenerate ML price predictions (Layer 3)** | `npm run prices:predict` then `npm run catalog:enrich -- --seed=data/catalog-seed-full.csv --out=data/catalog-enriched-full.json` |
| **Push enriched JSON to Supabase** | `DRY_RUN=1 npm run catalog:seed-full` first, then `npm run catalog:seed-full` |
| **Recompute heat scores on the live DB** (without a full re-enrich) | `npm run catalog:recompute-heat` then `npm run catalog:heat-report` |
| **Apply curated collector nicknames** (Pepsi, Batman, Moonwatch, …) | `DRY_RUN=1 npm run catalog:enrich-nicknames` then `npm run catalog:enrich-nicknames` — dictionary at [data/catalog-nicknames.json](../data/catalog-nicknames.json), entries for refs not yet in the catalog are skipped silently |
| **Generate the seed CSV from `thewatchapi` brand/ref dumps** | `npm run catalog:expand-list` (writes `data/catalog-seed-1500.csv`) |
| **Expand seed to ~35K refs via `watch_db.csv`** | `npm run catalog:expand-from-watchdb` (writes `data/catalog-seed-full.csv`) |
| **Cache `thewatchapi` reference lists** (rate-limited; see §6) | `npm run catalog:fetch-thewatchapi -- --mode=list-refs --brands=Rolex,Omega,Tudor` |
| **Search `thewatchapi` for specific refs** | `npm run catalog:fetch-thewatchapi -- --mode=search-refs --top=100` |
| **Scrape WatchBase for new refs** (≈3s/req, polite UA) | `SEED_CSV=data/catalog-seed-full.csv npm run catalog:scrape-watchbase` |
| **Re-parse WatchBase HTML after fixing the parser** | `npm run catalog:reparse-watchbase` |
| **LLM-extract sparse text-only fields** (sees seed-default CSV unless `--all-watches`) | `npm run catalog:llm-extract -- --top=5000` |
| **Acquire raw images** for the top-N hottest unimaged watches | `npm run images:acquire -- --top=1000` |
| **Process raw → cutout PNG/WebP + manifest** | `npm run images:process` (or `--only-flagged` / `--skip-approved` — see image pipeline doc) |
| **Upload processed images to Supabase Storage** | `DRY_RUN=1 npm run images:upload-storage` then `npm run images:upload-storage` (`-- --overwrite` after reprocess) |
| **Clean up legacy PNG objects in Storage** | `npm run images:cleanup-png` |
| **Generate the heat-report card** for a quick gut-check after re-enrich | `npm run catalog:heat-report` |

After **any** reprocess or upload, bump `IMAGE_VERSION` in
[lib/watchImages/cacheBust.ts](../lib/watchImages/cacheBust.ts) and commit
that + `public/watch-assets/processed/manifest.json`. Never commit the
PNG/WebP files themselves.

---

## 2. Playbook — "Add 1000 more imaged watches"

This is the canonical growth loop. Each step is idempotent; cached work
from earlier runs is reused unless you pass `--overwrite` / `--force`.

```bash
# 0. Make sure the priority seed CSV covers what you want imaged.
#    Skip if data/catalog-seed-full.csv already contains the target refs.
npm run catalog:expand-list                # refresh data/catalog-seed-1500.csv
npm run catalog:expand-from-watchdb        # writes data/catalog-seed-full.csv

# 1. Hydrate specs for any new refs.
#    WatchBase is the workhorse (~3s/req, ~95% hit rate). Re-runs are
#    cache-resumed; only refs without a cache file are fetched.
SEED_CSV=data/catalog-seed-full.csv npm run catalog:scrape-watchbase

# 2. Optionally augment with thewatchapi for the 24 priority brands.
#    Honour the daily budget (see §6).
npm run catalog:fetch-thewatchapi -- --mode=search-refs --top=200 \
  --seed=data/catalog-seed-full.csv

# 3. Merge everything into the enriched JSON. This also computes heat and
#    assigns Layer 1 + Layer 2 prices.
npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json

# 4. Fill in sparse text-only fields from watch_db descriptions.
#    --top here means "highest-heat N", which is exactly the set the UI
#    will surface first. The script is image-aware by default and only
#    extracts for watches that already have a processed image — pass
#    --all-watches to extract ahead of imaging.
npm run catalog:llm-extract -- --top=5000

# 5. Re-enrich so the LLM extracts land in the JSON.
npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json

# 6. Acquire raw images for the next 1000 hottest unimaged watches.
#    Walks the catalog by descending heatScore. Sources in order:
#    watchbase (og:image from cached HTML) → wikimedia.
npm run images:acquire -- --top=1000

# 7. Cut out backgrounds + write the manifest.
npm run images:process

# 8. Push images to Supabase Storage. Idempotent; re-runs only upload
#    files that aren't already in the bucket.
DRY_RUN=1 npm run images:upload-storage
npm run images:upload-storage

# 9. Bump the cache-bust version so browsers refetch.
#    Edit IMAGE_VERSION in lib/watchImages/cacheBust.ts.

# 10. Push catalog rows + market + watch_images to Supabase.
DRY_RUN=1 npm run catalog:seed-full
npm run catalog:seed-full

# 10b. Apply curated collector nicknames so new refs ship searchable by
#      their aliases ("Pepsi", "Batman", "Moonwatch", "Daytona Panda", …).
#      Dictionary: data/catalog-nicknames.json — extend it for any new refs
#      this batch added that have well-known collector names. Re-running is
#      idempotent; entries for refs not in the catalog are skipped silently.
#      Always run AFTER catalog:seed-full (script reads catalog_watches and
#      updates the nickname column). The generated search_text column from
#      migration 023 picks the values up automatically — no other step
#      needed for search to start matching them.
DRY_RUN=1 npm run catalog:enrich-nicknames
npm run catalog:enrich-nicknames

# 11. Commit only what production needs.
git add data/catalog-seed-full.csv \
        data/catalog-nicknames.json \
        public/watch-assets/processed/manifest.json \
        lib/watchImages/cacheBust.ts
git commit -m "catalog: +1000 imaged watches"
```

Expected wall-clock cost: WatchBase scrape dominates (~1h per 1000 new
refs at 3s/req). Image acquisition is ~15min per 1000. LLM extract for
1000 at `gpt-4o-mini` is ≈$0.20.

Misses are written to `data/external/_logs/image-acquire-misses.csv` —
that's the manual review queue.

---

## 3. Playbook — "Refresh prices monthly"

Layer 1 + Layer 2 don't change unless the underlying Kaggle dumps are
refreshed. Layer 3 (CatBoost) should be re-trained whenever the catalog
shape shifts non-trivially (new brands, large new ref batches, etc.).

```bash
# A. If new Kaggle data dropped, replace the file in
#    data/external/kaggle/<archive>/... — the loader picks it up
#    automatically on the next enrich.

# B. Rebuild the enriched JSON. This refreshes:
#      - Layer 1 (direct match from Kaggle listings)
#      - Layer 2 (family-median imputation)
#      - heatScore (uses chrono24 listing counts)
npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json

# C. Retrain CatBoost on the fresh Layer-1 set.
#    Requires: pip3 install catboost pandas numpy scikit-learn
npm run prices:predict

# D. Re-enrich so Layer-3 predictions land in the JSON.
npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json

# E. Ship to Supabase.
DRY_RUN=1 npm run catalog:seed-full
npm run catalog:seed-full
```

Sanity checks before shipping:

- Look at the SHAP feature importance line printed by `prices:predict`.
  Sudden jumps in `brand` vs spec features usually mean data quality
  regressed.
- Spot-check 10 well-known refs (Submariner 124060, Speedmaster 310,
  Royal Oak 15500ST, Nautilus 5711, etc.) — the predictions should land
  within their normal market band.
- `npm run catalog:heat-report` shows the top 30 by heat. If a sleeper
  spikes to rank 1, investigate before pushing.

Layer 4 (live API refresh for the top-heat slice) is documented in
[docs/pricing-model.md](pricing-model.md) §4 but not yet implemented in
the runbook scripts.

---

## 4. Adding a new source to `enrich-catalog.ts`

The merger ([scripts/enrich-catalog.ts](../scripts/enrich-catalog.ts))
is a per-field priority resolver: for each watch, for each field, it
walks `FIELD_PRIORITY[field] ?? DEFAULT_PRIORITY` and keeps the first
non-null candidate. Adding a new source is mechanical.

### Step-by-step

1. **Land the raw data on disk.** New CSV/JSON files go under
   `data/external/<source-name>/...` (kept out of git via the existing
   `data/external/` gitignore). Add the path constant near the top of
   `enrich-catalog.ts` and respect an env override:

   ```ts
   const newSourceCsvPath =
     process.env.NEW_SOURCE_CSV ?? path.join(externalDir, 'newsource', 'data.csv')
   ```

2. **Extend the `FieldSource` union.** Pick a stable string id of the
   form `<provider>:<dataset>` (e.g. `'kaggle:newsource'`,
   `'newsource:api'`). Add it to the union and to `DEFAULT_PRIORITY`
   somewhere appropriate — high if the source is manufacturer-direct,
   low if it's scraped listings.

3. **Write a loader.** Return a `Map<string, NewSourceRecord>` keyed by
   `${normalizeBrand(brand)}::${normalizeReference(ref)}`. Use the
   existing `iterCsvRows()` generator for CSVs. Use the existing
   `parsePrice` / `parseMm` / `parseWaterResistance` / `parseYear` /
   `parsePowerReserve` helpers for the per-cell normalization. **Never
   roll your own number parsers** — they handle edge cases we've already
   debugged (TRY currency, mm vs cm, atm/bar/ft for WR).

4. **Plumb it into the merge.** Inside the per-row loop in
   `buildEnrichedRecord` (or whatever the current main loop is called),
   look up the record by `(brand, ref)` key and push candidates per
   field, e.g.:

   ```ts
   const ns = newsource.get(key)
   if (ns) {
     pushCandidate('caseSizeMm', ns.caseSizeMm, 'newsource:api')
     pushCandidate('waterResistanceM', ns.waterResistanceM, 'newsource:api')
   }
   ```

5. **Decide field-by-field priority.** If the new source should
   _override_ existing sources for a specific field, add an entry in
   `FIELD_PRIORITY` (e.g. `caseSizeMm: ['newsource:api', 'watch_db',
   ...]`). Otherwise it inherits its slot from `DEFAULT_PRIORITY`. Only
   override for fields where the new source is clearly more accurate
   (manufacturer-direct beats listings; listings beat LLM).

6. **Re-run enrich with a small slice** to sanity-check:

   ```bash
   npm run catalog:enrich -- --seed=data/catalog-seed-200.csv \
     --out=data/catalog-enriched.json
   ```

   Eyeball a few records in the output JSON — `provenance.<field>`
   should show `newsource:api` for the fields the new source provided.

7. **For pricing only:** the merger has special logic that treats
   "median across many listings" as a stronger price than a single
   data point. If the new source is listing-based, expose **both** a
   median and a count, and consider whether it should sit above or
   below the existing `kaggle:chrono24-big:median` source in the
   `estimatedValue` priority list.

8. **Run the full pipeline once** and diff the heat-report:

   ```bash
   npm run catalog:enrich -- --seed=data/catalog-seed-full.csv \
     --out=data/catalog-enriched-full.json
   npm run catalog:heat-report
   ```

If you're adding a _scraper_ rather than a static dump, copy the shape
of [scripts/scrape-watchbase.ts](../scripts/scrape-watchbase.ts) —
specifically the disk cache, the `_misses.json` deadletter file, the
3s-with-jitter throttle, and the explicit `User-Agent` with a contact
email. Don't write a scraper without those four pieces.

---

## 5. Data quality / provenance per field

**Provenance is on every field in the enriched JSON.** Every record
carries a `provenance: Record<string, FieldSource>` map. When the app
or a downstream consumer needs to decide "should I trust this
value," look at `provenance[field]` first — never the value alone.

### Source-quality tiers

| Tier | Sources | Trust level | When to display |
|---|---|---|---|
| **A. Manufacturer-direct** | `brand_site`, `watch_db` (35k Kaggle dump with vendor-grade structured columns), `thewatchapi` (free tier — sourced from brand catalogs) | **High** — display as authoritative | Always |
| **B. Curated third-party** | `watchbase` (community-edited spec database, ~95% scrape success) | **High** — display as authoritative | Always |
| **C. Aggregated listings (median/mode)** | `kaggle:chrono24-big:median`, `kaggle:chrono24-big:mode`, `chrono24:scrape`, `kaggle:luxury163k`, `kaggle:luxury508`, `kaggle:sami` | **Medium** — listings can be wrong individually, but the median across many is reliable for case size, price, year, material | Always for price; for specs only when no Tier A/B is available |
| **D. Imputed within catalog** | `family_median:strong` (≥8 priced siblings), `family_median:weak` (2–7), `catboost:predict` | **Low** — these are model-derived. Always tag as "estimate" in UI | Always for `estimatedValue` when bands are shown; never for hard specs |
| **E. LLM extraction** | `llm:extract` | **Low–medium**, _text-only fields only_ (see below) | Always for text/category fields (nickname, bezelType, etc.); never used for numeric specs |
| **F. Cached scrape** | `watchspecs:cache` | **Low** — older HTML scrape, fallback only | Last resort |

### LLM extraction: hard rules

The LLM pass ([scripts/llm-extract-specs.ts](../scripts/llm-extract-specs.ts))
runs `gpt-4o-mini` over the `watch_db.csv` Description field
(~1000 chars per watch) and writes one JSON file per watch under
`data/external/llm-extracts/`. The system prompt is explicit:

- It **only writes fields it can ground in the source text.** Empty
  `{}` is an acceptable response. Hallucinating is the failure mode we
  optimized against.
- It targets a **fixed allowlist** — see `TARGET_FIELDS` in
  `scripts/llm-extract-specs.ts:108`:
  ```
  watchType, nickname, msrpAtLaunchUsd, countryOfOrigin, bezelType,
  caseFinish, lumeColor, claspType, markerType, dialFinish,
  productionStatus
  ```
  These are all text/category fields the rule-based pipeline can't
  recover from structured CSV columns. **Numeric spec fields
  (caseSizeMm, thicknessMm, waterResistanceM, lugWidthMm,
  powerReserveHours, frequencyVph, jewelCount, year*) are not in this
  list and the LLM never touches them.** If you need to add a new
  numeric field, do _not_ add it to the LLM allowlist — find a
  manufacturer or listings source instead.
- It **only fills fields that are already `null` after Tiers A–C ran.**
  The `shouldExtract()` gate in the script enforces this. LLM output
  never overrides a Tier A/B/C value.
- `msrpAtLaunchUsd` is the one numeric exception, and the prompt
  explicitly forbids guessing — only when the text states a launch
  price.

### Per-field summary

| Field | Primary sources | Notes |
|---|---|---|
| `brand`, `model`, `reference` | Seed CSV (identity, never overwritten) | Canonical id derived in `lib/catalogId.ts` |
| `caseSizeMm` | `watch_db` → `thewatchapi` → `watchbase` → Kaggle listings median | LLM not used. Numeric, manufacturer-grade preferred |
| `thicknessMm` | `watch_db` → `watchbase` → `kaggle:luxury508` | LLM not used |
| `lugWidthMm` | `kaggle:luxury508` (only set with explicit Band Width column) → `watchbase` → `brand_site` | LLM not used |
| `waterResistanceM` | `watch_db` → `watchbase` → `kaggle:luxury508` → `kaggle:sami` | LLM allowed as last resort but in practice the structured sources fill ~all of catalog |
| `caseMaterial`, `dialColor`, `crystalMaterial`, `bezelMaterial` | `watch_db` → `watchbase` → Kaggle listings mode | LLM not used (we have structured cols everywhere) |
| `movement`, `caliber`, `movementType`, `powerReserveHours`, `frequencyVph`, `jewelCount` | `watch_db` → `watchbase` → `thewatchapi` | LLM not used for the numeric ones |
| `complications` | `watch_db` → `watchbase` → `kaggle:luxury508` | Multi-valued; merged not overwritten |
| `yearIntroduced`, `yearDiscontinued` | `watch_db` → `watchbase` → `thewatchapi` → `kaggle:chrono24-big:mode` | LLM not used |
| `watchType` | Seed CSV (heuristic in `expand-from-watchdb`) → LLM extract | Single category enum |
| `nickname`, `bezelType`, `caseFinish`, `dialFinish`, `lumeColor`, `claspType`, `markerType`, `countryOfOrigin`, `productionStatus` | LLM extract only (after structured pass yields null) | **All text-only; sparse fields the structured data doesn't cover** |
| `msrpAtLaunchUsd` | `watch_db` → LLM extract (only with explicit text evidence) | Numeric LLM exception |
| `estimatedValue` / `Low` / `High` / `valueLayer` / `valueConfidence` | Layer 1 (Kaggle listings) → Layer 2 (family median) → Layer 3 (CatBoost) | See [pricing-model.md](pricing-model.md) |
| `heatScore`, `popularityRank` | Computed by `scripts/heat-score.ts` after merge | Inputs: brand tier, market activity (chrono24 + luxury163k listing counts), curation signal, source corroboration, nickname bonus |

### Sources we never make up data from

Three explicit no-go's:

1. **Don't add a "best guess" or "AI-completed" field to any source.**
   Every spec value must be traceable to a real document or listing.
2. **The LLM never fills numeric specs.** Period. Numeric fields fall
   through to `null` if the structured sources can't find them.
3. **Don't bypass `FIELD_PRIORITY`.** If you find yourself wanting to
   "just override this once," fix the priority list instead. Every
   ad-hoc override becomes someone else's mystery later.

---

## 6. `thewatchapi` free-tier quota

- **Limit:** 25 calls per day on the free tier.
- The fetcher tracks usage in
  `data/external/thewatchapi-cache/_quota.json`. Re-running the same day
  is safe — it stops when the budget is hit. Re-running on a later day
  resumes naturally.
- Every successful response is cached to disk; re-fetching a cached ref
  costs nothing. Use `--force` to bypass the cache (rarely needed).
- `--mode=list-brands` is **1 call** and unlocks the brand list for
  later runs.
- `--mode=list-refs --brands=Rolex,Omega` costs **1 call per brand**
  but returns a list of refs (sometimes hundreds) that future
  `search-refs` runs can dedupe against, so it's the most leveraged
  use of the daily budget.
- `--mode=search-refs --top=N` costs **up to N calls** (one per ref
  not already cached). Pick N ≤ remaining budget; the script will stop
  early if it runs out.

Upgrading to the Standard plan ($19–49/mo) unlocks
`/reference/price/history` for Layer 4 live-price refresh. See
[pricing-model.md](pricing-model.md) §4.

If you're scripting a cron job, **don't** schedule a fixed budget per
day — let the quota file gate it and run `npm run
catalog:fetch-thewatchapi -- --mode=search-refs --top=25` so any
already-cached refs are free and the script naturally tapers.

---

## 7. Sanity checks before shipping

After any non-trivial catalog change:

```bash
# 1. Build must pass — production is statically pre-rendered.
npm run build

# 2. Heat report — eyeball the top 30 for surprises.
npm run catalog:heat-report

# 3. Spot-check provenance for a sample of records.
node -e "const d=require('./data/catalog-enriched-full.json'); \
  const sample=d.records.filter(r=>r.brand==='Rolex').slice(0,5); \
  sample.forEach(r=>console.log(r.id, r.provenance))"

# 4. If you touched the seed script, re-run catalog:seed-report.
npm run catalog:seed-report
```

The build matters because `lib/watches.ts` reads
`public/watch-assets/processed/manifest.json` at module-load time —
any malformed manifest entry will surface at build, not at runtime.
