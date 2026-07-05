# Case Segmentation Strategy v2

**Status:** tier-0 (geometric) and tier-1 (Claude vision) providers implemented,
unit-validated on synthetic data (`npm run straps:segment-cases:selftest`), and
smoke-tested against one real photo (`npm run straps:segment-cases:realtest`)
— see "Real-photo validation" below for what that test found and fixed. Not
yet run against the real catalog batch or with a live `ANTHROPIC_API_KEY` —
see "What's still required."

---

## What the Delugs reference actually shows

The reference video (Delugs.com's Omega Speedmaster strap gallery) is a
screen recording of their product page scrolling through 8 strap colorways —
studio photography of the same watch head with the strap swapped, shot
per-SKU. That's the tell: **Delugs achieves photographic quality because they
shoot real product photography of each strap on a specific watch model**, not
because they solved automated case/strap segmentation. Their integrated
straps are literally molded for named watch models (Omega Speedmaster, Rolex
Sub, etc.) — a few dozen watch models, each photographed once per strap. That
doesn't generalize to a 40k-SKU catalog where every watch needs to accept
every strap automatically. Virtual Watchbox's problem — arbitrary catalog
watch × arbitrary strap, generated automatically — is a genuinely different
and harder problem than what the reference demonstrates. This doc is about
solving *that* problem, not replicating Delugs' production pipeline.

## The core reframing

The previous plan (`strap-studio-mvp.md` Phase 1) treated this as a generic ML
segmentation problem: send the full watch photo to SAM/grounded-SAM, get a
mask back. That path was never actually exercised — no `REPLICATE_API_TOKEN`
was ever configured in this project, so it produced zero real segmentations
beyond 3 hand-curated 3D-render ingests.

The reframing: **catalog photos already have clean transparent backgrounds.**
The hard part was never "find the watch" — it's "find where the case ends and
the strap begins" *within a silhouette we already have*. That's a boundary-
detection problem, not a segmentation problem, and it can exploit a real
regularity in the data: catalog photos are shot consistently top-down, so a
watch's silhouette traces a **narrow (strap) → wide (case) → narrow (strap)**
width profile from top to bottom. The case/strap boundary is where that
profile transitions.

This is implemented as `GeometricSilhouetteProvider` in
[`lib/caseSegmentation.ts`](../../lib/caseSegmentation.ts):

1. Compute the per-row opaque-pixel span width (leftmost to rightmost opaque
   x) for every row of the full watch silhouette.
2. Find the widest row (the case's own diameter) and scan outward in both
   directions for the steepest width drop over a small row window — a round
   case's width profile has its steepest slope right at the true case edge,
   so this lands close to the real lug line even though the exact "% of max
   width" a case tapers at varies by design.
3. Confidence is the drop's size relative to the case's own max width. A
   flat profile (integrated bracelet — Royal Oak, Nautilus) has **no** sharp
   drop by construction — that's the correct signal to escalate or skip, not
   a bug in the detector.
4. The cut line is biased a couple of px into the case (never into the
   strap) — the new strap layers *behind* the case at that exact row, so any
   residual strap pixel above the cut would show as a visible remnant; a
   slightly short case edge is imperceptible at render scale.

This runs with **zero external API calls and zero marginal cost per image** —
it's pure pixel math on data already in Storage. Validated against synthetic
"capsule" silhouettes (flat bezel body + short elliptical lug taper, fused to
a strap band with no artificial gap — modeling exactly how a real product
photo looks, where the strap visually plugs into the case) in
`scripts/segment-watch-cases.selftest.ts`. Run it with:

```
npm run straps:segment-cases:selftest
```

## Real-photo validation

A real photo — a Tudor Black Bay GMT ("Pepsi") on a steel oyster bracelet,
committed at `test-fixtures/case-segmentation/tudor-bb58-gmt-pepsi.webp`
(see that directory's README for why this is a deliberate, narrow exception to
the "never commit processed watch photos" rule) — surfaced a real gap the
synthetic capsule model didn't cover: **a two-piece leather/rubber strap meets
the case in a short, sharp junction, but a metal bracelet's end-links flare
gradually across several links before reaching the lugs.** The original
window size (tuned only against a short-taper capsule model) undershot the
true case boundary by ~25px on this photo — visibly chopping into the bezel.

Fix: `GeometricSilhouetteProvider.segmentCase()` now takes a
`hint.braceletType` and widens its detection window when the hint isn't
`'strap'` — which includes the catalog's most common convention, an *unset*
`bracelet_type` meaning "plain metal bracelet" (2,491 of ~4.1k imaged
watches), not "unknown." This fix also caught a real bug: the `'auto'`
orchestrator (`segmentAuto` in `scripts/segment-watch-cases.ts`) was never
actually passing the catalog hint through to the geometric tier at all — it
only reached providers on the non-default `--provider=` path. Fixed; the
synthetic self-test now covers both attachment families explicitly (short-cap
"strap" specs with `hint.braceletType='strap'`, long-cap "bracelet" specs with
no hint), and `scripts/segment-watch-cases.realtest.ts` runs the same
provider against the committed real photo and writes annotated + case-only
PNGs to `test-fixtures/case-segmentation/output/` (gitignored) for visual
review — there's no exact pixel ground truth for a real photo the way there is
for a synthetic one, so that script sanity-checks shape rather than exact
position.

After the fix, the Tudor photo's confidence rose from 0.448 → 0.496 — still
correctly below both the escalation (0.7) and needs-review (0.55) thresholds.
That's the right outcome, not a shortfall to chase further: this is a
genuinely ambiguous case (gradual multi-link taper has no single "correct"
row the way a sharp strap junction does), and the honest behavior is
escalating to Claude vision or a human dragging the four lug markers in
`/admin/image-review` → Case Segmentation, not an over-confident automated
guess. One real photo is one data point — expect further constant tuning once
more real photos (ideally a batch across bracelet styles: oyster, jubilee,
mesh, two-piece leather, rubber, NATO) go through it.

## Integrated bracelets: skip outright, don't just wait for low confidence

The escalation tier exists to classify *ambiguous* cases (a metal bracelet
photographed at an odd angle, an unusual case shape) — it is deliberately
**not** the mechanism for handling watches the catalog already knows are
integrated-bracelet designs (Royal Oak, Nautilus). Those are skipped before
any provider ever runs (`runSegment` checks `catalogMeta.braceletType ===
'integrated'` first). The Claude tier can still independently discover
`strap_attachment: 'integrated'` on a watch the catalog *didn't* flag — a
catalog data gap, not a segmentation failure — and the pipeline treats that
identically to the upfront skip: no case-only image gets uploaded, and the
classification is written back to `catalog_watches.strap_attachment_type` so
the next run skips it before calling a provider at all.

This distinction matters on the UI side too: integrated-bracelet watches
aren't just missing a cutout (the side-by-side fallback, meant for watches
pending processing) — they're never Studio-eligible, because the bracelet
*is* the case design. All three documented entry points already gated this
(`WatchSidebar`, the watch detail page, `StrapSidebar`'s compatibility
engine), but the in-Studio watch picker (`WatchPickerDropdown`'s "My
Watches"/"Browse Catalog" lists) didn't — you could reach an integrated watch
by switching to it from inside the Studio. Fixed: `useStudioController`
exposes `isIntegrated(id)`, and both picker lists filter it out.

## Three tiers, escalate only when needed

| Tier | Provider | Cost | When |
|---|---|---|---|
| 0 | `GeometricSilhouetteProvider` | free | every candidate, first |
| 1 | `ClaudeVisionLandmarkProvider` | 1 vision call | tier 0 confidence < `SEGMENT_CONFIDENCE_ESCALATE` (default 0.7) |
| 2 | `ReplicateSamProvider` | 1 Replicate prediction | manual `--provider=replicate`, rare residual cases (e.g. open-link mesh bracelets that break the width-profile heuristic) |

Tier 1 matters because it's not "a better segmentation model" — it's a model
that *understands what a watch lug is*. Grounded-SAM et al. need a text
prompt and have no domain concept of "watch case vs. strap"; Claude's vision
API is asked to directly report the four lug landmark points as structured
tool output (`report_case_geometry` in `ClaudeVisionLandmarkProvider`),
which sidesteps the mask-to-geometry step entirely and reasons semantically
about the photo rather than classifying pixels.

The orchestrator (`segmentAuto` in `scripts/segment-watch-cases.ts`) runs
tier 0 for free on every watch and only pays for tier 1 on the confidence
residue — cost scales with how many watches are genuinely ambiguous, not with
catalog size.

## Watches that should never get a cutout

`bracelet_type: 'integrated'` (607 of the ~4.1k imaged catalog, per
`data/catalog-live-imaged.json`) — Royal Oak / Nautilus-style designs where
the bracelet visually flows into the case with no drilled lug — are **skipped
outright**, not segmentation failures to retry. The Studio's own product
design already keeps these side-by-side rather than composited (see
`docs/playbooks/strap-studio-mvp.md` and `lib/strapStudio.ts`'s composite/
side-by-side split), so attempting a cutout would fight the product, not
solve a segmentation shortfall. The pipeline marks these
`segmentation_status = 'not_applicable'` (migration 034) so they never show
up as unresolved review-queue items.

## New data sources worth adding (not yet built)

1. **Case-family clustering to multiply review budget.** `--by model-family`
   groups a batch by (brand, model_family, bracelet_type) so an admin review
   pass reads as "one case family at a time" — if a whole family shares a
   failure mode (e.g. every Milanese-mesh Aqua Terra scores low confidence),
   that's obvious immediately instead of buried in a heat-score shuffle. This
   is a batching/reporting optimization today, not automatic geometry reuse —
   a legitimate next step would be a consensus rule (auto-approve a cluster
   member once K siblings independently clear a confidence bar), which needs
   real batch data to calibrate before it's worth building.
2. **Brand press kits for the highest-heat SKUs.** Rolex, Omega, Tudor, IWC,
   AP, and Patek all publish press-kit photography, and some technical/
   editorial imagery shows the case alone. For the top ~100-300 SKUs by heat
   score, sourcing a real case-only press image has a zero-segmentation-error
   ceiling that no automated pipeline can match — worth a manual pass
   alongside the automated batch, not instead of it.
3. **`case_shape` / `strap_attachment_type` as first-class catalog columns**
   (migration 034, `catalog_watches`). Cheap classification the pipeline
   derives (`strapAttachment: 'drilled_lug' | 'unknown'` from the geometric
   tier, or the full enum from Claude) so future routing and admin triage
   don't need to decode the `lug_geometry` jsonb blob.

## What's still required (this session couldn't do it)

This session ran in a sandboxed environment whose egress policy blocks
Supabase Storage and the Replicate/Anthropic APIs directly (only
`anthropic.com`/`registry.npmjs.org`/a short allowlist are reachable) — so
neither the Claude vision tier nor a real catalog batch could be exercised
here. What *could* be validated: the geometric tier's pure pixel logic, both
against synthetic silhouettes (exact ground truth) and one real user-provided
photo (visual review only — see "Real-photo validation" above). Before
trusting this at scale:

1. **Run the real batch.** `npm run straps:segment-cases -- --top 100 --by model-family`
   against the actual `data/catalog-heat-scores.json` top-100, with
   `ANTHROPIC_API_KEY` set for tier-1 escalation. Confirm the confidence
   thresholds (`SEGMENT_CONFIDENCE_ESCALATE=0.7`, `SEGMENT_AUTO_APPROVE=0.9`)
   land where expected on real photos — they were tuned against synthetic
   "capsule" shapes, which is a good proxy but not a substitute for real
   data. Expect to retune the width-profile constants
   (`detectCaseBand`'s `0.72` case-threshold-adjacent constants, the
   steepest-window size) once real confidence/accuracy numbers come back.
2. **Review the results** in `/admin/image-review` → **Case Segmentation**
   (built this session — `components/admin/CaseSegmentationReview.tsx`,
   `app/api/admin/case-segmentation/route.ts`). Drag the four lug markers to
   correct any cutout, approve/reject/flag for review.
3. **Sync corrections back to the committed bridge**: `npm run straps:sync-bridge`
   pulls the reviewed state from Supabase into `data/case-only-images.json`
   (mirrors the existing `catalog:sync-heat` / `catalog:export-live` pattern —
   Supabase is the source of truth, the JSON is a committed mirror the client
   reads at module-load).
4. **Apply migration 034** (`supabase/migrations/034_case_segmentation_v2.sql`)
   before running any of the above — it adds the `not_applicable` /
   `needs_review` / `rejected` status vocabulary and the `case_shape` /
   `strap_attachment_type` catalog columns the new code writes to.
