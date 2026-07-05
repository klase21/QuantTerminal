# Data Availability and Unavailable Root-Cause Audit

**Project:** Theta  
**Track:** Data Remediation  
**Sprint:** R1  
**Scope:** Product pages, APIs, Source Governance, and Context Snapshot inputs  
**Decision:** **DATA REMEDIATION ROADMAP READY**

## 1. Audit Method

This is a static audit of currently reachable availability branches. It
groups related fields that share one source and failure path; it does not
count every repeated `NO DATA` label as a separate defect. A state is included
when it is visible, reachable, a fallback, or intentionally unavailable.

The source of truth is current code. Earlier D12 findings are retained only
where the branch still exists. Certified improvements to ETF Flow, Sector
Rotation, Reserve Intelligence, Replay/Trade context, and Context lineage are
reflected below.

### Root-cause vocabulary

Every issue is assigned exactly one primary cause:

`SOURCE_BLOCKED`, `SOURCE_NOT_IMPLEMENTED`, `SOURCE_STALE`,
`SOURCE_EXPIRED`, `ENVELOPE_MISSING`, `CONTEXT_NOT_WIRED`,
`UI_NOT_CONSUMING`, `FALLBACK_MISSING`, `INTENTIONAL_UNAVAILABLE`,
`DATASET_TOO_SMALL`, `MOCK_ISOLATED`, or `MANUAL_ONLY`.

### Priority vocabulary

* **P0:** blocks Signal-to-Memory correctness.
* **P1:** affects a core product page or Context Snapshot quality.
* **P2:** affects secondary evidence, optional datasets, or status clarity.
* **P3:** deferred or intentionally unavailable.

No current P0 correctness defect was found. The factual pipeline fails closed
when required source-backed data is absent. The main remediation need is P1
coverage and provenance, not removal of unavailable labels at any cost.

## 2. Product Availability Inventory

### 2.1 Dashboard

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| DASH-01 | Market Direction/evidence `UNAVAILABLE`, `PARTIAL`, or `STALE` | `/api/market-drivers`; derived source ID remains unclear | Missing/stale constituent artifacts or failed summary removes the primary conclusion and reasons. | `ENVELOPE_MISSING` | P1 |
| DASH-02 | Macro evidence absent | `/api/macro`; `macro` / `stooq-macro` | Stooq currently returns no usable source observations; `_source` is unavailable and Dashboard correctly omits Macro causes. | `SOURCE_BLOCKED` | P1 |
| DASH-03 | ETF evidence `STALE`, `EXPIRED`, `UNAVAILABLE`, or partial | `/api/etf-flow`; `etf-flow` / `farside-etf` | Current/latest Farside rows may be old, incomplete across BTC/ETH, or unparsable. Summary loses capital-flow evidence. | `SOURCE_STALE` | P1 |
| DASH-04 | Sector evidence absent, partial, or stale | `/api/market/sector-rotation`; `sector-rotation` | Oldest contributing Binance/Upbit timestamp controls freshness; partial connectors reduce summary evidence. | `SOURCE_STALE` | P1 |
| DASH-05 | Reserve Intelligence unavailable, partial, stale, or expired | `/api/dashboard/reserve-intelligence`; `exchange-reserve` | Artifact missing/invalid/expired, no selected observation, or retained delta coverage is partial. | `SOURCE_EXPIRED` | P1 |
| DASH-06 | Prediction Markets empty; freshness not trustworthy | `/api/prediction-markets`; `prediction-markets` / `polymarket-gamma` | No relevant market may pass filters; provider timestamps can be replaced by request time and Dashboard treats response status as current. | `UI_NOT_CONSUMING` | P1 |
| DASH-07 | Narrative/Information Flow unavailable or partial | `/api/narratives`; `narratives`, `regional-news`, `gdelt-doc` | Provider subset may fail and GDELT can substitute request time for absent timestamps. Context becomes incomplete or ambiguously current. | `ENVELOPE_MISSING` | P2 |
| DASH-08 | Tactical Alerts/candidate summary empty | `/api/market/movers`; `market-movers` | Binance request failure produces explicit fallback mode; no qualifying candidates is a valid empty observation. | `FALLBACK_MISSING` | P1 |
| DASH-09 | Historical Analog absent | Removed by AGENTS.md and ADR-001 | Historical processing is intentionally not a Dashboard responsibility. No user-facing restoration is permitted. | `INTENTIONAL_UNAVAILABLE` | P3 |

