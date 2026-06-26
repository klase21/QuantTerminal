# Replay & Trade Readiness Audit

Project Omega - Sprint O4  
Status: Audit and documentation only  
Scope: Replay and Trade readiness contracts based on frozen Dashboard, Markets, Scanner, and Research  
Decision: READY WITH KNOWN LIMITATIONS

## 1. Replay Input Contract

Replay should receive context from upstream pages. It must not recreate upstream analysis, generate a thesis, rank opportunities, or perform market exploration.

| Input | Required | Owning page | Replay usage | Notes |
| --- | --- | --- | --- | --- |
| Symbol | Required | Shared context; usually Dashboard, Markets, Scanner, or Research | Select replay instrument and related source data. | Must be preserved exactly from upstream context. |
| Exchange | Required when available | Markets / Research context | Select venue-specific replay data. | Defaulting is allowed only through existing investigation context rules. |
| Timeframe | Required when available | Research / Markets context | Align replay window and historical case context. | Replay should not infer a new timeframe from unrelated evidence. |
| Time Window | Required for actual replay | Research or Replay direct entry | Defines date/hour/session to replay. | If missing, Replay should show unavailable or needs-selection state. |
| Thesis | Optional but preferred | Research | Preserve why replay exists. | Replay may display inherited thesis but must not create one. |
| Investigation State | Optional but preferred | Research / shared investigation context | Preserve symbol, exchange, timeframe, thesis, source, selected case, and selected event. | Should be immutable unless user explicitly changes replay target. |
| Evidence | Optional | Research | Display what evidence led to Replay. | Replay must not generate new evidence summaries. |
| Supporting Evidence | Optional | Research | Show inherited support behind the replay question. | Replay may reference it as inherited context only. |
| Conflicting Evidence | Optional | Research | Show inherited contradiction context. | Replay must not hide contradictions. |
| Narrative | Optional | Research | Frame why the replay window matters. | Narrative remains Research-owned and source-backed. |
| Confidence Context | Optional | Research / Dashboard / Scanner | Show inherited reliability context. | Replay must not fabricate or recalculate confidence. |
| Structure Context | Optional | Markets | Explain the live market structure that motivated validation. | Structure remains Markets-owned. |
| Market Context | Optional | Markets / Dashboard | Display broad market or symbol context. | Replay should not become a market overview. |
| Freshness | Optional | Research / Data Health | Show inherited data freshness and coverage. | Replay should apply its own source availability states separately. |
| Selected Historical Case | Required for historical-case replay | Research / Historical Intelligence | Seed the replay window and analog context. | If unavailable, Replay should request selection rather than invent a case. |
| Selected Event | Optional | Research / Event Impact | Seed event-based replay if supported. | Event ownership remains Research/Event Impact. |

Replay contract rule:

```text
Replay validates inherited context.
Replay does not create the thesis, opportunity, evidence set, or execution plan.
```

## 2. Trade Input Contract

Trade should receive enough context to plan execution. It must not recreate Research or Replay, generate evidence, validate historical outcomes, or invent confidence.

| Input | Required | Owning page | Trade usage | Notes |
| --- | --- | --- | --- | --- |
| Symbol | Required | Shared context | Identify instrument for execution planning. | Must remain stable after handoff unless user changes candidate. |
| Exchange | Required when available | Markets / shared context | Determine venue-specific execution assumptions. | No venue inference beyond existing context. |
| Timeframe | Required when available | Markets / Research / Replay | Align setup horizon and plan framing. | Trade may display but should not reinterpret upstream evidence. |
| Thesis | Optional but preferred | Research | Explain why the trade candidate exists. | Trade must not rewrite the thesis. |
| Replay Result | Optional | Replay | Show whether replay validation supports planning. | If absent, Trade should show validation unavailable or not performed. |
| Validation Result | Optional | Replay | Distinguish validated, degraded, unavailable, or not run. | Trade must not claim validation unless Replay supplies it. |
| Evidence Summary | Optional but preferred | Research | Display inherited supporting/conflicting evidence context. | Trade must not generate new evidence. |
| Confidence Context | Optional | Research / Dashboard / Scanner | Display inherited confidence or reliability. | Trade must not fabricate conviction scores. |
| Risk Context | Optional | Trade-owned once computed | Seed risk discussion if inherited from upstream labels. | Trade owns final risk management. |
| Structure Context | Optional | Markets | Show live structure that motivated the candidate. | Markets remains owner of exploration details. |
| Opportunity / Signal Context | Optional | Scanner | Preserve setup, direction, reason, priority, and watchlist status. | Scanner owns triage; Trade owns plan. |
| Freshness / Health | Optional | Data Health / source pages | Warn when upstream context is stale or unavailable. | Trade should not hide stale context. |

