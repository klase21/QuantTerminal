# UNAVAILABLE Reduction Candidate Audit

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D12  
**Status:** Analysis complete  
**Scope:** Dashboard, Markets, Scanner, Research, Replay, and Trade

## 1. Audit Method

This audit inventories visible `UNAVAILABLE`, `UNKNOWN`, `NO DATA`, and durable
empty-state branches in the six product pages. Closely related fields emitted
by one branch are grouped into one inventory item; for example, missing bid,
ask, spread, and depth rows are one Orderbook item.

The audit distinguishes a reducible source gap from a correct unavailable
state. A state is reducible only when real data, provenance, timestamps, and
page ownership can be preserved. Empty results such as no alerts or no
qualifying opportunities are valid observations and must not be converted into
fabricated records.

### Classification

- **A. Existing source available (implementation gap)**
- **B. Existing source partially available (needs normalization)**
- **C. Future source planned**
- **D. Impossible / intentionally unavailable**
- **E. Ownership boundary (must remain unavailable)**

### Priority

- **P1:** High decision value, with an identifiable source-backed path.
- **P2:** Useful supporting context or a dependency on earlier P1 work.
- **P3:** Correct empty/boundary state, low-value reduction, or high risk.

## 2. Product-Wide Inventory

### 2.1 Dashboard

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| DASH-01 | Market Direction: direction, conclusion, confidence | `/api/market-drivers` timeout, failure, or empty summary | Dashboard; Market Driver derived product | A | P1 |
| DASH-02 | Market Direction: regime | Market Driver response has no regime | Markets-derived structure consumed by Dashboard | B | P2 |
| DASH-03 | Evidence Preview: ETF, Treasury, OI, Liquidation, Exchange Flow, Funding | Category is absent, stale, or unavailable in Market Driver summary | Data Platform / Markets; `etf-flow`, `treasury-snapshot`, `futures-intelligence`, `exchange-flow` and retained liquidation evidence | B | P1 |
| DASH-04 | Evidence Preview: Reserve and reserve delta | No observation, insufficient retained history, or source request failure | Data Platform; `exchange-reserve` via `/api/dashboard/reserve-intelligence` | B | P1 |
| DASH-05 | Historical Analog strip | Cache unavailable or no statistics | Replay/Research; `historical-analog` | E | P3 |
| DASH-06 | Prediction Markets | No relevant markets, filtered probability, or provider failure | Research; `prediction-markets` / `polymarket-gamma` | B | P2 |
| DASH-07 | Tactical Alerts | No live alerts pass current rules | Dashboard consumes existing market movers/signals | D | P3 |
| DASH-08 | Market Brief, Signal Evidence, Execution Guidance | No candidate or source evidence supports a brief | Dashboard summary of Market Movers and Futures Intelligence | B | P2 |
| DASH-09 | ETF Flow analytics | No validated current or stale ETF rows | Data Platform; `etf-flow` / `farside-etf` | B | P2 |
| DASH-10 | Liquidity Conditions | Funding, OI, or sector inputs are absent | Markets; `futures-intelligence` and `sector-rotation` | B | P2 |
| DASH-11 | Narrative Heatmap and Information Flow | Narrative request failed or returned no tagged rows | Research; `narratives`, `regional-news`, `gdelt-doc` | B | P2 |

`DASH-05` must not be reduced on Dashboard. `AGENTS.md`, the Dashboard skill,
and ADR-001 assign Historical Analog to Research and Replay. The current runtime
reference is an architecture conflict, not permission to restore the workflow.

