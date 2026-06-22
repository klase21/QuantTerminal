# Flow Replay Multi-Window Validation V1

## Purpose

This validation determines whether Flow Replay produces consistent factual
evidence across every currently replay-compatible Historical Analog case.

It is a gate before Replay Learning.

The audit:

- discovers compatible cases from the existing Replay Coverage Audit;
- assembles Flow Replay evidence in memory;
- does not publish or replace durable artifacts;
- does not generate Replay Learning;
- does not modify Replay UI or runtime;
- processes provider requests sequentially.

Run:

```powershell
npm run audit:flow-replay-coverage
```

## Compatibility Definition

A Historical Analog case is replay-compatible when its UTC date is on or
after the documented CryptoHFTData coverage start:

```text
2025-07-01
```

The current Historical Analog caches contain:

| Symbol | Analog cases | Replay-compatible cases |
| --- | ---: | ---: |
| BTCUSDT | 25 | 6 |
| ETHUSDT | 25 | 0 |

SOLUSDT is included automatically when a valid Historical Analog cache exists.
No SOL cache was available during this validation.

## Success Definition

A Flow Replay case is successful when canonical OHLCV provides verified price
evidence for the exact selected UTC window.

Coverage is classified independently:

| Classification | Evidence |
| --- | --- |
| `MINIMAL` | Verified price without orderbook-flow evidence |
| `PARTIAL` | Price plus orderbook-flow evidence |
| `ENRICHED` | Price, orderbook flow, funding, and open interest |
| `COMPREHENSIVE` | Enriched evidence plus liquidations and trades |
| `FAILED` | Exact-window verified price evidence is unavailable |

Funding and OI can be verified while a case remains `MINIMAL` when no
orderbook-flow cache exists. Coverage classification does not hide individual
source availability.

## Aggregate Results

Audit date:

```text
2026-06-22
```

Status:

```text
PASS
```

| Metric | Count | Percent |
| --- | ---: | ---: |
| Total compatible cases | 6 | 100% |
| Successful Flow Replay cases | 6 | 100% |
| Comprehensive | 0 | 0% |
| Enriched | 2 | 33.33% |
| Partial | 0 | 0% |
| Minimal | 4 | 66.67% |
| Failed | 0 | 0% |

All compatible cases had:

- verified canonical price evidence;
- verified CryptoHFTData funding evidence;
- verified CryptoHFTData open-interest evidence.

No case had prepared liquidation or trade evidence.

## Per-Case Results

| Symbol | Date | UTC hour | Similarity | Coverage | Funding | OI | Orderbook flow |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| BTCUSDT | 2025-07-20 | 17 | 92.7355 | `ENRICHED` | verified | verified | degraded |
| BTCUSDT | 2025-09-15 | 07 | 92.2148 | `MINIMAL` | verified | verified | unavailable |
| BTCUSDT | 2026-02-22 | 12 | 94.2713 | `ENRICHED` | verified | verified | degraded |
| BTCUSDT | 2026-03-08 | 11 | 92.3368 | `MINIMAL` | verified | verified | unavailable |
| BTCUSDT | 2026-03-29 | 17 | 92.2906 | `MINIMAL` | verified | verified | unavailable |
| BTCUSDT | 2026-04-05 | 12 | 92.7304 | `MINIMAL` | verified | verified | unavailable |

The two enriched cases use degraded orderbook evidence only:

- `2025-07-20 17 UTC` has a V1 static terminal cache that cannot prove
  initialization or progression.
- `2026-02-22 12 UTC` has a V2 diagnostic cache with no verified initialization
  snapshot.

Neither case supports complete or deterministic orderbook replay.

## Common Failure and Limitation Categories

### Liquidations Unavailable

Count:

```text
6 of 6 cases
```

Reason:

No prepared canonical liquidation cache exists for the selected windows.

### Trades Unavailable

Count:

```text
6 of 6 cases
```

Reason:

No prepared canonical trade cache exists for the selected windows.

### Orderbook Cache Missing

Count:

```text
4 of 6 cases
```

Affected windows:

- 2025-09-15 07 UTC;
- 2026-03-08 11 UTC;
- 2026-03-29 17 UTC;
- 2026-04-05 12 UTC.

### Orderbook Degraded Without Verified Initialization

Count:

```text
2 of 6 cases
```

One case has static V1 evidence. One has update-flow V2 evidence. Both remain
degraded and must not be represented as complete orderbook reconstruction.

## Reliability Findings

Strengths:

- exact-window price evidence succeeded for every compatible case;
- funding and OI provider normalization succeeded consistently;
- one missing evidence source did not fail a case;
- no case generated fabricated substitutes;
- sequential execution completed without provider or decoder failure.

Gaps:

- ETH has no replay-compatible Historical Analog cases;
- no liquidation evidence is prepared;
- no trade evidence is prepared;
- four compatible cases lack orderbook-flow caches;
- the two available orderbook cases remain degraded.

## Replay Learning Gate

Replay Learning should remain disabled.

This validation proves that Flow Replay can reliably provide price, funding,
and OI evidence. It does not yet prove sufficiently rich market-structure
coverage because:

- 66.67% of cases are `MINIMAL`;
- 0% are `COMPREHENSIVE`;
- liquidations and trades are unavailable in every case;
- no orderbook case is deterministic.

## Recommended Next Sprint

Prioritize prepared liquidation and trade evidence for the six validated BTC
windows.

After that:

1. Backfill orderbook-flow evidence for the four missing windows only where
   source semantics can be represented honestly.
2. Re-run this audit.
3. Define a Replay Learning minimum coverage policy.
4. Require multiple `COMPREHENSIVE` or explicitly approved `ENRICHED` cases
   before generating Replay Learning artifacts.
