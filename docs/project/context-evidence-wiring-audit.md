# Context Evidence Wiring Audit

**Project:** Theta  
**Track:** Data Remediation  
**Sprint:** R2  
**Scope:** Context Snapshot implementation readiness  
**Decision:** **CONTEXT WIRING BLOCKED**

## 1. Audit Boundary

This audit asks whether existing production data can be frozen safely into a
new Context Snapshot at Signal creation. “Available from an API” is not enough.
An `AVAILABLE` Context item also requires:

* a registered production-approved `sourceId`;
* a real source `observedAt` no later than `capturedAt`;
* canonical freshness derived from that timestamp;
* an opaque source-backed payload;
* no inferred or request-time substitute fields.

SignalCapture currently accepts explicit `metadata.contextEvidence`, validates
production source identity, fills every absent canonical category with
`UNAVAILABLE`, and finalizes once. It automatically derives only `MARKET` from
the supplied Scanner opportunity `_source`.

## 2. Category Consistency

The runtime has exactly nine canonical categories:

```text
MARKET, DERIVATIVES, ETF, MACRO, PREDICTION,
SECTOR, NEWS, RESEARCH, EXCHANGE
```

The requested inventory names “Reserve” separately and omits Derivatives.
Reserve is not a tenth runtime category. It is an evidence domain within
`EXCHANGE`, using source ID `exchange-reserve`. This audit includes both the
required Reserve mapping and the omitted canonical Derivatives category;
future implementation must not change the category vocabulary merely to make
the planning table line up.

## 3. Readiness Summary

| Evidence domain | Canonical category | Current status | Wiring status | Highest-confidence source |
| --- | --- | --- | --- | --- |
| Market | `MARKET` | PARTIAL | `ALREADY_AVAILABLE` | Supplied Scanner opportunity `_source` |
| Derivatives | `DERIVATIVES` | PARTIAL | `ENVELOPE_MISSING` | Futures Intelligence / Binance symbol context |
| Macro | `MACRO` | UNAVAILABLE | `BLOCKED` | `/api/macro` / `macro` |
| ETF | `ETF` | AVAILABLE | `READY_TO_WIRE` | `/api/etf-flow` / `etf-flow` |
| Prediction | `PREDICTION` | PARTIAL | `FRESHNESS_MISSING` | `/api/research/prediction-markets` / `prediction-markets` |
| Sector | `SECTOR` | AVAILABLE | `READY_TO_WIRE` | `/api/market/sector-rotation` / `sector-rotation` |
| Reserve | `EXCHANGE` | PARTIAL | `READY_TO_WIRE` | `/api/dashboard/reserve-intelligence` / `exchange-reserve` |
| News | `NEWS` | PARTIAL | `ENVELOPE_MISSING` | `/api/news` / `news` or `regional-news` |
| Research | `RESEARCH` | UNAVAILABLE | `BLOCKED` | No signal-time Research evidence contract |
| Exchange comparison | `EXCHANGE` | PARTIAL | `FRESHNESS_MISSING` | `/api/market/exchange-comparison` / `exchange-comparison` |

`AVAILABLE` here means the route contract can produce a valid Context item
when its existing source is healthy. It does not promise that a live provider
will be available for every Signal.

## 4. Source Mapping

### 4.1 Market

| Item | Finding |
| --- | --- |
| Production input | `metadata.scannerOpportunity` supplied to Local Runner; upstream candidates commonly originate from `/api/market/movers` or `/api/scanner/opportunities` |
| Source envelope | SignalCapture reads `scannerOpportunity._source`; upstream Scanner Opportunities itself is a bare array without `_source` |
| Freshness support | Supported only when supplied metadata contains canonical freshness and real `lastUpdatedAt` |
| Source ID | Any registered active production source; the certified pilot used `binance-live` |
| Availability | PARTIAL |
| Wiring status | `ALREADY_AVAILABLE` |

SignalCapture already creates a `MARKET` item containing reference price,
opportunity context, signal reason, and market structure when source metadata
passes its guard. If metadata is absent or freshness is `UNAVAILABLE`, Market
correctly remains unavailable. Future work should standardize the upstream
Scanner envelope, not weaken this guard.

### 4.2 Derivatives