### 2.2 Markets

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| MKT-01 | Inherited Dashboard direction, drivers, evidence, freshness | Direct navigation, missing/expired session context, or absent upstream field | Dashboard-owned Shared Product Context | E | P3 |
| MKT-02 | Ranked Opportunities | Market Movers request failed or returned no candidates | Scanner; `market-movers` via `/api/market/movers` | A | P1 |
| MKT-03 | Market Breadth | Sector Rotation unavailable or mapped coverage empty | Markets; `sector-rotation` | B | P1 |
| MKT-04 | Sector Rotation leaders and rows | Provider subset failed, mapping is thin, or no sectors returned | Markets; `sector-rotation`, `binance-live`, `upbit-live`, `upbit-datalab` | B | P1 |
| MKT-05 | Exchange Overview: venues, funding/OI relationships | Binance/Bybit branch or relationship field unavailable | Markets; `exchange-comparison`, `binance-live`, `bybit-live` | B | P1 |
| MKT-06 | ETF / Capital Flow: ETF observation | Selected asset has no validated ETF row | Data Platform; `etf-flow` / `farside-etf` | B | P2 |
| MKT-07 | ETF / Capital Flow: reserve observation | Selected asset has no reserve observation or delta | Data Platform; `exchange-reserve` | B | P2 |
| MKT-08 | Live Market State: price, 24h change/range | Binance ticker stream/REST unavailable | Markets; `binance-live` | A | P1 |
| MKT-09 | Funding, OI, and Market Structure | Aggregate and direct futures context are absent or structure inputs are partial | Markets; `futures-intelligence`, `market-structure`, `binance-live` | B | P1 |
| MKT-10 | Advanced Chart: candles and volume | No usable candle series | Markets; Binance live candle stream | A | P1 |
| MKT-11 | Orderbook: spread, bids, asks, depth | Shared orderbook stream has no usable levels | Markets; `binance-live` websocket | A | P2 |
| MKT-12 | Trade Flow | Trade stream has no rows | Markets; `binance-live` websocket | A | P2 |
| MKT-13 | Selected Symbol Liquidation History | Manual CryptoHFTData window is absent, unsupported, or timed out | Replay; `cryptohftdata` / `replay-cache` | E | P3 |
| MKT-14 | Current liquidation read | Display value remains hardcoded `NO DATA`; live liquidation evidence is not normalized into this field | Markets; existing Binance liquidation stream | B | P1 |

`MKT-13` must not become a heavy historical workflow in Markets. Historical
liquidation investigation belongs to Replay; Markets may retain only a light,
explicitly optional handoff or current-market summary.

### 2.3 Scanner

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| SCN-01 | Inherited Markets structure, sector, breadth, freshness | Direct navigation or missing/expired session context | Markets-owned Shared Product Context | E | P3 |
| SCN-02 | Scanner Summary counts | Market Movers and Scanner Opportunities returned no candidate list | Scanner; `market-movers`, `scanner-opportunities` | A | P1 |
| SCN-03 | Priority Opportunities | Neither existing candidate path returned ranked opportunities | Scanner; `/api/market/movers`, `/api/scanner/opportunities` | A | P1 |
| SCN-04 | Signal Feed | No candidates remain after the top three | Scanner; current ranked list | D | P3 |
| SCN-05 | Opportunity Filters category leader | No real candidate belongs to a displayed category | Scanner; current candidate categories | D | P3 |
| SCN-06 | Watchlist Candidates | No user-created active setup memory exists | Scanner; browser active-setup memory | D | P3 |
| SCN-07 | Supporting Context: mover and confidence summaries | Candidate source unavailable or no confidence-ranked records | Scanner; `market-movers`, `scanner-opportunities` | A | P2 |
| SCN-08 | Navigation Actions | No selected opportunity exists | Scanner; dependent on SCN-03 | D | P2 |

### 2.4 Research

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| RES-01 | Inherited opportunity, signal, structure, freshness | Direct navigation or missing/expired Scanner context | Scanner-owned Shared Product Context | E | P3 |
| RES-02 | Thesis | No user/upstream thesis was supplied | Research owns thesis evaluation; Scanner must not invent it | E | P2 |
| RES-03 | Supporting/Conflicting Evidence before manual load | Historical Analog, Event Impact, and Market Memory intentionally do not auto-poll | Research manual workflow | D | P3 |
| RES-04 | Historical Intelligence after load | Cache absent, stale, incompatible, or no comparable cases | Replay/Research; `historical-analog` | B | P1 |
| RES-05 | Event Impact after load | No verified event/outcome link or cache | Research; `event-impact`, `verified-event-catalog` | B | P2 |
| RES-06 | Market Memory after load | No accepted memories, catalog unavailable, or incomplete metadata | Research; `market-memory` | B | P1 |
| RES-07 | Conflicting Evidence | Loaded sources expose no contradiction metadata | Research; Historical Analog, Event Impact, Market Memory, Decision Brief | B | P1 |
| RES-08 | Narrative Timeline: macro, narratives, information flow | No current macro/narrative items or tagged heatmap | Research; `macro`, `narratives`, `stooq-macro`, regional news/GDELT | B | P1 |
| RES-09 | Prediction Markets and probability | No relevant market, null probability, or no observation timestamp | Research; `prediction-markets`, `polymarket-gamma` | B | P2 |
| RES-10 | Source Intelligence freshness/coverage/generated time | APIs do not consistently expose canonical source ID, observation time, quality, and health | Data Platform metadata consumed by Research | B | P1 |