### 2.2 Markets

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| MKT-01 | Inherited Dashboard context `UNAVAILABLE`, `STALE`, or `PARTIAL` | Shared Product Context | Direct navigation, invalid identity, or expired session context removes upstream summary only. | `INTENTIONAL_UNAVAILABLE` | P3 |
| MKT-02 | Ranked movers `UNAVAILABLE` or fallback | `/api/market/movers`; `market-movers` | Binance 24h request failure returns a fallback-shaped response without alternative source data. Discovery is reduced. | `FALLBACK_MISSING` | P1 |
| MKT-03 | Breadth/rotation `UNAVAILABLE`, `PARTIAL`, or `STALE` | `/api/market/sector-rotation`; `sector-rotation` | No mapped rows, connector subset failure, or oldest contributing observation outside policy. | `SOURCE_STALE` | P1 |
| MKT-04 | Exchange comparison unavailable/partial; relationships `NO DATA` | `/api/market/exchange-comparison`; `exchange-comparison` | Binance or Bybit may fail independently; both route branches have no source timestamp, so freshness stays unavailable. | `ENVELOPE_MISSING` | P1 |
| MKT-05 | ETF/reserve capital-flow panels stale, partial, or unavailable | `/api/etf-flow`, reserve intelligence; `etf-flow`, `exchange-reserve` | Selected asset may have no verified current ETF row or reserve observation. | `SOURCE_STALE` | P1 |
| MKT-06 | Ticker, candles, orderbook, depth, trades `NO DATA` | Binance REST/WebSocket; `binance-live` | Stream disconnect, invalid symbol, initial wait, or empty book/candle set removes real-time exploration fields. | `SOURCE_BLOCKED` | P1 |
| MKT-07 | Funding/OI and market structure missing/partial | Futures routes and direct Binance context; `futures-intelligence`, `market-structure` | Aggregate fields or direct symbol context may be absent; these routes lack canonical envelopes. | `ENVELOPE_MISSING` | P1 |
| MKT-08 | Current liquidation read permanently `NO DATA` | Existing Binance liquidation stream; `binance-live` | The page has live liquidation inputs but does not normalize them into this field. | `UI_NOT_CONSUMING` | P1 |
| MKT-09 | Selected historical liquidation window unavailable | `/api/replay/cryptohftdata`; `cryptohftdata` / `replay-cache` | Manual window unsupported, missing, timed out, or decoded with no rows. Heavy history is intentionally optional in Markets. | `MANUAL_ONLY` | P3 |

### 2.3 Scanner

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| SCN-01 | Inherited Markets context unavailable/stale/partial | Shared Product Context | Direct navigation or expired context removes supporting structure but does not invent it. | `INTENTIONAL_UNAVAILABLE` | P3 |
| SCN-02 | Summary and priority opportunities empty | `/api/scanner/opportunities`, `/api/market/movers`; `scanner-opportunities`, `market-movers` | No mover candidates or failed upstream internal calls yields an empty bare array with no canonical availability metadata. | `ENVELOPE_MISSING` | P1 |
| SCN-03 | Opportunity fields `NO DATA` | Scanner opportunity scoring | Grade, risk/reward, confidence, direction, or setup is absent in source candidate. Some route fields use text defaults. | `SOURCE_NOT_IMPLEMENTED` | P1 |
| SCN-04 | Historical support unavailable | Scanner opportunities | `historicalAvailable` is hard-coded false; no historical memory is consumed during scoring. | `SOURCE_NOT_IMPLEMENTED` | P2 |
| SCN-05 | Signal feed/category/watchlist empty | Current candidates and browser setup memory | No remaining candidate or user-created setup is a valid empty state. | `INTENTIONAL_UNAVAILABLE` | P3 |
| SCN-06 | Scanner freshness shown from polling time | Client polling state | Page uses hook `lastUpdatedAt`, not canonical source observation freshness, so upstream unknown/stale states are not represented reliably. | `UI_NOT_CONSUMING` | P1 |