| Item | Finding |
| --- | --- |
| Production APIs | `/api/market/futures-intelligence`, `/api/market/futures-symbol-context`, optionally `/api/market/exchange-comparison` |
| Source envelope | Futures Intelligence and symbol context have none; Exchange Comparison has `_source` but freshness is always `UNAVAILABLE` |
| Freshness support | Binance payloads expose some provider times (`time`, `nextFundingTime`), but aggregate observations lack a canonical oldest-observation rule and envelope |
| Source IDs | `futures-intelligence`, `binance-live`, `exchange-comparison` |
| Availability | PARTIAL |
| Wiring status | `ENVELOPE_MISSING` |

Funding and OI values exist, but freezing them now would require ad hoc source
identity and timestamp interpretation inside SignalCapture. Derivatives must
wait for an additive envelope on the selected canonical source path.

### 4.3 Macro

| Item | Finding |
| --- | --- |
| Production API | `/api/macro` |
| Source envelope | Present |
| Freshness support | Canonical policy exists, but route passes `lastUpdatedAt: null`; retrieval time is separate |
| Source IDs | `macro`, upstream `stooq-macro` |
| Availability | UNAVAILABLE in the documented current source-blocked state |
| Wiring status | `BLOCKED` |

The Stooq client has source date/time fields in successful quotes, but the
approved source currently returns no usable observations and the aggregate
route does not expose those fields as `lastUpdatedAt`. Yahoo and FRED remain
unapproved fallbacks. Macro cannot be wired until R-series source remediation
produces trusted observations and a real envelope timestamp.

### 4.4 ETF

| Item | Finding |
| --- | --- |
| Production API | `/api/etf-flow` |
| Source envelope | Present on all branches |
| Freshness support | Real Farside source dates; aggregate uses oldest included observation; canonical current/stale/expired behavior |
| Source IDs | `etf-flow`, upstream `farside-etf` |
| Availability | AVAILABLE when at least one verified BTC/ETH row exists; otherwise explicit stale/expired/unavailable |
| Wiring status | `READY_TO_WIRE` |

ETF is ready for guarded wiring. Capture must preserve `STALE` when returned,
must not represent excluded stale rows as current, and must include only the
rows actually present at Signal creation. The configured CoinMarketCap
fallback must not be recorded unless it actually supplied the response.

### 4.5 Prediction

| Item | Finding |
| --- | --- |
| Production API | `/api/research/prediction-markets` |
| Source envelope | Present |
| Freshness support | Envelope intentionally reports `UNAVAILABLE`; aggregate `lastUpdatedAt` is null |
| Source IDs | `prediction-markets`, upstream `polymarket-gamma` |
| Availability | PARTIAL: probabilities may be source-backed, but timestamp trust is incomplete |
| Wiring status | `FRESHNESS_MISSING` |

The Polymarket client substitutes request time when a provider market lacks
`updatedAt`. That timestamp cannot become Context `observedAt`. Prediction is
not ready until missing provider timestamps remain missing and the aggregate
envelope derives freshness from the selected markets’ real timestamps.

### 4.6 Sector

| Item | Finding |
| --- | --- |
| Production API | `/api/market/sector-rotation` |
| Source envelope | Present on success, degraded, unavailable, and failure branches |
| Freshness support | Canonical; oldest contributing Binance `closeTime` and Upbit `timestamp` controls freshness |
| Source IDs | `sector-rotation`; inputs `binance-live`, `upbit-live`, `upbit-datalab` |
| Availability | AVAILABLE, PARTIAL, STALE, or UNAVAILABLE explicitly |
| Wiring status | `READY_TO_WIRE` |

Sector is the strongest immediate candidate. Capture should use the aggregate
`sector-rotation` source ID, preserve degraded/partial provenance in the
payload, and reject expired or unavailable branches rather than synthesizing
rankings.

### 4.7 Reserve

| Item | Finding |
| --- | --- |
| Canonical category | `EXCHANGE` |
| Production API | `/api/dashboard/reserve-intelligence` |
| Source envelope | Present on all branches |
| Freshness support | Real artifact `observedAt`; canonical current/stale/expired/unavailable handling |
| Source ID | `exchange-reserve` |
| Availability | PARTIAL: ready when artifact is usable; current artifact may be expired or selected asset absent |
| Wiring status | `READY_TO_WIRE` |

