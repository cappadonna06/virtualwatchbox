# Case Segmentation Strategy v2

**Status:** tier-0 (geometric) and tier-1 (Claude vision) providers implemented,
unit-validated on synthetic data (`npm run straps:segment-cases:selftest`), and
smoke-tested against real photos (`npm run straps:segment-cases:realtest`) —
see "Real-photo validation" and "How the mask design got here" below for what
those tests found and fixed — three successive mask designs each broke against
a real photo in a way no synthetic test had caught, and each failure is now a
permanent regression probe. Not yet run against the real catalog batch or
with a live `ANTHROPIC_API_KEY` — see "What's still required."

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
[`lib/caseSegmentation.ts`](../../lib/caseSegmentation.ts) via the
**case-contour model** — what a watch head actually is, verified against the
curated 3D case-only reference renders (Tudor BB58 GMT / Omega Aqua Terra /
Oris Big Crown; the committed channel-zoom standard is
`test-fixtures/case-segmentation/reference/`):

> case-only = round case body ∪ four lug horns ∪ crown; the strap channel
> between each lug pair is bounded by the lug inner faces on the sides and
> the case's own **curved** edge below; **nothing** exists beyond the lug
> tips.

Pipeline, all pure pixel math (zero external API calls, ~60ms/image):

1. **Coarse band** (`detectCaseBand`): per-row silhouette span profile →
   steepest contraction bounds the case's vertical extent. Only used to seed
   the next step's sampling range.
2. **Case-body fit** (`fitCaseBody`): robust circle fit (Kåsa) on the
   silhouette's left/right edges across the band, with percentile trimming
   to reject the crown and lug shoulders as outliers. An axis-aligned
   ellipse is also fitted and wins only when decisively better — the sampled
   arcs are the case's *sides*, and a free vertical semi-axis extrapolated
   from side arcs alone drifts (measured: b≈253 fitted vs ≈234 observed on
   the Tudor fixture), while a circle's cap is pinned by the sides' own
   curvature. No stable fit (rectangular/tonneau case) → low confidence →
   escalate, never guess.
3. **Lug tips** (`findLugZone`): scanning outward from the case body, the
   span holds at the lug outer edges then contracts sharply the instant the
   lugs end — that contraction marks the tip row. Two hard-won constraints:
   the scan ignores rows near the image's own crop edge (a strap running
   off-frame produces the biggest contraction of all — a real tip always has
   strap *continuing beyond* it), and it is confined to rows BEYOND the case
   cap (cy ± 0.95b) — inside the cap, the case arc's own slope and a chrono
   pusher's shoulder produce comparable drops (the IWC Portugieser fixture
   "found" its top tips at the top pusher's edge and chopped the whole cap
   off). Channel width = the strap/end-link span measured just beyond the
   tips (an end link fills the channel exactly).
4. **Contour mask** (`buildCaseContourMaskPng`): keep = rows within the two
   tip rows AND (inside the fitted body ∪ |x−cx| ≥ channel half-width).
   That's the curved channel floor, the lug horns at full shape, the case
   sides, and the crown — and a hard stop past the tips (no floating
   bracelet fragments).
5. **Channel-floor snap** (`refineChannelFloor`): the fitted arc is measured
   from the case's sides, but the *visible* boundary between the lugs is the
   bezel's outer edge (on a dive watch, the serrated coin-edge ring), a few
   px inside the side-profile radius — the strap/end-link tucks under it.
   Two regimes, selected by the measured strap↔case contrast (strap color
   sampled from the channel between tips and cap; case color from just
   inside the cap):
   - **Color mode** (contrast ≥ 240 — leather/rubber/fabric): the boundary
     is where pixels stop matching the strap's color, scanned outside-in
     with 3-row persistence; a per-pixel strap-color **veto** then cleans
     the transition zone (strap edges hugging the lug faces, anti-aliased
     stubble on the arc). All color thresholds scale to the measured
     contrast — absolute values failed on the IWC fixture, whose channel
     strap sits in near-black lug shadow while its edge highlights land in
     any fixed ramp's gray zone.
   - **Texture mode** (weak contrast — a steel bracelet on a steel case):
     the boundary is a **cluster** of gradients (measured on the Tudor
     fixture: smooth end-link ≤ 24, serrated ring 30-60, ring → colored
     insert 130-250); the snap anchors at the strongest edge and walks
     **outward** to the cluster's start — snapping to the strongest edge
     alone eats the serrated ring, which is case.
   Falls back to the fitted arc where no signal clears the bar.

Confidence blends tip sharpness, body-fit residual, and channel/case-ratio
plausibility; integrated designs land at ≈0.58 (inside the escalation zone)
and clean drilled-lug shapes at ≈0.78-0.81. Validated in
`scripts/segment-watch-cases.selftest.ts` against synthetic silhouettes with
real case anatomy — protruding lug horns, a bezel edge inset from the
silhouette radius with strap-colored fill between (the end-link-under-bezel
condition), a crown, flared bracelets — scored by IoU (≥0.995 achieved)
against analytic ground truth plus targeted point probes, each of which
encodes a failure a real photo actually caught. Run it with:

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