Trade contract rule:

```text
Trade plans execution from inherited context.
Trade does not create evidence, validate replay, rank opportunities, or generate narratives.
```

## 3. Ownership Review

Canonical chain:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade
```

| Page | Owns | Hands off |
| --- | --- | --- |
| Dashboard | Market conclusion, direction, top drivers, evidence preview, health metadata. | Market state, selected driver/evidence context, symbol, and intent to inspect. |
| Markets | Live exploration, market context, breadth, rotation, structure, movers, selected-symbol verification. | Symbol, exchange, structure context, market context, ranked market row, and source health. |
| Scanner | Opportunity triage, priority, signal visibility, watchlist, alert surfacing. | Candidate, signal reason, priority, direction, confidence if source-backed, and destination intent. |
| Research | Thesis, supporting evidence, conflicting evidence, narratives, source attribution, confidence context. | Thesis, evidence summary, selected historical case, selected event, freshness, and validation request. |
| Replay | Validation, historical case replay, outcome analysis, replay metadata. | Replay result, validation result, outcome summary, replay evidence quality, and readiness for planning. |
| Trade | Execution, setup, entries, exits, risk, sizing, execution plan. | Final trade plan or not-ready state. |

Ownership finding: upstream pages may hand off context, but destination pages own the next decision layer. No downstream page should recompute upstream ownership merely to fill missing context.

## 4. Data Contract Matrix

| Source Page | Destination Page | Data Passed | Ownership | Mutable / Immutable | Required / Optional |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Markets | Symbol, market direction, driver/evidence context, source page. | Dashboard owns conclusion; Markets owns exploration. | Symbol mutable in Markets; inherited conclusion immutable. | Symbol required; driver context optional. |
| Dashboard | Scanner | Market state, symbol, watch intent. | Dashboard owns conclusion; Scanner owns triage. | Scanner may select new candidate; dashboard conclusion immutable. | Optional direct path. |
| Markets | Scanner | Symbol list, selected symbol, structure context, mover context. | Markets owns exploration; Scanner owns prioritization. | Scanner may reprioritize; structure context immutable as source context. | Optional but preferred for exploration-to-triage. |
| Markets | Research | Symbol, exchange, timeframe, structure context, market context. | Markets owns structure; Research owns evidence evaluation. | Research should preserve inherited structure; thesis mutable only by user. | Symbol required; structure optional. |
| Scanner | Research | Opportunity, signal, setup, reason, direction, priority, confidence if source-backed. | Scanner owns triage; Research owns evidence. | Research should treat signal as inherited context, not ranking input to mutate. | Symbol required; signal context optional but preferred. |
| Scanner | Replay | Symbol, setup, reason, direction, confidence, historical-context intent. | Scanner owns triage; Replay owns validation. | Replay must resolve its own valid replay window; signal context immutable. | Optional direct path; replay window required before replay. |
| Scanner | Trade | Candidate, setup, reason, direction, confidence, RR text if source-backed. | Scanner owns triage; Trade owns execution. | Trade may build plan; inherited signal remains source context. | Optional direct path; execution context required in Trade. |
| Research | Replay | Thesis, evidence, selected historical case, selected event, symbol, exchange, timeframe, freshness. | Research owns evidence; Replay owns validation. | Replay target immutable unless user changes selected case/window. | Symbol and replay window/case required for actual replay. |
| Research | Trade | Thesis, evidence summary, confidence context, source health, symbol, exchange, timeframe. | Research owns evidence; Trade owns execution. | Trade may create plan; evidence context immutable. | Symbol required; evidence summary preferred. |
| Replay | Trade | Replay result, validation result, outcome summary, evidence quality, symbol, time window. | Replay owns validation; Trade owns execution. | Trade may use validation result but cannot rewrite it. | Optional but preferred for validated planning. |
| Trade | Research | Execution concern, insufficient evidence flag, selected candidate. | Trade owns execution; Research owns evidence. | Research may re-evaluate thesis; execution concern immutable as user context. | Optional return path. |
| Trade | Replay | Need validation flag, selected setup, symbol, intended window if known. | Trade owns planning need; Replay owns validation. | Replay resolves target window; planning need immutable. | Optional return path. |

## 5. Replay Readiness

Replay may own:

- validation;
- historical analogue selection display when inherited;
- outcome analysis;
- replay metadata;
- replay timeline;
- replay source availability;
- replay data quality states;
- chart, liquidation, OI, funding, and orderbook evidence states.

Replay must not own:

- thesis generation;
- evidence generation;
- narrative generation;
- market exploration;
- opportunity ranking;
- execution planning;
- trade setup creation;
- confidence generation;
- complete orderbook claims when evidence is degraded or unavailable.

Replay readiness decision:

- Product contract: ready.
- Implementation caveat: Replay must degrade gracefully when replay window, selected case, or source data is missing.
- Data caveat: orderbook evidence must remain explicitly degraded/unavailable unless initialization and quality criteria are met.

## 6. Trade Readiness

Trade may own:

- execution;
- setup;
- entries;
- exits;
- invalidation;
- risk;
- sizing;
- plan readiness;
- candidate stability;
- trade not-ready states.

Trade must not own:

- evidence generation;
- narratives;
- replay validation;
- market exploration;
- opportunity discovery;
- scanner ranking;
- thesis generation;
- fabricated confidence;
- synthetic RR or execution values.

Trade readiness decision:

- Product contract: ready with known limitations.
- Implementation caveat: Trade must clearly distinguish inherited context from Trade-owned calculations.
- Data caveat: if entries, exits, sizing, or risk cannot be derived from real data or user input, Trade must show not-ready/unavailable rather than fabricate a plan.

## 7. Future API Readiness

This section documents ownership only. It does not design APIs.

### Replay-only future APIs

Replay-only APIs may own:

- replay window resolution;
- replay source availability;
- replay validation result;
- historical case replay result;
- replay timeline state;
- replay outcome summary;
- replay evidence quality;
- replay orderbook quality state.

Replay-only APIs must not own:

- thesis generation;
- market-driver scoring;
- opportunity ranking;
- execution plan generation.

### Trade-only future APIs

Trade-only APIs may own:

- trade candidate state;
- execution setup;
- entry/exit planning;
- risk and sizing calculations;
- invalidation state;
- plan readiness;
- execution checklist.

Trade-only APIs must not own:

- evidence generation;
- narrative generation;
- replay validation;
- market exploration;
- scanner ranking.

### Shared future APIs

Shared APIs may own:

- investigation context;
- handoff payload validation;
- source health and freshness display;
- symbol/exchange/timeframe normalization;
- artifact references;
- immutable upstream context references.

Shared APIs must not own:

- page-specific decisions;
- synthetic data fallbacks;
- hidden recomputation of upstream analysis;
- volatile timestamp generation during navigation render.

## 8. Recommendation

Decision: READY WITH KNOWN LIMITATIONS

Justification:

- Dashboard, Markets, Scanner, and Research already define enough upstream ownership for Replay and Trade to inherit context safely.
- Replay has a clear product role: validate inherited context and report outcomes.
- Trade has a clear product role: plan execution from inherited context without recreating evidence or validation.
- The remaining risks are implementation discipline, source availability, and handoff consistency, not product architecture.

Known limitations:

- Scanner can hand directly to Replay and Trade, but those destinations must show readiness states if Research evidence or Replay validation is missing.
- Research handoff to Replay depends on loaded Historical Intelligence and selected cached cases.
- Markets row-level handoffs to Research/Trade remain future work.
- Badge and CTA vocabulary normalization should happen before broad Replay/Trade UI work.
- Trade readiness requires strict no-fabrication rules for entries, exits, sizing, and risk.

Recommended next work:

1. Replay constitution and information architecture.
2. Trade constitution and information architecture.
3. Shared handoff payload schema.
4. Badge vocabulary normalization plan.
5. CTA vocabulary normalization plan.

## 9. Validation

- `docs/project/replay-trade-readiness.md` exists.
- Runtime code changes: none.
- Dashboard runtime changes: none.
- Markets runtime changes: none.
- Scanner runtime changes: none.
- Research runtime changes: none.
- Package changes: none.
- Build required: no.
