# CryptoHFTData Orderbook Provider Semantics Investigation V1

## Executive Finding

CryptoHFTData can support deterministic orderbook replay only conditionally.

Its published schema explicitly defines complete `snapshot` events and
incremental `update` events. However, four consecutive BTCUSDT Binance Futures
hourly files inspected for February 22, 2026 contained 12,251,517 in-window
updates and zero snapshot rows. Cross-file update identifiers also failed to
bridge exactly.

For the inspected target, CryptoHFTData is an update-flow source, not a
self-initializing historical orderbook source.

The recommended architecture is:

```text
Hybrid Snapshot + Updates Replay
```

A separately verified historical snapshot or provider checkpoint must
initialize the book before CryptoHFTData deltas can be used as deterministic
progression evidence.

## Investigation Scope

Target:

```text
BTCUSDT
binance_futures
2026-02-22
12 UTC
```

Locally observed provider windows:

- 09 UTC
- 10 UTC
- 11 UTC
- 12 UTC

No additional provider data was downloaded for this semantics sprint. The
investigation consumes the persisted initialization-discovery and V2 quality
results.

External documentation reviewed:

- [CryptoHFTData orderbook dataset](https://www.cryptohftdata.com/datasets/crypto-orderbook-data)
- [CryptoHFTData Binance orderbook dataset](https://www.cryptohftdata.com/datasets/binance-orderbook-data)
- [CryptoHFTData CommonOrderbookEvent documentation](https://www.cryptohftdata.com/docs/python-orderbook)
- [CryptoHFTData orderbook tutorial](https://www.cryptohftdata.com/blog/orderbook-analysis-python)
- [Binance local orderbook procedure](https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/How-to-manage-a-local-order-book-correctly)
- [Binance Futures depth snapshot endpoint](https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Order-Book)
- [Binance public-data repository](https://github.com/binance/binance-public-data)

## Dataset Inventory

### CryptoHFTData Hourly Orderbook

File convention:

```text
{exchange}/{date}/{HH}/{symbol}_orderbook.parquet.zst
```

Provider contract:

```text
CommonOrderbookEvent
```

Fields:

| Field | Meaning |
| --- | --- |
| `received_time` | Provider receive timestamp |
| `event_time` | Exchange event timestamp |
| `transaction_time` | Exchange transaction timestamp when supplied |
| `symbol` | Trading pair |
| `event_type` | `snapshot` or `update` |
| `first_update_id` | First sequence id represented by the event |
| `final_update_id` | Final sequence id represented by the event |
| `prev_final_update_id` | Previous final id for gap detection |
| `last_update_id` | Last exchange-processed update id |
| `side` | `bid` or `ask` |
| `price` | Price level |
| `quantity` | Absolute quantity; zero removes the level |
| `order_count` | Optional number of orders at the level |

The official dataset pages say hourly files contain normalized snapshots and
deltas. The CommonOrderbookEvent docs define snapshot events as complete book
state used for initialization.

The provider's January 2026 tutorial, however, presents Binance Futures data
as raw level updates and explicitly warns that displayed rows are not
reconstructed snapshots. Its takeaway calls the data delta data.

This documentation is internally ambiguous when compared with the inspected
files.

### Replay Orderbook Snapshot V1

Role:

- final static top-of-book evidence;
- not a raw provider dataset;
- not seekable;
- cannot prove initialization.

### Replay Orderbook Replay V2 POC

Role:

- one-minute checkpoints;
- compacted update batches;
- terminal summary;
- quality diagnostics.

Current target status:

```text
degraded
```

It has no verified initial snapshot and cannot self-replay.

### Initialization Discovery

Role:

- source-window inventory;
- snapshot candidate detection;
- within-file continuity;
- cross-file boundary checks.

It is diagnostic metadata, not orderbook evidence.

## Observed Row Semantics

| Window | Total rows | Snapshot rows | Update rows |
| --- | ---: | ---: | ---: |
| 09 UTC | 2,654,553 | 0 | 2,654,334 |
| 10 UTC | 2,809,722 | 0 | 2,809,667 |
| 11 UTC | 2,865,779 | 0 | 2,865,693 |
| 12 UTC | 3,921,890 | 0 | 3,921,823 |

All four files:

- were available;
- used the documented CommonOrderbookEvent columns;
- contained valid bid/ask level updates;
- were internally ordered;
- showed no snapshot event.

For these windows, the actual design is updates-only.

This is not enough evidence to claim that every CryptoHFTData venue, symbol,
or date is updates-only.

## Update Semantics

### Quantity

Provider and Binance semantics agree:

- quantity is the absolute quantity at a price level;
- zero quantity removes the level;
- removing an unknown level can be normal.

### Sequence Identifiers

For Binance Futures, the meaningful fields map to:

- `first_update_id` = Binance `U`;
- `final_update_id` = Binance `u`;
- `prev_final_update_id` = Binance `pu`.

Binance's official local-book procedure requires:

1. buffer diff events;
2. obtain a REST depth snapshot and its `lastUpdateId`;
3. discard stale events;
4. find the first event spanning the snapshot id;
5. require each later event's `pu` to equal the previous event's `u`;
6. restart from a snapshot when continuity breaks.

### Within-File Continuity

The four inspected files had no detected within-window gaps after duplicate
event ids were collapsed for continuity checking.

### Cross-File Continuity

All three inspected hourly boundaries showed id gaps:

- 09 to 10 UTC;
- 10 to 11 UTC;
- 11 to 12 UTC.

This may indicate:

- omitted boundary events;
- hourly partition overlap/filtering differences;
- provider normalization behavior;
- incorrect assumptions about cross-file id comparison;
- true collection gaps.

Regardless of cause, continuity is not proven and must not be repaired
silently.

### Provider Guarantees

CryptoHFTData markets its data as normalized, deduplicated, and gap-checked.
The public pages inspected do not define a formal cross-file reconstruction
guarantee or specify snapshot frequency for Binance Futures hourly files.

Therefore, cross-file deterministic continuity remains unproven.

## Initialization Assessment

### Target Hour Only

Unsupported for the target.

The 12 UTC file contains zero snapshots. Starting from an empty map produces a
plausible terminal book but not a verified complete book.

### Prior Hours

Unsupported for the inspected three-hour lookback.

The 09, 10, and 11 UTC files also contain zero snapshots, and their boundaries
to later files contain sequence gaps. Extending update-only replay backward
does not establish a trustworthy initial state.

### Provider-Documented Snapshots

Unknown.

The provider contract says snapshot events exist, but the inspected Binance
Futures files contain none. The public documentation does not state:

- snapshot cadence;
- whether snapshots are venue-dependent;
- whether snapshots are stored in another object path;
- whether each day or symbol begins with a snapshot;
- how snapshots relate to hourly partition boundaries.

Provider clarification or a known sample containing `event_type=snapshot` is
required.

## Alternative Initialization Sources

### Binance REST Depth Snapshot

Technically appropriate for live initialization, but not historical
initialization.

Binance exposes:

```text
GET /fapi/v1/depth
```

The response contains current bids, asks, and `lastUpdateId`. Binance requires
this snapshot to bootstrap diff events.

The endpoint does not accept a historical timestamp. Calling it now cannot
initialize February 22, 2026 replay.

### Contemporaneous Snapshot Capture

Viable for future windows.

A collector can periodically capture Binance REST depth snapshots while also
recording diff streams. The snapshot id can then be bridged to updates using
Binance's official procedure.

This does not repair already historical windows unless snapshots were captured
at that time.

### Provider Checkpoint Object

Potentially ideal, but currently unknown.

If CryptoHFTData stores snapshot/checkpoint files separately, that source
should be preferred. No documented separate path was found in the public
dataset catalog.

### Binance Vision

Not suitable based on currently documented public archive coverage.

The official Binance public-data repository documents aggregate trades,
klines, and trades for Futures. It does not document historical full-depth
snapshot archives that can bootstrap this target.

### Other Historical Providers

Possible but not evaluated in this sprint.

Any alternate source must provide:

- historical full-depth or sufficiently deep snapshot;
- exchange and symbol match;
- timestamp and sequence compatibility;
- provenance and licensing;
- deterministic bridge to CryptoHFTData updates.

## Provider Capability Matrix

| Capability | Status | Evidence |
| --- | --- | --- |
| Static update-flow analysis | Supported | Millions of ordered bid/ask updates |
| Price-level flow replay | Supported | Timestamped absolute level changes |
| Full snapshot initialization | Unknown globally; unsupported for inspected windows | Provider docs claim snapshots; observed count is zero |
| Target-hour initialization | Unsupported | Zero target snapshots |
| Prior-hour initialization | Unsupported for inspected lookback | Zero snapshots across 09 to 11 UTC |
| Within-file update sequencing | Supported for inspected files | No detected internal gaps |
| Cross-file continuity | Unsupported for inspected boundaries | Three sequence gaps |
| Seekable orderbook replay | Unsupported for target | No verified initial state |
| Deterministic full-book reconstruction | Conditional | Requires verified snapshot and continuous updates |
| Static terminal book evidence | Degraded support | Plausible spread, unverified completeness |

## Explicit Answers

### A. CryptoHFTData snapshots exist?

```text
UNKNOWN
```

The official schema says yes. The four inspected Binance Futures files say no
for this target and lookback. The available evidence cannot support a global
YES or NO.

### B. Updates-only design?

```text
UNKNOWN
```

The inspected files are updates-only. The provider contract is explicitly
mixed snapshot/update. Global updates-only design is therefore unproven.

### C. Deterministic orderbook replay possible?

```text
CONDITIONAL
```

It is possible only when a verified historical snapshot and continuous
subsequent updates are available. Those conditions are not met for the target.

### D. Recommended future architecture

```text
2. Hybrid Snapshot + Updates Replay
```

Use:

```text
Verified historical snapshot/checkpoint
  + continuous CryptoHFTData updates
  + deterministic checkpoint validation
  = replayable V2 cache
```

Until snapshots are available, CryptoHFTData should power Flow Replay rather
than claims about complete book state.

## Risk Assessment

### Replay Learning: High

Progression-based learning from the current cache would encode unverified book
state and continuity. It must remain disabled.

Point-in-time update-flow facts may eventually be captured, but must be
explicitly labeled as flow evidence rather than full-book evidence.

### Replay Evidence: Medium

Trade, liquidation, funding, OI, and update-flow evidence remain useful.
Static terminal orderbook metrics are plausible but completeness is not
verified.

### Historical Replay: High

Presenting an update-only reconstruction as historical full-book replay risks
false liquidity, spread, imbalance, and depth conclusions.

## Recommended Architecture

### Primary Path

Pursue Hybrid Snapshot + Updates Replay:

1. Ask CryptoHFTData for documented snapshot frequency and object paths.
2. Obtain one known Binance Futures sample with snapshot rows.
3. Verify provider snapshot ids against subsequent update ids.
4. Add an offline snapshot/checkpoint acquisition contract.
5. Build V2 only when initialization and continuity pass.
6. Keep all request paths cache-only.

### Degraded Path

Formalize Flow Replay using the existing update stream:

- update rate;
- bid/ask update imbalance;
- additions and removals;
- price-level churn;
- activity bursts.

Flow Replay must not claim:

- complete depth;
- true best bid/ask before initialization;
- full liquidity;
- deterministic book state.

## Conclusion

CryptoHFTData is a strong historical orderbook update-flow source. For the
inspected Binance Futures target it is not a self-contained deterministic
orderbook replay source.

The architecture should not abandon orderbook replay, but it must require a
verified historical snapshot bootstrap. Until that source is proven,
QuantTerminal should treat these files as Flow Replay data and preserve the
current degraded quality status.