### 2.4 Research

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| RES-01 | Inherited Scanner context unavailable/stale/partial | Shared Product Context | Direct navigation or expired context removes upstream opportunity context. | `INTENTIONAL_UNAVAILABLE` | P3 |
| RES-02 | Thesis unavailable | User/upstream Research context | Research must not infer a thesis when none was supplied. | `INTENTIONAL_UNAVAILABLE` | P3 |
| RES-03 | Historical Analog/Event Impact/Market Memory pending | Manual Research endpoints; `historical-analog`, `event-impact`, `market-memory` | Historical systems intentionally load only after user action. | `MANUAL_ONLY` | P3 |
| RES-04 | Historical comparable cases unavailable after load | Historical Analog/Replay datasets | Cache absent, invalid, stale, or too small to return comparable cases. | `DATASET_TOO_SMALL` | P1 |
| RES-05 | Market Memory/Event Impact unavailable or partial | Research cache/catalog routes | No accepted memories, verified links, or compatible cache coverage. | `DATASET_TOO_SMALL` | P2 |
| RES-06 | Macro timeline unavailable | `/api/macro`; `macro` / `stooq-macro` | Approved source access yields no timestamped observations; no fallback is approved. | `SOURCE_BLOCKED` | P1 |
| RES-07 | Prediction freshness/coverage shown `CURRENT`/`PARTIAL` from response presence | `/api/research/prediction-markets`; `prediction-markets` | Envelope correctly reports freshness unavailable, but Research derives current status from legacy `status`. | `UI_NOT_CONSUMING` | P1 |
| RES-08 | Narratives coverage partial; generated timestamp uncertain | `/api/narratives`; `narratives` | Multi-provider partial results and timestamp substitution are not represented by a canonical envelope. | `ENVELOPE_MISSING` | P2 |
| RES-09 | Source Intelligence `UNKNOWN`/`UNAVAILABLE` | Multiple Research APIs | Several routes expose custom validity objects or no envelope, so canonical freshness/health is inconsistent. | `ENVELOPE_MISSING` | P1 |
| RES-10 | Conflicting evidence unavailable | Loaded historical/evidence payloads | Sources do not always expose contradiction metadata; Research must not generate it. | `SOURCE_NOT_IMPLEMENTED` | P2 |

### 2.5 Replay

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| RPL-01 | Inherited thesis/evidence/freshness unavailable or partial | Shared Product Context | Direct entry, invalid/expired handoff, or absent upstream fields. Replay correctly displays only inherited values. | `INTENTIONAL_UNAVAILABLE` | P3 |
| RPL-02 | Price chart/trades unavailable | CryptoHFTData, direct Binance historical candle fallback; `cryptohftdata`, `binance-live` | Selected window lacks decoded trades/candles or provider access fails. Replay cannot validate without price evidence. | `SOURCE_BLOCKED` | P1 |
| RPL-03 | OI/Funding partial or unavailable | CryptoHFTData, Binance historical/current fallback; `cryptohftdata`, `binance-live` | Historical rows absent; current fallback is not equivalent to selected-window evidence and remains partial. | `FALLBACK_MISSING` | P1 |
| RPL-04 | Liquidations/top liquidations unavailable | CryptoHFTData/replay cache | Selected dataset returns no decoded rows or provider/window is unsupported. | `DATASET_TOO_SMALL` | P1 |
| RPL-05 | Orderbook cache unavailable/partial | `/api/replay/orderbook-cache`; `replay-cache`, `cryptohftdata` | Missing/corrupt/expired/incompatible cache; full reconstruction exceeds request budget by design. | `MANUAL_ONLY` | P3 |
| RPL-06 | Validation status partial/unavailable | Loaded price, positioning, liquidation, orderbook evidence | One or more factual datasets are missing; no validation score is generated. | `DATASET_TOO_SMALL` | P1 |
| RPL-07 | Comparable/failure cases unavailable | Research handoff and future historical dataset | No selected case or durable adverse-case dataset exists. | `SOURCE_NOT_IMPLEMENTED` | P2 |
| RPL-08 | Cache/evidence quality fields `NO DATA` | Replay diagnostics | Routes use custom diagnostics and do not consistently emit canonical envelopes. | `ENVELOPE_MISSING` | P2 |

