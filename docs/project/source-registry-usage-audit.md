# Source Registry Usage Audit

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D3  
**Status:** Audit complete; no enforcement applied  
**Decision:** Registry integration is not ready until source aliases, mock-route exposure, and response metadata are normalized.

## 1. Scope and Method

This audit compares the canonical 32-source registry with current code under `app/api`, `lib`, `components`, and `workers/intelligence-tests`. Related hooks and transitive `core` dependencies were inspected when needed to identify the actual provider behind a route or page.

The optional static audit scanned 486 code files and 75 active `route.ts` files. It matched 30 registry entries outside the registry definition itself. Static matches indicate possible use; they do not prove that a branch executes at runtime.

Classifications:

| Classification | Meaning |
| --- | --- |
| Registered source | Provider or derived product maps to an active canonical registry entry. |
| Unregistered but existing source | Real source is used by current code but has no canonical entry. Approval is not implied. |
| Inactive source usage | Source code exists, but no active production route imports it. |
| Mock/test source usage | A reachable API path uses fixtures, mock adapters, or mock repositories. |
| Unclear source ownership | Internal product or control-plane route has no unambiguous registry owner or provenance chain. |

## 2. API Source Usage Audit

### 2.1 Provider and Product Routes

| Route | Underlying source | Canonical mapping | Classification |
| --- | --- | --- | --- |
| `/api/etf-flow` | Farside tables through `etfFlowClient` | `farside-etf` -> `etf-flow` | Registered source |
| `/api/macro` | Stooq CSV | `stooq-macro` -> `macro` | Registered source |
| `/api/prediction-markets` | Polymarket Gamma | `polymarket-gamma` -> `prediction-markets` | Registered source; response emits the authority ID rather than the derived ID |
| `/api/research/prediction-markets` | Polymarket Gamma | `polymarket-gamma` -> `prediction-markets` | Registered source; same alias issue |
| `/api/news` | CoinDesk, Cointelegraph, Decrypt, Coinness, Jinse, Wu sources | `regional-news` -> `news` | Registered source; per-item names are not canonical IDs |
| `/api/narratives` | Regional news plus GDELT | `regional-news`, `gdelt-doc` -> `narratives` | Registered source |
| `/api/kr-retail` | SaveTicker and Coinness | Coinness fits `regional-news`; SaveTicker has no entry | Unregistered but existing source |
| `/api/market/movers` | Binance USD-M 24-hour ticker | `binance-live` -> `market-movers` | Registered source; emits `binance-usdm-24hr-ticker` alias |
| `/api/market/futures-intelligence` | Binance Futures REST | `binance-live` -> `futures-intelligence` | Registered source |
| `/api/market/futures-symbol-context` | Binance Futures REST | `binance-live` / `futures-intelligence` | Registered source; emits `binance-direct` alias |
| `/api/market/exchange-comparison` | Binance Futures and Bybit Linear | `binance-live`, `bybit-live` -> `exchange-comparison` | Registered source; connector aliases are non-canonical |
| `/api/market/sector-rotation` | Binance Spot, Upbit, Upbit DataLab | `binance-live`, `upbit-live`, `upbit-datalab` -> `sector-rotation` | Registered source; emits composite alias `binance-upbit-real-market` |
| `/api/intelligence/market-structure` | Sector rotation plus Binance OI/funding | `sector-rotation`, `binance-live` -> `market-structure` | Registered source; emits `phase-27-30-market-structure` alias |
| `/api/market-drivers` | Binance funding/OI/price plus retained ETF, flow, liquidation, treasury, and historical artifacts | No `market-driver` registry entry | Unregistered derived source |
| `/api/scanner/opportunities` | Market Movers, Narratives, Sector Rotation, Futures Intelligence | `scanner-opportunities` with four registered inputs | Registered derived source, but route returns a bare array with no source envelope |
| `/api/upbit-datalab/snapshot` | Upbit DataLab and Upbit public proxy | `upbit-datalab`, `upbit-live` | Registered sources; multiple emitted aliases |
| `/api/dashboard/reserve-intelligence` | Deployable reserve-intelligence snapshot | Governed under `exchange-reserve` | Registered parent source; emitted snapshot source may not equal the canonical ID |
| `/api/dashboard/historical-analog` | Historical Analog cache | `historical-analog` | Registered source; remains an ADR/AGENTS governance conflict and must not be expanded |
| `/api/historical-analog` | Historical Analog cache | `historical-analog` | Registered source |
| `/api/research/historical-analogs` | Historical Analog cache | `historical-analog` | Registered source |
| `/api/event-impact` | Verified event catalog and event-impact cache | `verified-event-catalog` -> `event-impact` | Registered source |
| `/api/dashboard/market-memory` | Local historical snapshots and market-memory aggregation | `historical-analog` -> `market-memory` | Registered product; emits `market_state_snapshots` storage label |
| `/api/research/market-memory` | Durable catalog with process-local fallback | `market-memory` | Registered product; `process-local-fallback` is not a registered fallback source |
| `/api/replay/cryptohftdata` | CryptoHFTData | `cryptohftdata` | Registered source |
| `/api/replay/binance-positioning` | Binance historical positioning | `binance-vision` / approved Binance positioning fallback | Registered source; emits `binance-historical` alias |
| `/api/replay/orderbook-cache` | Precomputed Replay cache | `replay-cache` | Registered source |

