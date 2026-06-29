# Data Source Governance

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D1  
**Status:** Canonical governance baseline  
**Scope:** Existing sources and derived data products only

## 1. Purpose

This document defines how QuantTerminal identifies, owns, evaluates, degrades, and consumes data before any API expansion. It governs external providers, normalized artifacts, and derived intelligence.

Core rule:

```text
Source-backed data -> validated normalization -> explicit quality/freshness -> page consumption
```

Missing data remains missing. A fallback may preserve availability only when its provenance and limitations are explicit.

## 2. Canonical Data Sources

### 2.1 External Authorities

| Source ID | Authority | Existing use |
| --- | --- | --- |
| `binance-live` | Binance public Spot/Futures REST and WebSocket | Tickers, candles, trades, orderbook, funding, open interest, liquidations, market movers, structure |
| `binance-vision` | Binance public historical archive | Historical OHLCV backfill and canonical market-data caches |
| `upbit-live` | Upbit public REST and WebSocket | KRW market participation and sector rotation |
| `upbit-datalab` | Upbit DataLab public endpoints | Regional market indicators and market-structure context |
| `bybit-live` | Bybit public linear market REST/WebSocket | Exchange comparison and existing multi-exchange streams |
| `cryptohftdata` | CryptoHFTData authenticated downloads | Replay trades, orderbook, liquidations, OI, mark price, and ticker datasets |
| `coinmarketcap-data-api` | CoinMarketCap public data-api and compatible adapter contracts | Exchange flow, treasury holdings, Binance reserve wallets, optional ETF-compatible ingestion |
| `farside-etf` | Farside Investors public BTC/ETH ETF tables | Daily ETF net-flow observations |
| `polymarket-gamma` | Polymarket Gamma public API | Prediction-market probability, volume, liquidity, and attention context |
| `stooq-macro` | Stooq public CSV quotes | DXY, US10Y, VIX, and S&P 500 macro context |
| `gdelt-doc` | GDELT DOC API | Global narrative-news enrichment |
| `regional-news` | CoinDesk, Cointelegraph, Decrypt, Coinness, and Jinse feeds | English, Korean, and Chinese news aggregation |
| `saveticker` | SaveTicker public news API | Korean crypto news plus source-provided vote and view observations used by KR Retail derivation |
| `verified-event-catalog` | Curated records linked to authoritative sources such as Federal Reserve releases | Existing event and historical-impact inputs |

CoinGecko is not canonical in D1: no active adapter or API dependency was found. Yahoo Finance and FRED clients exist in legacy/support code, but the active `/api/macro` route uses Stooq; they are not approved fallbacks until a dedicated source contract is adopted. Mock Polymarket, macro, ETF, replay, and historical repositories are test/development fixtures and are prohibited as product fallbacks.

### 2.2 Normalized and Derived Sources

These are data products, not independent authorities. Their quality and freshness cannot exceed their weakest required input.

| Source ID | Inputs | Product |
| --- | --- | --- |
| `etf-flow` | Farside or validated CMC-compatible input | Normalized BTC/ETH daily net flow |
| `exchange-flow` | CoinMarketCap exchange flow | Exchange-level or asset-level flow artifact |
| `treasury-snapshot` | CoinMarketCap treasury table | Verified and partial holder snapshots |
| `exchange-reserve` | CoinMarketCap Binance reserve wallets | Reserve snapshots, retained history, deltas, and reserve observations |
| `market-movers` | Binance Futures 24-hour ticker | Ranked market-mover candidates |
| `futures-intelligence` | Binance exchange info, funding, mark price, and OI | Sector and symbol derivatives context |
| `exchange-comparison` | Binance Futures and Bybit linear markets | Venue funding/OI comparison |
| `sector-rotation` | Binance, Upbit, and optional Upbit DataLab | Breadth and sector rotation |
| `market-structure` | Sector rotation, Binance OI, and Binance funding | Derived structure intelligence |
| `scanner-opportunities` | Market movers, narratives, sector rotation, futures intelligence | Existing Scanner prioritization |
| `narratives` | Regional news and GDELT | Tagged heatmap, leaders, and divergence context |
| `historical-analog` | Canonical historical market states and outcomes | Comparable historical cases |
| `event-impact` | Verified events and durable outcomes | Source-backed event impact |
| `market-memory` | Historical cases, outcomes, and accepted event links | Durable historical memory |
| `replay-cache` | CryptoHFTData and approved Binance positioning fallback | Window-specific Replay evidence |
| `data-health` | Artifact index, coverage index, metadata, and files | Current/stale/missing/invalid/unsupported status |