### 2.6 Trade

| ID | Visible/reachable state | Source/API and sourceId | Current reason and user impact | Cause | Priority |
| --- | --- | --- | --- | --- | --- |
| TRD-01 | Inherited validation/readiness unavailable or partial | Replay Shared Product Context | Direct entry, invalid/expired handoff, or missing Replay facts. Trade correctly refuses to reconstruct readiness. | `INTENTIONAL_UNAVAILABLE` | P3 |
| TRD-02 | Candidate list empty/fallback | `/api/market/movers`; `market-movers` | No qualifying mover, upstream failure, or no active local setup. | `FALLBACK_MISSING` | P1 |
| TRD-03 | Current price/change `NO DATA` | Binance ticker; `binance-live` | Stream wait, disconnect, or selected-symbol mismatch. | `SOURCE_BLOCKED` | P1 |
| TRD-04 | Orderbook/trade/liquidation pressure `NO DATA` | Binance shared streams; `binance-live` | Empty or not reliably symbol-scoped stream data. | `SOURCE_BLOCKED` | P2 |
| TRD-05 | Execution levels/risk context partial or unavailable | Market Movers candidate | Candidate lacks numeric entry, stop, target, trigger, or invalidation. Trade must not invent them. | `SOURCE_NOT_IMPLEMENTED` | P1 |
| TRD-06 | Position sizing and user risk inputs unavailable | User-owned future workflow | Account/risk/leverage/fee inputs are intentionally absent; no sizing engine exists. | `INTENTIONAL_UNAVAILABLE` | P3 |
| TRD-07 | Win rate/outcome memory partial or `NO DATA` | Local setup memory | Fewer than five completed setups or no outcomes; sample is too small. | `DATASET_TOO_SMALL` | P3 |

## 3. API Availability Inventory

