# Virtual Watchbox — iOS Conversion Architecture Plan

**Status:** Planning · **Owner:** TBD · **PRD reference:** v1.15 (Platform §1.3 — *"Future: Native iOS and Android"*)
**Codebase reviewed through:** PR #84 (catalog cleanup) · main @ `47e54a7`
**Roadmap:** see `docs/VW-ROADMAP.md` → Phase 5 — Native iOS

Read this before starting any iOS / native work. It captures the current-state
assessment, the chosen conversion strategy, the concrete blockers, and the
sequenced plan so a future session can pick up without re-deriving context.

---

## 1. TL;DR / Decision

- **Chosen path: Capacitor hybrid wrapper (Option B2).** Wrap the existing
  Next.js front-end in a native iOS shell (WKWebView via Capacitor). Ship the
  consumer surfaces as a fast, offline-capable bundle; keep API routes and
  server-only image processing on the hosted backend; talk to Supabase + our
  APIs over HTTPS.
- **Why:** the app is ~90% client components (96 of 106 `.tsx` files are
  `'use client'`) with a disciplined design-token layer (`lib/brand.ts`) and an
  existing PWA manifest. Capacitor reuses essentially all React/TS/component
  code. A React Native rewrite (Option C) is months of work for a feel upgrade
  we don't need yet; a pure PWA (Option A) gives no App Store presence.
- **Top 3 things that must change before it feels right:** (1) decouple auth
  from cookies/middleware → token-based Supabase session in native secure
  storage; (2) native Google OAuth (no redirect-callback in webview); (3) safe
  areas (`env(safe-area-inset-*)` + `viewport-fit=cover`).

---

## 2. Current-State Assessment

### What's in our favor
- **Client-heavy rendering.** 96/106 components are client components. The UI
  already runs in a browser sandbox without per-render server round-trips.
- **Clean state ownership.** `CollectionSessionProvider`, `CatalogProvider`,
  `WatchImagesProvider`, `AuthProvider` own all user/app state and can be
  consumed by a native shell unchanged.
- **Design-system discipline.** `lib/brand.ts` tokens (color/type/spacing/
  motion/radius/shadow), enforced by `CLAUDE.md`. One source of truth → a
  consistent native frame (status bar, splash, tab tint) is achievable.
- **Backend is already a mobile-friendly API surface.** Supabase (Postgres +
  RLS + Storage + Auth) SDK runs natively. We are not coupled to a monolith.
- **PWA baseline exists.** `app/manifest.ts` (standalone, theme/background
  colors, categories), full icon set (`icon-192/512`, maskable, apple-touch),
  and `appleWebApp: { capable: true }` in `app/layout.tsx`.
- **Persistence discipline.** The CLAUDE.md rule (every user field → migration
  + hydrate + sync + snapshot) means the data layer is coherent, which de-risks
  an eventual offline/sync layer.
- **Warm-load + sync foundations already exist.** PR #81 added a per-user,
  versioned instant-paint localStorage cache for collection + profile (cleared
  on sign-out/account switch); PR #70 added retry-with-backoff + flush-on-hide
  across all Supabase writes. This is most of the read-side offline UX and the
  write-durability hardening a native app wants — we extend it, not build it.

### What will bite on iOS
1. **Auth is cookie + middleware based.** `middleware.ts` → `updateSession`;
   `lib/supabase/server.ts` uses `cookies()`; the browser client uses
   `@supabase/ssr` `createBrowserClient` (cookie-backed). Webview cookie
   handling is fragile and a native shell has no Next.js middleware to refresh
   sessions. **This is blocker #1.**
2. **24 API routes; several genuinely server-only.** `process-image`,
   `user-watches/upload-photo`, `create-from-photo`, `user-straps/[id]/photo`
   pull in `sharp` + `@imgly/background-removal-node` with `runtime='nodejs'`.
   These cannot run on-device and cannot be statically exported — they must stay
   hosted.
3. **No safe-area handling.** `app/globals.css` (640 lines) has no
   `env(safe-area-inset-*)` and no `viewport-fit=cover`. Content will collide
   with the Dynamic Island / home indicator on notched devices.
4. **OAuth is redirect-based.** `app/auth/callback/route.ts` + Google OAuth
   assume web redirect flow; won't fire correctly inside a webview without
   native auth-session + deep-link handling.
5. **Web-shaped navigation.** Sticky top `NavBar` + mobile drawer. iOS users
   expect a bottom tab bar + native back gestures. App Store guideline 4.2
   ("minimum functionality") risk if we ship a thin web wrapper with no native
   value.
