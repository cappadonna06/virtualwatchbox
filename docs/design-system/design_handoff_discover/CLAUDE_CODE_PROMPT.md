# Prompt for Claude Code

Copy everything below the `---` line into your Claude Code session **after** dragging the unzipped `design_handoff_discover/` folder (or its parent) into your project workspace.

---

I'm shipping a redesign of the `/discover` page for Virtual Watchbox. The design is in `design_handoff_discover/` — open it now.

**Start by reading `design_handoff_discover/README.md` end-to-end before writing any code.** It's the source of truth for layout, typography, spacing, colors, data shapes, interactions, and the seven sections. Also look at the paired screenshots in `screenshots/` (one per section, desktop + mobile), open `PRD.md` Feature 14 for product context, and `Discover.html` + `DiscoverEditorial.jsx` to see the live design.

**What I want you to do:**

1. **Find the existing `/discover` route in this repo** and understand the surrounding patterns — how other pages (Collection, Playground, News) are composed, what design tokens / Tailwind classes / shared components exist, how `useCollectionSession()` is consumed, how `buildChrono24URL` is called, how the existing sidebar/hover-card pattern is wired.
2. **Recreate the editorial design in the codebase's existing stack** (Next.js + Tailwind per the PRD). The HTML prototype uses inline styles and `React.createElement` — those are reference, not production. Translate to the codebase's typography utilities, color tokens, component primitives, and routing conventions. Match the design pixel-perfectly on desktop and respect the mobile reflow rules.
3. **Strip the design-tool infrastructure** — `design-canvas.jsx`, `tweaks-panel.jsx`, the Tweaks panel in `DiscoverRoot.jsx`, and the canvas artboard wrappers. The real page is just `DiscoverNav + SectionNav + DiscoverEditorial` mounted on `/discover`.
4. **Wire up real data**. The prototype's `discover-data.jsx` hand-authors everything; replace with:
   - Owned + followed watches from `useCollectionSession()` (or its equivalent — find it in the codebase)
   - `BoxInsight.read` computed from a rules-based reader (dominant brand cluster, dial color mode, median price tier — keep it simple for v1; PRD Feature 8 / Smart Suggestions is the long-term plan)
   - `LEAD` / `NEXT_SLOT` recommendations from the same source the current `/discover` uses today
   - `UPGRADES` from per-owned-watch brand-family upgrade logic (whatever currently powers the Discover upgrade cards)
   - `STRAPS` lug-width-filtered against the user's owned lugs
   - `WATCHBOXES` with the "Best fit" badge assigned by matching the user's slot count
   - `NEWS` from the existing `/api/news` proxy, filtered by `brandsOfInterest`, capped at 4
5. **Section nav anchors must work** — smooth-scroll with the offset spec'd in the README, active tracking via `IntersectionObserver`. Section wrappers need `id` attributes: `lead`, `upgrade`, `next-slot`, `straps`, `box`, `news`.
6. **All affiliate CTAs route through the codebase's existing URL builders** — `buildChrono24URL` for watches, the strap and box partner equivalents, the existing `/news` route for the View All link.
7. **Don't ship the placeholder watch images.** They're stand-ins. The real catalog supplies images via the PRD Feature 2D image-resolution-fallback chain.

**Order of operations I'd recommend:**

1. Audit: read the README, PRD Feature 14, the existing `/discover` route, then the prototype files. Confirm you understand the seven sections and the data shapes.
2. Plan: write out which existing components/utilities you'll reuse, which need to be built, and where each piece of live data comes from. Confirm with me before coding if anything is ambiguous.
3. Scaffold: build the page shell, section nav, and one section end-to-end (suggest starting with **Upgrade This Watch** since it's the most complex layout — gets the trickiest piece out of the way).
4. Fill in: the remaining sections one at a time. Verify each against the prototype before moving on.
5. Mobile pass: respect the breakpoint rules from `Discover.html`'s `<style>` block — translate them to the codebase's responsive utilities (e.g., Tailwind's `sm:` / `md:`).
6. Polish: sticky behavior, IntersectionObserver, hover states, dark Complete the Box panel, "Stretch" badge on aspirational upgrades, "Best Fit" badge on the matching box.

**Things to check with me before shipping:**

- The `insight.read` reader heuristic (what signals it weighs)
- Strap affiliate partner copy — currently placeholder, leave the *"Affiliate partners coming soon."* italic caveat in place unless we're flipping a partner live
- The exact news brand-tag filter
- The Lead pick selection logic if it's not already wired (today's `/discover` already has `LEAD` equivalent — confirm the existing source and use it)

The design is high-fidelity and final — match it precisely. Tokens, type scale, exact spacing, and the editorial voice in the copy strings all carry weight. If you find yourself wanting to deviate, ask first.
