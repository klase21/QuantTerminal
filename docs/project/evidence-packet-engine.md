# Evidence Packet Engine

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B12  
**Status:** IMPLEMENTED

## Purpose

The Evidence Packet Engine converts precomputed Repository coverage projection
metadata into an immutable evidence-availability container. It does not load
market facts or produce market intelligence.

```text
Coverage Projection API
  -> B11 projection-only client
  -> Evidence Packet Builder
  -> availability metadata packet
```

The packet is intended as a future reasoning input boundary. It contains no
reasoning, explanation, direction, Signal, Snapshot, Memory, analog, outcome,
or recommendation.

## Packet Contract

An Evidence Packet contains:

- symbol and UTC day;
- projection-derived `generatedAt`;
- deterministic evidence readiness;
- one entry per projected dataset;
- missing, experimental, and canonical evidence lists;
- explicit limitations and warnings.

Dataset entries preserve projection metadata only: coverage status, counts,
coverage percentage, resolution, coverage mode, provider tier, canonical and
verification flags, confidence, and observation bounds.

`generatedAt` is the latest valid `computedAt` among the five projection
records. Retrieval time is never substituted.

## Readiness Rules

| Readiness | Rule |
| --- | --- |
| `READY` | At least one complete canonical dataset and no constrained dataset |
| `PARTIAL` | At least one complete canonical dataset plus partial, missing, variable, experimental, or non-canonical constraints |
| `DEGRADED` | Usable canonical records exist, but no canonical dataset is complete |
| `INSUFFICIENT` | No usable canonical evidence exists |

These classifications assess evidence availability only. They do not measure
market conditions, thesis confidence, data values, or likely outcomes.

## Dataset Rules

- `COMPLETE` canonical datasets increase readiness.
- `PARTIAL` adds an absent-interval warning.
- `MISSING` and `UNAVAILABLE` enter `missingEvidence`.
- `EXPERIMENTAL` and non-canonical datasets enter `experimentalEvidence`.
- `VARIABLE` records availability only; no event-stream completeness is
  inferred.
- Missing Funding explicitly states that no market-state implication may be
  inferred.
- Experimental Liquidation explicitly states that it is not canonical truth.

## Initial Evidence Packet

Target: `BTCUSDT`, `2026-07-01`.

```json
{
  "symbol": "BTCUSDT",
  "utcDay": "2026-07-01",
  "generatedAt": "2026-07-03T11:52:02.149Z",
  "evidenceReadiness": "PARTIAL",
  "missingEvidence": ["HISTORICAL_FUNDING"],
  "experimentalEvidence": ["HISTORICAL_LIQUIDATION"],
  "canonicalEvidence": [
    "HISTORICAL_MARKET",
    "HISTORICAL_OPEN_INTEREST",
    "HISTORICAL_AGG_TRADE"
  ]
}
```

Dataset summary:

| Dataset | Status | Actual / Expected | Classification |
| --- | --- | ---: | --- |
| OHLCV | `COMPLETE` | 288 / 288 | Canonical |
| Open Interest | `PARTIAL` | 287 / 288 | Canonical with warning |
| Liquidation | `EXPERIMENTAL` | 298 / 288 | Non-canonical, unverified, confidence 0.65 |
| Funding | `MISSING` | 0 / 3 | Missing evidence; no neutrality inference |
| AggTrade | `VARIABLE` | 1,994,155 / variable | Canonical availability metadata only |

Warnings:

1. Open Interest has one absent expected interval.
2. Liquidation is experimental and not canonical truth.
3. Liquidation provider evidence is unverified.
4. Funding is missing and implies no market state.
5. AggTrade count does not assert event-stream completeness.

## Failure Boundary

The loader reuses the B11 projection-only client. `STALE`,
`PROJECTION_MISSING`, invalid, and unavailable responses do not build packets.
`CAPUSDT` therefore returns `PROJECTION_MISSING` without a fact scan.

The builder rejects a missing dataset, unknown coverage status, malformed
count/confidence, or invalid projection computation timestamp. It never fills
missing metadata with defaults.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| BTCUSDT packet build | PASS |
| Evidence readiness | `PARTIAL` |
| Funding missing handling | PASS; missing evidence and explicit warning |
| Liquidation experimental handling | PASS; experimental and non-canonical |
| AggTrade variable handling | PASS; availability-only warning |
| CAPUSDT | `PROJECTION_MISSING` |
| Raw fact scan | NONE |
| External provider request | NONE |
| Repository write | NONE |
| AI/reasoning generation | NONE |
| Signal/Snapshot/Memory/analog generation | NONE |

## B12.5 Recommendation

**B12.5 Evidence Packet API is safe to start.**

The API must call this projection-only loader, return structured fail-closed
statuses, and never import the Coverage Engine, historical fact repository
queries, providers, or persistence writers. It must not add interpretation to
the packet or substitute request time for projection-derived `generatedAt`.