## 3. Ownership Registry

Criticality:

- `P0`: page cannot perform its primary responsibility without this source family.
- `P1`: major evidence or decision support is reduced when unavailable.
- `P2`: optional context; the page remains useful without it.

| Source | Owner | Consumers | Criticality | Approved fallback | Update frequency | Freshness expectation | Known unavailable states |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Binance Live | Markets | Dashboard, Markets, Scanner, Replay, Trade | P0 | Cached last verified response; Binance historical positioning where explicitly supported | Stream/event or request-time | LIVE for active streams; CURRENT within domain threshold | timeout, region block, invalid symbol, empty book, disconnected stream |
| Binance Vision | Replay/Data Platform | Research, Replay | P1 | None | Backfill/on demand | Historical file validity, not wall-clock recency | file absent, unsupported interval, download/decode failure |
| Upbit Live | Markets | Markets, Scanner | P1 | Binance-only partial rotation | Request-time/stream | LIVE or CURRENT within 5 minutes | blocked response, empty KRW mapping, stream disconnected |
| Upbit DataLab | Markets | Markets, Research | P2 | Omit DataLab contribution | Request-time; market-list cache 10 minutes | CURRENT within 15 minutes | blocked endpoint, schema drift, empty indicators |
| Bybit Live | Markets | Markets | P1 | Binance-only comparison marked PARTIAL | Request-time | CURRENT within 5 minutes | non-zero provider code, missing ticker fields, timeout |
| CryptoHFTData | Replay | Replay, Research validation | P0 for full Replay | Binance fallback for OI/funding only; no orderbook substitute | Manual/window load | Immutable historical evidence after validation | API key absent, pre-coverage date, file absent, decode failure, runtime budget |
| CoinMarketCap Data API | Data Platform | Dashboard, Markets, Research | P1 | Last validated artifact marked STALE | Scheduled/manual artifact build | Hourly for flow/reserve; daily for treasury | endpoint/schema change, missing timestamp, partial fields, credentials for Pro path |
| Farside ETF | Data Platform | Dashboard, Markets, Research | P1 | Last validated ETF artifact marked STALE | Daily publication | CURRENT <=24h; STALE through 7 days; then EXPIRED | table shape change, market holiday/weekend, date parse failure, no verified row |
| Polymarket Gamma | Research | Dashboard, Research | P1 | Last verified cache when available, marked STALE | Request-time; recommended cache <=5 minutes | CURRENT <=15 minutes | no relevant markets, probability filtered, timeout, schema change |
| Stooq Macro | Research | Dashboard, Research, Scanner context | P1 | None currently approved | Request-time | CURRENT <=30 minutes | `N/D`, symbol mismatch, CSV change, timeout |
| GDELT DOC | Research | Research, Dashboard narrative context | P2 | Regional news only, marked PARTIAL | Request-time | CURRENT <=15 minutes | empty article set, timeout, schema change |
| Regional News | Research | Dashboard, Scanner, Research | P1 | Remaining successful providers, marked PARTIAL | Request-time/polling | CURRENT <=15 minutes | provider outage, RSS proxy failure, region filter empty, translation failure |
| Verified Event Catalog | Research | Research, Replay | P1 | None | Curated/manual | CURRENT when source reference and event timestamp validate | unverified link, missing outcome, unsupported event |
| ETF Flow | Data Platform | Dashboard, Markets, Research | P1 | Approved upstream fallback only | Daily build/request | Artifact policy: 24 hours | stale source date, unavailable coverage, invalid artifact |
| Exchange Flow | Data Platform | Dashboard, Markets | P1 | Last valid artifact marked STALE | Hourly target | Artifact policy: 1 hour | exchange-only partial scope, missing asset-level flow, endpoint failure |
| Treasury Snapshot | Data Platform | Dashboard, Markets, Research | P1 | Partial records with null timestamps; never CURRENT | Daily target | Artifact policy: 24 hours | missing `dataAsOf`, partial quality, stale observation |
| Exchange Reserve | Data Platform | Dashboard, Markets, Research | P1 | Last retained snapshot marked STALE | Hourly target | Artifact policy: 1 hour | missing network, provider timestamp absent, insufficient history for delta |
| Market Movers | Scanner | Dashboard, Markets, Scanner, Trade | P0 for Scanner | Existing empty fallback response with explicit reason; no candidates invented | Request/polling | CURRENT <=5 minutes | Binance unavailable, no eligible candidate, fallback mode |
| Futures Intelligence | Markets | Dashboard, Markets, Scanner, Trade | P1 | Per-symbol Binance direct context where already implemented | Request/polling | Artifact-equivalent derivatives expectation: 15 minutes | partial symbol coverage, exchange-info failure, OI/funding missing |
| Exchange Comparison | Markets | Markets | P1 | Single-venue result marked PARTIAL | Request-time | CURRENT <=5 minutes | Binance or Bybit unavailable, relationship unavailable |
| Sector Rotation | Markets | Dashboard, Markets, Scanner | P1 | Binance-only partial result | Request/polling | CURRENT <=5 minutes | Upbit/DataLab absent, thin mapping, connector error |
| Market Structure | Markets | Markets, Scanner, Research | P1 | Partial derivation with source-health reasons | Request-time | CURRENT <=5 minutes and no required stale input | rotation/OI/funding unavailable, empty sectors |
| Scanner Opportunities | Scanner | Scanner, Research handoff | P0 | Direct Market Movers candidates | Polling (currently 45 seconds in Scanner) | CURRENT <=5 minutes | all upstream APIs unavailable, no candidates |
| Narratives | Research | Dashboard, Scanner, Research | P1 | Successful provider subset marked PARTIAL | Polling/request | CURRENT <=15 minutes | no tagged items, all regions unavailable, fabricated timestamp risk |
| Historical Analog | Replay/Research | Research, Replay | P1 | None; manual-load unavailable state | Cache build/manual load | Current-state cache <=24h; historical cases immutable after validation | cache absent, no comparable cases, incompatible coverage, stale current state |
| Event Impact | Research | Research, Replay | P1 | None | Cache build/manual load | Follows event/outcome source validity | event not linked, outcome missing, cache absent |
| Market Memory | Research | Research, Replay | P1 | None | Catalog build/manual load | Follows newest accepted source; missing timestamp is UNKNOWN | no accepted memory, stale catalog, incomplete contradiction evidence |
| Replay Cache | Replay | Replay, Trade handoff | P0 for loaded Replay | Binance OI/funding fallback; optional orderbook remains unavailable | Explicit window load | Historical snapshot validity; cache identity must match window | no selected window, pre-coverage date, orderbook budget exceeded, cache absent |
| Data Health | Data Platform | All pages and operations | P0 governance | None | Audit/build time | Coverage index 15 minutes; artifact policy by type | missing file, invalid metadata/hash/size, unsupported policy |

