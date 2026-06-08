# Virtual Watchbox — Take It Home Roadmap
**IF** = infrastructure · **RM** = product feature · **BUG** = existing issue
Mark `[x]` when done, `[~]` when partially done (sub-items called out inline).

---

## Changelog
| Date | Update |
|---|---|
| May 2026 | Initial roadmap created from PRD v1.11, Jira board, and codebase review |
| May 2026 | VW-8 done: Resend set up, Supabase SMTP swapped, all auth emails branded, domain DNS via Cloudflare, email routing configured |
| May 2026 | Added Cloudflare infrastructure items (Phase 0.5) |
| May 2026 | VW-15 done: AI photo identification ("Watchbox Concierge") shipped end-to-end. Two-step pipeline (vision + web-search reference lookup), market-value capture, dial-bbox cropping, filename-aware SKU prior, three-way classification (match / discovered / not-a-watch). Reroutes Phase 0.5 R2/Cloudinary plans → Supabase Storage now in production use. |
| May 2026 | VW-11 done: Admin catalog management upgraded — Catalog Manager modal (view + edit, works for static seed AND dynamic rows), Image Intake with verify-vs-intake split + before/after preview, Submissions Queue with dedupe + inline edit + curated photo replacement. Service-role admin client added. |
| May 2026 | Per-watch user photo gallery shipped (PRD v1.12 Feature 2D + Owned Watch Detail Page 2E) — sidebar thumbnail strip + grid + lightbox + drag-reorder + captions + set-primary, AI photo flow auto-adds to gallery. |
| May 2026 | Round of post-review fixes: duplicate-insert bug (strict-mode side effect in setState updater), watchbox slot-count fluctuation (unsynced auto-grow), client-side AVIF/HEIC transcode, footer admin link, customize-popover click-outside, Concierge chip contrast. |
| May 2026 | Roadmap hygiene: `/news` (VW-13) and `/discover` (VW-14) had already shipped with full feature scope but were still listed as pending. Marked done; PRD v1.12 now documents both as proper feature specs (Feature 11 + Feature 14). Added Discover UI cleanup as a Phase 2 polish item. |
| May 2026 | Second hygiene pass: VW-12 (`/settings`) had shipped at P0 scope (visibility controls, legal links, mailto deletion, sign-out) — marked done with P1/P2 follow-ups noted. OG image generation also shipped via Next.js edge route at `/api/og/box/[slug]` + unified ShareBoxModal — three stale roadmap/PRD references updated to reflect done state. |
| May 2026 | Third hygiene pass after a deeper investigation: VW-1 (profile sync) was already fixed in `b3ddab6`; VW-9 (support email) was already done; Collection Jewel state was fully shipped (sidebar badge + state-control picker + profile hero selector); VW-10 (Real Watchbox Photo) was fully shipped. All marked done. **Dropped "Grail surface on /collection"** as a category error — Grail is by definition unowned and lives on `/profile`. **Replaced "Next Targets panel" with broader `/collection` UI pass** that includes the Targets treatment plus header/stats/cards/mobile polish so the working surface gets a cohesive review rather than a one-feature drop. |
| May 2026 | Bug-backlog sweep: VW-2 (Grail desktop contrast) marked done. VW-3 (watchbox auto-shrink on delete) reviewed against the codebase and dropped — `getEffectiveSlotCount` is grow-only by design so the bug isn't structurally possible. VW-5 (profile watchbox sizing) dropped as no-longer-reproduces. VW-7 (general backlog sweep) dropped — backlog is clean. VW-6 split: the `/collection` half is now folded into the `/collection` UI pass; the `/playground` half remains as VW-6b. VW-4 annotated as a Google Cloud Console-side change (no code). |
| May 2026 | **Catalog scale-up:** catalog grew from ~50 seed watches to **35,659 catalog watches** in Supabase with full specs, heat scores, and layered pricing. **4,000+ imaged watches** with WebP in Supabase Storage (PRs #48, #52, #60). Server-side search with brand filter, debounced, photos-only via inner-join. CatalogProvider paginates top 2,000 by heat into memory, rest fetched on demand. |
| May 2026 | **Catalog search infrastructure:** full-text search via `pg_trgm` GIN index on generated `search_text` column (migration 023). Concatenates brand, model, reference, model_family, nickname, watch_type, complications. Curated collector nicknames in `data/catalog-nicknames.json` with `npm run catalog:enrich-nicknames` script. |
| May 2026 | **Heat score algorithm rework** (PR #49): flattened brand-prestige dominance, rewards market activity, penalizes seven-figure paperweights. Static bridge via `data/catalog-heat-scores.json`. Add Watch UX improvements: default browse state, pagination, mobile layout, sort controls. |
| May 2026 | **Admin image-review tool** shipped at `/admin/image-review` (PRs #50, #54): side-by-side raw vs processed comparison, tag chips for 10 failure modes grouped by pipeline stage (missing parts / edge quality / background), one-click approve/needs-reprocess/wrong-watch save. Reviews stored in `watch_image_reviews` table. Image exclusion mechanism via `data/excluded-image-ids.json`. |
| May 2026 | **Image pipeline documentation + ops tooling** (PRs #51, #53): routed hero image paths through Supabase Storage, documented the full pipeline in `docs/WATCH_IMAGE_PIPELINE.md`, added `docs/adding-watches.md` runbook, added image-ops quality-of-life scripts. |
| May 2026 | **Collection empty state + auth nudge** (PR #47): empty watchbox shows watch silhouette CTA instead of "+/ADD". Layered, dismissible auth-nudge system for cross-device sync without gating the demo-first experience. |
| May 2026 | **Collection stability fix** (PR #58): decoupled owned-watch set from heat-score cache so user watches always render regardless of discovery-cache state, heat score, catalog ID migrations, or surface. |
| May 2026 | **`/discover` editorial redesign** (PRs #57, #59, #61, #64): replaced utility-stack layout with magazine-style editorial design. LLM-personalized hero + lead section with daily-rotated recommendations. Seven sections: hero, sticky TOC, dark "Complete the Box" lead, from-to upgrade spreads, three alternate next-watch sections. Per-section refresh buttons. Model-family filtering for dedup/exclusion. Mobile: compact dark "Discover" banner replacing tall light editorial hero, sticky nav fix (top: 56px). Strap and Box editorial sections removed (not production-quality); remaining sections tightened. |
| May 2026 | **Playground major upgrades** (PRs #62, #63, #65): (1) Import collection on empty box via one-click CTA. (2) Drag watches from tray into slots with long-press reorder, sparse slot support, drag-to-trash. (3) Mobile UI cleanup. (4) **Playground Supabase persistence** — playground boxes now sync to Supabase for logged-in users via debounced auto-sync (`public.playground_boxes`). |
| May 2026 | **Seed script safety** (PR #56): seed script aborts instead of writing local-path URLs when `SUPABASE_URL` is unset. |
| May 2026 | **PRD v1.14:** Next Targets moved from `/collection` to `/discover` § 03. Photo type picker promoted to P0. Feature 2F (Service History) added. Feature 7 rewritten as "The Strap Drawer" — first-class strap inventory with auto-match compatibility and combo stats. Replaces old VW-17/VW-18 stubs. Added Phase 1.5 "Ownership Depth." |
| Jun 2026 | **iOS conversion plan:** added Phase 5 (Native iOS) and a full architecture plan at [docs/IOS-CONVERSION.md](IOS-CONVERSION.md). Codebase review found the app well-suited to a **Capacitor hybrid wrapper** (~90% client components, disciplined `lib/brand.ts` design system, existing PWA manifest). Chosen path: B2 hybrid — static-export consumer surfaces into the native shell, keep API routes + server-only image pipeline (`sharp`/`@imgly`) hosted. Top blockers identified: cookie/SSR/middleware auth → token-based, redirect OAuth → native auth-session, missing safe-area handling, web-shaped nav → bottom tab bar. |
| Jun 2026 | **Phase 1.5 (Ownership Depth) shipped end-to-end** (PRs #72, #73, #83) — Targets/Grail on `/discover` § 03, photo-type picker (upload + lightbox), Papers & Provenance, ownership detail strip + expanded `EditWatchModal` (acquisition method / box / papers / warranty), and **Service History** built out into a full **Service Room hub** at `/service-room` (Agenda/Horizon + Ledger + Gallery, dossier drawer, Log-a-Service with PDF attachments, configurable `interval_years`, derived next-due/cost) with first-run onboarding (empty / convert / hub gating + setup wizard). Migrations 026–029. **Data export** shipped (`/api/user/export`, Settings "Download my data" now functional for auth + guest). |
| Jun 2026 | **The Strap Drawer shipped** (PR #75) — VW-17 complete: `/collection/straps` inventory with bidirectional watch↔strap lug-width compatibility + overrides, Supabase-backed (`user_straps` + `strap_watch_overrides`, migration 030), plus a photorealistic strap-image pipeline (Gemini 2.5 Flash Image + local post-process, `strap-images` bucket migration 031, 40 templates in `data/strap-templates.json`). Real strap photos replace the procedural swatch everywhere. |
| Jun 2026 | **Design language v2 + UX polish** (PRs #76–#82) — readability pass via expanded `lib/brand.ts` tokens (AA-contrast `muted`, antique `goldDeep` for text-on-light, new `brand.text.*` scale with 11px floor, `onDark*`), homepage redesign, hybrid empty-state watchbox (showcase mode), Add-Watch empty state, microcopy trim, Framer-Motion entrance/reorder animations, and the **instant-paint localStorage cache** (PR #81) for collection + profile warm loads (per-user scoped, versioned, cleared on sign-out). Note: the readability token ripple was ~half complete at #77 — remaining sub-12px surfaces still need the sweep. |
| Jun 2026 | **State-capture pass (code-verified):** confirmed against current `main` that two items the PR descriptions had understated are actually shipped. (1) **Drag-to-reorder in Collection is live at full parity with Playground** — same `WatchBox` handlers (desktop HTML5 + touch long-press), Collection persisting `sort_order` to Supabase via `swapCollectionSlots`/`syncWatchReorder`. (2) **Standardized marketing empty-state system** across three surfaces: `components/collection/CollectionEmptyState.tsx`, `components/collection/PlaygroundEmptyState.tsx`, and `components/serviceRoom/onboarding/Screen1Empty.tsx` — shared pattern (gold eyebrow → italic serif headline → 3 benefit rows → dark CTA + gold link, with a ghost watchbox / ghost Service Horizon preview). Added these to the CLAUDE.md component map. |
| Jun 2026 | **Cloud-sync hardening + catalog cleanup** (PRs #70, #71, #84) — retry-with-backoff + flush-on-hide across all Supabase writes; automated image-quality flagging on approval + admin Flagged tab; catalog dedupe/ref/lug cleanup applied live to Supabase with a git-visible source-of-truth snapshot (`data/catalog-live-imaged.json`, `npm run catalog:export-live`) and a "Catalog Data — What Lives Where" table in `CLAUDE.md`. |

---

## Phase 0 — Stability & Trust
*Ship these before spreading the link.*

- [x] **IF** ~~`VW-1` Fix profile not syncing with Supabase~~ — **Done.** Shipped in `b3ddab6 fix(profile,settings,collection): harden save/hydrate against tab-focus refetch races`. ProfileSurface + Settings both use the change-id + saveInFlight + dirty-aware-refetch pattern (same one we used for the slot-count fix). Supports cross-device edits without overwriting in-flight local changes.
- [ ] **IF** `VW-4` Set Google auth sender address to virtualwatchbox.com — personal address erodes credibility. *Configured in Google Cloud Console (OAuth consent screen) — no code change needed.*
- [x] **IF** `VW-8` ~~Set up Resend for transactional email~~ — **Done.** Resend live, Supabase SMTP swapped, branded templates deployed, DNS/routing via Cloudflare
- [x] **IF** ~~`VW-9` Update support email in Terms & Privacy~~ — **Done.** Both `app/terms/page.tsx` and `app/privacy/page.tsx` use `support@virtualwatchbox.com`.
- [x] **IF** `VW-11` ~~Fix admin flow: watch detail completeness + reference data quality~~ — **Done.** Catalog Manager modal lets admins edit every catalog field (works for both static seed and dynamic rows; static edits create Supabase override). Submissions Queue dedupes pending rows + inline edit + curated photo replacement. Image Intake has verify-vs-intake split and before/after photo preview.
- [x] **BUG** ~~`VW-2` Fix Grail contrast issue on desktop~~ — **Done.**
- [x] **BUG** ~~`VW-6b` `/playground` UI polish pass~~ — **Substantially done.** PRs #62, #63, #65 delivered: import-collection CTA on empty boxes, drag-from-tray with long-press reorder and sparse slot support, tray constrained to watchbox width on mobile, padding/border fixes, and Supabase persistence for logged-in users. Remaining: badge consistency review and minor spacing tweaks can be folded into a future cross-surface polish pass.

> **Dropped items (reviewed and not pursued):**
> - ~~`VW-3` Fix watchbox auto-shrinking when deleting a watch~~ — Not a real bug. `getEffectiveSlotCount` in [lib/watchboxOverflow.ts](lib/watchboxOverflow.ts) is grow-only by design (`if (itemCount <= currentSlotCount) return currentSlotCount`); a delete can't shrink slot count.
> - ~~`VW-5` Fix watchbox sizing too large on profile page~~ — No longer reproduces. Will refile if it surfaces again.
> - ~~`VW-7` Sweep general bug backlog~~ — Backlog is clean; no concrete bugs left on the board. Will refile if new ones surface during the next round of testing.

---

## Phase 0.5 — Cloudflare Infrastructure
*You're already paying for it and nameservers are managed here — set these up now while the context is fresh. All are either free or low-cost and materially improve security, performance, and ops.*

> **Storage update (May 2026):** the Cloudinary / R2 / Cloudflare Images items below were originally planned to handle user-uploaded watch photos. We now use **Supabase Storage** (`watch-photos` and `watch-images` buckets) for that purpose because (a) it lives next to the auth/RLS layer that gates access, (b) eliminates the cross-provider auth dance, and (c) is already in production for the photo gallery + admin curated images. The R2 / Cloudflare Images items below remain as **deferred / optional** — only revisit if Supabase Storage becomes a cost or performance bottleneck.

- [ ] **IF** Enable Cloudflare Analytics — free, privacy-friendly, no cookie banner required. Replace or supplement any GA setup. Dashboard → Analytics & Logs → Web Analytics.
- [ ] **IF** Configure Cloudflare caching rules for Next.js static assets — cache `/_next/static/*` at edge, set long TTLs. Cuts origin load and speeds global delivery.
- [ ] **IF** Set up Cloudflare WAF rules — block common attack patterns (SQLi, XSS, bad bots) on the free plan. Especially important once auth + user data is live.
- [ ] **IF** Enable Cloudflare Turnstile on auth pages — replaces reCAPTCHA with a privacy-respecting, invisible bot check. Wire into `/auth` sign-in flow. Free tier is generous.
- [ ] **IF** ~~Configure Cloudflare R2 bucket for user watch photos~~ — **Deferred.** Replaced by Supabase Storage `watch-photos` bucket (in production). Revisit only if storage cost or egress becomes a bottleneck.
- [ ] **IF** ~~Set up Cloudflare Images for watch photo delivery~~ — **Deferred.** Supabase Storage public URLs are served via the standard CDN; we use server-side Sharp for resize/format conversion at upload time. Revisit if we need on-the-fly format negotiation (WebP/AVIF) at delivery.
- [x] **IF** ~~OG image generation via Cloudflare Workers + Satori~~ — **Done (different host).** Shipped as a Next.js edge route at `/api/og/box/[slug]` using `next/og` ImageResponse + Satori on Vercel edge. Same renderer + same output quality; no Cloudflare Worker needed. Profile and box share links resolve to dynamic OG cards via the unified ShareBoxModal. Could be migrated to a Cloudflare Worker later if Vercel edge becomes a bottleneck, but no functional gap today.
- [ ] **IF** Configure redirect rules — ensure `www.virtualwatchbox.com` → `virtualwatchbox.com`, HTTP → HTTPS, and any legacy paths are handled at the edge rather than in Next.js.
- [ ] **IF** Set up Cloudflare Email Routing catch-all — route any `*@virtualwatchbox.com` to personal inbox as a safety net so no emails sent to the domain get silently dropped.

---

## Phase 1 — Complete the Product Contract
*Things the nav promises but doesn't deliver.*

- [x] **RM** ~~`VW-12` Build `/settings` page (Feature 6 MVP)~~ — **Done at P0 scope.** PRD v1.12 Feature 6. Account summary (email + auth method), privacy/sharing visibility toggles backed by `user_profiles.visibility`, legal links, support email, mailto-backed data deletion request, sign-out. `Download my data` now **shipped** (PR #72 — `/api/user/export` for auth, client-side assembly for guests). **Open follow-ups:** self-serve account deletion + data purge, sign-out-all-sessions, notification preferences.
- [x] **RM** ~~`VW-14` Build `/discover` route — commerce + editorial hub~~ — **Done.** PRD v1.12 Feature 14. Collection-aware insights (gap analysis, dial-color skew), next-slot recommendations with Chrono24 deep links, per-watch upgrade cards, lug-width-aware strap suggestions, box upgrade affiliate card, curated Discover Reads strip. Demo seed for guests so the page is never empty.
- [x] **RM** ~~`VW-13` Wire up `/news` — RSS-aggregated watch publications~~ — **Done.** PRD v1.12 Feature 11. Cloudflare Worker backend (`NEWS_WORKER_URL`) handles RSS fetch + brand/reference tagging, Next.js API route proxies with 15-min revalidation. Hero featured article, source pills, mode tabs (Latest / For You / By Source), filter bar, sponsored slot framework. Personalization driven by collection + followed signals.
- [x] **RM** ~~Edit owned watch metadata from sidebar~~ — **Done.** EditWatchModal exists for condition / ownership status / purchase price / purchase date / notes. Available from sidebar pencil icon and the new owned-watch detail page (`/collection/watch/[id]`).
- [x] **RM** ~~Collection Jewel state~~ — **Done.** PRD v1.12 Feature 2B Category 6. Sidebar Jewel badge, WatchStateControl picker offers `[followed, jewel]` for owned watches, profile hero selector (FeaturedProfileWatch) toggles between Grail and Jewel. Watch cards show the jewel badge.
- [~] **RM** `/collection` UI pass — **partially done.** Design-token readability pass (PR #77) + hybrid empty-state watchbox (PR #78) + entrance/reorder animations (PR #76) landed; ownership fields are now surfaced in `EditWatchModal` (PR #72). Remaining:
  - [x] ~~**Surface existing ownership fields in EditWatchModal**~~ — **Done** (PR #72): acquisition method, has box, has papers, warranty expiry in a "Provenance & Papers" section.
  - **Header / value pill / action button** spacing and hierarchy review
  - **Stats section** typography and density pass (portfolio value, dial colors, watch types, complications, brands)
  - **Cards view** spacing + status badge consistency
  - **Mobile reflow** for sidebar → bottom sheet transitions and overflow behavior
  - [x] ~~**Finish the readability ripple**~~ — **Effectively done (code-verified Jun 8).** The 11px floor holds across all consumer surfaces (sub-11px only remains in `app/admin/*` + `components/admin/*`, intentionally excluded); bright-gold-as-text on light is now confined to dark surfaces + decorative glyphs. Lone residual: `components/serviceRoom/PartnerBand.tsx` gold eyebrow/tag labels (~2-line fix to `goldDeep`).
  - *Note: Both Targets and Grail are intentionally NOT on `/collection`. `/collection` is the truth about what the user owns. Targets moved to `/discover` § 03 (PRD v1.14). Grail's home is `/profile`.*

---

## Phase 1.5 — Ownership Depth ✅ COMPLETE
*Make the collection page the definitive record of what you own — not just the watches, but the provenance, papers, and service history. **Shipped across PRs #72, #73, #83.***

- [x] **RM** ~~Targets/Grail section on `/discover` (§ 03)~~ — **Done (PR #72).** `TargetsGrailSection`: crowned grail card + up to 3 target cards (intent, desired condition, target price, market links). Renders for logged-in users with grail/targets; section renumbering wired through `SectionNav`.
- [x] **RM** ~~Photo type picker~~ — **Done (PR #73).** `photoType` surfaced in upload flow + lightbox toolbar; grouped-7 taxonomy (migration 029) including document types.
- [x] **RM** ~~Papers & Provenance section on detail page~~ — **Done (PR #73).** Filtered document-photo view on `/collection/watch/[id]`, plus Overview / Service-Dossier tabs.
- [x] **RM** ~~Ownership detail strip on detail page~~ — **Done (PR #72).** Ownership chips (box, papers, acquisition method, warranty expiry) below specs.
- [x] **RM** ~~Service History (Feature 2F)~~ — **Done & expanded (PRs #73, #83).** Went beyond a per-watch timeline into a full **Service Room hub** (`/service-room`): Service Horizon/Agenda + Ledger + Gallery, dossier drawer, Log-a-Service modal with per-file PDF attachments, configurable `interval_years` (3/5/7/10), derived next-due + running cost, affiliate band, dossier export, mobile refactor, and first-run onboarding (empty / convert / setup-wizard gating). `watch_service_records` + RLS, migrations 026–029.
- [x] **RM** ~~Expand `EditWatchModal`~~ — **Done (PR #72).** "Provenance & Papers" section: has_box, has_papers, acquisition_method, warranty_expires_at, last_serviced_at, service_notes.

---

## Phase 2 — Collector Delight
*Features that make people share the app.*

- [x] **RM** ~~`VW-10` Collection Photo view~~ — **Done.** PRD v1.12 Feature 2A View C. Third icon in the ViewSwitcher, `CollectionPhotoView` (412 lines) handles the photo state, `WatchboxPhotoEditModal` (496 lines) handles upload + camera capture + crop. Persists to Supabase Storage `watch-photos` bucket via the `watchbox_config.watchbox_photo_url` column.
- [x] **RM** ~~Per-watch user photo gallery~~ — **Done.** PRD v1.12 Feature 2D. Sidebar thumbnail strip + grid view on owned-watch detail page + lightbox + drag-reorder + captions + set-primary. AI photo flow auto-adds new uploads as primary. Backed by `public.user_watch_photos` with RLS.
- [x] **RM** ~~Owned-watch detail page~~ — **Done.** PRD v1.12 Feature 2E. New route `/collection/watch/[id]` with sticky image, full specs, edit/delete affordances, full-width gallery at the bottom.
- [x] **RM** ~~Duplicate-aware add page~~ — **Done.** PRD v1.12 Feature 3. Single + multi-instance treatments. "Manage your watch" + "Add another" CTAs.
- [x] **RM** ~~Discover page editorial redesign~~ — **Done.** PRs #57, #59, #61, #64 replaced the utility-stack layout with a magazine-style editorial design: LLM-personalized hero + lead, daily-rotated recommendations with per-section refresh, from-to upgrade spreads, model-family filtering, mobile compact dark hero. **Strap and Box affiliate sections remain pending** — tracked under `VW-17` Strap Swap and `Shop This Box` below.
- [x] **IF** ~~OG image generation for profile + box share links~~ — **Done.** Dynamic OG cards via `/api/og/box/[slug]` (Next.js edge route, see Phase 0.5). Wired into the unified ShareBoxModal so profile and box share links render rich previews on iMessage / Slack / Twitter / etc.
- [ ] **RM** Save as Playground from Collection draft state — unsaved changes bar "Save as Playground" is a placeholder, wire it up.
- [x] **RM** ~~Drag-to-reorder in Playground~~ — **Done.** PR #62 shipped long-press drag-to-reorder within playground watchbox slots, drag-from-tray into slots, sparse slot support (drops land where you aim), and drag-to-trash. Desktop HTML5 drag also supported.
- [x] **RM** ~~Drag-to-reorder in Collection~~ — **Done (parity with Playground).** `WatchBox.tsx` drives both surfaces with the same handlers: desktop HTML5 drag + touch long-press (~350ms) → `onReorder`. Collection persists via `app/collection/page.tsx` `handleReorder` → `swapCollectionSlots` → `syncWatchReorder` (writes `sort_order` to Supabase, retry-hardened); Playground reorders via `moveEntryToSlot` and syncs through the debounced `playground_boxes` writer.
- [x] **RM** ~~`VW-17` The Strap Drawer (Feature 7)~~ — **Done (PR #75).** First-class strap inventory at `/collection/straps`: Add/Edit modal (material + lug width + color), card grid with material badges + compatible-watch count, detail sidebar "Fits these watches", auto-match by lug width + manual `fits`/`excluded` overrides, combo stats. Supabase `user_straps` + `strap_watch_overrides` (migration 030), API under `/api/user-straps`, hydrated/saved via `CollectionSessionProvider`. **Plus** a photorealistic strap-image pipeline (Gemini 2.5 Flash Image + local post-process, `strap-images` bucket migration 031, 40 templates in `data/strap-templates.json`) and an Add-Strap "Quick pick from common straps". Replaces old VW-17/VW-18 stubs.
- [~] **RM** Strap Drawer phase 2 — **partially done.** Real strap *photos* shipped (PR #75) in place of the planned CSS material swatches (better outcome). Still pending: compatibility matrix view, sidebar "Swap Strap" quick-pick wired to the drawer, lug-width distribution in collection stats, Discover "missing strap" suggestions grounded in actual inventory.
- [ ] **RM** Shop This Box — physical box affiliate matching. When user configures virtual box, surface Wolf1834 / Rapport / Holme & Hadfield matches. Direct revenue.

---

## Phase 3 — Intelligence + Live Data

- [x] **RM** ~~`VW-15` Add watch via AI photo detection flow (Feature 9)~~ — **Done.** PRD v1.12 Feature 9 ("Watchbox Concierge"). Upload watch photo → identify → match-found primary card / "Discovered" not-in-catalog card / not-a-watch panel. Two-step pipeline using OpenAI Responses API: vision-only first pass, then web-search reference lookup. Captures estimated market value. Filename-aware SKU prior. Server-side dial-bbox crop. Client-side AVIF/HEIC transcode. Add-from-photo creates pending catalog row + admin moderation queue. **Switched provider plan: replaced Google Vision AI with OpenAI Responses API.**
- [ ] **IF** Wire WatchCharts for live market pricing — replace AI-derived `estimatedValueUsd` (currently from web-search lookup at submission time) with live ongoing pricing. Unlocks value-tracking as a retention hook.
- [ ] **RM** Smart Suggestions engine — personalized watch recs (Feature 8). Based on collection, followed, search history. Feeds Discover surface and sidebar upsells.
- [ ] **RM** AI weekly digest — personalized watch news summary. OpenAI-powered, relevant to the user's collection and followed watches. Drives weekly retention.
- [ ] **RM** Spec-fingerprint cache for AI lookup — most repeat lookups are the same `(brand, model, dial, case)` tuple from different user photos. Cache by spec key to cut the long tail of redundant `gpt-4.1` + web-search calls.

---

## Phase 4 — Scale + Public Identity

- [ ] **IF** Account-backed `/u/[handle]` public profile routes — replace localStorage demo with real Supabase-backed public profiles. Required before any growth/sharing push.
- [ ] **IF** Account-backed public box routes `/u/[handle]/box/[slug]` — Playground and Collection box share links resolve here post-auth.
- [ ] **RM** `VW-16` Virtual Try-On Room — preview watch on wrist photo (Feature 10). Rare in the category. High shareability.
- [ ] **RM** Integrated sell listing support (Feature 12) — Find For Sale deep links + structured sell intent to Chrono24/eBay as leads. Completes ownership lifecycle.
- [ ] **IF** White-label licensing foundation (future) — infrastructure for dealer/brand partnerships.

---

## Phase 5 — Native iOS (Capacitor Hybrid)
*Take the product to the App Store. Full architecture, rationale, and blocker analysis in [docs/IOS-CONVERSION.md](IOS-CONVERSION.md) — read it before starting any native work. PRD §1.3 names this as the platform roadmap step.*

> **Chosen path: Capacitor hybrid (Option B2).** Static-export the consumer surfaces (collection · discover · profile · playground · straps) into a native WKWebView shell; keep API routes + the server-only image pipeline (`sharp` + `@imgly`) hosted; talk to Supabase + our APIs over HTTPS. Reuses ~all React/TS/component code and the `lib/brand.ts` design system. React Native rewrite (Option C) deferred unless iOS becomes the primary platform.

### Phase 5.0 — Prep (web-side, low risk; no native project yet)
- [ ] **IF** Centralize `apiFetch()` with a configurable base URL — migrate the ~38 hardcoded `fetch('/api/...')` callsites. A native bundle needs absolute URLs to the hosted backend.
- [ ] **IF** Add `env(safe-area-inset-*)` + `viewport-fit=cover` to `app/globals.css` and every sticky surface (`NavBar`, footer, sidebars, bottom sheets). Currently zero safe-area handling — content collides with the Dynamic Island / home indicator.
- [ ] **IF** Stub `lib/platform/*` abstraction (storage · auth-callback · camera · share · haptics) with web implementations so providers stay untouched.
- [ ] **IF** Add Playwright smoke tests (login, add watch, reorder, save) — no tests exist today; these protect the upcoming auth refactor.

### Phase 5.1 — Auth refactor (behind platform flag; web unaffected)
- [ ] **IF** Token-based Supabase session via native secure storage (Capacitor Preferences / Keychain). Decouples the mobile path from cookies + `middleware.ts` + `cookies()`. **Blocker #1.**
- [ ] **IF** Native Google OAuth — Capacitor Browser + `ASWebAuthenticationSession` + custom URL scheme / universal link → `supabase.auth.exchangeCodeForSession`. Current `app/auth/callback/route.ts` redirect flow won't fire in a webview.

### Phase 5.2 — Capacitor shell
- [ ] **IF** Stand up the iOS Capacitor project; hybrid bundle of consumer surfaces. Exclude `/admin/*`, `/api/og/box/[slug]`, and image-processing API routes from the mobile bundle (keep hosted).
- [ ] **IF** Point `apiFetch()` + Supabase at the hosted backend; get login → collection → save working end-to-end on a physical device.

### Phase 5.3 — Native feel
- [ ] **RM** Bottom tab bar (Collection / Discover / Playground / Profile), platform-gated, replacing the web top-nav drawer on iOS.
- [ ] **RM** Safe-area polish pass across all surfaces.
- [ ] **RM** Native camera capture wired into `AddFromPhotoSheet` / `PhotoSearch` (POST to existing server-side `upload-photo` / `create-from-photo` routes).
- [ ] **RM** Haptics on drag/drop; native share sheet for box/profile share links.

### Phase 5.4 — App Store readiness
- [ ] **RM** Push notifications — service-due reminders, watch news, "complete the box" nudges (data already exists). Primary guideline-4.2 value-add.
- [ ] **IF** Persistent offline write queue — the instant-paint read-through cache already shipped (PR #81) and writes are retry/flush-on-hide hardened (PR #70); remaining gap is a mutation queue that survives app-kill and replays on reconnect (the limit PR #70 called out).
- [ ] **IF** App Store assets, privacy nutrition labels (we collect photos + profile data), TestFlight beta.

---

*Last updated: June 8, 2026 · PRD reference: v1.15*
