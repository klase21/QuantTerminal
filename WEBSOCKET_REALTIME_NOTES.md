# WebSocket Realtime Feed Notes

This pack moves the sector rotation surface from pure polling to a streaming-first model.

## What changed

- `useSectorRotationFeed` now uses `/api/market/sector-rotation` as the seed/fallback feed.
- Binance realtime data is consumed from `wss://stream.binance.com:9443/ws/!miniTicker@arr`.
- Upbit KRW ticker overlay is consumed from `wss://api.upbit.com/websocket/v1` when validated KRW markets are available from the seed snapshot.
- Stream frames are throttled before rebuilding sector rotation snapshots.
- Polling remains active at a slower cadence as a fallback and source of connector metadata.
- The Live Command Surface now shows Binance/Upbit websocket transport status.

## Why this structure

Polling remains safer for initial hydration, DataLab context, Binance symbol validation, and fallback reliability. WebSocket updates are layered on top to make the command surface feel live without breaking the existing API route.

## Next hardening targets

- Move stream aggregation into a Web Worker if frame volume starts to affect FPS.
- Persist last known Upbit KRW market list so the Upbit websocket can hydrate faster.
- Add stream heartbeat telemetry to Diagnostics.
- Consider Binance combined streams for only validated registry symbols if `!miniTicker@arr` becomes too noisy.
