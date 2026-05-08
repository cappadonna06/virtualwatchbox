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

---

## Phase 0 — Stability & Trust
*Ship these before spreading the link.*

- [ ] **IF** `VW-1` Fix profile not syncing with Supabase — auth is live, sync must work before sharing feels trustworthy
- [ ] **IF** `VW-4` Set Google auth sender address to virtualwatchbox.com — personal address erodes credibility
- [x] **IF** `VW-8` ~~Set up Resend for transactional email~~ — **Done.** Resend live, Supabase SMTP swapped, branded templates deployed, DNS/routing via Cloudflare
- [ ] **IF** `VW-9` Update support email in Terms & Privacy to official virtualwatchbox address
- [x] **IF** `VW-11` ~~Fix admin flow: watch detail completeness + reference data quality~~ — **Done.** Catalog Manager modal lets admins edit every catalog field (works for both static seed and dynamic rows; static edits create Supabase override). Submissions Queue dedupes pending rows + inline edit + curated photo replacement. Image Intake has verify-vs-intake split and before/after photo preview.
- [ ] **BUG** `VW-2` Fix Grail contrast issue on desktop
- [ ] **BUG** `VW-3` Fix watchbox auto-shrinking when deleting a watch — *(slot-count fluctuation on add was fixed in May 2026; the deletion path may still need attention)*
- [ ] **BUG** `VW-5` Fix watchbox sizing too large on profile page
- [ ] **BUG** `VW-6` Desktop Playground + Collection UI polish pass — layout/spacing issues making core surfaces feel unfinished
- [ ] **BUG** `VW-7` Sweep general bug backlog — clear the board before building net-new

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
- [ ] **RM** Collection Jewel state — badges, sidebar actions, profile hero selector. Completes the Grail/Jewel emotional model. PRD v1.10 delta.
- [ ] **RM** Grail surface on `/collection` — crown-icon treatment, Find on Market CTA. Grail is designated but has no dedicated section on collection.
- [ ] **RM** Next Targets panel on `/collection` (max 3) — intent type, target price, condition, Track Listings affiliate CTA. Monetization hook.

---

## Phase 2 — Collector Delight
*Features that make people share the app.*

- [ ] **RM** `VW-10` Collection Photo view — upload/take photo of real watchbox (Feature 2A View C). Camera icon in view switcher. Framing guide. Uses Supabase Storage `watch-photos` bucket (already in production for the gallery).
- [x] **RM** ~~Per-watch user photo gallery~~ — **Done.** PRD v1.12 Feature 2D. Sidebar thumbnail strip + grid view on owned-watch detail page + lightbox + drag-reorder + captions + set-primary. AI photo flow auto-adds new uploads as primary. Backed by `public.user_watch_photos` with RLS.
- [x] **RM** ~~Owned-watch detail page~~ — **Done.** PRD v1.12 Feature 2E. New route `/collection/watch/[id]` with sticky image, full specs, edit/delete affordances, full-width gallery at the bottom.
- [x] **RM** ~~Duplicate-aware add page~~ — **Done.** PRD v1.12 Feature 3. Single + multi-instance treatments. "Manage your watch" + "Add another" CTAs.
- [ ] **RM** Discover page UI cleanup pass — `/discover` shipped with full feature scope but the layout, spacing, section headers, and card density need a polish pass. Goals: tighten visual hierarchy between Box Insight / Recommendations / Upgrades / Straps / Box / Reads sections; consistent card sizing within each section; mobile reflow review; surface affiliate CTAs more confidently without making the page feel salesy.
- [x] **IF** ~~OG image generation for profile + box share links~~ — **Done.** Dynamic OG cards via `/api/og/box/[slug]` (Next.js edge route, see Phase 0.5). Wired into the unified ShareBoxModal so profile and box share links render rich previews on iMessage / Slack / Twitter / etc.
- [ ] **RM** Save as Playground from Collection draft state — unsaved changes bar "Save as Playground" is a placeholder, wire it up.
- [ ] **RM** Drag-to-reorder in Collection and Playground — P1 per PRD. No draft workflow needed for Playground. Adds tactile feel to both core surfaces.
- [ ] **RM** `VW-18` Strap Viewer — display watch with alternate straps. Foundation for strap affiliate CTAs.
- [ ] **RM** `VW-17` Strap Swap / matchmaking with affiliate links (Feature 7) — filter by lug width, link to WatchWarehouse / Etsy. Monetization surface.
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

*Last updated: May 2026 · PRD reference: v1.12*
