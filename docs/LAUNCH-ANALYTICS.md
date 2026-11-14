# Launch analytics

The production domain resolves to the `virtualwatchbox` project under the `marc-sells-projects` Pro team. A read-only check on November 14, 2026 found that the production Web Analytics script was served successfully. Pro supports custom events with two properties per event. The installed SDK is `@vercel/analytics` 2.0.1 and exposes the browser `track(name, properties)` function from `@vercel/analytics`. Live ingestion of the launch events and the team's Web Analytics Plus status still need dashboard verification. [Vercel custom events](https://vercel.com/docs/analytics/custom-events) · [Vercel plan limits](https://vercel.com/docs/analytics/limits-and-pricing)

## Activation counts

| Event | When it counts |
| --- | --- |
| `first_owned_watch_added` | An explicit catalog or photo-confirm add to a collection without a prior saved owned watch. The guest session snapshot or the signed-in Supabase upsert must succeed. |
| `first_three_watch_playground_box` | The first explicit Playground change that brings a single box to at least three occupied watch slots. Catalog adds, tray drops, and importing at least three owned watches into an empty box qualify, including when the collector fills the default empty box. Older prefilled sample entries are excluded. The guest local write or debounced Supabase sync must succeed. |
| `first_launch_activation` | The first of either activation event in this browser profile. Use this count for combined browser activations. |

Hydration, guest-to-account migration, ownership edits, reorders, and failed saves produce no activation on their own. Existing collections and completed boxes are baseline data. This instrumentation does not backfill historical activations. Signed-in Playground sync retries are part of the same write. A failed batch can qualify on a later successful save of that pending change.

Use event totals for these counts. A Boolean marker per event in local storage suppresses repeats across tabs, reloads, and sign-in in ordinary use. A document-level marker handles unavailable local storage. The markers record dispatch attempts because the browser SDK provides no ingestion acknowledgment. Blockers, rapid tab exits, cleared storage, simultaneous tabs, multiple browsers, and shared browser profiles can change the counts. The markers contain no identifiers and cannot deduplicate people across browsers or measure person-level retention. The combined event takes its attribution from the first successful activation dispatched.

## Attribution

Use links such as `/playground?utm_source=rwatches&utm_medium=community&utm_campaign=three_watch_box`. Approved sources are `founder_network`, `rwatches`, `los_angeles_watch_collective`, `unpolished_watches`, and `instagram`. Approved media are `community` and `creator`. The campaign is `three_watch_box`. Add new partner labels to `campaignLabels` in [lib/launchAnalytics.ts](../lib/launchAnalytics.ts) before distributing their links.

The last complete approved trio in the tab is kept in session storage. The `campaign` property carries it in `source/medium/campaign` order as one filterable value, for example `rwatches/community/three_watch_box`. The optional second property is `referral=playground_share` when the recipient used the build CTA in that tab. Internal navigation retains attribution and the mutation captures it before an asynchronous write. Event properties contain only these fixed labels. The Vercel URL filter drops query strings and fragments, reduces dynamic watch and box paths to route templates, and reduces recipient URLs to `/playground/share`.

## Share integration

Import `trackPlaygroundShare` from `@/lib/launchAnalytics` in the client components that own the actions below. The helper accepts only an event name and reads attribution itself.

| Event | Integration point |
| --- | --- |
| `playground_share_copied` | Call after the clipboard write resolves successfully. A failed clipboard write or manual-copy prompt does not qualify. |
| `playground_share_viewed` | Call once on the client when a validated, resolved snapshot is visible. Guard re-renders and React Strict Mode with a ref for that visit. Invalid links, metadata generation, and link prefetches do not qualify. |
| `playground_share_build_clicked` | Call from the actual **Build your own box** link before navigation. The helper sets the tab attribution used by the later Playground activation. |

Share totals represent successful copy actions, valid page visits, and CTA clicks. Reloads of a valid link can count as another visit. Filter the Playground activation event by `referral=playground_share` for browser completions following the CTA. These aggregate counts do not tie a completion to a specific sender, link, or person.

## Confirm ingestion after deployment

1. In a fresh browser profile with blockers disabled, open a tagged URL and use the product to save an owned watch and fill a Playground box. Wait for each save to complete. Reload, reorder, and add another watch to check for duplicate activations. Use a separate fresh profile for the signed-in flow.
2. In DevTools Network, check the Vercel Analytics event POSTs. The standard endpoint is `/_vercel/insights/event`. SDK v2 can use a deployment-specific path, visible in the loaded script's `data-event-endpoint`. The two activation events and one combined event should carry only the expected labels and redacted route metadata.
3. In Vercel, open the project’s **Analytics → Events** panel. Verify that all three event names and the expected `campaign` filter appear for the relevant time range. Once the share hooks are wired, test a copied URL in a fresh browser, click the build CTA, finish the box, and verify each share event and the activation's `referral` value. A network response alone does not establish that a dashboard count was ingested. [Vercel dashboard instructions](https://vercel.com/docs/analytics/custom-events#tracking-custom-events-in-the-dashboard)

In local development the SDK logs debug events instead of submitting them to Vercel. A local check can verify event names, props, and save gating. It cannot verify billing entitlements or ingestion.
