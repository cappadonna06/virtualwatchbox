# vw-news-feed

Cloudflare Worker that aggregates 5 watch publication RSS feeds for Virtual Watchbox, tags each article (brands / references / categories), caches the merged result in Workers KV for 15 minutes, and serves it as JSON.

## Endpoints

- `GET /` — `NewsItem[]`, sorted `publishedAt` desc, max 60 items (12 per source max).
- `GET /health` — `{ ok, cachedAt, itemCount }`.

CORS is set to allow `https://virtualwatchbox.com`, `https://www.virtualwatchbox.com`, and `http://localhost:3000`.

## One-time setup

```bash
cd workers/news-feed
npm install
npx wrangler login
npx wrangler kv:namespace create NEWS_CACHE
```

Paste the returned id into `wrangler.toml` (`[[kv_namespaces]] id = "..."`).

For local dev with KV emulation:

```bash
npx wrangler kv:namespace create NEWS_CACHE --preview
```

…and add `preview_id = "..."` to the same block.

## Develop

```bash
npm run dev
# curl http://127.0.0.1:8787/
# curl http://127.0.0.1:8787/health
```

## Deploy

```bash
npm run deploy
```

After deploy, paste the `https://vw-news-feed.<subdomain>.workers.dev` URL into the Next.js app's `.env.local` as `NEWS_WORKER_URL=...`.

## Type contract

The `NewsItem` shape in `index.ts` is duplicated from `types/news.ts` so the Worker bundles standalone. If you change either, update both.