## 4. Source Registry Model

Every future source response or artifact should resolve to this metadata shape:

```ts
interface DataSourceRegistryRecord {
  sourceId: string
  sourceName: string
  authority: string
  owner: "dashboard" | "markets" | "scanner" | "research" | "replay" | "trade" | "data_platform"
  consumers: string[]
  freshnessStatus: "LIVE" | "CURRENT" | "STALE" | "EXPIRED" | "UNAVAILABLE"
  qualityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" | "UNAVAILABLE"
  degradedReason: string | null
  unavailableReason: string | null
  cacheable: boolean
  fallbackSource: string | null
  lastUpdatedAt: string | null
}
```

Rules:

- `authority` names the external provider or canonical internal artifact, never the consuming page.
- `lastUpdatedAt` is the provider observation time when available. Request or generation time must not replace a missing observation time.
- `degradedReason` explains usable but incomplete data.
- `unavailableReason` explains why no usable data exists.
- `fallbackSource` must reference another registered source.
- A derived record retains the source IDs and timestamps of its required inputs.

## 5. Quality Levels

| Level | Meaning |
| --- | --- |
| `HIGH` | Direct authoritative or validated canonical data, complete for its declared scope, with valid provenance and observation time. |
| `MEDIUM` | Source-backed and usable but partial, derived, fallback-based, or missing non-critical fields. |
| `LOW` | Materially incomplete or stale but still safe for limited display; must include a degraded reason. |
| `UNKNOWN` | Provenance, timestamp, schema, or validation is insufficient to assign quality. It must not support a strong conclusion. |
| `UNAVAILABLE` | No usable source-backed record exists. No value may be substituted. |

Quality propagation:

