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
| `tudor-bb58-gmt-pepsi.webp` | Tudor Black Bay GMT ("Pepsi"), steel oyster bracelet | drilled-lug, metal bracelet | User-provided hard case — a steel bracelet's end-links flare gradually across several links before reaching the lugs, unlike a two-piece strap's short, sharp junction. Steel-on-steel means the channel floor must come from the TEXTURE-mode gradient-cluster walk (color can't separate end-link from bezel), and its serrated coin-edge bezel ring is the canonical "don't eat the ring" regression. |
| `iwc-portugieser-chrono-navy-strap.webp` | IWC Portugieser Chronograph, navy alligator strap | drilled-lug, leather strap | User-provided color-mode case: dark strap against a steel case drives the COLOR-mode channel floor + per-pixel strap veto. Also hard in two other ways — chrono pushers + crown are three fit outliers on one side, and the top strap is *wider than the lug span*, so the lug tips are only findable because the tip scan is confined beyond the case cap (an unconstrained scan "found" the tips at the top pusher's shoulder and chopped the whole cap off). The channel strap sits in deep lug shadow (near-black), which is why the veto thresholds scale to the measured strap↔case contrast instead of absolute values. |
| `cartier-tank-mc-navy-strap.webp` | Cartier Tank MC, navy alligator strap | rectangular case (brancards) | User-provided rectangular-case fixture — the rounded-rect model's reason to exist. Straight sides that a trimmed circle fit will happily mis-explain (a=213/rms 7.8 → model competition lets the rect win at mad 2), a strap that ROLLS OVER the flat top edge (boundary ~39 rows outside the corner row) while the bottom rail sits ~55 rows inside it (asymmetric search window), a navy strap over a BLUE dial (the veto margin must stop short of the dial or it vetoes itself), and a blue-cabochon crown. Also the origin of the "lugs never have holes" rule: the channel floor cut through the brancard's inner face where it overlaps the channel-edge columns, carving a gouge — now prevented by `solidifyCaseMaskPng` and asserted by the realtest's connectivity invariants on every fixture. |

## Reference imagery (ground-truth standards, not test inputs)

| File | What it shows |
|---|---|
| `reference/tudor-bb58-gmt-channel-groundtruth.jpeg` | User-provided zoom of the curated BB58 GMT case-only render's top strap channel — the visual standard the mask must reproduce: the bezel's serrated coin-edge ring IS the case boundary between the lugs (nothing survives outside it), the channel floor follows that curved edge, and the lug inner faces bound it on the sides. The full curated case-only renders live in Supabase Storage (`watch-images/<id>/case-only.png`, ids in `data/case-only-images.json`); this crop is committed so the standard is reviewable without Storage access. |

## Adding a new fixture

1. Confirm it already has a genuinely transparent background (check with
   `sharp(...).ensureAlpha().raw()` and sample corner-pixel alpha — don't
   assume `hasAlpha: true` means the background is actually transparent).
2. Keep it small — a few hundred KB at most, resized/re-encoded as webp if the
   original is large.
3. Add a row to the table above with what makes it a useful/hard case.
4. Add it to `FIXTURES` in `scripts/segment-watch-cases.realtest.ts`.
