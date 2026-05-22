# Realtime Stabilization Pack

This pass focuses on cleanup and real-time reliability instead of adding more surfaces.

## What changed

- Added `hooks/useSectorRotationFeed.ts` as the single client-side feed hook for the Live Command Surface.
- Kept the UI on a 10s polling loop, with AbortController cancellation and hidden-tab polling suppression.
- Added server-side in-memory TTL cache for Binance `exchangeInfo` validation.
- Added server-side in-memory TTL cache for Upbit market list discovery.
- Kept Binance 24h ticker requests chunked and validated against live Binance exchange metadata.
- Added fetch timeouts for upstream connector calls.
- Added Binance symbol validation telemetry to Diagnostics.

## Why not full websocket yet?

The current sector rotation API aggregates Binance, Upbit and Upbit DataLab into one normalized response. A websocket-first design should be introduced as a separate transport layer, while this route remains the stable fallback path.

Recommended next transport path:

1. `core/realtime/sectorRotationBus.ts`
2. Binance websocket miniTicker stream
3. Upbit websocket ticker stream
4. Batch updates into the same `RealMarketRotationResponse` shape
5. Keep `/api/market/sector-rotation` as cold-start/fallback snapshot

## Commit suggestion

```bash
git add .
git commit -m "feat: stabilize realtime market core and diagnostics"
```
