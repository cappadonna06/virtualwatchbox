# Case segmentation test fixtures

Real watch photos, committed as small (~80KB) algorithm-validation fixtures for
`scripts/segment-watch-cases.realtest.ts` — **not** part of the production
catalog image pipeline.

This is a deliberate exception to the project's usual rule ("never commit
processed watch photos — Supabase Storage is the source of truth," see
`docs/WATCH_IMAGE_PIPELINE.md`). These images aren't catalog assets; they're
fixed inputs for regression-testing the case/strap boundary detector
(`lib/caseSegmentation.ts`) against real photos rather than only synthetic
silhouettes. Unlike the synthetic self-test
(`scripts/segment-watch-cases.selftest.ts`), there's no exact analytic ground
truth for a real photo — the realtest script only sanity-checks the output and
writes annotated images for a human to eyeball, to `output/` (gitignored).

## Fixtures

| File | Watch | Attachment | Notes |
|---|---|---|---|
| `tudor-bb58-gmt-pepsi.webp` | Tudor Black Bay GMT ("Pepsi"), steel oyster bracelet | drilled-lug, metal bracelet | User-provided hard case — a steel bracelet's end-links flare gradually across several links before reaching the lugs, unlike a two-piece strap's short, sharp junction. This is what drove `GeometricSilhouetteProvider`'s `hint.braceletType`-based window sizing (see its doc comment). |

## Adding a new fixture

1. Confirm it already has a genuinely transparent background (check with
   `sharp(...).ensureAlpha().raw()` and sample corner-pixel alpha — don't
   assume `hasAlpha: true` means the background is actually transparent).
2. Keep it small — a few hundred KB at most, resized/re-encoded as webp if the
   original is large.
3. Add a row to the table above with what makes it a useful/hard case.
4. Add it to `FIXTURES` in `scripts/segment-watch-cases.realtest.ts`.