1. A derived product cannot exceed the lowest quality of its required inputs.
2. Optional missing inputs may reduce coverage without invalidating the product.
3. A fallback cannot retain the primary source's quality label automatically.
4. Partial records remain partial even when artifact generation succeeds.
5. An HTTP 200 response is not evidence of `HIGH` quality.

## 6. Freshness Policy

| Status | Meaning |
| --- | --- |
| `LIVE` | An active stream or near-real-time source has a recent provider event inside its stream threshold. |
| `CURRENT` | The latest validated observation is inside its domain policy. |
| `STALE` | The observation is outside the current window but remains usable with an explicit warning. |
| `EXPIRED` | The observation is too old or identity-incompatible for product use. It may be retained for audit only. |
| `UNAVAILABLE` | No valid observation timestamp or usable source-backed payload exists. |

Canonical thresholds:

| Source class | LIVE/CURRENT | STALE | EXPIRED |
| --- | --- | --- | --- |
| Active WebSocket | event age <=15s | >15s to 60s | >60s/disconnected |
| Live market REST/derived structure | <=5m | >5m to 15m | >15m |
| Funding, OI, Market Driver | <=15m | >15m to 60m | >60m |
| Liquidation artifact | <=30m | >30m to 2h | >2h |
| Exchange flow/reserve/delta/intelligence | <=1h | >1h to 6h | >6h |
| ETF and treasury | <=24h | >24h to 7d | >7d |
| News and narratives | <=15m | >15m to 1h | >6h |
| Macro | <=30m | >30m to 4h | >24h |
| Prediction markets | <=15m | >15m to 2h | >6h |
| Current-state historical caches | <=24h | >24h to 7d | >7d or identity mismatch |
| Immutable historical evidence | Valid when source, checksum/schema, and window identity pass | Degraded when coverage is partial | Unavailable when missing/invalid; age alone does not expire history |

The existing Data Health policies remain authoritative for standardized artifacts: funding/OI/Market Driver 15 minutes, liquidations 30 minutes, ETF/treasury 24 hours, exchange flow/reserve/delta/reserve intelligence one hour, and coverage index 15 minutes.

## 7. Degradation Rules

Canonical sequence:

```text
Primary source unavailable
  -> approved registered fallback
  -> lower quality/freshness and show degraded reason
  -> if no usable fallback, show UNAVAILABLE with reason
```

Required behavior:

1. Preserve provider values and nulls; do not infer missing fields.
2. Never reconstruct inflow/outflow from net flow.
3. Never use request time or generation time as a missing observation time.
4. Never convert an empty response into zero activity.
5. Never promote stale cached data to CURRENT.
6. Never use mock/test adapters as product fallback sources.
7. Never let optional heavy Replay data block chart, liquidation, OI, or funding evidence.
8. Keep fallback provenance visible in source metadata and UI status.
9. If identity changes (`symbol`, exchange, timeframe, replay window), invalidate incompatible cached or inherited evidence.
10. A derived source fails closed when a required input is invalid; partial output is allowed only when its contract declares the missing input optional.

### 7.1 Existing Governance Exceptions

These paths exist today and are not approved precedents for Phase 3:

- `core/upbit-datalab/normalize.ts` contains hardcoded fallback indicator values, and `hooks/useRegimeEngine.ts` can reach them after a failed request. Governance requires an explicit `UNAVAILABLE` DataLab state instead of those values.
- News and narrative normalization can substitute `Date.now()` when a provider timestamp is absent. Such records must become `UNKNOWN` or `UNAVAILABLE`, not current observations.
- The Polymarket client can substitute request time for a missing provider `updatedAt`. Request time may describe retrieval, but it must not be represented as the market observation time.
- Historical Intelligence contains mock adapters, repositories, replay data, and a mock-event ingestion route. They are development/test surfaces only and must be blocked from production fallback chains.

These exceptions require dedicated implementation sprints. D1 documents them but does not alter runtime behavior.

## 8. Product Dependency Graph

