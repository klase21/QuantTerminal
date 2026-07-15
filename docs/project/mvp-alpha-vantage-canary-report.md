# MVP Alpha Vantage Canary Report

## Result

`CERTIFIED_BOUNDED_CANARY_WITH_LICENSE_LIMITATION`

The documented `TIME_SERIES_DAILY` endpoint returned 90 SPY daily OHLCV
observations. Provider metadata identified SPY, compact output, the latest
provider date, and the `US/Eastern` time zone.

## Persistence

- Raw Artifact: 1 verified object, 21,398 bytes
- Raw Artifact checksum: `c00aceeba0891ef88d768b8d171732b98c87e32f08e907b25eb744ff3cb7e5ef`
- Canonical Facts: 90 `DAILY_MARKET_CONTEXT_OBSERVATION` versions
- Publication: 90 `PENDING`
- Lineage edges: 90
- Coverage decisions: 1 eligible bounded decision
- Terminal Units: 1
- Active leases after execution: 0
- Licensing: `PUBLIC_DEMO_LICENSE_REVIEW_REQUIRED`

Provider-native OHLCV strings remain in the Candidate and Raw Artifact. The
typed low-density Fact stores the governed daily close used by the supplemental
Projection.

## Exact Rerun

The exact rerun resolved as `RERUN_DUPLICATE`: 90 Candidate duplicates, 90
Fact duplicates, and 90 submission duplicates. Counts and checksums remained
stable and no conflict was created.

## Limitation

This certifies SPY only. QQQ, GLD, WTI, and EUR/USD remain explicit pending
roles. Alpha Vantage is daily market context, not official macro truth or a
realtime execution source.
