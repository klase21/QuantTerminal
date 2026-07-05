# Projection Lifecycle Framework

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B9.5  
**Status:** IMPLEMENTED

## Purpose

The Projection Lifecycle Framework gives Repository-owned coverage projections
explicit versioning, lineage, freshness, and recomputation state before Replay
consumes them.

It performs no exact coverage scan, provider request, backfill, API-side
recomputation, UI work, Replay work, Signal generation, Context Snapshot
creation, Historical Memory write, or AI work.

## Lifecycle Metadata

Every v2 coverage projection carries:

- `projectionKind: REPOSITORY_COVERAGE`;
- symbol and UTC day;
- computation timestamp;
- source record count;
- deterministic source Repository watermark;
- `stale`;
- `recomputeRequired`;
- projection version.

Projection identity now includes projection kind and version in addition to
dataset, symbol, UTC day, and source watermark. Existing v1 records remain
immutable and readable.

## Freshness Policy

Coverage projection freshness is evaluated at read time:

- current v2 metadata within 24 hours: `AVAILABLE`;
- older projection version: `STALE` and recomputation required;
- age greater than 24 hours: `STALE` and recomputation required;
- explicit stale/recompute marker: `STALE`;
- invalid or future computation timestamp: `STALE`;
- absent complete projection set: `PROJECTION_MISSING`.

Freshness evaluation never invokes recomputation. It only reports lifecycle
state.

## Immutable Upgrade

The five existing v1 BTCUSDT projections were read from projection storage and
used to append five v2 lifecycle projections. Historical facts and exact
coverage were not read.

| Operation | Writes | Duplicates |
| --- | ---: | ---: |
| v1 to v2 lifecycle append | 5 | 0 |
| identical v2 rerun | 0 | 5 |

Before upgrade, all five legacy projections evaluated `STALE` because their
version was below the current contract. After upgrade, all five evaluate
`AVAILABLE`, with `stale: false`, `recomputeRequired: false`, and
`projectionVersion: 2`.

## API Behavior

The coverage API exposes top-level `projectionStatus` as exactly one of:

- `AVAILABLE`;
- `STALE`;
- `PROJECTION_MISSING`.

Each dataset includes projection kind, computation timestamp, source count,
watermark, stale flag, recompute flag, and projection version. Stale data
remains readable with an explicit degraded projection health result. Missing or
incomplete projection sets return HTTP 404 and never trigger exact evaluation.

## Recompute Safety

Recomputation is an external manual/background responsibility. Neither
`readCoverageProjectionRecords()` nor the API imports or calls the exact
coverage evaluator. A future scheduler may respond to
`recomputeRequired: true`, but that behavior is not implemented here.

The projection module has no exact-evaluator import. Manual/background code
must explicitly compose exact evaluation and projection writing outside the API
dependency graph.

## B10 Decision

**YES: B10 Replay coverage gate is safe.**

Replay may consume `AVAILABLE` projections. It must degrade explicitly for
`STALE`, fail closed for `PROJECTION_MISSING`, and never synchronously request
recomputation or exact coverage.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Existing v1 projection readability | PASS |
| v1 freshness classification | PASS; `STALE` |
| v2 lifecycle append | PASS; 5 writes |
| v2 duplicate rerun | PASS; 5 duplicates, zero writes |
| Current v2 freshness | PASS; `AVAILABLE` |
| 24-hour expiry behavior | PASS; `STALE` |
| Missing projection | PASS; `PROJECTION_MISSING` |
| CAPUSDT exact-scan prevention | PASS |
| External fetches | NONE |
| API recomputation | NONE |
| Prohibited behavior | PASS |
