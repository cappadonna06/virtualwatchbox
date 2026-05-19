# Pricing Model

Layered system that gives every watch in the catalog an `estimatedValue`,
optional low/high band, `valueLayer`, and `valueConfidence`. Output goes
into `data/catalog-enriched-full.json` and then into
`public.catalog_watch_market.market_value_usd` at seed time.

## Why layered

Watch prices come from heterogeneous sources with very different quality.
A single "price" field would either ignore the long tail (no price for
60%+ of catalog) or pretend ML predictions are the same as observed market
data. The layered system makes the source explicit per row.

---

## The four layers

### Layer 1 — Direct market match (current state)

For each `(brand, reference)` pair, we look up listing data across multiple
Kaggle datasets:
- `archive/Watches.csv` — 533K Chrono24-style listings (`kaggle:chrono24-big:median`)
- `archive4/watch_data.csv` — 163K ref-keyed catalog (`kaggle:luxury163k`)
- `archive1/Luxury watch.csv` — 508 curated (`kaggle:luxury508`)
- `archive3/samiwatches.csv` — 1.7K Turkish luxury (`kaggle:sami`)

When a ref has direct listings, we take the median across listings and
assign:
- `valueLayer = 'direct'`
- `valueConfidence = 'high'` if N≥10 listings, `'medium'` if 3-9, `'low'` if 1-2
- `valueSource` = which dataset contributed

Coverage today: **~34%** of catalog rows (12,200 watches).

### Layer 2 — Similar-family median (pure JS, runs in `catalog:enrich`)

For each row without a Layer-1 price, group all directly-priced rows by
`(brand, modelFamily)` and take the median.

Intuition: variant pricing within a watch family is usually tight
(e.g., all Royal Oak 15500ST dial variants ≈ same price). A model family
typically has many references in the catalog; if 8+ of them have
Layer-1 prices, the median is a reliable estimate for the rest.

- `valueLayer = 'family_median'`
- `valueConfidence = 'medium'` if family has ≥8 priced siblings, `'low'` if 2-7
- `valueSource = 'family_median:strong'` or `'family_median:weak'`
- Band: P25 / P75 of the family's priced siblings (gives a real range)

Coverage gain: **+47 points** (34% → 81% in current data).

### Layer 3 — CatBoost prediction (Python, runs via `prices:predict`)

Trains a CatBoost gradient-boosting regressor on the Layer-1 direct-match
rows. Predicts `log10(price)` for every watch in the catalog, then we
ingest those predictions for any row still missing a price after Layers 1
and 2.

Features (mix of categorical + numeric):
- **Categorical:** brand, modelFamily, caseMaterial, braceletType,
  movementType, productionStatus, watchType, crystalMaterial, bezelMaterial
- **Numeric:** caseSizeMm, thicknessMm, waterResistanceM, yearIntroduced,
  jewelCount, frequencyVph, complicationCount, limitedEditionCount,
  heatScore

Validation: 80/20 split on the Layer-1 training set, target log10(price).
RMSE on log10 typically ~0.15-0.20 — that's predictions within ~1.5-1.6x
of true price on the test set. Good enough for "in the right ballpark"
catalog display, not for transactional valuations.

- `valueLayer = 'catboost'`
- `valueConfidence = 'low'` (always — these are imputations)
- `valueSource = 'catboost:predict'`
- Band: `price / sqrt(typical_error_factor)` and `price * sqrt(typical_error_factor)`

Coverage gain after Layer 3: typically reaches **95%+** of catalog.

Output: `data/external/predicted-prices.json` (gitignored).

### Layer 4 — Live API refresh (future, paid)

Optional refresh layer for the top-heat watches where we want live market
data:
- **thewatchapi Standard plan** ($19-49/mo): adds the `/reference/price/history`
  endpoints. Run weekly for the top ~500 by heatScore.
- **Apify Chrono24 actor** ($5 per 1K rows): one-shot scrape for live
  listings. Use quarterly to refresh top-heat watches.
- **WatchCharts API** (private partnership): another option if we get
  access.

When implemented, Layer 4 would write to a separate
`catalog_watch_market.history` row with `valueSource = 'thewatchapi:live'`
or `'chrono24:scrape:live'`, and `valueConfidence = 'high'` for the
current snapshot. The enrich step would prefer Layer 4 over all other
layers when present and not stale (e.g., <30 days old).

---

## When to refresh

| Layer | Refresh cadence | Trigger |
|---|---|---|
| Layer 1 | When new Kaggle data drops | Manual |
| Layer 2 | Every `catalog:enrich` run | Automatic |
| Layer 3 | Monthly, or after large data changes | Manual via `npm run prices:predict` |
| Layer 4 | Weekly for top 500, quarterly for top 5K | Cron job (future) |

---

## Running the pipeline

```bash
# Layer 1 + Layer 2 + ingest Layer 3 predictions if present
npm run catalog:enrich

# Layer 3 — train CatBoost and write predicted-prices.json
# Requires: pip3 install catboost pandas numpy scikit-learn
npm run prices:predict

# Then re-run enrich to ingest the new predictions
npm run catalog:enrich
```

The Python script writes to `data/external/predicted-prices.json` which the
enrich step picks up automatically. Re-runs are idempotent.

---

## Schema mapping

The enriched record has these pricing fields:
```ts
{
  estimatedValue: number | null         // The chosen value across layers
  estimatedValueLow: number | null      // Lower band (P25 / pred/sqrt(err))
  estimatedValueHigh: number | null     // Upper band (P75 / pred*sqrt(err))
  valueLayer: 'direct' | 'family_median' | 'catboost' | null
  valueConfidence: 'high' | 'medium' | 'low' | null
  provenance.estimatedValue: FieldSource   // Specific source within the layer
}
```

At seed time these map to `public.catalog_watch_market`:
- `market_value_usd` ← estimatedValue
- `market_value_low_usd` ← estimatedValueLow
- `market_value_high_usd` ← estimatedValueHigh
- `value_source` ← valueLayer concat valueSource (e.g. `direct:kaggle:chrono24-big`)
- `value_confidence` ← valueConfidence

The app reads from `catalog_watch_market` and shows the bands + a
confidence indicator in the sidebar.

---

## Quality guardrails

- Train set = Layer-1 rows only. Layer 2 + Layer 3 are NEVER used as
  training data (would compound errors).
- Predictions are capped to plausible range ($50 - $10M). Outliers dropped.
- Brand coverage check: if a brand has <5 training rows, predictions get
  `valueConfidence='low'` regardless.
- Periodic regression test: compare new model's predictions vs old model's
  on a holdout of well-known refs (Submariner, Speedy, etc.). Track drift.
- The SHAP feature importance is logged on every run — watch for sudden
  shifts that indicate data quality issues.
