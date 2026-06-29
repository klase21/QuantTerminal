# Source Envelope Rollout Status

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D8  
**Status:** Two controlled pilots complete  
**Rollout posture:** Pause API expansion until freshness policy is reusable at runtime

## 1. Current Rollout Status

Static inspection confirms that exactly two API routes currently emit additive `_source` metadata.

### 1.1 Market Exchange Comparison

| Item | Status |
| --- | --- |
| Route | `/api/market/exchange-comparison` |
| Canonical source ID | `exchange-comparison` |
| Compatibility | PASS; all legacy keys, HTTP 200 behavior, and cache headers preserved |
| Success branch | `ACTIVE`, `MEDIUM`; both Binance and Bybit available |
| Degraded branch | `DEGRADED`, `PARTIAL_DATA`; one venue available |
| Unavailable branch | `UNAVAILABLE`, `SOURCE_UNAVAILABLE`; neither venue available |
| Timestamp policy | Legacy `updatedAt` and `_source.retrievedAt` are retrieval time. `lastUpdatedAt` remains `null`; freshness remains `UNAVAILABLE`. |
| Consumer impact | One runtime consumer, `components/markets/MarketsPage.tsx`; additive metadata is ignored safely. |

### 1.2 Research Prediction Markets

| Item | Status |
| --- | --- |
| Route | `/api/research/prediction-markets` |
| Canonical source ID | `prediction-markets` |
| Compatibility | PASS; `status`, `source`, `updatedAt`, `markets`, and `diagnostics` preserved |
| Success branch | `ACTIVE`, `MEDIUM`; at least one normalized market is available |
| Degraded branch | Not applicable. The existing route has no partial/degraded semantic branch, so none was invented. |
| Unavailable branch | Empty relevant set -> `EMPTY_RESPONSE`; provider/client error fallback -> `SOURCE_UNAVAILABLE` |
| Timestamp policy | Existing `updatedAt` is retrieval time. `_source.retrievedAt` reuses it; `lastUpdatedAt` remains `null`; freshness remains `UNAVAILABLE`. |
| Consumer impact | One runtime consumer, `components/research/ResearchPage.tsx`; optional-field parsing ignores `_source` safely. |

Both pilots preserve the legacy provider `source` field. `_source.sourceId` identifies the registered QuantTerminal aggregate and does not overwrite provider provenance.

## 2. Verified Rollout Rules

D5-D7 prove the following rules:

1. Add `_source` only; do not wrap the response during compatibility rollout.
2. Preserve every legacy field, value type, status code, header, and branch semantic.
3. Use only the exact canonical ID from `lib/data-governance/registry.ts`.
4. Keep legacy provider aliases intact until consumers explicitly migrate.
5. Use retrieval time only for `retrievedAt`.
6. Do not fill `lastUpdatedAt` without a trustworthy provider or artifact observation timestamp.
7. Do not label data `LIVE` or `CURRENT` from request time alone.
8. Do not invent degraded branches. Envelope status describes an existing branch.
9. Empty or failed data fails closed to `UNAVAILABLE` with a canonical reason.
10. Record a fallback only when that registered fallback actually supplied the response.
11. Do not add fetches, providers, normalization, scoring, polling, or cache behavior during envelope rollout.
12. Exercise success, partial when present, empty, and error branches before acceptance.

## 3. Remaining API Classification

The categories apply to routes that do not yet emit `_source`.

### Low Risk

No remaining route is certified low-risk today. A route may enter this class only after confirming one tolerant consumer, a simple object payload, a registered aggregate source, explicit unavailable behavior, and trustworthy timestamp handling.

### Medium Risk

| Routes | Risk reason |
| --- | --- |
| `/api/etf-flow` | Two tolerant consumers and strong stale metadata, but Dashboard-adjacent and has upstream fallback policy. |
| `/api/macro` | Registered `macro` source and simple object payload, but many consumers and no trustworthy observation timestamp. |
| `/api/market/sector-rotation` | Registered aggregate with explicit connector quality, but many page/API consumers, partial connectors, and in-memory caches. |
| `/api/intelligence/market-structure` | Registered aggregate, but consumes Sector Rotation and Binance derivatives and feeds later intelligence layers. |
| `/api/news`, `/api/narratives` | Registered aggregates, but multi-provider subsets and known timestamp-substitution exceptions require care. |
| `/api/upbit-datalab/snapshot` | Registered inputs, but multiple source aliases and mixed partial availability require normalization. |

### High Risk

| Routes | Risk reason |
| --- | --- |
| `/api/prediction-markets` | Dashboard-adjacent and inherits the Polymarket timestamp caveat. |
| `/api/market/movers` | Scanner, Dashboard, Markets, and Trade dependency; ranking and fallback semantics are product-critical. |
| `/api/market/futures-intelligence` | Multiple consumers including Trade; broad partial connector coverage. |
| `/api/market/futures-symbol-context` | Consumed by Markets and Replay; Replay behavior is protected. |
| `/api/scanner/opportunities` | Bare-array contract, ranking ownership, polling, and no existing metadata envelope. |
| `/api/market-drivers` | Dashboard critical path and currently lacks a canonical `market-driver` registry entry. |
| `/api/dashboard/reserve-intelligence` | Dashboard critical path with deployable snapshot and freshness semantics. |
| `/api/event-impact`, `/api/research/historical-analogs`, `/api/research/market-memory` | Manual-load historical Research paths with cache, validity, or fallback constraints. |
| `/api/replay`, `/api/replay/*` | Protected historical validation paths; optional data, cache identity, and graceful failure must remain stable. |