Research manual-load states are intentional. Reduction means improving the
result after an explicit load, not enabling automatic Historical Analog or
Market Memory polling.

### 2.5 Replay

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| RPL-01 | Inherited context on direct Replay entry | No `contextId`, unavailable storage, invalid, or expired context | Upstream Shared Product Context | E | P3 |
| RPL-02 | Inherited thesis, evidence counts, confidence, freshness | Per-hop contexts do not preserve every upstream field | Research handoff / Shared Product Context | B | P2 |
| RPL-03 | Validation Status: price, positioning, liquidation availability | Selected replay window has incomplete loaded evidence | Replay; `replay-cache`, `cryptohftdata`, approved Binance positioning fallback | B | P1 |
| RPL-04 | Comparable Historical Cases | No selected historical case was inherited | Research supplies case; Replay must not create one | E | P2 |
| RPL-05 | Price Chart, candle/trade series, trend | No decoded ticker/candle/trade series or normalization failed | Replay; `cryptohftdata`, `binance-vision`, `replay-cache` | B | P1 |
| RPL-06 | Orderbook Snapshot | Cache absent, unusable levels, or full reconstruction exceeds runtime budget | Replay; `cryptohftdata`, `replay-cache` | D | P3 |
| RPL-07 | Open Interest and Funding | CryptoHFTData rows absent and Binance fallback unavailable | Replay; `cryptohftdata`, `binance-live` fallback | B | P1 |
| RPL-08 | Liquidations and Top Liquidations | Decoded liquidation dataset returned no rows | Replay; `cryptohftdata`, `replay-cache` | B | P1 |
| RPL-09 | What Happened, outcome path, and `If You Traded It` | Price/event coverage is insufficient | Replay; existing loaded replay evidence | B | P2 |
| RPL-10 | Failure Patterns: adverse cases and failure source | No durable comparable failure-pattern dataset is loaded | Replay future validation intelligence | C | P2 |
| RPL-11 | Event context, cache metadata, and Evidence Quality | Selected event/cache metadata or trade rows are absent | Replay; `replay-cache`, Data Health metadata | B | P2 |

`RPL-06` must remain unavailable in the request path when no checkpoint/cache is
present. ADR-002 prohibits full snapshot/update reconstruction in a request.

### 2.6 Trade

| ID | Section / field | Current reason | Owner / current source | Class | Priority |
| --- | --- | --- | --- | --- | --- |
| TRD-01 | Inherited validation, Replay result, thesis, evidence | Replay handoff is absent, expired, or does not carry the field | Replay/Research Shared Product Context | B | P1 |
| TRD-02 | Selected candidate and Trade Summary | No Market Movers candidate or active setup exists | Scanner; `market-movers` plus local setup memory | A | P1 |
| TRD-03 | Current price and 24h change | Binance ticker stream has no selected-symbol row | Markets; `binance-live` | A | P1 |
| TRD-04 | Orderbook pressure, trade flow, liquidation pressure | Shared streams have no rows or are not reliably symbol-scoped | Markets; Binance websocket infrastructure | B | P2 |
| TRD-05 | Execution readiness, setup, entry, exit, and risk context | Existing candidate lacks real numeric entry/invalidation/target fields | Trade consumes current Market Movers candidate payload | B | P1 |
| TRD-06 | User risk inputs and Position Sizing | Account value, allocation, risk tolerance, leverage, fees, and slippage are not supplied | Trade future user-input/sizing workflow | C | P2 |
| TRD-07 | Execution Checklist validation/risk checks | Replay context or user risk inputs are absent | Trade; dependent on TRD-01 and TRD-06 | B | P2 |
| TRD-08 | Tactical Alerts metadata | Market Movers is unavailable | Scanner; `market-movers` | A | P2 |
| TRD-09 | Outcome metrics and win rate | No completed local setups exist | Trade local history | D | P3 |
| TRD-10 | Durable persistence/backend | Current setup memory is local-only by design | Trade future execution journal | C | P3 |

