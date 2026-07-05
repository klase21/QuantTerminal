# Historical Open Interest Backfill

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B5  
**Status:** COMPLETE

## Source Contract

The canonical provider is the registered, production-approved Binance Vision
archive (`sourceId: binance-vision`). B5 uses the official USD-M Futures daily
metrics path:

```text
futures/um/daily/metrics/{symbol}/{symbol}-metrics-{UTC-day}.zip
```

The relevant provider fields are:

```text
create_time
symbol
sum_open_interest
```

`create_time` is retained as `sourceTimestamp` and converted losslessly to the
ISO `observedAt` representation. `sum_open_interest` is retained as
`openInterest`. Because the archive does not declare a portable unit label,
the record uses `PROVIDER_NATIVE`; it is not relabelled as contracts, coins, or
USD. Historical facts do not claim live freshness, so `freshness` is explicitly
`UNAVAILABLE` rather than inferred from retrieval time.

## Provider Architecture

| Priority | Provider | Role | Production behavior |
| --- | --- | --- | --- |
| 1 | Binance Vision | Canonical official historical OI source | Active through direct provider archives |
| 2 | Coinalyze | Optional verification/cross-check | Inactive; requires governance approval, a direct provider adapter, and explicit instrument mapping |
| 3 | UNAVAILABLE | Safe fallback state | Returned when the official archive or symbol capability is absent |

Coinalyze is not queried by B5. Its internal web API is not a production source
boundary. A Coinalyze capability is available only when the caller supplies an
explicit Binance-symbol-to-provider-instrument mapping. CAP-like unsupported
symbols remain `UNAVAILABLE`; no provider symbol or OI value is fabricated.

## Record Contract

Record kind: `HISTORICAL_OPEN_INTEREST`

Each immutable payload contains:

* `symbol`
* `exchange`
* `provider`
* `observedAt`
* `openInterest`
* `unit`
* `sourceId`
* `sourceTimestamp`
* `freshness`

Identity is deterministic:

```text
historical-open-interest-v1 + sourceId + symbol + observedAt
```

The Repository idempotency key uses the same source, symbol, and provider
observation timestamp. Writes use
`PersistenceRepository.saveHistoricalOpenInterestRecord()` only. Existing
records are never updated or overwritten.

## Initial BTCUSDT Execution

The initial run intentionally uses one latest completed UTC archive, matching
the bounded-pilot discipline used before broader historical expansion.

| Item | Result |
| --- | --- |
| Symbol | `BTCUSDT` |
| Archive day | `2026-07-01` |
| First observation | `2026-07-01T00:05:00.000Z` |
| Last observation | `2026-07-02T00:00:00.000Z` |
| Source records | 288 |
| Initial records written | 288 |
| Source duplicates | 0 |
| Missing five-minute intervals | 0 |
| Identical rerun writes | 0 |
| Identical rerun duplicates | 288 |

## Multi-Symbol and Availability Behavior

The engine accepts a canonical Binance Futures symbol and builds the official
archive path from that symbol. It does not derive a Coinalyze instrument.
Invalid Binance symbols fail capability validation. A canonical-looking symbol
whose official archive returns 404 returns `UNAVAILABLE` with zero records and
zero writes. This is the certified behavior for unsupported CAP-like symbols.

Broader symbol or date execution remains explicit and bounded. B5 adds no
scheduler, API, page integration, symbol crawler, or bulk raw-file storage.

## No-Fabrication Boundary

B5 stores provider observations only. It creates no Signal, Context Snapshot,
Tracking, Evaluation, Outcome, Outcome Event, Historical Memory, Pattern,
Learning, Calibration, Playbook, recommendation, or AI reasoning. It does not
estimate OI, interpolate gaps, substitute retrieval time, activate Coinalyze,
or introduce a provider fallback.

## Validation

| Check | Result |
| --- | --- |
| TypeScript validation | PASS |
| Official Binance Vision source | PASS |
| Chronological ordering | PASS |
| Source duplicate detection | PASS; 0 |
| Five-minute interval detection | PASS; 0 missing |
| Deterministic identity | PASS |
| Repository-only persistence | PASS; 288 records |
| Duplicate-safe rerun | PASS; 288 duplicates, 0 writes |
| Unsupported CAP-like archive | PASS; `UNAVAILABLE`, 0 writes |
| Coinalyze missing mapping | PASS; `UNAVAILABLE` |
| Prohibited behavior scan | PASS |
| UI, Dashboard, Scanner, Replay changes | NONE |
| Signal, Context, Memory, AI generation | NONE |

No production build was run, in accordance with repository instructions.
