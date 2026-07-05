# Repository Coverage Projection

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B8.5  
**Status:** IMPLEMENTED

## Purpose

`HISTORICAL_COVERAGE_PROJECTION` stores precomputed coverage for one dataset,
symbol, and UTC day. Projection reads preserve the B8 machine-readable result
without scanning historical fact records.

The implementation performs no provider request, data backfill, UI work,
Replay work, Signal generation, Context Snapshot creation, Historical Memory
write, or AI work.

## Persistence Model

Coverage projections are a distinct `PROJECTION` persistence category. They are
derived cache records, not historical facts, knowledge, or mutable operational
state.

Each immutable payload contains:

- symbol, UTC day, and dataset;
- resolution and coverage mode;
- actual and expected records;
- coverage status and percentage;
- provider availability, provider tier, canonical/verified flags, confidence;
- first and last observation timestamps;
- computation timestamp;
- source record count;
- deterministic source Repository watermark.

Identity is:

```text
dataset + symbol + UTC day + projection kind + projection version
+ source Repository watermark
```

The watermark hashes the exact coverage inputs and provider metadata. Unchanged
facts produce the same identity and return `DUPLICATE`. Changed source coverage
or contract meaning appends a new immutable projection; existing projections
are never updated or deleted.

## Initial Projection

Target: `BTCUSDT`, `2026-07-01`

| Dataset | Actual | Expected | Status | Tier |
| --- | ---: | ---: | --- | --- |
| `HISTORICAL_MARKET` | 288 | 288 | `COMPLETE` | `CANONICAL` |
| `HISTORICAL_OPEN_INTEREST` | 287 | 288 | `PARTIAL` | `CANONICAL` |
| `HISTORICAL_LIQUIDATION` | 298 | 288 | `EXPERIMENTAL` | `EXPERIMENTAL` |
| `HISTORICAL_FUNDING` | 0 | 3 | `MISSING` | `CANONICAL` |
| `HISTORICAL_AGG_TRADE` | 1,994,155 | null | `VARIABLE` | `CANONICAL` |

## Write And Duplicate Behavior

| Run | Records written | Duplicates | Historical facts changed |
| --- | ---: | ---: | ---: |
| Initial projection | 5 | 0 | 0 |
| Identical rerun | 0 | 5 | 0 |

The Repository total increased by exactly five projection records. Historical
fact counts, payloads, identities, and provider metadata were not rewritten.

## Exact Comparison

The projected `RepositoryCoverageReport` matched the exact B8 report
byte-for-byte, including status separation, strict UTC boundaries, provider
metadata, counts, timestamps, and reasons.

| Evaluation path | Local elapsed time |
| --- | ---: |
| Exact Repository fact scan | 74,224 ms |
| Projection-only Repository read | 2,723 ms |

The projection read queries only `HISTORICAL_COVERAGE_PROJECTION`; it does not
read AggTrade or any other historical fact kind.

## Runtime API

- `evaluateRepositoryCoverage()` computes exact coverage on demand.
- `writeCoverageProjection()` persists immutable projection versions.
- `readCoverageProjection()` reads the latest projection per dataset.
- Background/manual callers explicitly compose `evaluateRepositoryCoverage()`
  with `writeCoverageProjection()`; projection readers have no exact-evaluator
  dependency.

Projected reads fail closed when required dataset projections are missing.
They do not silently invoke an exact scan.

## Limitations

- Projection freshness depends on an explicit recomputation after historical
  facts change; no scheduler exists.
- The initial projection covers only `BTCUSDT` on `2026-07-01`.
- Exact computation remains expensive and belongs in manual or background work.
- Local SQLite projected read latency includes opening and validating the large
  local Repository. Production latency requires measurement on Postgres/Neon.

## B9 Recommendation

**YES: B9 Repository Query API is safe to start with a projection-only request
path.**

B9 must return `MISSING` or `UNAVAILABLE` when a projection is absent. It must
not synchronously fall back to `evaluateRepositoryCoverage()`. Projection
generation remains an explicit background/manual responsibility until a
certified scheduler exists.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Initial projection write | PASS; 5 records |
| Duplicate rerun | PASS; 5 duplicates, zero writes |
| Exact/projected output equality | PASS |
| AggTrade projection read avoids fact scan | PASS |
| Projected read latency | PASS; 2,723 ms local |
| External provider calls | NONE |
| Historical fact mutation | NONE |
| Prohibited behavior | PASS |