```text
Dashboard
  <- Market Driver <- ETF / Funding / OI / Liquidation / Exchange Flow / Treasury
  <- Market Movers <- Binance Live
  <- Reserve Intelligence <- CMC Reserve + Historical Retention
  <- Prediction Markets <- Polymarket Gamma
  <- Macro <- Stooq
  <- Narratives <- Regional News + GDELT

Markets
  <- Binance Live + Upbit Live + Upbit DataLab + Bybit Live
  <- Market Movers / Futures Intelligence / Exchange Comparison
  <- Sector Rotation / Market Structure
  <- ETF Flow / Exchange Reserve Intelligence

Scanner
  <- Market Movers
  <- Scanner Opportunities <- Narratives + Sector Rotation + Futures Intelligence

Research
  <- Narratives / Regional News / GDELT
  <- Prediction Markets / Stooq Macro
  <- Historical Analog / Event Impact / Market Memory
  <- ETF / Treasury / Reserve evidence when available

Replay
  <- Research-selected context
  <- CryptoHFTData
  <- Binance positioning fallback
  <- Replay caches / canonical historical market data

Trade
  <- Replay validation context
  <- Scanner/Market Movers candidate context
  <- Binance live market, orderbook, trades, and liquidation context
  <- Local setup memory
```

Dashboard Historical Analog remains a governance conflict: `AGENTS.md` and ADR-001 prohibit it, while the frozen Dashboard/runtime still reference it. Phase 3 source work must not expand that dependency until the conflict is resolved through an explicit architecture decision.

## 9. UNAVAILABLE Reduction Strategy

Only source-backed reductions are permitted.

| Priority | Current unavailable area | Permitted Phase 3 reduction |
| --- | --- | --- |
| P0 | Inconsistent source health across APIs | Apply the registry envelope and Data Health statuses to existing endpoints and artifacts. |
| P0 | Replay orderbook/cache gaps | Precompute or retain verified CryptoHFTData snapshots outside request handlers; keep unsupported windows unavailable. |
| P0 | Replay validation absent for missing windows | Improve explicit coverage lookup and selected-window diagnostics; do not generate validation. |
| P1 | Exchange Flow/Treasury/Reserve staleness | Schedule existing CMC-backed builders, retain history, and expose real observation timestamps. |
| P1 | ETF unavailable/stale | Refresh Farside-backed artifacts and preserve market-calendar gaps as stale rather than zero. |
| P1 | Prediction markets empty/live-only | Cache the last verified Polymarket response with timestamp and downgrade it to STALE on live failure. |
| P1 | Macro unavailable | Add a governed fallback contract for existing Yahoo/FRED clients only after schema, timestamp, and provenance review. |
| P1 | Partial narratives/news | Preserve successful regional providers, expose provider coverage, and remove any request-time timestamp substitution. |
| P1 | Research historical evidence manual-only | Schedule existing Historical Analog, Event Impact, and Market Memory cache builders where real prerequisites exist; preserve manual loading in the Research UI. |
| P2 | Scanner empty opportunities | Improve upstream availability diagnostics and reuse valid Market Movers; never create candidates when source records are absent. |
| P2 | Trade Replay validation unavailable | Consume only real Replay handoff results; no successful chart or candidate may imply validation. |

Reduction success means fewer unexplained unavailable states, not fewer unavailable labels at any cost.

## 10. Future API Expansion Priorities

No API expansion is authorized by D1. Future work should proceed in this order:

1. **P0 - Registry adoption:** standardize source IDs, timestamps, quality, freshness, degraded reasons, and unavailable reasons in existing API responses.
2. **P0 - Health convergence:** align live API health with artifact Data Health without changing artifact policies.
3. **P0 - Provenance enforcement:** reject request-time timestamps, mock fallbacks, and zero-filled missing observations at API boundaries.
4. **P1 - Cache policy:** add source-specific last-known-good caches with explicit stale/expired transitions.
5. **P1 - Replay coverage:** expose verified coverage and precomputed cache availability without runtime-heavy reconstruction.
6. **P1 - Capital-flow operations:** operationalize existing CMC/Farside builders and retention before adding providers.
7. **P2 - Governed fallback adapters:** review existing but inactive Yahoo/FRED clients and multi-provider news paths.
8. **P2 - Consumer migration:** move pages to canonical registry metadata without changing page ownership or scoring.

Any future source requires a registry entry, ownership decision, freshness threshold, quality policy, fallback decision, and explicit unavailable behavior before implementation.

## 11. Validation

- `docs/project/data-source-governance.md` exists.
- Existing provider and derived-source names were confirmed from current routes, adapters, workers, artifacts, and governance documents.
- CoinGecko and mock adapters were not promoted into canonical product sources.
- Existing synthetic fallback and timestamp-substitution exceptions are documented for future remediation.
- Runtime files changed in D1: none.
- API files changed in D1: none.
- Package files changed in D1: none.
- Build required: no.
