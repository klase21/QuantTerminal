# Known Limitations

## Signal Weights Are Heuristic

Rotation and signal-quality weights are first-pass heuristics. They should be tuned against real usage and historical review.

## Sector Registry Requires Maintenance

Symbols can be delisted, renamed, migrated, or added. The Binance validation layer reduces failure risk, but the sector registry still requires maintenance.

## Upbit DataLab Is Public but Lightly Documented

The current DataLab endpoints are usable, but endpoint shapes may change. The app should degrade gracefully and report partial data.

## WebSocket Realtime Still Needs Hardening

Current direction:

```txt
WebSocket first
Polling fallback
```

Remaining work:

- stronger reconnect policy
- stream batching
- stale frame detection
- browser visibility handling
- workerization for heavy aggregation

## UI Still Needs Final Product Polish

The Regime Lab has been decommissioned into product surfaces, but some redundant historical notes or panels may still remain.

## False Positives Are Not Fully Solved

Phase 4 added trust labels and suppression logic, but real-world tuning is still required.

## Not Financial Advice

QuantTerminal is a research and intelligence tool. It should not be interpreted as financial advice or automated trading instruction.
