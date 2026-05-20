# Narrative Intelligence Patch

Applied changes:

- Added rule-based narrative keyword engine.
- Added news-level narrative tagging via `detectNarratives()`.
- Added `/api/narratives?range=24h` endpoint.
- Added cross-region KR/CN/EN narrative heatmap generation.
- Added regional narrative divergence scoring.
- Added MacroPanel UI blocks:
  - Narrative Heatmap
  - Regional Divergence
- Added narrative badges to news cards/feed.
- Expanded `NewsItem` type to support optional `narratives`, `region`, `importance`, `sourceWeight`, and `publishedAt`.
- Improved Jinse timestamp normalization.

Important notes:

- `/api/news` remains region-safe and still uses strict source filtering.
- `/api/narratives` intentionally fetches KR, CN, and EN separately to prevent regional source contamination.
- Build was not executed in this environment because dependencies were not installed in the uploaded zip (`next` binary unavailable).

Recommended local check:

```bash
npm install
npm run build
npm run dev
```

Smoke test URLs:

```bash
/api/news?region=kr&translate=true&target=ko
/api/news?region=cn&translate=true&target=ko
/api/news?region=en&translate=true&target=ko
/api/narratives?range=24h
```