6. **Server-dependent routes that don't belong in the mobile bundle.**
   `/admin/*` (all `force-dynamic`) and `/api/og/box/[slug]` (edge runtime) are
   web/admin-only — exclude from mobile scope.

### Readiness scorecard
| Dimension | Status | Notes |
|---|---|---|
| Client-rendered UI | Strong | 96/106 client components |
| Design tokens / consistency | Strong | `lib/brand.ts`, enforced |
| PWA baseline | Good | manifest + icons + apple-web-app present |
| Backend mobile-fit | Good | Supabase SDK runs natively |
| Auth model | Needs work | cookie/SSR/middleware → token-based |
| Server-only routes | Manage | keep hosted; can't bundle on-device |
| Safe areas / native chrome | Absent | no `env(safe-area-inset)`, no tab bar |
| Native OAuth flow | Needs work | redirect callback won't work in webview |
| Offline behavior | Partial+ | per-user instant-paint localStorage cache (PR #81) + retry/flush-on-hide sync (PR #70) already exist — strong warm-load foundation; still no true offline write queue |
| Push / native APIs | Not started | none wired |

---

## 3. Path Options (and why B2)

### Option A — PWA only (Add to Home Screen)
Nearly free; we're 90% there. **But:** no App Store presence, weak iOS push,
no native camera/share polish, no IAP. Good as a *bridge*, not the destination.

### Option B — Capacitor wrapper ✅ CHOSEN
Wrap the Next.js app in a native iOS shell (WKWebView) via Capacitor.
- **B1 — Remote URL:** Capacitor points at deployed `virtualwatchbox.com`.
  Fastest; keeps SSR + all API routes + middleware. **Risk:** guideline 4.2
  rejection unless we add native value.
- **B2 — Hybrid (TARGET):** statically export the *consumer* surfaces
  (collection, discover, profile, playground, straps, service-room) into the Capacitor
  bundle; keep API routes + image processing hosted; talk to Supabase + our
  APIs over HTTPS. Fast, offline-capable, App-Store-acceptable.

### Option C — React Native / Expo rewrite
Best native feel + strongest App Store story. **But:** full UI rewrite — inline-
style web components, `framer-motion`, `@dnd-kit`, `react-easy-crop`, DOM/SVG
dial rendering all need native replacements. Months of work. Reconsider only if
iOS becomes the *primary* platform.

**Decision:** Option B2 (Capacitor hybrid). Reuse the codebase, ship to the App
Store, add native polish incrementally.

---

## 4. Target Architecture (B2)

```
┌─────────────────────────────────────────────────────────────┐
│  iOS App (Capacitor / WKWebView)                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Static-exported consumer bundle (Next.js client)     │  │
│  │  collection · discover · profile · playground ·       │  │
│  │  straps · service-room                                 │  │
│  │  + lib/brand.ts design system (drives native chrome)  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  lib/platform/* abstraction                            │  │
│  │  storage · auth-callback · camera · share · haptics    │  │
│  │  (web impl vs Capacitor impl behind one interface)     │  │
│  └───────────────────────────────────────────────────────┘  │
│           │ Supabase JS (token auth, native storage)         │
│           │ apiFetch() → absolute base URL                   │
└───────────┼─────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Hosted backend (unchanged, stays on Vercel/host)           │
│  • Next.js API routes (24): user-watches, user-straps,      │
│    service-records, identify-watch, discover/personalize…    │
│  • Server-only image pipeline (sharp + @imgly) — NEVER       │
│    ported on-device                                          │
│  • /admin/* + /api/og/* — web-only, excluded from app        │
└─────────────────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase: Postgres + RLS + Storage + Auth                  │
└─────────────────────────────────────────────────────────────┘
```

### Key architectural rules for the conversion
- **Keep all `sharp`/`@imgly` work server-side, forever.** Do not port image
  processing on-device. Those API routes are the permanent backend.
- **Web keeps working throughout.** All native enabling changes go behind a
  platform flag / abstraction so the deployed web app is never regressed.
- **One source of truth stays one.** Native chrome (status bar style, splash,
  tab tint, launch icon) reads from `lib/brand.ts` — no new color/type system.

---

## 5. Blocker Punch-List (ordered)

1. **Decouple auth from cookies/middleware.** Move the mobile path to
   `@supabase/supabase-js` with a native storage adapter (Capacitor Preferences
   / Keychain). Keep `persistSession` + `autoRefreshToken`; drop reliance on
   `middleware.ts` / `cookies()` for the mobile build. Web keeps SSR auth.
2. **Native Google OAuth.** Replace redirect callback with Capacitor Browser +
   `ASWebAuthenticationSession` + custom URL scheme / universal link, handled by
   `supabase.auth.exchangeCodeForSession`.
3. **Safe areas + `viewport-fit=cover`.** Add `env(safe-area-inset-*)` padding
   to `NavBar`, footer, sidebars/bottom sheets, and every sticky element. Set
   `viewport.viewportFit = 'cover'`.
4. **Decide the build boundary.** Mark consumer routes exportable; exclude
   `/admin/*`, `/api/og/box/[slug]`, and image-processing API routes from the
   mobile bundle (keep hosted).
5. **Bottom tab bar for mobile.** Native-feeling tab bar (Collection / Discover
   / Playground / Profile) behind a platform check, instead of top-nav drawer.
6. **Native camera & photo upload.** `AddFromPhotoSheet` / `PhotoSearch` use
   Capacitor Camera for capture, then POST to existing `upload-photo` /
   `create-from-photo` routes (which stay server-side).
7. **App Store value-adds** (clear guideline 4.2): push notifications
   (service-due reminders, watch-news, "complete the box" nudges — data already
   exists), haptics on drag/drop, native share sheet, offline read of the
   collection.

---

## 6. Architecture Recommendations (smooth & maintainable)

- **`lib/platform/` abstraction layer** for storage, auth-callback, camera,
  share, haptics — web vs native implementations behind one interface. Keeps
  providers untouched.
- **Centralize the API client base URL.** ~38 hardcoded `fetch('/api/...')`
  callsites today. A native bundle needs an absolute base URL → introduce a
  single `apiFetch()` helper now. Small change, large payoff.
- **Extend the existing offline/sync story.** The instant-paint cache (PR #81)
  and retry/flush-on-hide sync (PR #70) already give warm-load rendering and
  durable writes. What's left for true native-grade offline is a **persistent
  write queue** (mutations survive app-kill and replay on reconnect) — the one
  gap PR #70 explicitly called out. This doubles as a guideline-4.2 value-add.
- **Carry the design system into native chrome.** `brand.ts` tokens drive status
  bar style, splash, tab tint, launch icon. Icon set already exists.
- **Add e2e smoke coverage before the auth refactor.** No tests exist today. A
  handful of Playwright flows (login, add watch, reorder, save) protect the
  auth/native refactors.

---

## 7. Sequenced Plan

### Phase 0 — Prep (web-side, low risk; no native project yet)
- [ ] Centralize `apiFetch()` with configurable base URL; migrate the ~38
      `fetch('/api/...')` callsites.
- [ ] Add `env(safe-area-inset-*)` + `viewport-fit=cover` to globals + sticky
      surfaces.
- [ ] Stub `lib/platform/*` (storage, auth-callback, camera, share, haptics)
      with web implementations.
- [ ] Add Playwright smoke tests (login, add watch, reorder, save).

### Phase 1 — Auth refactor (behind platform flag; web unaffected)
- [ ] Token-based Supabase session via native storage adapter.
- [ ] Native-capable OAuth (Capacitor Browser + custom scheme / universal link).
- [ ] Verify web SSR auth path still passes smoke tests.

### Phase 2 — Capacitor shell
- [ ] Stand up the iOS project; hybrid bundle of consumer surfaces.
- [ ] Point `apiFetch()` + Supabase at hosted backend.
- [ ] Login → collection → save working end-to-end on a physical device.

### Phase 3 — Native feel
- [ ] Bottom tab bar (platform-gated).
- [ ] Safe-area polish across all surfaces.
- [ ] Native camera capture wired into the photo flows.
- [ ] Haptics on drag/drop; native share sheet.

### Phase 4 — App Store readiness
- [ ] Push notifications (service-due, news, complete-the-box).
- [ ] Persistent offline write queue (read-through cache already shipped in
      PR #81; add app-kill-survivable mutation replay on reconnect).
- [ ] App Store assets, privacy nutrition labels (we collect photos + profile
      data), TestFlight beta.

---

## 8. Open Questions / To Decide
- Hosting target for the persistent backend (stay on Vercel vs move API routes
  to Supabase Edge Functions) — affects cold-start + cost for image routes.
- Universal links vs custom URL scheme for the OAuth callback (universal links
  are cleaner but need the apple-app-site-association file on the domain).
- Android: B2 generalizes to Android via the same Capacitor project; sequence
  after iOS ships, or in parallel at Phase 2.
- Whether to keep `@supabase/ssr` for web at all, or unify both platforms on the
  token-based `supabase-js` path to reduce two-codepath maintenance.

---

*Last updated: June 8, 2026 (reviewed through PR #84) · Living document — update as phases complete.*
