# Product Language & Vocabulary Audit

Project Omega - Sprint O3  
Status: Audit and documentation only  
Scope: Dashboard, Markets, Scanner, Research, with Replay and Trade language constraints  
Decision: PASS WITH KNOWN LIMITATIONS

## 1. Canonical Dictionary

| Term | Definition | Owning page | Allowed pages | Forbidden usage | Example usage |
| --- | --- | --- | --- | --- | --- |
| Opportunity | A market or setup that may deserve user attention because existing data indicates movement, activity, or structure worth inspecting. | Scanner, with Markets as exploration context | Markets, Scanner, Trade as downstream input | Dashboard conclusions, Research evidence ranking, Replay validation | `Priority Opportunities`, `Ranked Opportunities` |
| Signal | A specific detected condition, alert, trigger, or market behavior that explains why an opportunity surfaced. | Scanner | Dashboard secondary alerts, Scanner, Research as evidence input | Trade execution decision, unsupported prediction | `Signal Feed`, `Live Market Signal` |
| Evidence | An observed, source-backed fact that supports, contradicts, or contextualizes a thesis or conclusion. | Research | Dashboard preview, Markets source health, Scanner signal support, Replay validation | Synthetic reasoning, unsupported opinion, invented metrics | `Evidence Preview`, `Supporting Evidence` |
| Thesis | The active research question or market claim being evaluated. | Research | Dashboard as context, Scanner/Markets as handoff metadata, Replay as inherited context, Trade as planning context | Markets ranking, Scanner signal creation, Dashboard hero replacement | `BTCUSDT Market Thesis` |
| Narrative | A source-backed information flow or storyline from tagged news, macro, or related context. | Research | Dashboard lower analytics, Scanner future signal input | Markets structure analysis, Trade execution rationale unless cited as evidence | `Narrative Timeline`, `Narrative Context` |
| Confidence | A data-derived reliability or strength indicator shown only when the source already provides it. | Dashboard and Research by context | Dashboard, Scanner, Research, Trade as inherited metadata | Fabricated conviction, invented scores, replacement for health | `Confidence`, `High Confidence` |
| Health | A system or evidence-readiness state describing whether a page, source, or artifact can be trusted operationally. | Dashboard as reference language | Dashboard, Markets, Scanner, Research, Replay, Trade | Directional market meaning, bullish/bearish implication | `Data Health`, `Source Health` |
| Freshness | A time-validity state describing whether data is current, stale, missing, or unavailable. | Research and Data Health | Dashboard, Markets, Scanner, Research, Replay, Trade | Market direction, confidence, or quality score | `Freshness: 2026-06-26T...`, `CURRENT`, `STALE` |
| Structure | Live market mechanics: price behavior, orderflow, breadth, venue confirmation, OI, funding, and related structure inputs. | Markets | Dashboard as driver/evidence preview, Scanner as signal context, Research as evidence input | Research narrative ownership, Trade execution rules | `Market Structure`, `Validate live structure` |
| Context | Supporting information that frames the current page's owned task without becoming the primary decision. | Shared, page-specific | All pages | Replacement for page ownership, vague action label with no destination | `Supporting Context`, `Live Context Handoff` |
| Validation | Historical or replay-based checking of whether a thesis, case, or signal held up under observed conditions. | Replay | Research as handoff language, Scanner as limited future handoff | Dashboard conclusion, Markets exploration, Scanner ranking | `Need historical validation`, `Validate in Replay` |
| Execution | Trade planning and action preparation, including entry, exit, risk, sizing, and plan stability. | Trade | Research/Replay/Scanner only as handoff language | Dashboard, Markets, Scanner, Research, Replay content ownership | `Ready to plan execution`, `Prepare Trade` |
| Handoff | A context-preserving transition from one page's ownership domain to another page's ownership domain. | Shared system language | All pages | Generic navigation with no preserved intent, hidden ownership transfer | `Live Context Handoff`, `Research only hands off evidence context` |
| Watchlist | A lower-commitment attention state for signals or candidates worth monitoring but not yet ready for evidence review or trade planning. | Scanner | Markets as selected-symbol list, Trade as imported candidate list | Dashboard conclusion, Research evidence status | `Watchlist Candidates`, `WATCHLIST` |
| Priority | A triage rank or urgency label that determines what the user should inspect first. | Scanner | Dashboard Tactical Alerts, Markets rows only as ordered discovery | Research evidence hierarchy unless source-backed, Trade risk ranking unless execution-owned | `Priority Opportunities`, `PRIORITY` |

## 2. Page Language Ownership

### Dashboard

Dashboard owns:

- conclusion;
- direction;
- drivers;
- evidence preview;
- market direction;
- confidence as first-read metadata;
- data health as first-read metadata.

Dashboard should avoid:

- long-form evidence review;
- opportunity generation;
- execution language;
- replay validation language beyond compact context;
- narrative ownership.

### Markets

Markets owns:

- market context;
- breadth;
- rotation;
- movers;
- structure;
- exchange overview;
- capital flow exploration;
- selected-symbol live verification.

