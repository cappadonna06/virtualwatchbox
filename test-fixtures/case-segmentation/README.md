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
| `cartier-tank-mc-navy-strap.webp` | Cartier Tank MC, navy alligator strap | rectangular case (brancards) | User-provided rectangular-case fixture — the rounded-rect model's reason to exist. Straight sides that a trimmed circle fit will happily mis-explain (a=213/rms 7.8 → model competition lets the rect win at mad 2), a strap that ROLLS OVER the flat top edge (boundary ~39 rows outside the corner row) while the bottom rail sits ~55 rows inside it (asymmetric search window), a navy strap over a BLUE dial (the veto margin must stop short of the dial or it vetoes itself), and a blue-cabochon crown. Also the origin of the "lugs never have holes" rule: the channel floor cut through the brancard's inner face where it overlaps the channel-edge columns, carving a gouge — now prevented by `solidifyCaseMaskPng` and asserted by the realtest's connectivity invariants on every fixture. Later (second review round) the origin of the CASE-FIRST rect model: the strap here is nearly case-wide and OVERLAPS the brancards, whose polished faces carry near-black reflection bands — the per-pixel color veto read that dark metal as "strap" and carved visible lug metal (asymmetric, jagged), while its uncertain zones left strap stubble and floating band bits. The rect mask now has NO veto: per column, a METAL WALK anchored at the case's vertical middle keeps the rails to their natural silhouette ends (crossing dark metal, stopping only at decisive lit strap color or transparency, claims audited against strap-pixel ratio and median-9 smoothed so a strap's bright edge filament can't hold one), and the snapped floors alone rule the channel. Also why the floor's no-boundary fallback with a prior is "deepest reach", not the prior line — the rect prior rows are the RAIL ends, and falling back to them kept a full-height strap sliver. |
| `longines-master-brown-strap.webp` | Longines Master Collection, brown alligator strap | drilled-lug, leather strap | User-provided "easy" round case that broke three assumptions at once. (1) The strap ends INSIDE the frame (deployant product shot) — its rounded end collapses the span over ~20 rows, drops that dwarf the softly-tapered lugs' own, so the tip scan found "lug tips" at the strap's end; tips now require persistent strap beyond them (`findLugZone`'s persists rule, also a synthetic selftest spec). (2) The strap is three-tone — dark shadowed grain, lit grain, pale tan cut edge — and the tan measures d≈223 from the median strap color, i.e. "case" to any distance test, which left a 10-row tan band hanging under the tips; the albedo-line model (one material under varying light spans a ray through the RGB origin) classifies all three tones as strap while steel sits decisively off the line. (3) The strap's near-white painted edge coat IS colorimetrically polished steel — only geometry cuts it: a round case can't extend past its own fitted circle, so the color-mode floor's outward search is clamped to the fit's rms. Also the motivation for the deep inward color-mode window (this bezel edge sits ~0.09a inside the side-profile radius, past the old 0.06a reach) and for color-mode floors standing in for soft tip evidence in confidence. |

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
