# Catalog Seeding

`data/catalog-seed-200.csv` is a curated target list for quickly building a polished Virtual Watchbox demo catalog. It is intentionally separate from runtime catalog rendering.

Rules:

- Treat seed rows as review targets, not final product truth.
- Prefer official manufacturer pages for specs.
- Use community signals only for selection taste, not factual specs.
- Keep `verificationStatus` honest. Blank or pending is better than wrong.
- Only app surfaces should use processed approved images.

Community signals used in the first pass include r/Watches/r/Sinn-style collection and recommendation themes: Sinn 104/U50/U1, NOMOS Club/Tangente/Orion, Seiko SKX/Captain Willard/Baby Alpinist, Grand Seiko SBGA/SBGX staples, Hamilton Khaki, Tissot PRX, Casio G-Shock, and Longines Spirit/Legend Diver.

Useful command:

```bash
npm run catalog:seed-report
```