### Blocked

| Routes or family | Blocker |
| --- | --- |
| `/api/health` | Process health is not the registered `data-health` artifact; source ownership is unclear. |
| `/api/kr-retail` | SaveTicker and the combined KR Retail product are unregistered. |
| `/api/market-drivers` | No canonical derived source ID despite an existing governed freshness threshold. |
| `/api/dashboard/historical-analog`, `/api/dashboard/market-memory` | Dashboard historical ownership conflicts with AGENTS.md/ADR-001. |
| `/api/dashboard/snapshots` | Accepts page-provided state without a canonical source chain. |
| `/api/intelligence/ai-layer`, `/institutional-layer`, `/war-room-layer` | Derived-layer source ownership and provenance chaining are unresolved. |
| `/api/intelligence/operations`, `/runs`, `/scheduler`, `/api/admin/*` | Control-plane/storage responses need a contract distinct from provider data envelopes. |
| `/api/historical-intelligence/*` | Multiple production-reachable mock adapters and repositories. Live exceptions require isolation before rollout. |
| `/api/information-intelligence/*` | Mock information repository is production-reachable. |
| Legacy Yahoo/FRED and pseudo-macro code | Inactive or synthetic sources are not approved registry fallbacks. |

Blocked takes precedence over the apparent payload simplicity of a route.

## 4. Recommended Next Candidates

These candidates are ordered for rollout after freshness policy runtime is available.

### 1. ETF Flow

- **Route:** `/api/etf-flow`
- **Risk:** Medium
- **Source clarity:** Strong. Use canonical `etf-flow`; Farside remains upstream provider provenance.
- **Consumer tolerance:** Dashboard and Markets use optional object fields and tolerate additive keys.
- **Freshness:** Best available candidate. Source dates, `isStale`, `staleReason`, and `unavailableReason` already exist.
- **Fallback complexity:** Moderate. Only record CMC fallback if it actually supplied the payload; do not copy the configured fallback automatically.

### 2. Macro

- **Route:** `/api/macro`
- **Risk:** Medium
- **Source clarity:** Strong. Use canonical `macro`; current authority is Stooq.
- **Consumer tolerance:** Multiple consumers appear structurally tolerant, but each must be re-audited because the route is widely reused.
- **Freshness:** Weak. Existing `updatedAt` is retrieval time, not a provider observation timestamp.
- **Fallback complexity:** Low at runtime because no fallback is currently approved. Yahoo/FRED must not be activated by envelope work.

### 3. Sector Rotation

- **Route:** `/api/market/sector-rotation`
- **Risk:** Medium, highest of the three
- **Source clarity:** Strong aggregate ID `sector-rotation`, with Binance, Upbit, and DataLab inputs.
- **Consumer tolerance:** Many page and downstream API consumers; additive compatibility must be proven per consumer.
- **Freshness:** Connector timestamps and generated time exist, but they need one canonical aggregation rule.
- **Fallback complexity:** High. Binance-only results, optional Upbit/DataLab inputs, cache hits, failed chunks, and partial connector states must map without changing legacy mode.

## 5. Blockers

The remaining rollout is constrained by:

- unregistered sources and derived products, especially SaveTicker, KR Retail, and Market Driver;
- mock/test repositories reachable through production API paths;
- unclear ownership for process health, control-plane, and chained intelligence-layer outputs;
- fragile consumers such as bare arrays and protected Replay/Trade paths;
- request-time substitution for missing provider timestamps in Polymarket and news/narrative paths;
- legacy aliases that do not resolve directly to canonical IDs;
- configured fallbacks that may be mistaken for fallbacks actually used;
- Dashboard critical paths without dedicated envelope branch tests;
- historical routes whose availability depends on cache identity, manual loading, or architecture decisions.

## 6. Rollout Stop Conditions

Stop an envelope sprint when any of these conditions is true:

1. The response cannot remain additive and backward compatible.
2. The aggregate source is absent from the registry or has ambiguous ownership.
3. Only a mock, fixture, pseudo, or synthetic source supplies the route.
4. A timestamp would need to be fabricated or retrieval time presented as observation time.
5. A consumer requires a refactor merely to tolerate `_source`.
6. Existing success, partial, empty, or error semantics cannot be mapped without behavior change.
7. Fallback provenance cannot distinguish configured from actually used.
8. The route is Dashboard critical path without branch-level compatibility coverage.
9. The route touches protected Replay, Trade, WebSocket, ingestion, or historical behavior beyond metadata.
10. Validation reveals a TypeScript, audit, intelligence, build, polling, request, or hydration regression.

On stop, document the blocker. Do not force metadata, invent a source ID, or broaden the sprint.

## 7. D9 Recommendation

**Recommended sprint: Freshness policy runtime.**

Both successful pilots prove additive compatibility but also expose the same limitation: current route timestamps often represent retrieval rather than observation. D9 should define reusable, source-policy-aware freshness evaluation before applying the envelope to medium-risk APIs.

D9 should remain infrastructure-only. It should not apply `_source` to another route, activate a fallback, change page behavior, or reinterpret existing provider timestamps without evidence.

## 8. Validation

- `docs/project/source-envelope-rollout-status.md` exists.
- Current envelope usage confirmed on exactly two API routes.
- D8 runtime files changed: none.
- D8 API files changed: none.
- D8 page/component files changed: none.
- D8 package files changed: none.
- Build required: no.

Existing uncommitted D5 and D7 API changes remain in the worktree and were inspected, not modified, during D8.
