# Directory Platform

Standalone reusable directory platform template built with Astro and TypeScript.

## Quick start

```bash
npm ci
cp .env.example .env   # optional — not required for build
npm run validate
npm run build
npm run test
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Static build + Vercel redirects |
| `npm run validate` | Validate config and data files |
| `npm run test` | Unit and generated-site tests |
| `npm run smoke` | Post-build smoke checks |
| `npm run repo:scan` | Scan for blocked patterns |

See `package.json` for data pipeline commands (`data:*`, `entry:publish`).

## Site-owned directories

Site-specific material lives only in:

- `config/`
- `content/`
- `data/`
- `public/`
- `.env`

Platform code under `src/`, `scripts/`, and `tests/` is shared across template instances.

## Deployment

Build output is in `dist/`. `vercel.json` redirects are generated from `data/redirects.json` during build.

### GitHub

Repository: https://github.com/marin/directory-platform

```bash
git push origin main
```

### Vercel

Production URL: https://directory-platform-swart.vercel.app

The Vercel project `directory-platform` is linked locally (`.vercel/project.json`). To enable automatic deploys on push:

1. Grant the [Vercel GitHub App](https://github.com/apps/vercel/installations/select_target) access to `marin/directory-platform`.
2. Connect the repo in [Project Git Settings](https://vercel.com/marin-7752s-projects/directory-platform/settings/git), or run:

```bash
vercel git connect https://github.com/marin/directory-platform
```

CI already runs on push via `.github/workflows/ci.yml`.