| API | Availability behavior | Envelope/sourceId | Freshness policy | Fallback and blocker | Primary cause | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/macro` | Empty -> unavailable; any rows -> degraded/partial | Present: `macro` | 30m current, 24h stale window; `lastUpdatedAt` is always null, so result is unavailable freshness | Stooq only; quote endpoint/access currently blocked; no approved Yahoo/FRED fallback | `SOURCE_BLOCKED` | P1 |
| `/api/etf-flow` | Success, partial, stale, expired, empty explicit | Present: `etf-flow` | Oldest verified BTC/ETH source date; 1d current, 7d stale | Farside current pages only; configured CMC fallback is not executed | `SOURCE_STALE` | P1 |
| `/api/dashboard/reserve-intelligence` | Available, partial, stale, expired, invalid, empty explicit | Present: `exchange-reserve` | Real artifact `observedAt`; 1h current, 6h stale | File artifact only; no refresh in route; expired artifact fails closed | `SOURCE_EXPIRED` | P1 |
| `/api/market/sector-rotation` | Success, partial connectors, stale, expired/unavailable, error | Present: `sector-rotation` | Oldest Binance closeTime/Upbit timestamp; 5m current, 15m stale | Registered Binance fallback semantics, but no synthetic rows | `SOURCE_STALE` | P1 |
| `/api/research/prediction-markets` | Relevant markets -> success; empty/error -> unavailable | Present: `prediction-markets` | Envelope remains `UNAVAILABLE`; no trusted aggregate timestamp | No fallback; client substitutes request time when provider `updatedAt` is absent | `SOURCE_NOT_IMPLEMENTED` | P1 |
| `/api/market/exchange-comparison` | Both venues success; one partial; neither unavailable | Present: `exchange-comparison` | Envelope always `UNAVAILABLE`; route has retrieval time only | Binance is registered fallback but branch is simultaneous venue comparison, not cached fallback | `SOURCE_NOT_IMPLEMENTED` | P1 |
| `/api/scanner/opportunities` | Always bare array; failures collapse to empty input | Missing; registered `scanner-opportunities` exists | None exposed | Internal calls to movers/narratives/sector/futures; no branch diagnostics | `ENVELOPE_MISSING` | P1 |
| `/api/market/movers` | Live response or legacy fallback response with HTTP 200 | Missing; registered `market-movers` exists | None exposed | No source-backed alternate provider; fallback is an unavailable response shape | `ENVELOPE_MISSING` | P1 |
| `/api/market/futures-intelligence` | Connected/partial/error connectors; HTTP 500 fallback object on catch | Missing; registered `futures-intelligence` exists | No canonical envelope timestamp | Binance-derived partial payload; numeric parser can default malformed numbers to zero | `ENVELOPE_MISSING` | P1 |
| `/api/market/futures-symbol-context` | Invalid/missing/source failure returns `ok:false` with HTTP 200 | Missing; upstream `binance-live` | No canonical envelope | Direct Binance only; used by Markets/Replay | `ENVELOPE_MISSING` | P1 |
| `/api/replay/cryptohftdata` | Invalid request 400; provider/window failure 500 with diagnostics | Missing; `cryptohftdata` / `replay-cache` | Historical identity/coverage, not age alone | Optional dataset subsets; no automatic heavy reconstruction | `ENVELOPE_MISSING` | P2 |
| `/api/replay/binance-positioning` | Validation 400; historical source may return no rows | Missing; `binance-live` is nearest registered ID | Historical window identity required | Current-symbol context can only be partial fallback in UI | `ENVELOPE_MISSING` | P2 |
| `/api/replay/orderbook-cache` | Missing/corrupt/expired/version/partial/failed explicit | Missing; registered `replay-cache` | Age-independent historical cache plus schema/identity | Manual cache generation only; request reconstruction forbidden | `MANUAL_ONLY` | P3 |
| `/api/replay` | Missing record 404; malformed input 400 | Missing/ownership depends on stored replay record | No canonical envelope | Local/file-backed replay record lookup | `ENVELOPE_MISSING` | P2 |

Six inspected routes currently emit `_source`: Macro, ETF Flow, Reserve
Intelligence, Sector Rotation, Research Prediction Markets, Exchange
Comparison, and the earlier pilot route family represented by those current
files. Most remaining core market, scanner, and Replay routes still use custom
availability contracts.

## 4. Context Snapshot Availability Inventory

SignalCapture automatically derives only `MARKET` evidence from
`metadata.scannerOpportunity._source`. Every category can also be supplied
explicitly through `metadata.contextEvidence`, but no page/API collector wires
the remaining categories today. Missing categories are finalized as explicit
`UNAVAILABLE`; this preserves correctness while limiting future learning
quality.

| Category | Current input source | Current/captured state | Missing metadata or blocker | Remediation candidate | Cause | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Market | Scanner opportunity `_source`, entry price, opportunity context, optional market structure | Conditionally captured automatically | Requires registered active source, real `lastUpdatedAt`, canonical freshness; Scanner API itself has no envelope | Wire canonical Scanner/Market Movers envelope into capture input | `ENVELOPE_MISSING` | P1 |
| Derivatives | Explicit `contextEvidence` only | Usually `UNAVAILABLE`; not automatically captured | Funding/OI/liquidation source ID, observedAt, freshness, and opaque payload | Capture existing Futures Intelligence facts after envelope migration | `CONTEXT_NOT_WIRED` | P1 |
| ETF | Explicit input only | `UNAVAILABLE` unless caller supplies it | `etf-flow` metadata and source timestamp at signal time | Reuse certified ETF envelope; preserve stale/expired exactly | `CONTEXT_NOT_WIRED` | P1 |
| Macro | Explicit input only | `UNAVAILABLE` | Approved Macro observation is currently blocked and has no source timestamp | Remediate source before wiring; never use retrieval time | `SOURCE_BLOCKED` | P1 |
| Prediction | Explicit input only | `UNAVAILABLE` | Aggregate envelope freshness unavailable; provider timestamp substitution exists | Fix timestamp policy, then wire selected market facts | `CONTEXT_NOT_WIRED` | P1 |
| Sector | Explicit input only | `UNAVAILABLE` | Certified sector envelope exists but SignalCapture does not receive it | Wire canonical sector summary with real oldest timestamp | `CONTEXT_NOT_WIRED` | P1 |
| News | Explicit input only | `UNAVAILABLE` | No canonical envelope; provider timestamp substitution/partial coverage | Normalize timestamps and envelope before capture | `ENVELOPE_MISSING` | P2 |
| Research | Explicit input only | `UNAVAILABLE` | No approved immutable Research evidence reference is supplied by Scanner | Add explicit Research reference only when already available at signal time | `CONTEXT_NOT_WIRED` | P2 |
| Exchange | Explicit input only | `UNAVAILABLE` | Reserve artifact may be expired; no signal-time selection is supplied | Refresh artifact, then wire selected `exchange-reserve` fact | `CONTEXT_NOT_WIRED` | P2 |

No unavailable Context item should be backfilled after capture. Remediation
must improve signal-time inputs for new Signals only.

## 5. Root-Cause and Priority Summary

Counts apply to the 49 grouped product issues, 14 API issues, and 9 Context
issues above.

| Root cause | Count | Main concentration |
| --- | ---: | --- |
| `SOURCE_BLOCKED` | 8 | Macro, live Binance page streams, Replay selected windows |
| `SOURCE_NOT_IMPLEMENTED` | 7 | Scanner fields/history, prediction/exchange timestamp policy, Replay comparisons, Trade levels |
| `SOURCE_STALE` | 6 | ETF and Sector across Dashboard/Markets/APIs |
| `SOURCE_EXPIRED` | 2 | Reserve artifact consumers and route |
| `ENVELOPE_MISSING` | 17 | Market/Scanner/Replay APIs, narratives, Context Market/News |
| `CONTEXT_NOT_WIRED` | 6 | Derivatives, ETF, Prediction, Sector, Research, Exchange |
| `UI_NOT_CONSUMING` | 4 | Prediction freshness, Scanner polling freshness, liquidation read |
| `FALLBACK_MISSING` | 4 | Movers, Replay positioning, Trade candidates |
| `INTENTIONAL_UNAVAILABLE` | 9 | Shared-context direct entry, thesis, sizing, valid empty states |
| `DATASET_TOO_SMALL` | 5 | Historical cases, liquidations, validation coverage, local outcome memory |
| `MOCK_ISOLATED` | 0 | Mock routes were isolated in Phase 3; no current product issue depends on them |
| `MANUAL_ONLY` | 4 | Research history, Markets historical liquidations, Replay orderbook cache |
| **Total** | **72** | |

| Priority | Count | Interpretation |
| --- | ---: | --- |
| P0 | 0 | No correctness blocker; current factual pipeline fails closed. |
| P1 | 44 | Core page, source provenance, and Context quality work. |
| P2 | 14 | Secondary evidence and status clarity. |
| P3 | 14 | Intentional/manual/deferred boundaries. |
| **Total** | **72** | |

## 6. Remediation Roadmap

| Sprint | Target | Root causes reduced | Expected outcome | Stop condition |
| --- | --- | --- | --- | --- |
| **R2 - Macro Source Remediation** | Restore trustworthy approved Macro observations or document an approved governance change | `SOURCE_BLOCKED` | Real Stooq timestamps and values, or explicit continued unavailable state | Stop if access remains blocked or only Yahoo/FRED/unapproved fallback is available |
| **R3 - Farside All-History ETF Normalization** | Normalize Farside historical tables outside request-time guesswork | `SOURCE_STALE`, `DATASET_TOO_SMALL` | Better current-date resolution and historical Context/Research coverage | Stop if dates or table identity cannot be verified |
| **R4 - Reserve Artifact Refresh** | Run the existing approved reserve builder/retention path | `SOURCE_EXPIRED` | Current real `observedAt`, retained deltas, explicit partial coverage | Stop if source artifact cannot be refreshed from approved inputs |
| **R5 - Context Snapshot Evidence Wiring** | Supply certified signal-time Derivatives, ETF, Sector, Prediction, News/Research, and Exchange evidence | `CONTEXT_NOT_WIRED`, `ENVELOPE_MISSING` | New Signals preserve richer immutable Context; absent categories stay unavailable | Stop for any missing source timestamp, unregistered ID, or hindsight fetch |
| **R6 - Replay Comparable Dataset** | Expand verified historical case and selected-window coverage using cache/offline processing | `DATASET_TOO_SMALL`, `FALLBACK_MISSING` | More factual comparable and validation coverage without request-heavy reconstruction | Stop if cases cannot be linked to immutable source windows/outcomes |
| **R7 - Remaining Envelope Migrations** | Prioritize Market Movers, Scanner Opportunities, Futures Intelligence, symbol context, Narratives, then Replay diagnostics | `ENVELOPE_MISSING`, `UI_NOT_CONSUMING` | Canonical source/freshness/quality/unavailable metadata across core consumers | Stop if additive compatibility, source identity, or trusted timestamps fail |
| **R8 - Availability Dashboard / Observability** | Read-only registry/API/Context coverage diagnostics | `UI_NOT_CONSUMING` | Operators can distinguish blocked, stale, expired, partial, and intentionally unavailable states | Must not poll providers, mutate state, or reinterpret unavailable data |

R5 should follow the relevant source and envelope work. Wiring an unreliable
timestamp into immutable Context would make future Historical Memory worse,
not better.

## 7. No-Fabrication Policy

Every remediation sprint must preserve these rules:

* Never create a source timestamp from retrieval, request, capture, or persistence time.
* Never promote missing freshness to `CURRENT`.
* Never generate Macro values, ETF flows, prediction probabilities, reserve values, comparable cases, or confidence.
* Never infer direction, entry price, funding, OI, liquidation, news, regime, or validation from a missing source field.
* Never turn an empty provider response into zero activity.
* Never backfill a finalized Context Snapshot with later evidence.
* Never use isolated mocks as production fallback data.
* Preserve `UNAVAILABLE`, `STALE`, `EXPIRED`, and `PARTIAL` when they are the truthful state.

## 8. Decision

**DATA REMEDIATION ROADMAP READY**

The availability gaps are sufficiently attributable to proceed in bounded
R-series sprints. No global provider expansion or blanket fallback is needed.
The first work should remediate source trust and timestamps, then wire only
certified signal-time evidence into Context, and finally improve observability.

## 9. Validation

* Required Phase 3/5 governance, certification, architecture, and prior audit documents were reviewed.
* All six product pages were inspected for visible and reachable unavailable, stale, expired, partial, fallback, and intentional states.
* Required API routes plus all current `app/api/replay/**` and `app/api/market/**` routes were inspected.
* Registry, freshness, health, Context runtime, Local Runner capture, and data-source clients were inspected.
* No runtime, API, page, worker, Repository, persistence, source, or package file was modified.
* No provider was called and no live availability claim was fabricated; this is a static root-cause audit.
* TypeScript validation was not required because only documentation was added.
* Production build was not run, in accordance with repository rules.
