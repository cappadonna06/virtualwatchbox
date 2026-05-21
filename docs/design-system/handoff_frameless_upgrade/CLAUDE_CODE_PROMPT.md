# Prompt for Claude Code

Copy everything below the `---` after dragging the unzipped `handoff_frameless_upgrade/` folder into your workspace.

---

I'm updating the Upgrade This Watch section on `/discover` to a Frameless treatment. The rest of the Discover page is already built — **only update this section**.

**Open `handoff_frameless_upgrade/README.md` first** — it's the spec. Also check `screenshots/desktop.png` + `screenshots/mobile.png` for visual reference, and `FramelessUpgrade.html` for the live design.

**What's changing:**

1. The inner paper-warm image boxes — **remove them**. Watches now sit directly on the cream card surface.
2. The "Stretch" pill in the top-right of aspirational cards — **delete it**. Aspirational state is signaled by the gold halo + italic model name on the Consider watch only.
3. The center "Step Up" column — **promote it**. It's now the visual peak between the two watch images: small `STEP UP` kicker on top, italic 26px Cormorant gold delta, then a wider 44px arrow.
4. A soft **gold radial-gradient halo** behind the Consider watch (no border) — exact gradient is in the README §"TO column".
5. Watch images normalized to a **fixed 260×260 box** with `object-fit: contain` so visual mass is identical regardless of source image aspect ratio.

**Approach:**

1. Find the existing Upgrade This Watch / `UpgradeRow` component in this repo and read it to understand the current pattern.
2. Apply the spec in the README exactly — every pixel, color, font, letter-spacing, padding value is intentional. The `box-shadow` / radial-gradient values matter; don't approximate.
3. Keep the data shape unchanged (`UpgradePath` — `aspirational` flag stays on the data even though it's no longer rendered as a pill).
4. Make sure mobile reflow still works (stack vertically per the README "Grid" section).
5. Drop the placeholder watch images — the production catalog supplies the real ones via the existing image-resolution-fallback chain (see PRD Feature 2D if you have it).

**Things to flag before committing:**

- If your codebase has component primitives for the kicker / italic-serif headline / link button — use them instead of inline styles.
- If the gold halo causes painting issues at low zoom levels (some Safari versions), wrap it in `transform: translateZ(0)`.
- If your Tailwind config doesn't have the exact `0.18em` / `0.22em` letter-spacing values, add them rather than rounding.

The section spec in the README is the source of truth. The HTML prototype is the reference. The screenshots are the visual target. Match all three.
