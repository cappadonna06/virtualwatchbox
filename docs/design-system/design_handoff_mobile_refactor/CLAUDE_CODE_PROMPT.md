# Claude Code Prompt — The Service Room: Mobile Refactor + Document Attachments

Paste into Claude Code from the repo root. Assumes "The Service Room" desktop hub is already shipped and the reference bundle (`design_handoff_mobile_refactor/`) is readable.

---

## Prompt

> Two scoped additions to the existing **Service Room** maintenance hub (already shipped on desktop — do **not** rebuild it). The full spec + reference files are in `design_handoff_mobile_refactor/` — read `README.md`, then `source/`, then `screenshots/`. Recreate the behavior in our React + Supabase stack with our existing components; the reference is HTML/inline-style and not for direct copy.
>
> **1) Make the hub responsive (breakpoint < 760px).** Drive every breakpoint from one source (a `useMediaQuery`/container hook), not duplicate routes. Apply, surface by surface (see the README table):
> - **Nav** → collapse links to a hamburger; smaller bar.
> - **Header** → 34px title; move Export down beside the layout switch.
> - **Summary strip** → 2×2 grid.
> - **Service Horizon** → wrap in a horizontal-scroll container with a ~660px min-width inner canvas so it stays swipeable; keep the dot = exact-due-month behavior.
> - **Agenda "On the bench" card** → watch image fills the full card height; stats become a 3-column grid with short labels (LAST / EVERY / UPKEEP); **the two action buttons stack full-width** (they overflow if left inline — this is the key fix).
> - **Agenda "Resting easy" row** → compact 3-column layout.
> - **Ledger** → replace the 7-column table with stacked status-bordered cards + a `<select>` sort control.
> - **Gallery / partner band / drawer / modal** → already fluid; confirm 1-column / full-screen behavior.
> - Gutters 40 → 18px.
>
> **2) Add document attachments to "Log a Service".** A bottom "Attach documents" field: a dashed upload button over a hidden `<input type="file" multiple accept="image/*,application/pdf">`; each file becomes a row with a gold doc tile, filename, an editable **document-type select** (auto-guessed from filename — see README heuristics), and a remove button. On save, upload files to storage and insert `watch_documents` rows (dated to the service) alongside the `watch_service_records` insert, ideally transactionally; they should then surface in the detail page's **Papers & Provenance** and increment the Ledger "Papers" count. Also fix the "Resets the service clock — next due recalculates to N years out" note so the year doesn't break onto its own line (wrap the sentence in one inline element).
>
> Keep accessibility solid (focus trap + Esc on the modal/drawer, ≥44px hit targets, the file input reachable by keyboard). Use our existing `DOC_TYPES` taxonomy and any current photo/document upload plumbing. Flag anywhere our patterns should override the reference.

---

### Notes
- One breakpoint (760px); no separate mobile build.
- Mobile bench buttons **must** stack — side-by-side overflows the ~227px card column.
- All derived values (status, next-due, costs) remain computed, not stored.
- A `The Service Room — Mobile.html` iPhone-frame harness exists in the prototype for QA only.
