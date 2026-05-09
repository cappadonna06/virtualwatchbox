# Catalog IDs and URLs

The single source of truth for how a watch becomes a database id, a URL slug, and a Storage path.

The minting logic lives in [`lib/catalogId.ts`](../lib/catalogId.ts). Every ingestion path, the seed script, the URL router, and the admin tooling go through it. Do not invent ids or slugs by hand.

---

## ID rule

```
id = {brand-slug}-{reference-slug}                  # 95% of watches
   = {brand-slug}-{reference-slug}-{dial-slug}      # same ref, multiple dials (rare)
   = {brand-slug}-{model-slug}-{disambiguator}      # ref-less (microbrand, vintage)
```

### Examples

| Watch | Reference | Catalog ID |
|---|---|---|
| Rolex Submariner Date | `126610LN` | `rolex-126610ln` |
| Rolex GMT-Master II "Pepsi" | `126710BLRO` | `rolex-126710blro` |
| Patek Philippe Nautilus | `5711/1A-010` | `patek-philippe-5711-1a-010` |
| Omega Speedmaster Moonwatch | `310.30.42.50.01.001` | `omega-310-30-42-50-01-001` |
| A. Lange & Söhne Lange 1 | `191.032` | `a-lange-and-sohne-191-032` |
| Vintage Rolex Submariner with gilt dial | `6204` (same ref, multiple dials) | `rolex-6204-gilt` |
| Lorier Falcon Series III (no ref) | — | `lorier-falcon-iii` (community-tagged) |

### Normalization

Performed by `baseSlugify()` in `lib/catalogId.ts`:

1. Lowercase
2. NFD-normalize and strip combining diacritical marks (`söhne` → `sohne`, `café` → `cafe`)
3. `&` → `and`, `+` → `plus`
4. Replace any run of non-alphanumeric chars with a single hyphen
5. Collapse consecutive hyphens, trim leading/trailing hyphens

### Reference policy

**Reference is required for any modern post-2000 watch from a known brand.** This is enforced by `mintCatalogId()` — it throws when both reference and `disambiguator` are missing. The ingestion script propagates the error to a per-row report so missing-ref entries are visible.

The fallback `{brand}-{model}-{disambiguator}` form is for:

- **Vintage** watches where the original reference is genuinely unknown
- **Microbrands** that don't use a reference number system

In both cases, the catalog row should be tagged `verification_status='community'` so consumers know the id is softer than a brand-issued reference.

---

## URL strategy

Two URL forms; the canonical detail page is the slug, the database key is the id.

```
/watches/{slug}                  # canonical SEO URL: /watches/rolex-submariner-date-126610ln
/brands/{brand-slug}             # browse by brand (future)
/brands/{brand}/{model-family}   # browse by family (future)
```

The `slug` lives on `catalog_watches.slug` as a stored generated column (`lower(brand-model-reference)`) and is indexed (migration 020). For internal references — FKs, API payloads, code — always use `id`.

`mintCatalogSlug()` in `lib/catalogId.ts` produces the canonical slug. Slugs can change over time as a watch is renamed or reclassified; ids cannot.

---

## Storage paths

### Catalog images (admin curated)

Bucket: **`watch-images`** (public read, admin write)

```
{catalog-id}/{variant}.{ext}

watch-images/rolex-126610ln/primary.webp
watch-images/rolex-126610ln/dial.webp
watch-images/rolex-126610ln/case_back.webp
```

`catalogImageStoragePath()` in `lib/catalogId.ts` formats this. One folder per watch keeps admin housekeeping simple — bulk delete is a single prefix scan.

### User gallery photos

Bucket: **`watch-photos`** (public read, RLS-fenced write per user folder)

```
user-uploads/{user-id}/{owned-watch-id}/{photo-id}.{ext}

watch-photos/user-uploads/abc.../uuid-of-owned-watch/uuid-of-photo.jpg
```

`userPhotoStoragePath()` in `lib/catalogId.ts` formats this.

---

## Migration

The 87 hand-curated entries in `lib/watches.ts` were renamed in one shot via `scripts/migrateCatalogIds.ts`. The full old → new map is committed at `data/catalog-id-migration.json` for reference. Re-runs of the migration script are no-ops (idempotent).

`scripts/seedCatalog.ts` revalidates every seed entry against `mintCatalogId()` before writing. A non-canonical id in the seed aborts the seed run with a clear list of mismatches.