Reserve is contract-ready even though data availability is operationally
conditional. Wiring must copy only selected source-backed observations and
their existing envelope timestamp. An expired artifact produces unavailable
Context evidence; capture time must never refresh it.

### 4.8 News

| Item | Finding |
| --- | --- |
| Production API | `/api/news`; narrative aggregation is a related but interpreted product |
| Source envelope | Missing; route returns a bare ranked array |
| Freshness support | Not trustworthy for all rows; missing provider timestamps fall back to `Date.now()` |
| Source IDs | Registry contains `news`, `regional-news`, `gdelt-doc`, and `saveticker` |
| Availability | PARTIAL |
| Wiring status | `ENVELOPE_MISSING` |

News cannot be frozen safely until every included item either has a trusted
provider timestamp or is unavailable, and the response identifies the actual
provider subset. Translation, ranking, sentiment, and narrative tags must not
be mistaken for source facts unless their derived ownership is explicitly
governed.

### 4.9 Research

| Item | Finding |
| --- | --- |
| Candidate APIs | `/api/research/historical-analogs`, `/api/research/market-memory`, Event Impact and other manual Research routes |
| Source envelope | No canonical `_source`; custom `validity` contracts exist |
| Freshness support | Cache validity may include observed/generated times, but many unavailable branches have no observation timestamp |
| Source IDs | `historical-analog`, `market-memory`, `event-impact`, `verified-event-catalog` |
| Availability | UNAVAILABLE at ordinary Scanner Signal creation |
| Wiring status | `BLOCKED` |

Research workflows are manual and usually occur after Scanner emits a Signal.
Later Research evidence cannot be backdated into signal-time Context. A future
wire is permitted only for an immutable Research reference that demonstrably
existed before or at Signal creation. Process-local Market Memory fallback is
not sufficient for automatic Context capture.

### 4.10 Exchange Comparison

| Item | Finding |
| --- | --- |
| Canonical category | `EXCHANGE` |
| Production API | `/api/market/exchange-comparison` |
| Source envelope | Present |
| Freshness support | Missing: `_source.freshnessStatus` is always `UNAVAILABLE`; route stores retrieval time only |
| Source IDs | `exchange-comparison`; inputs `binance-live`, `bybit-live` |
| Availability | PARTIAL |
| Wiring status | `FRESHNESS_MISSING` |

Venue funding/OI comparisons are useful Exchange evidence, but neither venue
branch retains a source observation timestamp. The route must expose real
provider timestamps before Context wiring. Reserve and Exchange Comparison may
coexist in `EXCHANGE` because Context uniqueness is category plus source ID.

## 5. Ready-to-Wire Change Surface

No code changes are made in R2. The expected implementation surface for the
ready subset is:

| Candidate | Expected files | Required behavior |
| --- | --- | --- |
| Sector | `workers/local-runner/signalCapture.ts`, Local Runner request/input assembly, `workers/local-runner/README.md`, focused Local Runner checks | Convert an already-fetched sector response into one validated `SECTOR` item; preserve source timestamp and stale/partial state. |
| ETF | Same Local Runner/SignalCapture integration files and focused checks | Convert present ETF rows and envelope into `ETF`; no fallback claim, no date reconstruction. |
| Reserve | Same Local Runner/SignalCapture integration files and focused checks | Map usable `exchange-reserve` observations into `EXCHANGE`; expired/missing remains unavailable. |

The Context Snapshot runtime, Repository, persistence adapters, existing API
responses, pages, and package files should not need modification for these
three candidates. The preferred transport is caller-supplied, already-fetched
signal-time evidence. SignalCapture must not issue late provider fetches or
recompute evidence after the Signal boundary.

Market requires no Context runtime change. Its prerequisite work belongs to a
separate Scanner envelope migration so ordinary Scanner output can satisfy the
existing guarded path without bespoke metadata injection.

## 6. Priority Ranking

