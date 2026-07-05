# Contract Cleanup Pack

**Project:** Theta  
**Track:** Data Remediation  
**Sprint:** R3  
**Scope:** Metadata-only source contract cleanup

## 1. Purpose

R2 found that Context evidence cannot be frozen safely unless the supplying
contract preserves registered source ownership, real observation timestamps,
canonical freshness, and explicit unavailable behavior. This pack fixes only
routes where those facts already existed in provider responses and were being
discarded or replaced.

No Context Snapshot category is wired in this sprint. SignalCapture,
Repository, persistence, pages, providers, package files, and Knowledge
runtimes are unchanged.

## 2. Readiness Triage

The R2 `READY_TO_WIRE` items were not blocked by missing metadata:

| Domain | Contract status before R3 | R3 action |
| --- | --- | --- |
| Sector | Complete additive envelope and real oldest-contributor timestamp | No change |
| ETF | Complete additive envelope and real Farside source dates | No change |
| Reserve | Complete additive envelope and real artifact `observedAt` | No change |

The metadata-only blockers suitable for this pack were:

| Domain | Objective blocker | R3 result |
| --- | --- | --- |
| Prediction | Provider `updatedAt` was replaced with request time; aggregate freshness always unavailable | Fixed |
| Exchange Comparison | Binance/Bybit response times were discarded; aggregate freshness always unavailable | Fixed |
| Derivatives direct symbol context | Real Binance response times existed, but no canonical source envelope was returned | Fixed |

Market/Scanner, aggregate Futures Intelligence, News, Macro, and Research are
not metadata-only fixes and remain blocked as documented below.

## 3. Prediction Markets Contract

Changed:

* `lib/data-sources/polymarketClient.ts`
* `app/api/research/prediction-markets/route.ts`

The Polymarket client now preserves a valid provider `updatedAt` as canonical
ISO time and uses `null` when it is missing or invalid. It no longer substitutes
`new Date()` for a missing market observation timestamp.

The Research route now:

* preserves each market's `lastUpdated` additively;
* derives aggregate `lastUpdatedAt` from the oldest included market only when
  every included market has a trusted timestamp;
* evaluates freshness with the registered `prediction-markets` policy;
* reports `PARTIAL_DATA` with `UNAVAILABLE` freshness when any required market
  timestamp is missing;
* reports `STALE_DATA` for stale or expired observations without changing the
  legacy market payload or availability status;
* preserves existing empty/error unavailable behavior.

Result: Prediction is now **READY_TO_WIRE conditionally**. A future Context
adapter may create `PREDICTION` evidence only when `_source.lastUpdatedAt` is
non-null and freshness is canonical. Untimestamped markets remain unusable for
available Context evidence.

## 4. Exchange Comparison Contract

Changed:

* `app/api/market/exchange-comparison/route.ts`

The route now retains:

* Binance Open Interest `time`;
* Binance Premium Index `time`;
* Bybit response `time`.

Binance venue `observedAt` is available only when both contributing responses
are timestamped; the oldest timestamp is used. The aggregate envelope is
available only when every successful venue has a timestamp, and its
`lastUpdatedAt` is the oldest successful-venue observation.

Freshness now uses the registered `exchange-comparison` policy. Missing
timestamps degrade to `PARTIAL_DATA`/`UNAVAILABLE`; stale or expired data
degrades to `STALE_DATA`. Retrieval time remains `retrievedAt` only. Existing
top-level keys, venue objects, relationship semantics, cache headers, and
success/partial/unavailable branches are preserved.

Result: Exchange Comparison is **READY_TO_WIRE conditionally** under canonical
`EXCHANGE`. Reserve and venue comparison can coexist because Context evidence
identity is category plus source ID.

## 5. Direct Derivatives Contract

Changed:

* `app/api/market/futures-symbol-context/route.ts`

The route now attaches additive `_source` metadata using the registered,
production-approved `binance-live` source. It derives `lastUpdatedAt`
conservatively:

