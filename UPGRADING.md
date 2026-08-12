# Upgrading from the platform template

When a site is created from this template, platform improvements can be merged down:

```bash
git remote add platform <directory-platform-template-url>
git fetch platform
git merge platform/main
```

Because site-specific material lives only in `config/`, `content/`, `data/`, `public/`, and `.env`, merge conflicts should be limited to those directories.

After merging:

```bash
npm ci
npm test
npm run validate
npm run build
```

## Template divergence check

Site repositories pin the template commit in `package.json`:

```json
"platformTemplate": { "repo": "...", "commit": "<sha>" }
```

CI compares `src/`, `scripts/`, and `tests/` against that commit. Make platform changes in the template, not locally.