### 2.2 Operations and Storage Routes

| Route | Source classification | Finding |
| --- | --- | --- |
| `/api/admin/backfill/binance-vision/ohlcv` | Registered source | Uses `binance-vision`; persisted records carry a source label. |
| `/api/admin/historical-data/status` | Registered internal storage | Reads local historical store; no canonical `data-health` envelope. |
| `/api/admin/historical-data/outcomes/rebuild` | Registered derived storage | Rebuilds historical outcomes from retained snapshots. |
| `/api/dashboard/snapshots` | Unclear source ownership | Accepts page-provided values and writes local snapshots without a registry source chain. |
| `/api/health` | Unclear source ownership | Runtime process health, not canonical `data-health`; naming can imply a broader guarantee than it provides. |
| `/api/intelligence/operations` | Unclear source ownership | Reads intelligence-operation artifacts without source-registry metadata. |
| `/api/intelligence/runs` | Unclear source ownership | Reads production-run records without source-registry metadata. |
| `/api/intelligence/scheduler` | Unclear source ownership | Scheduler control plane; no data-source envelope. |

### 2.3 Intelligence Layer Routes

| Route | Input | Classification |
| --- | --- | --- |
| `/api/intelligence/ai-layer` | `/api/intelligence/market-structure` | Unclear source ownership; internal derived layer is not registered and does not expose its input provenance. |
| `/api/intelligence/institutional-layer` | `/api/intelligence/ai-layer` | Unclear source ownership; chained provenance is not retained canonically. |
| `/api/intelligence/war-room-layer` | `/api/intelligence/institutional-layer` | Unclear source ownership; chained provenance is not retained canonically. |

### 2.4 Historical Intelligence Routes

These paths are reachable under `app/api`. Many are development-era systems backed directly or transitively by mock repositories.

| Routes | Classification | Source finding |
| --- | --- | --- |
| `/api/historical-intelligence/external-adapters/live-preview`, `/api/historical-intelligence/polymarket/validate-live-samples` | Registered source | Live Polymarket path maps to `polymarket-gamma`; response metadata is not canonical. |
| `/api/historical-intelligence/external-adapters/preview`, `/api/historical-intelligence/ingestion/mock-event` | Mock/test source usage | Explicit mock adapters and mock event ingestion are production-reachable paths. |
| `/api/historical-intelligence/external-review/enqueue` | Mock/test source usage | Defaults to mock mode when no mode is supplied. |
| `/api/historical-intelligence/external-review/items`, `/api/historical-intelligence/external-review/decision` | Unclear/mock-backed ownership | In-memory review queue can contain mock adapter output; no registry provenance envelope. |
| `/api/historical-intelligence/prediction-markets` | Mock/test source usage | `predictionMarketEngine` reads `mockPredictionMarketRepository`; this is separate from the live Polymarket route. |
| `/api/historical-intelligence/market-memory`, `/api/historical-intelligence/query`, `/api/historical-intelligence/scoring`, `/api/historical-intelligence/validation` | Mock/test source usage | Engines use mock historical repositories directly or transitively. |
| `/api/historical-intelligence/accepted-event-links/candidates`, `/api/historical-intelligence/accepted-event-links/list`, `/api/historical-intelligence/accepted-event-links/decision` | Mock/test source usage | Accepted-link services read mock persistence records. |
| `/api/historical-intelligence/event-memory-linker`, `/api/historical-intelligence/relationship-graph` | Mock/test source usage | Relationship engines read mock historical/persistence repositories. |
| `/api/historical-intelligence/replay-decision-journal`, `/api/historical-intelligence/replay-explanation`, `/api/historical-intelligence/replay-learning-summary` | Mock/test source usage | Replay intelligence engines consume the mock Replay case catalog. |
| `/api/historical-intelligence/persistence/decisions`, `/events`, `/memories`, `/outcomes`, `/playbooks`, `/replay-cases` | Mock/test source usage | Routes directly import `mockHistoricalPersistenceRepository`. |
| `/api/historical-intelligence/persistence/write/decision`, `/event`, `/memory`, `/outcome`, `/playbook`, `/replay-case` | Mock/test source usage | Write service delegates to the same mock persistence repository. |