Trade must not turn TRD-01 or TRD-06 into a positive readiness claim. Replay
validation and user sizing inputs are distinct prerequisites.

## 3. Inventory Totals

### Priority totals

| Priority | Count |
| --- | ---: |
| P1 | 26 |
| P2 | 24 |
| P3 | 14 |
| **Total** | **64** |

### Classification totals

| Classification | Count | Reduction posture |
| --- | ---: | --- |
| A. Existing source available | 12 | Candidate for targeted wiring/reliability work |
| B. Existing source partially available | 33 | Normalize identity, timestamps, coverage, health, and handoffs |
| C. Future source planned | 3 | Backlog only; no placeholder implementation |
| D. Impossible / intentionally unavailable | 8 | Preserve explicit empty/unavailable behavior |
| E. Ownership boundary | 8 | Must remain unavailable at the owning boundary |
| **Total** | **64** | |

The highest-value pool is Class B. Reducing it does not require invented data;
it requires trustworthy metadata and consistent use of existing source-backed
results.

## 4. P1 Dependency Mapping

| ID | Required source | Required API/runtime | Registry entry | Freshness requirement | Health dependency | Fallback policy |
| --- | --- | --- | --- | --- | --- | --- |
| DASH-01 | Market Driver constituents | `/api/market-drivers` | **Missing derived `market-driver` entry**; constituents are registered | CURRENT <=15m | P0 conclusion must not be healthy without current constituent health | Last verified compatible summary may be STALE; otherwise UNAVAILABLE |
| DASH-03 | ETF, Treasury, OI, liquidation, exchange flow, funding | `/api/market-drivers` plus retained artifacts | `etf-flow`, `treasury-snapshot`, `futures-intelligence`, `exchange-flow`; liquidation identity requires explicit mapping | Domain policy per evidence type | Per-card health; one missing optional card must not fabricate evidence | Preserve partial set; no zero substitution |
| DASH-04 | Reserve snapshots/history | `/api/dashboard/reserve-intelligence` | `exchange-reserve` | CURRENT <=1h; STALE <=6h | Observation and delta health must be independent | Last validated snapshot may be STALE; missing history keeps delta unavailable |
| MKT-02 | Binance 24h movers | `/api/market/movers` | `market-movers`, upstream `binance-live` | CURRENT <=5m | P0 for discovery | No fallback ranking; explicit empty/unavailable |
| MKT-03 | Mapped breadth | `/api/market/sector-rotation` | `sector-rotation` | CURRENT <=5m | Derived health cannot exceed required provider inputs | Binance-only partial mode; no synthetic breadth |
| MKT-04 | Binance/Upbit rotation inputs | `/api/market/sector-rotation` | `sector-rotation`, `binance-live`, `upbit-live`, `upbit-datalab` | CURRENT <=5m; DataLab <=15m | Missing optional DataLab lowers coverage, not identity | Binance-only/remaining-provider partial result |
| MKT-05 | Binance and Bybit venue data | `/api/market/exchange-comparison` | `exchange-comparison`, `binance-live`, `bybit-live` | CURRENT <=5m | Venue and relationship health should remain distinct | Single venue marked PARTIAL; no invented relationship |
| MKT-08 | Binance ticker | Existing market socket and Binance 24h REST path | `binance-live` | LIVE stream <=15s; REST CURRENT <=5m | Stream disconnect/invalid symbol must degrade explicitly | Last verified compatible ticker may be STALE; no fake price |
| MKT-09 | Funding, OI, sector structure | `/api/market/futures-intelligence`, `/api/market/futures-symbol-context`, `/api/intelligence/market-structure` | `futures-intelligence`, `market-structure`, `binance-live` | CURRENT <=15m for OI/funding; structure <=5m | Structure health cannot exceed rotation/OI/funding inputs | Existing direct Binance context only; partial fields stay unavailable |
| MKT-10 | Binance candle stream | Existing market websocket runtime | `binance-live` | LIVE/CURRENT for selected symbol and interval | Connection and symbol identity required | Last compatible candle cache may be STALE; no synthetic candles |
| MKT-14 | Binance liquidation stream | Existing liquidation websocket runtime | `binance-live` until a governed derived liquidation ID exists | LIVE <=15s | Must be selected-symbol scoped before a strong claim | Empty stream means no observed events, not zero liquidation pressure |
| SCN-02 | Movers and scanner opportunities | `useMarketMovers`, `/api/scanner/opportunities` | `market-movers`, `scanner-opportunities` | CURRENT <=5m | P0 Scanner health must reflect both path and provenance | Existing direct Market Movers candidates; no generated counts |
| SCN-03 | Ranked opportunities | `/api/scanner/opportunities`, `/api/market/movers` | `scanner-opportunities`, `market-movers` | CURRENT <=5m | Ranking health must follow real upstream inputs | Existing Market Movers candidates only; no synthetic ranking |
| RES-04 | Historical state/case cache | `/api/research/historical-analogs` manual load | `historical-analog` | Current-state input <=24h; immutable case validity by identity | Cache/schema/coverage health required | None; explicit unavailable |
| RES-06 | Accepted memory catalog | `/api/research/market-memory` manual load | `market-memory` | Follows newest accepted source; missing timestamp UNKNOWN | Catalog and evidence-link health required | None; explicit unavailable |
| RES-07 | Contradiction evidence | Existing Historical Analog, Event Impact, Market Memory, Decision Brief payloads | `historical-analog`, `event-impact`, `market-memory` | Inherit each source's policy | Contradictions cannot outrank weakest supporting source | Preserve partial loaded set; no generated contradiction |
| RES-08 | Macro and narrative observations | `/api/macro`, `/api/narratives?range=24h` | `macro`, `narratives`, `stooq-macro`, `regional-news`, `gdelt-doc` | Macro <=30m; narratives <=15m | Missing provider timestamp must be UNKNOWN/UNAVAILABLE | Successful provider subset marked PARTIAL |
| RES-10 | Canonical provenance metadata | Existing Research APIs plus source envelope/runtime | `data-health` and each source-specific entry | Source-specific; never retrieval-time substitution | Health derives from explicit freshness, quality, and status | Additive metadata only; absent metadata remains UNKNOWN |
| RPL-03 | Window replay cache and approved positioning fallback | `/api/replay/cryptohftdata`, `/api/replay/binance-positioning`, `/api/market/futures-symbol-context` | `replay-cache`, `cryptohftdata`, `binance-live` | Historical identity/schema validity; current fallback <=15m | Dataset-level health, not one blanket ready state | Binance OI/funding only; no chart/liquidation/orderbook substitution |
| RPL-05 | Trades/ticker/candle historical series | `/api/replay/cryptohftdata` and existing Binance kline fallback path | `cryptohftdata`, `binance-vision`, `replay-cache` | Immutable evidence valid by symbol/window/schema | Coverage and normalization must pass | Compatible Binance candle fallback only where already approved |
| RPL-07 | Historical OI/funding | CryptoHFTData then `/api/replay/binance-positioning` | `cryptohftdata`, `binance-live`, `replay-cache` | Window identity; fallback observation <=15m where current | Positioning health reported separately | Existing Binance OI/funding fallback only |
| RPL-08 | Historical liquidations | `/api/replay/cryptohftdata` / precomputed cache | `cryptohftdata`, `replay-cache` | Window identity and decoded coverage | Missing rows remain unavailable, not zero | No approved substitute |
| TRD-01 | Replay validation/result and inherited Research context | Shared Product Context Replay -> Trade handoff | Context contract; supporting sources retain their own registry IDs | Preserve upstream timestamps/status | Validation and Replay health must be read, not inferred | Direct Trade remains usable with validation unavailable |
| TRD-02 | Market Movers candidates and local active setups | Existing Market Movers hook/API and setup memory | `market-movers`; local memory is application state | Candidate CURRENT <=5m | Candidate source health must remain visible | Existing active setup memory; no invented candidate |
| TRD-03 | Binance ticker | Existing market websocket runtime | `binance-live` | LIVE <=15s | Selected-symbol stream identity required | Last compatible verified ticker may be STALE |
| TRD-05 | Candidate execution fields | Existing Market Movers candidate contract | `market-movers` | Candidate CURRENT <=5m | Execution readiness cannot exceed candidate field coverage | No computed entries/stops/targets unless a future approved engine receives real inputs |