## How the mask design got here (real-photo lessons)

The contour model above wasn't the first design — earlier mask
generations each failed against a real photo in a specific way, and each
failure is now permanently encoded as a synthetic-selftest probe or a
committed real fixture:

1. **A flat row cut chops the lugs off.** A drilled lug is an angled horn —
   widest at the case, tapering to a tip well past the case's own body. At
   the row where the lug reaches its tip, the strap is *also* present
   (filling the gap between the two lugs), so no single horizontal cut can
   both keep the tip and remove the strap. Caught on an Omega Aqua Terra
   with long tapered lugs: the tips got sliced into flat stubs.
2. **"Wider than the strap ⇒ lug" leaves floating bracelet fragments and a
   straight channel cut.** The second design classified transition-zone
   pixels by width against the strap's far-tip width. Two failures, both
   caught on the Tudor BB GMT fixture: a bracelet's end-links near the case
   are *wider* than its far end, so fragments of bracelet survived above the
   lug tips; and the between-lugs boundary stayed a straight line where the
   real boundary is the case's curved edge. The contour model's tip-row
   hard-stop and fitted-arc channel floor replaced it.
3. **The fitted arc alone keeps an end-link sliver over the bezel.** The fit
   measures the case's *side* profile, but the visible case edge between the
   lugs is the bezel's serrated ring, a few px inside that radius — the
   end-link tucks under it, and the sliver between ring edge and fitted arc
   showed vertical bracelet link-lines in the output. `refineChannelFloor`'s
   gradient-cluster snap (see step 5 above) fixed it; the committed
   channel-zoom standard in `test-fixtures/case-segmentation/reference/`
   shows exactly the boundary it must reproduce.