Markets should avoid:

- Dashboard-style final conclusions;
- Scanner-style triage ownership;
- Research narratives;
- Replay validation;
- Trade execution.

### Scanner

Scanner owns:

- opportunity;
- signal;
- priority;
- watchlist;
- alert;
- triage;
- filtering;
- handoff intent.

Scanner should avoid:

- market summary conclusions;
- dense Markets exploration;
- Research narrative evaluation;
- Replay validation;
- Trade execution details.

### Research

Research owns:

- thesis;
- evidence;
- narrative;
- source;
- confidence context;
- supporting evidence;
- conflicting evidence;
- freshness and coverage display;
- evidence handoff language.

Research should avoid:

- opportunity ranking;
- market exploration;
- replay reconstruction;
- execution planning;
- generated narratives or fabricated confidence.

### Replay

Replay owns:

- validation;
- historical case;
- replay;
- outcome;
- timeline;
- observed event behavior.

Replay should inherit:

- thesis;
- selected historical case;
- source evidence;
- symbol, exchange, timeframe, date, and hour context.

Replay should avoid:

- generating new thesis language;
- execution planning;
- claiming complete orderbook replay when evidence quality is degraded.

### Trade

Trade owns:

- execution;
- setup;
- risk;
- entry;
- exit;
- sizing;
- execution plan.

Trade should inherit:

- opportunity context from Scanner;
- market structure context from Markets;
- thesis/evidence context from Research;
- validation context from Replay.

Trade should avoid:

- creating new evidence;
- rewriting the research thesis;
- claiming validation that belongs to Replay.

## 3. Badge Vocabulary Audit

| Badge | Meaning | Allowed usage | Owning context | Forbidden usage | Status |
| --- | --- | --- | --- | --- | --- |
| CURRENT | Data is timely under the relevant freshness policy. | Data health, source health, evidence freshness | Data Health / all pages | Confidence, direction, prediction | Canonical |
| VERIFIED | Source-backed and validated enough for high-trust display. | Evidence quality, source quality | Evidence / source rows | Freshness alone, price direction | Canonical |
| PARTIAL | Some usable evidence exists, but coverage is incomplete. | Coverage, source health, evidence state | Evidence validity | Positive/negative market direction | Canonical |
| DEGRADED | Usable but weakened by missing fields, stale components, or incomplete source quality. | Evidence/source health | Data health and source quality | Normal successful state | Canonical |
| STALE | Data exists but is outside freshness expectations. | Data health, source freshness | Data Health | Missing data, unavailable APIs | Canonical |
| MISSING | Expected data is absent. | Empty states and missing evidence | Data availability | Stale but present data | Canonical |
| LOADING | Temporary request or computation state. | Loading states only | Runtime state | Persistent unavailable state | Canonical |
| UNAVAILABLE | Source, artifact, API, or coverage is not available. | Graceful degradation | Failure handling | Temporary loading, stale-but-present data | Canonical |
| LIVE | Real-time or active stream/source indication. | Market streams, live market state | Markets / Scanner | Replacement for CURRENT unless freshness policy supports it | Provisional |
| WATCH | A monitor state for a candidate or alert. | Scanner watch/monitor language, Dashboard tactical alert priority | Scanner / Tactical Alerts | Data health, evidence quality | Provisional |
| PRIORITY | A triage state or high-attention marker. | Scanner opportunities, tactical alerts | Scanner | Research evidence quality, market direction | Provisional |

Deprecated or needs future normalization:

- `NO DATA`: acceptable for real-data failure handling today, but should eventually map to `MISSING` or `UNAVAILABLE` based on cause.
- `UNKNOWN`: acceptable for source rows when metadata is insufficient, but should not be used when a precise unavailable/missing/stale state is known.
- `ACTIVE`, `FRESH`, `ACTIONABLE`, `HIGH`, `MEDIUM`, `LOW`, `AGING`, `MATURE`, `LATE`, `NO_TRADE`: current source or lifecycle vocabulary. Keep until a dedicated badge normalization sprint maps them to canonical states without changing data semantics.

## 4. CTA Vocabulary Audit

| CTA family | User intent | Destination page | Allowed source pages | Forbidden source pages |
| --- | --- | --- | --- | --- |
| View Markets | Inspect live market context, breadth, structure, or selected symbol behavior. | Markets | Dashboard, Scanner, Research, Trade as return path | Replay if it implies validation lives in Markets |
| Open Scanner | Triage attention-worthy signals or candidates. | Scanner | Dashboard, Markets | Research if it implies Research needs ranking |
| View Research | Evaluate evidence behind a thesis, driver, signal, or selected symbol. | Research | Dashboard, Markets, Scanner, Trade as return path | Replay if the user is in the middle of validation and needs continuity |
| Validate in Replay | Check historical behavior, selected case, or replay window. | Replay | Research, Scanner as limited direct handoff | Dashboard, Markets without selected context |
| Prepare Trade | Begin execution planning. | Trade | Research, Replay, Scanner, Markets as future row-level action | Dashboard if no actionable candidate exists |
| View Evidence | Move from preview/summary to evidence evaluation. | Research | Dashboard, Scanner, Markets | Trade as an execution action |
| Inspect Source | Inspect source quality, artifact, or underlying evidence detail. | Research or source-specific page | Research, Dashboard evidence preview, Markets source health | Scanner triage rows unless source detail is available |
| Add to Watchlist | Save or monitor a candidate without execution. | Scanner or future watchlist surface | Scanner, Markets, Trade | Dashboard conclusion, Research evidence rows |