### 2.5 Information Intelligence Routes

| Routes | Classification | Source finding |
| --- | --- | --- |
| `/api/information-intelligence/scoring` | Mock/test source usage | Scoring engine reads `mockInformationRepository` and returns `mode: "mock"`. |
| `/api/information-intelligence/review/enqueue`, `/items`, `/decision` | Mock/test source usage | Review flow is fed by the mock information repository. |
| `/api/information-intelligence/historical-bridge/preview` | Mock/test source usage | Bridge inherits mock information inputs and historical fixture dependencies. |
| `/api/replay` | Mock/test source usage | Directly imports `mockHistoricalIntelligenceRepository`. The frozen Replay V2 page uses the specific real-data routes instead. |

### 2.6 Inactive and Dormant Source Code

- `lib/macro/fetchYahoo.ts` contains a Yahoo Finance client but no active route imports it. Classification: inactive source usage; Yahoo is not an approved fallback.
- `lib/macro/fetchFRED.ts` is empty. No FRED runtime usage was found.
- `app/api/macro/route (2).ts` is not a Next.js `route.ts`, so it is not an active route. It contains randomized `tradingview-style-pseudo` values and must not be promoted or renamed into an active route.
- No active CoinGecko implementation was found.

## 3. Consumer Audit

| Consumer | Direct and indirect source use | Registry assessment |
| --- | --- | --- |
| Dashboard | Market Movers/Binance, Polymarket, Futures Intelligence/Binance, Stooq Macro, Farside ETF, Sector Rotation/Binance+Upbit, Narratives/news+GDELT, Market Driver artifacts, Reserve Intelligence, Historical Analog | Mostly registered. `market-driver` lacks a registry entry. Historical Analog is a documented architecture conflict. |
| Markets | Binance REST/WebSocket for candles, orderbook, trades and ticker; Market Movers; Futures Intelligence; Sector Rotation; Exchange Comparison/Binance+Bybit; Market Structure; Farside ETF; Reserve Intelligence; manual CryptoHFTData liquidation load | Providers are registered. Several client-side direct Binance calls bypass any future API envelope. |
| Scanner | Market Movers API plus Binance ticker WebSocket in `useMarketMovers`; Scanner Opportunities; inherited Markets context | Inputs are registered. Bare opportunities response has no source metadata, and API plus WebSocket paths create duplicate provenance surfaces. |
| Research | Narratives, regional news/GDELT, Polymarket, Stooq, manual Historical Analog, Event Impact, Market Memory; inherited Scanner context | Sources are registered. Freshness and quality remain endpoint-specific rather than canonical. |
| Replay | CryptoHFTData, Binance historical positioning, Binance Futures symbol context, Binance klines, Replay orderbook cache; inherited Research context | Real Replay V2 paths are registered. Legacy `/api/replay` remains mock-backed but is not used by `ReplayV1Page.tsx`. |
| Trade | Market Movers API and Binance ticker WebSocket, Binance trades/orderbook/liquidations, Futures Intelligence; inherited Replay context; local setup memory | Live providers are registered. Local setup memory is application state, not a source registry entry; inherited validation remains separate context metadata. |

## 4. Registry Mismatch Review

### 4.1 Sources Used but Not Registered

1. **SaveTicker:** actively fetched by `/api/kr-retail`; no source entry, owner, freshness threshold, or fallback policy exists.
2. **Market Driver:** `/api/market-drivers` is a first-class derived product with a governed 15-minute policy, but D2 has no `market-driver` entry.
3. **KR Retail:** the combined SaveTicker/Coinness product has no derived registry identity.
4. **AI, Institutional, War Room, and Information Intelligence layers:** internal derived outputs have no registry identities or canonical provenance chain. Whether these belong in the source registry or only in the artifact registry requires an ownership decision.
5. **Storage aliases:** `market_state_snapshots` and `process-local-fallback` are emitted as sources but are not canonical registry IDs.