4. **Geometry can carve holes in solid metal, and leave islands.** On the
   Cartier Tank fixture, the per-column channel floor cut at the rail row —
   but the brancard's inner face overlaps those same columns and continues
   past the rail, so the cut carved a diagonal gouge out of the lug; small
   strap fragments also survived disconnected from the case. The rule
   (user-stated): **lugs never have holes** — the case is ONE solid
   connected component. `solidifyCaseMaskPng` enforces it as a mask
   post-pass on every provider path: keep only the largest kept component
   (floaters die), color-reclaim removed-but-case-colored pixels attached to
   the case within the lug bands (the gouge grows back; mid-channel reclaim
   stays off so strap stitching can't creep in), and fill any fully enclosed
   holes. The realtest asserts both invariants on every fixture: largest
   component ≥ 99.5% of kept pixels, zero mask-carved enclosed holes.

5. **A strap that ends inside the frame fakes a lug tip.** The tip scan
   marks the biggest span contraction as the lug tips, with an edge margin
   protecting against straps cropped AT the frame — but a deployant product
   shot (Longines Master fixture) ends its strap with a rounded tip *inside*
   the frame, and that collapse produces drops that dwarf a softly-tapered
   lug's. `findLugZone` now requires persistent strap beyond a candidate tip
   (≥30% of the case half-width still present ~12% further out; off-frame
   counts as persisting). Encoded as the "strap ends inside the frame"
   synthetic spec.
6. **A median strap color can't classify a multi-tone strap — use the
   albedo line.** The same Longines strap spans dark shadowed grain, lit
   grain, and a pale tan cut edge; the tan measures d≈223 from the median
   (unambiguously "case" to a distance test) yet is obviously strap to a
   human. One material under varying illumination spans a RAY through the
   RGB origin: all three tones sit within ~0.06 normalized residual of that
   line while steel sits at ~0.15. `ChannelFloor.strapLine` (enabled only
   when the measured case color is decisively off the line — a near-black
   strap under steel is colinear with it, and there the median distance
   already works) classifies any-brightness strap pixels in the floor scan,
   the mask veto, and the solidify reclaim via `strapRefDist`.
7. **Color-mode floors get asymmetric trust regions.** With a reliable
   color stop condition, the floor scan may walk deep inside the fitted
   arc (`0.14a` — the Longines bezel edge sits ~0.09a inside the
   side-profile radius, unreachable with the old symmetric 0.06a window)
   but barely outside it (max(3, 2·rms) rows): a round case physically
   cannot extend past its own fitted circle, and the one thing color can
   never cut — a strap's near-white painted edge coat, colorimetrically
   identical to polished steel — hangs exactly there. Texture mode keeps
   the symmetric window; the rect prior owns its own windows.

The Longines fixture also motivated a confidence change: softly-tapered
lugs produce honest tips with tiny 2-row drops (tipScore ~0.15), which
under-rated an otherwise clean color-anchored cut to escalation level.
When BOTH channel floors ran in color mode AND real tips were found on
both sides AND the channel is decisively narrower than the case
(ratio < 0.6 — integrated attachments must stay in the escalation zone no
matter how separable their color), the color evidence stands in for soft
tips (`tipEvidence = max(tipScore, 0.8·colorScore)`).

Same evolution fixed `lugGeometry.lugWidthPx` (what the Studio width-scales
straps against): it was the full row span at the cut — lug-tip-to-lug-tip
when lugs exist, systematically overstated — and is now the channel width
measured from the strap just beyond the lug tips, where an end link fills
the channel exactly. `ClaudeVisionLandmarkProvider` shares the whole mask
path (its four points set the tips and channel edges; the body fit and
floor snap come from the pixels, same as the geometric tier).

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

## Runbook: casing the catalog

This is the operational loop for pointing the pipeline at the watch database.
The design above and the fixtures/tests are one system: every learning from a
real photo lives in three places — the model change (lib/caseSegmentation.ts),
a committed fixture proving it (test-fixtures/case-segmentation/), and a test
that fails if it regresses (`selftest` for analytic ground truth, `realtest`
for real photos).

**Per-batch procedure:**

1. `npm run straps:segment-cases:selftest && npm run straps:segment-cases:realtest`
   — green before any batch touches production data.
2. `npm run straps:segment-cases -- --top 100 --by model-family` (with
   `ANTHROPIC_API_KEY` set for tier-1 escalation). Model-family ordering makes
   shared failure modes obvious in review. The catalog's `bracelet_type` flows
   in as the per-watch hint; integrated designs are skipped outright.
3. Outcomes land by confidence: ≥ 0.9 auto-approved, 0.55-0.9 `pending`,
   < 0.55 `needs_review` (after tier-1 escalation below 0.7). Review the
   per-family summary the script prints, then work through
   `/admin/image-review` → **Case Segmentation** — lowest confidence first
   (the queue is sorted that way). Drag the four lug markers to correct;
   approve/reject/not-applicable.
4. `npm run straps:sync-bridge` — folds the reviewed Supabase state into the
   committed `data/case-only-images.json`; commit it (mirror-of-live pattern,
   same as `catalog:sync-heat`).

**When a watch comes out wrong (the fixture loop — how this doc was built):**

1. Copy its primary photo into `test-fixtures/case-segmentation/` and add a
   row to that README naming what makes it hard.
2. Add it to `FIXTURES` in `scripts/segment-watch-cases.realtest.ts` with the
   right hint, run the realtest, and inspect the gitignored `output/` images —
   zoom the channels; the failures live at the boundaries. Set
   `SEGMENT_DEBUG=1` to print the fitted body, lug zones, and per-floor
   internals (color mode, strap references, veto thresholds, sample floor
   rows) — this is how the Longines tan-band failure was localized to
   "unreachable window" vs "misclassified color", which need different fixes.
3. Fix the model, re-run BOTH test suites (the other fixtures are the
   regression net — every fix so far broke on its second real photo until the
   first one was pinned), and where the failure is expressible analytically,
   add a probe to the selftest.
4. Commit fixture + fix + doc note together, so the learning can't drift
   from the code.

**Current case-shape coverage:** round (circle/ellipse fit), rectangular/tank
(rounded-rect model with model competition — a trimmed circle fit will
mis-explain a rectangle at rms ~8, so the rect model wins whenever the round
fit is poor and the sides are straight). Cushion/tonneau land wherever their
curvature genuinely fits better — a soft cushion may pass as a poor ellipse
(confidence-capped) or fail to a row-band at 0.3; either way they stay in the
escalation/review zone rather than shipping a bad cutout. A dedicated
tonneau model is a known follow-up if review volume demands it.

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
5. **Background removal on bright/white straps is its own open problem,
   separate from case segmentation.** A second test photo (an Omega Aqua
   Terra on a white rubber strap) hit this directly: parts of the strap were
   photographed bright enough to be pixel-identical to the white studio
   background (verified: a 20×20 patch of strap and a 20×20 patch of
   background both sampled as flat `(250,250,250)`, zero variance in either).
   No pixel-level method — color or texture — can recover a boundary that
   isn't present in the data; this needs either better source photography
   (true transparent PNGs, not screenshots) or a semantic ML background
   remover (`applyMlBackgroundRemoval` in `lib/imageProcessing.ts` — unusable
   in this sandbox; its nested `sharp` dependency needs its own native build
   step this environment's `--ignore-scripts` `npm install` skipped, a
   sandbox-specific problem, not a real deployment blocker). Not fixed here —
   flagging so a real batch run doesn't mistake washed-out white-on-white
   photos for case-segmentation failures when they're upstream background-
   removal quality issues instead.