* Open Interest requires the Open Interest response's own `time`.
* Funding/mark price requires the Premium Index response's own `time`.
* When both fact groups are present, the oldest timestamp controls freshness.
* One source timestamp never substitutes for a missing timestamp from the
  other fact group.

Missing timestamps preserve legacy values but degrade metadata to
`PARTIAL_DATA` with `UNAVAILABLE` freshness. Invalid input, empty provider
values, and source failure return additive unavailable metadata with distinct
`INVALID_RESPONSE`, `EMPTY_RESPONSE`, and `SOURCE_UNAVAILABLE` reasons.

Result: the selected-symbol Binance path is **READY_TO_WIRE conditionally** as
`DERIVATIVES`. Aggregate `/api/market/futures-intelligence` remains a separate
blocked contract.

## 6. Backward Compatibility

All changes are additive except the correction of a fabricated Polymarket
timestamp:

* Existing route status codes are unchanged.
* Existing payload keys and provider values are unchanged.
* `_source` remains additive.
* Prediction market `lastUpdated` is newly exposed by the Research route.
* A missing Polymarket timestamp is now `null`, not request time. This is an
  objective no-fabrication correction.
* Missing Binance Open Interest time is now `null`; Premium Index time is no
  longer substituted into the legacy `openInterestTime` field. This is an
  objective no-fabrication correction.
* No fetch, polling, cache, ranking, filtering, scoring, or fallback provider
  was added.
* No unavailable branch was promoted to success.

## 7. Remaining Blockers

| Domain | Remaining blocker | Required future boundary |
| --- | --- | --- |
| Market / Scanner | `/api/scanner/opportunities` is a bare array and normal Scanner output lacks canonical `_source` | Backward-compatible Scanner/Market Movers transport decision; do not wrap without consumer migration |
| Aggregate Derivatives | `/api/market/futures-intelligence` lacks a canonical envelope and per-symbol aggregate observation timestamps | Dedicated aggregate envelope sprint with oldest-required-input policy |
| News | Bare-array response, multi-provider ownership, and `Date.now()` fallback for missing provider timestamps | Timestamp remediation plus additive-compatible response strategy |
| Macro | Approved Stooq source remains blocked and `/api/macro` has no real `lastUpdatedAt` | Source remediation; no Yahoo/FRED fallback without governance change |
| Research | Manual evidence usually exists after Signal creation; no immutable pre-signal Research reference contract | Ownership/timing decision; no historical backfill into Context |
| Dashboard Prediction route | `/api/prediction-markets` still has no canonical envelope even though the shared client no longer fabricates market timestamps | Separate additive rollout if Dashboard requires canonical metadata |

SignalCapture wiring itself remains unchanged. Future wiring must consume the
new metadata only at Signal creation and must leave a category unavailable
when `_source.lastUpdatedAt` is null or freshness is unavailable.

## 8. Files Changed

Runtime/API contract fixes:

* `lib/data-sources/polymarketClient.ts`
* `app/api/research/prediction-markets/route.ts`
* `app/api/market/exchange-comparison/route.ts`
* `app/api/market/futures-symbol-context/route.ts`

Documentation:

* `docs/project/contract-cleanup-pack.md`

No UI, Context Snapshot, SignalCapture, Repository, persistence, provider,
package, or Knowledge-layer file changed.

## 9. Validation

| Check | Result |
| --- | --- |
| TypeScript `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS before final documentation |
| Timestamped Prediction envelope | PASS; real provider time preserved and freshness derived |
| Untimestamped Prediction envelope | PASS; `lastUpdated = null`, freshness `UNAVAILABLE`, status degraded |
| Timestamped Exchange Comparison envelope | PASS; oldest source response time used |
| Timestamped direct Futures envelope | PASS; registered `binance-live`, canonical freshness |
| Invalid Futures branch | PASS; additive unavailable metadata, no fabricated timestamp |
| Legacy payload keys in focused smoke checks | PASS |
| New provider/fallback behavior | None |

The focused checks mocked existing provider response contracts only; they did
not introduce runtime mock paths. The disposable smoke file was removed after
validation. A final TypeScript pass and prohibited-provider/fabrication scan
complete this sprint.
