# Context Wiring Pack

**Project:** Theta  
**Track:** Data Remediation  
**Sprint:** R4  
**Scope:** Source-backed Context Snapshot evidence wiring

## 1. Purpose

R4 wires already-fetched, contract-ready source snapshots into SignalCapture's
immutable Context Snapshot. It adds no provider calls, API changes, UI changes,
or post-capture enrichment.

SignalCapture remains the capture boundary. The caller may supply existing
source responses in Local Runner metadata. SignalCapture validates each
response's exact canonical `_source` contract and either freezes it as
available evidence or leaves the category at its existing explicit
`UNAVAILABLE` state.

## 2. Input Contract

The following optional metadata keys are recognized:

| Metadata key | Canonical category | Required source ID |
| --- | --- | --- |
| `sectorRotation` | `SECTOR` | `sector-rotation` |
| `etfFlow` | `ETF` | `etf-flow` |
| `reserveIntelligence` | `EXCHANGE` | `exchange-reserve` |
| `predictionMarkets` | `PREDICTION` | `prediction-markets` |
| `exchangeComparison` | `EXCHANGE` | `exchange-comparison` |
| `futuresSymbolContext` | `DERIVATIVES` | `binance-live` |

These are response snapshots already available at Signal creation. The handler
does not fetch the corresponding routes.

## 3. Acceptance Rules

A supplied response becomes `AVAILABLE` Context evidence only when:

1. the response and `_source` are JSON-safe objects;
2. `_source.sourceId` exactly matches the expected registered source;
3. the registry source is active and production-approved;
4. `_source.productionApproved` is true;
5. `_source.sourceStatus` is `ACTIVE` or `DEGRADED`;
6. `_source.freshnessStatus` is canonical and not `UNAVAILABLE`;
7. `_source.lastUpdatedAt` is a valid real timestamp;
8. the observation timestamp is not after Signal creation;
9. `_source.unavailableReason` is null.

No freshness is calculated in SignalCapture. No timestamp is copied from
`retrievedAt`, request time, capture time, or persistence time. `STALE` and
`EXPIRED` remain their source-reported states when the route retains factual
data under a degraded contract.

An invalid, late, blocked, unavailable, or missing response is ignored. The
existing canonical category filler then records `UNAVAILABLE` with null
payload and an explicit reason.

## 4. Wired Categories

### Market

The existing Scanner-derived `MARKET` path is unchanged. It still requires a
registered production source, canonical non-unavailable freshness, and a real
source timestamp. The reference entry price remains available only when that
source timestamp exactly equals Signal creation.

### Sector

`metadata.sectorRotation` maps to `SECTOR:sector-rotation`. The complete source
response is preserved as opaque evidence. Partial connector status and stale
freshness are not upgraded.

### ETF

`metadata.etfFlow` maps to `ETF:etf-flow`. Only a route response with usable
envelope timestamp/freshness is captured. Stale, expired, empty, and unavailable
branches are preserved by the route contract and never reconstructed.

### Reserve

`metadata.reserveIntelligence` maps to `EXCHANGE:exchange-reserve`. Reserve is
an Exchange evidence domain, not a new Context category. A missing or expired
artifact stays unavailable.

### Prediction

`metadata.predictionMarkets` maps to `PREDICTION:prediction-markets`. R3's
timestamp correction makes this available only when the selected markets have
trusted provider times. Untimestamped responses remain unavailable to Context.

### Exchange Comparison

`metadata.exchangeComparison` maps to
`EXCHANGE:exchange-comparison`. It may coexist with Reserve because Context
evidence identity is category plus source ID. Missing venue timestamps prevent
capture.

### Derivatives

`metadata.futuresSymbolContext` maps to `DERIVATIVES:binance-live`. This uses
the R3 direct-symbol contract only. Aggregate Futures Intelligence remains
unwired because its aggregate envelope and timestamp policy are not ready.

## 5. Explicit Evidence Precedence

Existing `metadata.contextEvidence` remains supported. Explicit validated
evidence wins when the same category/source pair is also present in a wired
response. This preserves the prior contract and prevents duplicate-source
validation failures.

Different approved sources may coexist in one category. In particular,
`exchange-reserve` and `exchange-comparison` may both appear under `EXCHANGE`.

## 6. Categories Left Unavailable

| Domain/category | Status after R4 | Reason |
| --- | --- | --- |
| Macro / `MACRO` | `UNAVAILABLE` | Approved Stooq path remains source-blocked and has no trusted aggregate observation timestamp. |
| News / `NEWS` | `UNAVAILABLE` | Bare-array route, mixed ownership, and request-time timestamp fallback remain unresolved. |
| Research / `RESEARCH` | `UNAVAILABLE` | No immutable pre-signal Research reference contract; manual post-signal evidence cannot be backfilled. |
| Aggregate Futures | Not wired | `/api/market/futures-intelligence` lacks a certified aggregate envelope and timestamp rule. |
| Scanner API ownership | Existing Market guard only | Bare-array Scanner Opportunities is not treated as a new Context source. |

Missing ready inputs also remain unavailable per Signal. Wiring support does
not imply that a provider or artifact was available for a particular capture.

## 7. Immutability and Lineage

R4 does not change Context identity, lifecycle, hashing, persistence mapping,
or downstream references:

```text
Signal Snapshot
  + finalized Context Snapshot
  -> Tracking
  -> Evaluation
  -> Signal Outcome
  -> Outcome Event
  -> Historical Memory
```

Evidence is assembled only while the Context Snapshot is `CREATED`, then the
snapshot is finalized once. Same identity and same evidence remains an
idempotent duplicate. Same identity with changed finalized evidence returns
`CONFLICT` and does not overwrite the stored record.

## 8. Files Changed

* `workers/local-runner/signalCapture.ts`
* `workers/local-runner/README.md`
* `docs/project/context-wiring-pack.md`

No Context Snapshot runtime, Repository, persistence adapter, API, page,
provider, package, Pattern, Learning, Calibration, or Playbook file changed.

## 9. Validation Summary

Focused validation used current responses from existing approved production
routes. Availability remained data-dependent; in the validation run Sector,
ETF, Prediction, Exchange Comparison, and direct Futures were usable, while
the Reserve artifact correctly remained unavailable.

| Check | Result |
| --- | --- |
| TypeScript validation before focused checks | PASS |
| SignalCapture dry run with ready source snapshots | PASS |
| Ready usable responses mapped to expected category/source pairs | PASS |
| Unusable ready response not promoted | PASS |
| Macro, News, and Research explicit unavailable states | PASS |
| SQLite Signal + Context persistence | PASS |
| Dry-run and SQLite evidence hash equality | PASS |
| Identical Context duplicate | PASS; one Context record, no overwrite |
| Conflicting finalized Context | PASS; `CONFLICT`, no overwrite |
| Full Signal-to-Memory chain | PASS |
| Outcome and Historical Memory Context lineage | PASS |

The focused test harness and local SQLite files were disposable and removed
after validation. Final TypeScript and prohibited-provider/fabrication scans
complete the sprint.