## 5. No-Fabrication Check

The proposed reduction path explicitly preserves these constraints:

- **No placeholder values:** empty provider results remain empty; missing numeric
  fields are not converted to zero.
- **No synthetic confidence:** confidence remains absent unless an existing
  source-backed payload supplies it.
- **No fake validation:** Replay alone owns validation, and Trade may only read
  an inherited validation result.
- **No generated sizing:** position sizing remains unavailable until explicit
  user risk/account inputs and an approved sizing contract exist.
- **No fabricated timestamps:** `retrievedAt` may describe transport, but it
  never replaces `lastUpdatedAt` or a provider observation time.
- **No synthetic rankings or cases:** Scanner does not create opportunities to
  fill an empty feed, and Replay does not invent a comparable case.
- **No request-path orderbook reconstruction:** Replay orderbook remains
  unavailable without a safe precomputed cache/checkpoint.

## 6. Candidate Roadmap

### Sprint D13 - Market Driver Registry and Metadata Normalization

- **Target:** Register the existing Market Driver derived source and define its
  constituent provenance, timestamp, freshness, and health propagation.
- **User impact:** Unblocks honest diagnosis of Dashboard Market Direction and
  Evidence Preview instead of treating all failures alike.
- **Affected pages:** Dashboard; metadata consumers only.
- **Risk:** Medium. The scoring and values must remain unchanged.

