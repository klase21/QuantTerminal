# Release Notes

## Realtime Intelligence Terminal Stabilization

This release consolidates the experimental Regime Lab work into a more production-oriented terminal surface.

---

## Highlights

### Live Command Surface

- Market state HUD
- Sector heat radar
- live event rail
- top alert display
- WebSocket status indicators

### Realtime Market Core

- Binance symbol validation using `exchangeInfo`
- chunked Binance ticker fetch
- Next.js cache limit avoidance
- Upbit overlay
- polling fallback retained
- WebSocket scaffold for Binance and Upbit

### Upbit DataLab Intelligence

- overview snapshot
- fear/greed history
- volatility history
- altseason history
- BTC dominance history
- Upbit trade volume history
- premium history

### Signal Trust Layer

- signal quality scoring
- false-positive penalties
- duplicate cooldown grouping
- HIGH_TRUST / WATCH / LOW_QUALITY labels
- suppressed noise section

### UI Refactor

- Regime Lab decommissioned from primary UI
- product surfaces introduced
- Narrative / Signals / Research / Diagnostics split
- Live Command Surface equal-height behavior fixed

### Build Stabilization

- TypeScript stabilized on 5.x
- invalid TypeScript 6 deprecation setting removed
- package lock updated

---

## Suggested Commit

```bash
git add .
git commit -m "docs: add release documentation for realtime intelligence terminal"
```

If combined with the stabilization work:

```bash
git commit -m "chore: finalize realtime terminal stabilization and docs"
```