Observed CTA consistency:

- `Inspect Market` currently works as a Dashboard/Scanner -> Markets action.
- `Research Evidence` correctly communicates Scanner -> Research.
- `Open Markets`, `Open Replay`, and `Open Trade` are clear but less intent-specific.
- `Open Explorer` is useful for experienced users but should be treated as Historical Intelligence, not generic exploration.
- Markets has fewer explicit outward CTAs than Scanner and Research.

## 5. Conflict Review

| Conflict | Classification | Finding |
| --- | --- | --- |
| Opportunity vs Signal | Needs future normalization | Opportunity is the candidate; signal is the detected reason or trigger. Markets and Scanner both use opportunity language, so future copy should preserve Markets = exploration and Scanner = triage. |
| Confidence vs Health | Needs future normalization | Confidence describes evidence or driver strength; health describes data/source reliability. They must not be merged. |
| Verified vs Current | Needs future normalization | Verified means evidence/source validation; Current means freshness. A source can be current but not verified, or verified but stale. |
| Live vs Current | Needs future normalization | Live implies stream/activity. Current implies freshness policy. Live should not automatically mean Current. |
| Evidence vs Narrative | Acceptable | Narratives can be evidence inputs, but Research owns narrative evaluation. Dashboard/Scanner should not treat narratives as standalone conclusions. |
| Structure vs Context | Acceptable | Structure is live market mechanics, owned by Markets. Context is broader supporting framing and can appear across pages. |
| Priority vs Confidence | Needs future normalization | Priority is triage urgency. Confidence is strength/reliability. A high-priority item can have partial confidence if it needs inspection. |
| Watchlist vs Tradeable | Requires product decision | Watchlist means monitor. Tradeable implies execution readiness. Scanner currently has Trade handoffs and RR text, so Trade readiness language should be governed before Trade V2. |
| Validation vs Evidence | Acceptable | Evidence supports or contradicts; validation checks historical/replay behavior. Research owns evidence, Replay owns validation. |
| Execution vs Handoff | Acceptable | Upstream pages may hand off to Trade, but execution language belongs to Trade. |

## 6. Replay / Trade Readiness

### Replay Language Constraints

Replay should inherit:

- thesis;
- evidence;
- source;
- selected historical case;
- validation;
- outcome;
- replay window;
- freshness and coverage states.

Replay should use:

- `Validate in Replay`;
- `Historical Case`;
- `Replay Window`;
- `Outcome`;
- `Evidence Source`;
- `Orderbook Degraded` when orderbook evidence is incomplete;
- `Unavailable` when replay data is absent.

Replay should not use:

- `Opportunity` as a primary page concept;
- `Execution`;
- `Entry`;
- `Exit`;
- `Tradeable`;
- `Validated` unless validation actually completed from source-backed replay data.

### Trade Language Constraints

Trade should inherit:

- opportunity from Scanner;
- market structure from Markets;
- thesis and evidence context from Research;
- validation/outcome context from Replay.

Trade should use:

- `Prepare Trade`;
- `Setup`;
- `Risk`;
- `Entry`;
- `Exit`;
- `Invalidation`;
- `Execution Plan`;
- `Candidate`;
- `Not Ready` when required context is missing.

Trade should not use:

- `Validated` unless Replay or evidence explicitly supports it;
- `Confidence` as invented conviction;
- `Evidence` unless displaying inherited Research evidence;
- `Narrative` unless citing Research source context;
- `Signal` as a substitute for execution readiness.

## 7. Recommendation

Decision: PASS WITH KNOWN LIMITATIONS

Justification:

- The language system is coherent enough to proceed to Replay and Trade planning.
- Dashboard, Markets, Scanner, and Research now have clear language ownership.
- The remaining risks are known and governable: opportunity/signal overlap, badge state drift, and CTA inconsistency.
- No product-wide rename should happen until a scoped normalization sprint maps current labels to canonical meanings without changing data semantics.

Recommended follow-up:

1. Badge vocabulary normalization plan.
2. CTA vocabulary normalization plan.
3. Replay readiness audit.
4. Trade readiness audit.

## 8. Validation

- `docs/project/product-language-audit.md` exists.
- Runtime code changes: none.
- Dashboard runtime changes: none.
- Markets runtime changes: none.
- Scanner runtime changes: none.
- Research runtime changes: none.
- Package changes: none.
- Build required: no.
