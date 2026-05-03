# Watch Image Pipeline

Local intake is a manual review workflow. Vision identification and fuzzy matching are used only by the script that prepares the CSV; runtime app behavior reads deterministic catalog data and the processed image manifest.

1. Drop unknown watch image files into `public/watch-assets/inbox`.
2. Run `npm run images:intake`.
3. Review `public/watch-assets/intake-review.csv`.
4. Mark valid rows as `approved` in the `status` column.
5. Run `npm run images:apply-intake`.
6. Run `npm run images:process`.
7. For approved new watches, run `npm run images:catalog-candidates` and use `public/watch-assets/catalog-candidates.json` to add reviewed rows to `lib/watches.ts`.

Approved source images move into `public/watch-assets/raw`. The app only uses generated files from `public/watch-assets/processed`, with WebP paths attached to catalog watches through `public/watch-assets/processed/manifest.json`.

When `OPENAI_API_KEY` is set, intake sends a normalized JPEG preview of each inbox image to the OpenAI Responses API for visual identification. The script asks the model to read dial text, reference clues, case/dial traits, lug width, and strap/bracelet details, then either choose an existing `lib/watches.ts` catalog ID or propose a new catalog-ready ID. New watches are written with `catalogAction` set to `new-catalog-candidate`; review those fields before approving and add the corresponding catalog row when you want the app to render that processed image.

Useful flags:

- `npm run images:intake -- --no-vision` uses filename/catalog matching only.
- `npm run images:apply-intake -- --force` replaces existing raw files.
- `npm run images:apply-intake -- --keep-originals` copies into `raw` and leaves inbox files in place.
- `npm run images:process -- --trim-background` applies stricter Sharp trimming for already transparent or near-transparent source images.
- `npm run images:catalog-candidates` exports approved new-catalog rows for manual catalog insertion.

Optional environment:

- `OPENAI_API_KEY` enables visual identification during intake. It can be exported in your shell or placed in `.env.local`.
- `OPENAI_VISION_MODEL` overrides the default vision model, currently `gpt-4.1-mini`.
