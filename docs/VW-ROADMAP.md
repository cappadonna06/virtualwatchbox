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

---

## Phase 0 — Stability & Trust
*Ship these before spreading the link.*

- [ ] **IF** `VW-1` Fix profile not syncing with Supabase — auth is live, sync must work before sharing feels trustworthy
- [ ] **IF** `VW-4` Set Google auth sender address to virtualwatchbox.com — personal address erodes credibility
- [x] **IF** `VW-8` ~~Set up Resend for transactional email~~ — **Done.** Resend live, Supabase SMTP swapped, branded templates deployed, DNS/routing via Cloudflare
- [ ] **IF** `VW-9` Update support email in Terms & Privacy to official virtualwatchbox address
- [ ] **IF** `VW-11` Fix admin flow: watch detail completeness + reference data quality — catalog gaps show up in search/sidebar for every user
- [ ] **BUG** `VW-2` Fix Grail contrast issue on desktop
- [ ] **BUG** `VW-3` Fix watchbox auto-shrinking when deleting a watch
- [ ] **BUG** `VW-5` Fix watchbox sizing too large on profile page
- [ ] **BUG** `VW-6` Desktop Playground + Collection UI polish pass — layout/spacing issues making core surfaces feel unfinished
- [ ] **BUG** `VW-7` Sweep general bug backlog — clear the board before building net-new

---

## Phase 0.5 — Cloudflare Infrastructure
*You're already paying for it and nameservers are managed here — set these up now while the context is fresh. All are either free or low-cost and materially improve security, performance, and ops.*

- [ ] **IF** Enable Cloudflare Analytics — free, privacy-friendly, no cookie banner required. Replace or supplement any GA setup. Dashboard → Analytics & Logs → Web Analytics.
- [ ] **IF** Configure Cloudflare caching rules for Next.js static assets — cache `/_next/static/*` at edge, set long TTLs. Cuts origin load and speeds global delivery.
- [ ] **IF** Set up Cloudflare WAF rules — block common attack patterns (SQLi, XSS, bad bots) on the free plan. Especially important once auth + user data is live.
- [ ] **IF** Enable Cloudflare Turnstile on auth pages — replaces reCAPTCHA with a privacy-respecting, invisible bot check. Wire into `/auth` sign-in flow. Free tier is generous.
- [ ] **IF** Configure Cloudflare R2 bucket for user watch photos — replaces planned Cloudinary dependency for Collection Photo uploads (VW-10) and future AI photo uploads (VW-15). S3-compatible API, no egress fees. Set up bucket + access keys now so VW-10 has a ready storage target.
- [ ] **IF** Set up Cloudflare Images for watch photo delivery — resizing, format conversion (WebP/AVIF), and CDN delivery for user-uploaded watchbox photos. Pairs with R2. $5/month flat for up to 100k images.
- [ ] **IF** OG image generation via Cloudflare Workers + Satori — deploy a Worker that renders branded OG images for profile and box share links at edge. Faster and cheaper than a server-side route. Directly unblocks the OG image roadmap item in Phase 2.
- [ ] **IF** Configure redirect rules — ensure `www.virtualwatchbox.com` → `virtualwatchbox.com`, HTTP → HTTPS, and any legacy paths are handled at the edge rather than in Next.js.
- [ ] **IF** Set up Cloudflare Email Routing catch-all — route any `*@virtualwatchbox.com` to personal inbox as a safety net so no emails sent to the domain get silently dropped.

---

## Phase 1 — Complete the Product Contract
*Things the nav promises but doesn't deliver.*

- [ ] **RM** `VW-12` Build `/settings` page (Feature 6 MVP) — account summary, privacy/sharing toggles, legal links, request data deletion, local cache reset. P0 per PRD v1.11. Once auth is live users need control.
- [ ] **RM** `VW-14` Build `/discover` route — commerce + editorial hub. Nav link is dead (href='#'). Define as: curated brands, trending references, affiliate CTAs (Chrono24). Turns a broken nav item into a monetization surface.
- [ ] **RM** `VW-13` Wire up `/news` — RSS-aggregated watch publications. Nav link is dead. MVP: aggregate 3–5 sources (Hodinkee, Worn & Wound, WatchTime). Read-only feed, no auth required.
- [ ] **RM** Edit owned watch metadata from sidebar — condition, purchase price/date, notes, ownership status. Core CRUD gap that's missing on every owned watch.
- [ ] **RM** Collection Jewel state — badges, sidebar actions, profile hero selector. Completes the Grail/Jewel emotional model. PRD v1.10 delta.
- [ ] **RM** Grail surface on `/collection` — crown-icon treatment, Find on Market CTA. Grail is designated but has no dedicated section on collection.
- [ ] **RM** Next Targets panel on `/collection` (max 3) — intent type, target price, condition, Track Listings affiliate CTA. Monetization hook.

---

## Phase 2 — Collector Delight
*Features that make people share the app.*

- [ ] **RM** `VW-10` Collection Photo view — upload/take photo of real watchbox (Feature 2A View C). Camera icon in view switcher. Framing guide. Uses R2 for storage (set up in Phase 0.5).
- [ ] **IF** OG image generation for profile + box share links — deploy via Cloudflare Workers + Satori (Phase 0.5 item). Without OG images sharing is a naked URL.
- [ ] **RM** Save as Playground from Collection draft state — unsaved changes bar "Save as Playground" is a placeholder, wire it up.
- [ ] **RM** Drag-to-reorder in Collection and Playground — P1 per PRD. No draft workflow needed for Playground. Adds tactile feel to both core surfaces.
- [ ] **RM** `VW-18` Strap Viewer — display watch with alternate straps. Foundation for strap affiliate CTAs.
- [ ] **RM** `VW-17` Strap Swap / matchmaking with affiliate links (Feature 7) — filter by lug width, link to WatchWarehouse / Etsy. Monetization surface.
- [ ] **RM** Shop This Box — physical box affiliate matching. When user configures virtual box, surface Wolf1834 / Rapport / Holme & Hadfield matches. Direct revenue.

---

## Phase 3 — Intelligence + Live Data

- [ ] **RM** `VW-15` Add watch via AI photo detection flow (Feature 9) — upload watch photo → identify → pre-fill add-watch form. Google Vision AI. Uses R2 for photo staging. Biggest friction reducer in the add flow.
- [ ] **IF** Wire WatchCharts for live market pricing — replace static estimatedValue with live pricing. Unlocks value-tracking as a retention hook.
- [ ] **RM** Smart Suggestions engine — personalized watch recs (Feature 8). Based on collection, followed, search history. Feeds Discover surface and sidebar upsells.
- [ ] **RM** AI weekly digest — personalized watch news summary. OpenAI-powered, relevant to the user's collection and followed watches. Drives weekly retention.

---

## Phase 4 — Scale + Public Identity

- [ ] **IF** Account-backed `/u/[handle]` public profile routes — replace localStorage demo with real Supabase-backed public profiles. Required before any growth/sharing push.
- [ ] **IF** Account-backed public box routes `/u/[handle]/box/[slug]` — Playground and Collection box share links resolve here post-auth.
- [ ] **RM** `VW-16` Virtual Try-On Room — preview watch on wrist photo (Feature 10). Rare in the category. High shareability.
- [ ] **RM** Integrated sell listing support (Feature 12) — Find For Sale deep links + structured sell intent to Chrono24/eBay as leads. Completes ownership lifecycle.
- [ ] **IF** White-label licensing foundation (future) — infrastructure for dealer/brand partnerships.

---

*Last updated: May 2026 · PRD reference: v1.11*
