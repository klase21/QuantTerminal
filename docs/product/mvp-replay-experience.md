# MVP Replay Experience

## Product Contract

Replay explains a bounded governed market event as an ordered UTC sequence. It does not calculate Evidence, interpolate missing observations, or send raw AggTrades events to the browser.

The default hierarchy is:

1. Event and governed state
2. Plain-language event sequence
3. Shared UTC cursor and playback controls
4. Price, Open Interest, native Funding, and aggregated-flow lanes
5. Cursor detail and Evidence relationship
6. Limitations
7. Collapsed technical identities

## Timeline Semantics

- Price uses 288 persisted five-minute OHLCV closes for the exact UTC day.
- Open Interest uses 288 provider observations without forward fill.
- Funding is rendered only as three provider-native event markers.
- AggTrades is summarized server-side into 48 deterministic 30-minute buckets. The browser receives zero raw AggTrade events.
- Sequence timestamps are the first material observation, the native Funding event, the strongest flow bucket, or the governed assessment boundary.
- Cursor movement changes presentation only and persists `timestamp` in the URL.

Liquidation, historical depth, verified news, and intraday macro lanes remain unavailable or not applicable. Daily FRED and SPY context is supplemental and is never drawn as an intraday series.

## Responsive And Accessible Behavior

Desktop shows all synchronized lanes. Mobile provides a lane selector and one readable lane at a time while preserving the textual sequence and limitations. The slider, five-minute step controls, play/pause control, keyboard arrows, visible focus, textual sequence, and chart descriptions provide non-pointer and nonvisual access.
