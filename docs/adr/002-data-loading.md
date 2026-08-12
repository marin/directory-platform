# Data loading approach

## Decision

Adopt **Astro Content Collections** with a `glob` loader pointing at `data/entries/*.json`, combined with a Zod validation layer in `src/lib/data/load-dataset.ts` for referential integrity and site-wide validation.

## Rationale

- Content Collections provides typed access, build-time loading, and Zod schema validation per file.
- Site-owned data remains in `data/` per the template invariant (§8.1).
- Referential checks (category/area existence, redirect targets, quality thresholds) require cross-file validation, handled by `load-dataset.ts` and `npm run validate` rather than per-collection `refine()`.

## Rejected alternative

A fully custom JSON loader without Content Collections would duplicate schema definitions and lose Astro's typed `getCollection()` API.
