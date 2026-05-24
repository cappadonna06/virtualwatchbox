# Virtual Watchbox — Take It Home Roadmap
**IF** = infrastructure · **RM** = product feature · **BUG** = existing issue
Mark `[x]` when done.

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

- [x] **RM** ~~`VW-12` Build `/settings` page (Feature 6 MVP)~~ — **Done at P0 scope.** PRD v1.12 Feature 6. Account summary (email + auth method), privacy/sharing visibility toggles backed by `user_profiles.visibility`, legal links, support email, mailto-backed data deletion request, sign-out. **Open follow-ups:** `Download my data` (currently "Coming soon"), self-serve account deletion + data purge, sign-out-all-sessions, notification preferences.
- [x] **RM** ~~`VW-14` Build `/discover` route — commerce + editorial hub~~ — **Done.** PRD v1.12 Feature 14. Collection-aware insights (gap analysis, dial-color skew), next-slot recommendations with Chrono24 deep links, per-watch upgrade cards, lug-width-aware strap suggestions, box upgrade affiliate card, curated Discover Reads strip. Demo seed for guests so the page is never empty.
- [x] **RM** ~~`VW-13` Wire up `/news` — RSS-aggregated watch publications~~ — **Done.** PRD v1.12 Feature 11. Cloudflare Worker backend (`NEWS_WORKER_URL`) handles RSS fetch + brand/reference tagging, Next.js API route proxies with 15-min revalidation. Hero featured article, source pills, mode tabs (Latest / For You / By Source), filter bar, sponsored slot framework. Personalization driven by collection + followed signals.
- [x] **RM** ~~Edit owned watch metadata from sidebar~~ — **Done.** EditWatchModal exists for condition / ownership status / purchase price / purchase date / notes. Available from sidebar pencil icon and the new owned-watch detail page (`/collection/watch/[id]`).
- [x] **RM** ~~Collection Jewel state~~ — **Done.** PRD v1.12 Feature 2B Category 6. Sidebar Jewel badge, WatchStateControl picker offers `[followed, jewel]` for owned watches, profile hero selector (FeaturedProfileWatch) toggles between Grail and Jewel. Watch cards show the jewel badge.
- [ ] **RM** `/collection` UI pass — broader visual / structural polish on the working surface, including:
  - **Header / value pill / action button** spacing and hierarchy review
  - **Stats section** typography and density pass (portfolio value, dial colors, watch types, complications, brands)
  - **Cards view** spacing + status badge consistency
  - **Mobile reflow** for sidebar → bottom sheet transitions and overflow behavior
  - **Surface existing ownership fields in EditWatchModal** — has_box, has_papers, acquisition_method, warranty_expires_at, last_serviced_at, service_notes (columns exist in migration 017, not in UI)
  - *Note: Both Targets and Grail are intentionally NOT on `/collection`. `/collection` is the truth about what the user owns. Targets moved to `/discover` § 03 (PRD v1.14). Grail's home is `/profile`.*

---

## Phase 1.5 — Ownership Depth
*Make the collection page the definitive record of what you own — not just the watches, but the provenance, papers, and service history.*

- [ ] **RM** Targets/Grail section on `/discover` (§ 03) — user-curated aspirational watches between Upgrade and Next Slot sections. Up to 3 targets with intent type, target price, `Track Listings →` affiliate CTA. Grail card with crown treatment above targets when set. Highest-ROI affiliate surface — explicit purchase intent. Data already wired (`nextTargets[]`, `grailWatchId`).
- [ ] **RM** Photo type picker — surface `photoType` in upload flow (optional chips) and lightbox toolbar (type selector pill). DB column exists (migration 018, `user_watch_photos.photo_type`), not wired in UI.
- [ ] **RM** Papers & Provenance section on detail page — filtered gallery view for document-type photos (`receipt`, `warranty_card`, `service_record`, `box_papers`). Compact horizontal strip between specs and main gallery.
- [ ] **RM** Ownership detail strip on detail page — acquisition method, has box, has papers, warranty expiry. Compact chips below specs. Data exists (migration 017), needs `EditWatchModal` UI + detail page display.
- [ ] **RM** Service History (Feature 2F) — new `watch_service_records` Supabase table. Service timeline on detail page with past services, next-due estimate (5yr from last full service), running cost total. `+ Log a service` form. Sidebar "Last serviced" hint.
- [ ] **RM** Expand `EditWatchModal` — add has_box, has_papers, acquisition_method, warranty_expires_at, last_serviced_at tabs/sections to the existing modal.

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
- [ ] **RM** Drag-to-reorder in Collection — still pending. Playground has full drag support; Collection needs parity.
- [ ] **RM** `VW-17` The Strap Drawer (Feature 7) — first-class strap inventory at `/collection/straps`. Add Strap modal (material + lug width + color required). Card grid with material badges + compatible watch count. Strap detail sidebar with "Fits these watches" list. Auto-match by lug width + manual `fits`/`excluded` overrides. Combo stats in header ("X watches and Y straps create Z combinations"). New Supabase tables: `user_straps` + `strap_watch_overrides`. **Replaces** the old VW-17 (strap swap affiliate links) and VW-18 (strap viewer) — the Strap Drawer is the foundation both depend on.
- [ ] **RM** Strap Drawer phase 2 — CSS material swatches (design prototype in `docs/design-system/`), compatibility matrix view, sidebar "Swap Strap" quick-pick wired to drawer, lug width distribution in collection stats. Discover "missing strap" suggestions grounded in actual strap inventory.
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

*Last updated: May 23, 2026 · PRD reference: v1.14*