| Rank | Domain | ROI | Reason |
| ---: | --- | --- | --- |
| 1 | Sector | Highest | Complete canonical envelope, real aggregate timestamp, Scanner relevance, broad context value. |
| 2 | ETF | High | Certified envelope and real source dates; valuable independent capital-flow evidence. |
| 3 | Reserve | High | Certified envelope and real artifact observation time; adds exchange-balance evidence when current. |
| 4 | Market upstream standardization | High | Existing auto-capture works, but normal Scanner output lacks a canonical envelope. |
| 5 | Derivatives | High | Funding/OI are important, but envelope and aggregate timestamp policy are missing. |
| 6 | Prediction | Medium | Useful evidence; blocked specifically by timestamp trust rather than payload absence. |
| 7 | News | Medium | Broad context value, but multi-provider provenance and timestamp substitution require normalization. |
| 8 | Macro | Medium | High product value but currently source-blocked; wiring before remediation yields only unavailable evidence. |
| 9 | Exchange comparison | Medium | Useful venue context, but source observation times are absent. |
| 10 | Research | Deferred | Signal-time ownership is unresolved and manual post-signal evidence cannot be backfilled. |

## 7. Expected Sprint Sequence

| Sprint | Scope | Entry condition | Result |
| --- | --- | --- | --- |
| **R3** | Wire Sector Context evidence | Existing certified Sector envelope | New Signals can freeze source-backed `SECTOR`. |
| **R4** | Wire ETF Context evidence | Existing certified ETF envelope | New Signals can freeze present ETF observations and truthful stale state. |
| **R5** | Wire Reserve Context evidence | Current or explicitly unavailable Reserve artifact | New Signals can freeze `exchange-reserve` under `EXCHANGE`. |
| **R6** | Scanner/Market envelope normalization | Additive compatibility proven for Scanner output | Existing `MARKET` auto-capture works without handcrafted `_source`. |
| **R7** | Derivatives envelope and wiring | Futures source timestamps and aggregate policy certified | Funding/OI facts can enter `DERIVATIVES`. |
| **R8** | Prediction timestamp remediation and wiring | No request-time substitution; selected-market timestamps trusted | Probabilities can enter `PREDICTION`. |
| **R9** | News envelope/timestamp remediation and wiring | Actual provider subset and trusted timestamps exposed | Approved factual items can enter `NEWS`. |
| **R10** | Macro source remediation, then wiring | Approved source returns trusted observations | Macro facts can enter `MACRO`; otherwise remain unavailable. |
| **R11** | Exchange comparison timestamp remediation | Both venue branches expose real observation times | Venue comparison can join Reserve under `EXCHANGE`. |
| **R12** | Research signal-time contract decision | Immutable pre-signal Research reference exists | `RESEARCH` wiring or an explicit long-term unavailable decision. |

Each implementation sprint should wire one domain, preserve explicit
unavailable categories, and certify duplicate/conflict behavior. No sprint
may enrich an already-finalized Context Snapshot.

## 8. Stop Conditions

Stop a wiring sprint when:

1. `observedAt` would need to use request, retrieval, capture, or persistence time.
2. The source ID is unregistered, inactive, or not production-approved.
3. The route has no additive envelope and mapping would duplicate source logic in SignalCapture.
4. Evidence becomes available only after Signal creation.
5. A stale, expired, partial, or unavailable branch would need promotion to current.
6. The payload requires inferred confidence, regime, ranking, probability, reserve delta, or other missing fact.
7. Wiring would mutate or regenerate an existing Context Snapshot.

## 9. Decision

**CONTEXT WIRING BLOCKED**

Complete nine-category wiring is not safe today. The block is selective, not
architectural: Sector, ETF, and Reserve are ready, and Market already has a
guarded path. Derivatives and News need envelopes; Prediction and Exchange
Comparison need trusted freshness; Macro needs source remediation; Research
needs a signal-time ownership contract.

Implementation should proceed with the ready subset in isolated sprints while
blocked categories remain explicit `UNAVAILABLE`.

## 10. Validation

* Canonical Context category vocabulary was verified from runtime types.
* Evidence validation, timestamp ordering, duplicate-source rules, finalization, and SignalCapture mapping were reviewed.
* Required production API routes and source clients were inspected statically.
* Registry identity, envelope presence, and freshness support were compared per domain.
* Reserve was mapped to canonical `EXCHANGE`; no new category was proposed.
* No runtime, SignalCapture, Repository, Context Snapshot, API, page, package, or UI file was modified.
* No TypeScript or build was required for this architecture-only audit.