### Sprint D14 - Dashboard Evidence Availability Integration

- **Target:** Apply source identity/freshness/health to Market Driver evidence
  and Reserve Intelligence, preserving partial per-card results.
- **User impact:** Reduces DASH-01, DASH-03, and DASH-04 ambiguity and prevents
  one missing source from masking usable evidence.
- **Affected pages:** Dashboard and its existing APIs only under an explicit
  post-freeze product requirement.
- **Risk:** Medium-high because Dashboard is a critical path; additive contracts
  and compatibility tests are required.

### Sprint D15 - Markets and Scanner Discovery Source Normalization

- **Target:** Normalize Market Movers, Sector Rotation, Exchange Comparison,
  Market Structure, and Scanner Opportunities metadata; consolidate provenance
  without changing ranking.
- **User impact:** Reduces the largest P1 discovery gaps across Markets and
  Scanner.
- **Affected pages:** Markets and Scanner.
- **Risk:** Medium-high due polling/websocket duplication and frozen-page rules.

### Sprint D16 - Research Evidence Coverage Metadata

- **Target:** Add canonical source envelope, observation timestamps, coverage,
  and health to narratives, macro, Historical Analog, Event Impact, and Market
  Memory manual-load results.
- **User impact:** Makes source quality and conflicting-evidence availability
  explainable within the 60-second Research workflow.
- **Affected pages:** Research only; historical auto-polling remains disabled.
- **Risk:** Medium. Timestamp substitution and mock/test reachability are stop
  conditions.

### Sprint D17 - Replay Dataset Availability Normalization

- **Target:** Normalize per-window chart, positioning, liquidation, cache, and
  fallback diagnostics using existing CryptoHFTData and Binance paths.
- **User impact:** Reduces RPL-03, RPL-05, RPL-07, and RPL-08 while keeping heavy
  optional datasets non-blocking.
- **Affected pages:** Replay; Trade benefits later through inherited context.
- **Risk:** High. Replay ingestion and orderbook infrastructure are protected;
  no full orderbook reconstruction or new matching engine is allowed.

Trade execution and sizing work should follow these five sprints. Trade cannot
be made trustworthy by filling its fields before Replay validation continuity,
candidate field coverage, and explicit user risk inputs exist.

## 7. Validation

- `docs/project/unavailable-reduction-audit.md` exists.
- Runtime files changed by Sprint D12: none.
- API files changed by Sprint D12: none.
- Page files changed by Sprint D12: none.
- Package files changed by Sprint D12: none.
- Build required: no.
