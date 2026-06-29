# Critical Source Envelope Migration Plan

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D27  
**Status:** Planning complete  
**Runtime changes:** None

## 1. Scope and Method

This plan maps the APIs used directly or transitively by the frozen Dashboard,
Markets, Scanner, Research, Replay, and Trade pages, plus the global runtime
health consumer. A route is critical when a current product workflow depends
on its payload or its absence materially changes an approved page state.

Static inspection found five page-facing APIs that already emit additive
canonical `_source` metadata:

* `/api/etf-flow`;
* `/api/macro`;
* `/api/market/exchange-comparison`;
* `/api/market/sector-rotation`;
* `/api/research/prediction-markets`.

They are not migration candidates. The sixteen critical APIs below do not emit
`_source`. Direct browser connections to Binance REST/WebSocket are governance
gaps but are not API-envelope candidates because they do not pass through an
`app/api` response.

Risk definitions:

| Risk | Definition |
| --- | --- |
| LOW | One tolerant consumer, simple object payload, unambiguous source, simple failure branch, and branch coverage already present. |
| MEDIUM | Registered source and preservable payload, but multiple consumers, manual evidence semantics, or a critical page requires focused compatibility tests. |
| HIGH | Shared critical path, bare-array or fragile payload, derived/multi-source result, protected Replay behavior, complex partial branches, or incomplete branch coverage. |
| BLOCKED | Canonical identity, fallback provenance, or response-domain ownership is unresolved; an envelope would misrepresent the data. |

No candidate currently satisfies the full LOW definition.

## 2. Critical API Inventory

### Dashboard

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/market-drivers` | Dashboard | BLOCKED | Dashboard-critical derived summary has no canonical `market-driver` registry ID or constituent-health contract. |
| `/api/dashboard/reserve-intelligence` | Dashboard, Markets | MEDIUM | Registered artifact source and explicit coverage/freshness fields, but two consumers and Dashboard criticality require branch certification. |

Dashboard also consumes Market Movers, Prediction Markets, Futures
Intelligence, Narratives, Macro, ETF Flow, and Sector Rotation. Those routes
are listed under their owning domains or are already enveloped.

### Markets

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/market/futures-intelligence` | Dashboard, Markets, Scanner indirectly, Trade | HIGH | Broad derived payload, four product dependencies, connector-level partial states, and Trade sensitivity. |
| `/api/market/futures-symbol-context` | Markets, Replay | HIGH | Simple payload but protected Replay consumes it; no trusted observation timestamp is currently returned. |
| `/api/intelligence/market-structure` | Markets | HIGH | Multi-input derivation can be partial and must not report healthier metadata than Sector Rotation, OI, or funding inputs. |

### Scanner

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/market/movers` | Dashboard, Markets, Scanner, Trade | HIGH | P0 ranking input with REST failure semantics, a browser WebSocket alternate path, and four consumers. |
| `/api/scanner/opportunities` | Scanner | BLOCKED | Bare-array response has no place for top-level additive `_source`; changing it to an object would break the current contract. |

### Research

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/prediction-markets` | Dashboard | MEDIUM | One tolerant object consumer and clear Polymarket authority, but Dashboard criticality and legacy timestamp substitution require branch tests. |
| `/api/narratives` | Dashboard, Research, Scanner indirectly | HIGH | Multi-provider aggregation, partial-source behavior, and legacy request-time substitution for missing item timestamps. |
| `/api/event-impact` | Research manual load | MEDIUM | Registered immutable evidence source with explicit artifact metadata, but query/error/empty branches and validity fields must remain stable. |
| `/api/research/market-memory` | Research manual load | BLOCKED | Durable artifacts can fall back to `process-local-fallback`, which is not an approved source or registered fallback. |