### 4.2 Registered but Not Statically Matched

- `verified-event-catalog` is used conceptually through Event Impact, but its canonical ID is not emitted or referenced in the active route chain.
- `treasury-snapshot` has a production adapter and Market Driver consumption, but no dedicated active API route or canonical emitted ID was found.

### 4.3 Non-canonical Aliases

Aliases currently include `farside-investors`, `stooq`, `binance-usdm-24hr-ticker`, `binance-direct`, `binance-futures`, `binance-historical`, `bybit-linear`, `binance-upbit-real-market`, `phase-27-30-market-structure`, and provider-specific Upbit DataLab labels. These identify real systems but cannot be joined reliably to the registry without a mapping layer.

### 4.4 Inactive or Unapproved Fallbacks

- Yahoo client code exists but is inactive and unapproved.
- FRED has no active implementation.
- `process-local-fallback` is used by Research Market Memory but is not an approved source fallback.
- Mock historical, prediction, information, ETF, and macro adapters remain reachable through API routes and must not enter product fallback chains.

## 5. Freshness and Quality Gap Review

No inspected API provides the complete D1 metadata contract:

```text
sourceId + freshnessStatus + qualityLevel + degradedReason + unavailableReason + lastUpdatedAt
```

The static route-file check found the following markers among 75 active routes:

| Marker | Routes containing marker | Limitation |
| --- | ---: | --- |
| Source/sourceId | 19 | Most values are aliases, storage labels, or nested connector names. |
| Freshness/freshnessStatus | 1 | Other routes use `updatedAt`, `isStale`, candidate freshness, or no freshness field. |
| Quality/qualityLevel/dataQuality | 3 | Existing quality vocabularies do not match the canonical enum. |
| degradedReason | 0 | Partial/degraded states are usually encoded in notes, mode, or connector status. |
| unavailableReason/reason | 16 | Reason fields are inconsistent and often absent on successful empty responses. |

Important route-level gaps:

- ETF is relatively mature (`updatedAt`, `isStale`, `staleReason`, `unavailableReason`) but lacks canonical `sourceId`, freshness enum, and quality enum.
- Macro and Polymarket expose source, retrieval time, and unavailable reason, but not canonical freshness/quality. Both can substitute request time for missing provider observation time.
- Sector Rotation exposes connector quality and composite status, but uses a local vocabulary and composite source alias.
- Market Movers exposes source, updated time, mode, and candidate-level quality/freshness; it does not expose registry-level freshness/quality or degraded reason.
- Scanner Opportunities returns a bare array, so upstream source coverage, freshness, and failures are lost.
- Historical, information, and control-plane routes generally return domain records without a source envelope.
- Client-side direct Binance calls in Markets, Replay, and Trade cannot receive a QuantTerminal source envelope unless wrapped or decorated at the consumer boundary in a future sprint.

## 6. Static Audit Script

`workers/intelligence-tests/auditSourceRegistryUsage.ts` is a read-only diagnostic. It:

- scans production code and existing intelligence tests;
- maps known provider/source aliases to canonical registry IDs;
- reports Yahoo, FRED, CoinGecko, and SaveTicker terms;
- reports potential mock/test usage in `app/api` and `lib` production paths;
- inventories route-level metadata markers;
- exits successfully with `REPORT_ONLY` because D3 does not enforce registry usage.

The script deliberately does not add a package script. Its output requires human review because static string matching cannot distinguish every type-only import, dormant branch, or transitive provider.

## 7. Recommendation for D4

**Recommended D4: Source Metadata Envelope V1.**

Define, but initially do not force onto every route, a shared result type containing:

```text
data
sourceId
upstreamSourceIds
freshnessStatus
qualityLevel
lastUpdatedAt
degradedReason
unavailableReason
```

D4 should also provide an explicit alias-to-registry resolver. Start with leaf/provider routes (`etf-flow`, `macro`, `prediction-markets`, `market/movers`, Replay provider routes), then derived routes. Do not change scoring, polling, page behavior, or unavailable semantics.

Before broad integration, a dedicated security/production-boundary sprint should disable or gate production-reachable mock routes. That work is separate from envelope adoption and must preserve historical tooling needed for development.

## 8. Validation

- `docs/project/source-registry-usage-audit.md` created.
- Optional static audit script created without a package script.
- Audit script status: `REPORT_ONLY`; 486 files and 75 active API routes scanned.
- No page behavior changed.
- No API implementation changed.
- No fetch logic changed.
- No package file changed.
- No build run.
