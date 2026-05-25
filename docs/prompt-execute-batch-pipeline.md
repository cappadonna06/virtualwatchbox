# Prompt: Execute Catalog Batch Pipeline

Copy this prompt into a local Claude Code session (with Supabase credentials in `.env.local`) to run the runbook for batches 2, 3, and 4.

---

## Prompt

```
I need to run the catalog pipeline (docs/runbook.md §2) for three new seed CSVs:

- data/catalog-seed-batch-2.csv (990 watches — luxury brands, newer models)
- data/catalog-seed-batch-3.csv (870 watches — mid-tier/entry brands)
- data/catalog-seed-batch-4.csv (257 watches — gap-fill: missing houses, thin brands, 2024-2025 releases)

Total: ~2,117 new references to enrich, image, and seed to Supabase.

Before starting, pull the latest from branch `claude/add-watches-database-z4z9L` which has all three seed files.

### Prerequisites
Confirm these exist in `.env.local`:
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `THE_WATCH_API_TOKEN` (optional, for thewatchapi augmentation)

### Pipeline Steps

Run these for EACH batch CSV. Do them sequentially (batch-2 first, then 3, then 4) since they share the enrichment and image pipelines. Use the `SEED_CSV` env var to point at each file.

#### Step 1: Scrape WatchBase specs (~3s/req, cache-resumable)
```bash
SEED_CSV=data/catalog-seed-batch-2.csv npm run catalog:scrape-watchbase
SEED_CSV=data/catalog-seed-batch-3.csv npm run catalog:scrape-watchbase
SEED_CSV=data/catalog-seed-batch-4.csv npm run catalog:scrape-watchbase
```
Expected: ~35min per 1000 refs. Cached — re-runs skip already-fetched refs.

#### Step 2: (Optional) TheWatchAPI augmentation
Only if THE_WATCH_API_TOKEN is set. Budget-limited to 25/day on free tier.
```bash
npm run catalog:fetch-thewatchapi -- --mode=list-refs \
  --brands=Rolex,Omega,Tudor,IWC,Longines,Sinn,Seiko,Tissot,Hamilton,Casio,Orient,Citizen
```

#### Step 3: Merge and enrich all sources
Run once after all scraping is done. This merges WatchBase + thewatchapi + Kaggle data and computes heat scores.
```bash
# First, combine all seed CSVs into catalog-seed-full.csv
# The expand-from-watchdb script does this if watch_db.csv exists,
# otherwise concatenate manually:
cat data/catalog-batch-1.csv > data/catalog-seed-full.csv
tail -n +2 data/catalog-seed-batch-2.csv >> data/catalog-seed-full.csv
tail -n +2 data/catalog-seed-batch-3.csv >> data/catalog-seed-full.csv
tail -n +2 data/catalog-seed-batch-4.csv >> data/catalog-seed-full.csv

# If watch_db.csv exists in data/external/kaggle/, run:
# npm run catalog:expand-from-watchdb

npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json
```

#### Step 4: LLM extract sparse text fields
Fills nickname, bezelType, watchType, etc. from descriptions. ~$0.20/1000 watches at gpt-4o-mini.
```bash
npm run catalog:llm-extract -- --top=5000
```

#### Step 5: Re-enrich so LLM extracts land
```bash
npm run catalog:enrich -- \
  --seed=data/catalog-seed-full.csv \
  --out=data/catalog-enriched-full.json
```

#### Step 6: Acquire raw images for the top unimaged watches
```bash
npm run images:acquire -- --top=2000
```

#### Step 7: Process images (background removal, cutout)
```bash
npm run images:process
```

#### Step 8: Upload processed images to Supabase Storage
```bash
DRY_RUN=1 npm run images:upload-storage
# Review output, then:
npm run images:upload-storage
```

#### Step 9: Bump cache-bust version
Edit `IMAGE_VERSION` in `lib/watchImages/cacheBust.ts` (increment by 1).

#### Step 10: Push catalog to Supabase
```bash
DRY_RUN=1 npm run catalog:seed-full
# Review output, then:
npm run catalog:seed-full
```

#### Step 10b: Apply collector nicknames
```bash
DRY_RUN=1 npm run catalog:enrich-nicknames
npm run catalog:enrich-nicknames
```

#### Step 11: Recompute heat scores
```bash
npm run catalog:recompute-heat
npm run catalog:sync-heat
npm run catalog:heat-report
```

#### Step 12: Commit
```bash
git add data/catalog-seed-full.csv \
        data/catalog-nicknames.json \
        public/watch-assets/processed/manifest.json \
        lib/watchImages/cacheBust.ts
git commit -m "catalog: +2117 watches (batches 2-4)"
```

#### Step 13: Verify
```bash
npm run build
npm run catalog:heat-report
```

### What to watch for
- WatchBase misses go to `data/external/_logs/image-acquire-misses.csv` — review for manual image sourcing
- Microbrands (Halios, Kurono, Serica, Studio Underd0g) and Richard Mille/MB&F/F.P. Journe will likely have low WatchBase hit rates — they may need manual spec entry or alternative sources
- The Casio refs use model numbers not traditional references — WatchBase coverage may be spotty for G-Shock
- Heat report: eyeball the top 30 for surprises before pushing to prod
```