### Replay

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/historical-analog` | Research manual load | HIGH | Replay-owned historical evidence with cache identity, validity, contradiction, and unavailable semantics. |
| `/api/replay/cryptohftdata` | Markets, Replay | HIGH | Protected provider path with optional datasets, partial availability, coverage limits, and strict responsiveness requirements. |
| `/api/replay/binance-positioning` | Replay | BLOCKED | Implementation calls Binance Futures historical-range APIs while static governance currently aliases `binance-historical` to `binance-vision`; canonical source identity must be reconciled first. |
| `/api/replay/orderbook-cache` | Replay | HIGH | Protected cache path with missing/corrupt/ready states; orderbook must remain optional and non-blocking. |

### Trade

Trade has no Trade-owned API requiring an independent envelope migration.
It consumes `/api/market/movers` and `/api/market/futures-intelligence`, both
listed under their owning domains. Trade calculations, local setup memory, and
inherited Shared Product Context are not production data sources and must not
receive `_source` envelopes.

### Shared / Intelligence

| API | Consumers | Risk | Reason |
| --- | --- | --- | --- |
| `/api/health` | Global Runtime Shell | BLOCKED | It reports process uptime/memory state, not the registered `data-health` artifact. A runtime-diagnostics contract is required instead of misusing a source envelope. |

Control-plane APIs, source-governance diagnostics, admin routes, and isolated
mock routes are outside the six-page critical envelope rollout. SaveTicker is
registered, but `/api/kr-retail` remains outside this plan because no frozen
page consumes it and D26 correctly deferred a multi-source envelope identity.

## 3. Migration Batches

### Batch 1 - Lowest Risk, Highest Value

1. `/api/dashboard/reserve-intelligence`

It has a registered aggregate (`exchange-reserve`), real artifact
`observedAt`/`generatedAt` values, explicit freshness and coverage, an additive
object payload, and existing Reserve Intelligence plus Dashboard integration
audits. It is the strongest candidate for a one-route rollout.

### Batch 2 - Medium Risk

1. `/api/prediction-markets`
2. `/api/event-impact`

Prediction Markets should follow the already-enveloped Research variant but
must not treat route `updatedAt` or a substituted market `lastUpdated` as a
source timestamp. Event Impact should migrate independently because immutable
evidence and artifact generation have different freshness semantics.

### Batch 3 - High Risk / Dedicated Certification

Recommended order:

1. `/api/market/futures-symbol-context`
2. `/api/market/futures-intelligence`
3. `/api/intelligence/market-structure`
4. `/api/market/movers`
5. `/api/narratives`
6. `/api/historical-analog`
7. `/api/replay/cryptohftdata`
8. `/api/replay/orderbook-cache`

The ordering establishes leaf/provider metadata before derived products:
symbol context before Futures Intelligence, Futures/rotation before Market
Structure, Market Movers before Scanner Opportunities, and historical provider
or cache metadata before broader Replay evidence use.

### Blocked

| API | Required governance decision |
| --- | --- |
| `/api/market-drivers` | Register a canonical derived source and define how the weakest required evidence controls aggregate freshness, quality, and health. |
| `/api/scanner/opportunities` | Define a versioned object response or another canonical metadata transport while preserving the existing bare-array contract for current consumers. |
| `/api/research/market-memory` | Approve, register, remove, or explicitly isolate `process-local-fallback`; do not label it as `historical-analog` merely because that source is configured as a registry fallback. |
| `/api/replay/binance-positioning` | Decide whether direct Binance historical-range REST is `binance-live`, `binance-vision`, or a separately governed source; preserve the allowed OI/funding fallback rule. |
| `/api/health` | Define a runtime diagnostics envelope distinct from source-backed data, or change the route to expose the registered `data-health` artifact in a separate endpoint. |

## 4. Candidate Compatibility Contracts

For every migration, `_source` is additive at the top level. Legacy provider
`source` fields remain untouched. Configured registry fallback IDs are shown
below for planning, but `fallbackSourceId` must remain `null` unless that source
actually supplied the returned data.

| API | Existing keys to preserve | Primary source ID / fallback | Unavailable behavior and timestamp policy | Required tests |
| --- | --- | --- | --- | --- |
| `/api/dashboard/reserve-intelligence` | `ok`, `status`, `reason`, `source`, `generatedAt`, `observedAt`, `freshness`, `coverage`, `observations` | `exchange-reserve` / none | Preserve HTTP 200 unavailable branches. Use valid `observedAt` as `lastUpdatedAt`; `generatedAt` is artifact generation only and must not replace a missing observation time. | Valid artifact, no matching observations, invalid artifact, missing file, stale observation; Dashboard and Markets parsing. |
| `/api/prediction-markets` | `ok`, `source`, `updatedAt`, `marketEvents`, `unavailableReason`, `diagnostics` | `polymarket-gamma` / none | Preserve HTTP 200 empty/error payloads. `updatedAt` is retrieval time. Use a provider market timestamp only when present and valid; never use the client fallback timestamp as canonical freshness. | Success, no meaningful markets, provider failure, malformed/missing provider timestamp, Dashboard additive-field tolerance. |
| `/api/event-impact` | `schemaVersion`, `ok`, `status`, `reason`, `query`, `events`, `outcomes`, `statistics`, `sampleCount`, `source`, `validity`, `contradiction` | `event-impact` / `verified-event-catalog` only when actually used | Preserve 400 query validation and result-level unavailable states. Use validated artifact `source.generatedAt` for age-independent evidence metadata; event occurrence time is not retrieval freshness. | Event query, category query, invalid query, no evidence, partial outcomes, artifact validity and contradiction preservation. |
| `/api/market/futures-symbol-context` | `ok`, `symbol`, `reason`, `openInterest`, `fundingRate`, `markPrice`, `indexPrice`, `oiNotional`, `nextFundingTime`, `source` | `binance-live` / none | Preserve HTTP 200 for missing data and errors. `nextFundingTime` is future schedule data, not `lastUpdatedAt`; freshness remains `UNAVAILABLE` until a real observation timestamp exists. | Success, invalid symbol, all-null response, provider error, Markets and Replay direct-entry behavior. |
| `/api/market/futures-intelligence` | `ok`, `source`, `updatedAt`, `mode`, `sectors`, `symbols`, `connectors`, `coverage`, `validation`, `notes`, `diagnostics` | `futures-intelligence` / configured `binance-live`, emit only for a real fallback branch | Preserve 200 success/partial and existing 500 error branch. `updatedAt` is derivation time; derive source freshness only from trusted constituent observations, otherwise `lastUpdatedAt: null`. | Connected, partial connector, no symbols, route error, cache hit/miss, all four consumers, unchanged calculations. |
| `/api/intelligence/market-structure` | `ok`, `source`, `updatedAt`, `mode`, `sectors`, `topSector`, `sources`, `endpoints`, `notes` | `market-structure` / configured `sector-rotation`, emit only if used as fallback | Preserve partial and 500 error semantics. Aggregate freshness/quality cannot exceed the weakest required constituent; route `updatedAt` is retrieval/derivation time only. | All connectors, one/multiple failures, empty inputs, route error, no health overstatement. |
| `/api/market/movers` | Entire `MarketMoversResponse`: `ok`, `source`, `mode`, `updatedAt`, `scanIntervalMs`, candidates/suppressed/focus fields, `summary`, `notes` | `market-movers` / none | Preserve HTTP 200 fallback and all ranking fields. `updatedAt` is build time; use validated Binance `closeTime` observations for canonical freshness, never build time. | REST success, provider failure fallback, focus symbol, empty scan, Dashboard/Markets/Scanner/Trade parsing, WebSocket fallback unchanged. |
| `/api/scanner/opportunities` | Preserve the bare array and every item field: `symbol`, `score`, `setup`, `direction`, `confidence`, `historicalSupport`, `priority` | BLOCKED: bare-array compatibility / configured `market-movers`, but Market Movers is currently an input, not a fallback | Do not append object metadata to the array. Migration requires either a backward-compatible transport/header decision or versioned object contract; aggregate freshness must be inherited from upstream envelopes. | Bare-array compatibility, each upstream unavailable/partial combination, stable ranking/order, polling unchanged. |
| `/api/narratives` | `range`, `updatedAt`, `sources`, `counts`, `items`, `heatmap`, `topNarratives`, `regionalLeaders`, `divergenceScore`, `topDivergence` | `narratives` / configured `regional-news`, emit only for an actual fallback | Preserve 500 empty shape and multi-provider partial results. `updatedAt` is retrieval time; legacy `Date.now()` substitution for missing item timestamps cannot support `_source.lastUpdatedAt`. | Each provider alone, mixed providers, all failed, missing/malformed timestamps, Dashboard/Research parsing, Scanner upstream behavior. |
| `/api/historical-analog` | `ok`, `status`, `symbol`, `interval`, `reason`, all payload fields, `validity`, `contradiction`, `diagnostics` | `historical-analog` / none | Preserve invalid-interval 400 and cache unavailable states. Use validated manifest `generatedAt` for age-independent artifact metadata; do not use request time. | Ready, empty, missing, expired/corrupt cache, invalid interval, Research manual-load behavior. |
| `/api/replay/cryptohftdata` | `ok`, `source`, `exchange`, `symbol`, `window`, dataset arrays, `diagnostics`, `reason` | `cryptohftdata` / none | Preserve all 400 validations, pre-coverage unavailable, partial dataset diagnostics, and 500 provider error. Use validated returned observation timestamps per requested dataset; do not imply unavailable datasets are fresh. | Every optional dataset, mixed available/unavailable, pre-coverage, unsupported input, timeout/provider error, Markets and Replay responsiveness. |
| `/api/replay/orderbook-cache` | `ok`, `source`, coordinates/window, `reason`, `trades`, `book`, `liquidations`, `openInterest`, `funding`, `candles`, `diagnostics` | `replay-cache` / configured `binance-live`, emit only if a fallback supplied the response | Preserve missing, corrupt, and ready cache shapes. Use cache manifest `generatedAt` for age-independent cache metadata; never reconstruct the orderbook in the request. | Invalid coordinates, missing cache, corrupt payload, ready cache, schema mismatch, non-blocking Replay behavior. |
| `/api/market-drivers` | `ok`, `summary`, `reason`; preserve 400 and 503 status codes and every `MarketDriverSummary` field | BLOCKED: no canonical aggregate ID / none | Define constituent observation policy first. Summary `timestamp` is derivation time; evidence `observedAt` values are the only source-time candidates. | Invalid symbol, full/partial/unavailable evidence, stale categories, build failure, Dashboard hierarchy. |
| `/api/research/market-memory` | `ok`, `status`, `reason`, `generatedAt`, `memories`, `source`, `validity` | `market-memory` / configured `historical-analog`; current `process-local-fallback` is unapproved | Preserve durable, process-local, and unavailable branches until governance decides the process-local branch. Do not claim canonical fallback or freshness for it. | Durable artifact, process-local branch, unavailable, invalid category, symbol filtering, manual-load behavior. |
| `/api/replay/binance-positioning` | `ok`, `source`, `symbol`, `window`, `funding`, `reason`, `diagnostics` | BLOCKED: reconcile `binance-live` versus `binance-vision` | Preserve 400 validation and partial funding/OI diagnostics. Once identity is approved, use latest valid returned observation timestamp; never request time. | Funding only, OI only, both, empty, provider error, invalid input, Replay controls unchanged. |
| `/api/health` | `ok`, `service`, `checkedAt`, `uptimeSec`, `memory` | BLOCKED: process runtime state is not `data-health` | `checkedAt` is a real diagnostic check time but not a provider observation. Preserve the lightweight global monitor and define a separate diagnostics contract before metadata. | Healthy response, monitor timeout/failure, SSR/global shell behavior, no polling regression. |

## 5. Global Compatibility Rules

1. Add top-level `_source`; never wrap an existing payload during this rollout.
2. Preserve every legacy key, type, HTTP status, cache header, and branch.
3. Keep legacy `source`, status, validity, diagnostics, and connector fields.
4. Resolve only exact IDs from the canonical registry.
5. Set `retrievedAt` to actual envelope creation/retrieval time.
6. Set `lastUpdatedAt` only from a trusted provider observation or validated
   artifact timestamp appropriate to that source policy.
7. Never copy a configured registry fallback into metadata unless that fallback
   actually supplied the returned data.
8. Do not invent success, degraded, partial, stale, or unavailable branches.
9. Empty or failed source data remains explicit `UNAVAILABLE`; metadata must not
   create placeholder values.
10. Consumers may ignore `_source`; no page refactor is part of an additive
    rollout.

## 6. Stop Conditions

Stop a migration and record the blocker when any condition is true:

* canonical `sourceId` is unclear or conflicts with runtime provider behavior;
* the existing response shape, status code, or cache behavior cannot remain
  unchanged;
* a source timestamp would need fabrication or retrieval time substitution;
* a fallback is unregistered, unapproved, or cannot be distinguished from a
  normal constituent;
* any consumer requires a refactor to tolerate additive metadata;
* critical success, partial, empty, unavailable, and error branches lack test
  coverage;
* metadata would overstate freshness, quality, or health relative to a required
  constituent;
* work expands into polling, ranking, scoring, fetch, protected Replay,
  WebSocket, or page behavior.

## 7. Recommended D28

**D28: Source Envelope Rollout - Reserve Intelligence**

Modify exactly `/api/dashboard/reserve-intelligence` and focused existing tests.
Use canonical source ID `exchange-reserve`; attach additive `_source` only;
preserve all legacy keys and HTTP 200 unavailable behavior; map valid
`observedAt` to source observation freshness; keep `lastUpdatedAt: null` when
observation time is absent; and do not introduce a fallback.

D28 acceptance must cover valid, stale, no-matching-observation, invalid
artifact, and missing-artifact branches plus unchanged Dashboard and Markets
consumer parsing. If any branch cannot preserve its current shape, stop rather
than widening the sprint.

## 8. Validation

* `docs/project/critical-source-envelope-migration-plan.md` exists.
* Critical unenveloped API inventory: 16.
* Risk totals: LOW 0, MEDIUM 3, HIGH 8, BLOCKED 5.
* Existing enveloped page-facing APIs excluded: 5.
* Runtime files changed: none.
* API files changed: none.
* Page files changed: none.
* Package files changed: none.
* Build and TypeScript validation: not run; documentation-only sprint.
