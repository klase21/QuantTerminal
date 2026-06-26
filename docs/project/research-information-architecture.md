# Research Information Architecture

Status: Research V2 information architecture foundation  
Scope: documentation only  
Runtime impact: none

## Architecture Principle

Research organizes evidence around a thesis.

The page must follow:

```text
Thesis Context
  -> Evidence
  -> Contradiction
  -> Narrative
  -> Source Quality
  -> Handoff
```

Research must avoid article-style layouts. It should behave like an evidence workspace: compact, traceable, status-aware, and easy to scan.

## Approved Page Hierarchy

Research V2 follows this hierarchy:

1. Research Summary
2. Thesis
3. Supporting Evidence
4. Conflicting Evidence
5. Narrative Timeline
6. Source Intelligence
7. Related Markets
8. Navigation Actions

This order is intentional. Thesis and confidence context appear before evidence. Supporting and conflicting evidence appear before narrative detail. Source quality appears before handoff actions.

## Section Architecture

### 1. Research Summary

Purpose:

- orient the user to the current investigation;
- summarize evidence readiness;
- show freshness and coverage before detail.

Enabled decision:

- decide whether the current investigation is usable enough to inspect.

Expected inputs:

- investigation thesis context;
- decision brief context if available;
- evidence validity metadata;
- source coverage metadata;
- active symbol, exchange, and timeframe.

Expected outputs:

- thesis label;
- symbol, exchange, timeframe;
- overall evidence freshness;
- evidence coverage;
- supporting and conflicting evidence counts;
- missing or unavailable state if evidence cannot be evaluated.

Next navigation:

- continue to Thesis for context;
- route to Markets if live market context is missing;
- route to Scanner if the thesis is not tied to a clear attention target.

### 2. Thesis

Purpose:

- preserve why the investigation exists;
- state the current research question;
- expose the decision horizon.

Enabled decision:

- decide whether the thesis is still the right question to evaluate.

Expected inputs:

- investigation thesis;
- title;
- question;
- status;
- decision horizon;
- optional hypothesis;
- current view;
- tags.

Expected outputs:

- active thesis;
- research question;
- status;
- decision horizon;
- thesis metadata.

Next navigation:

- continue to Supporting Evidence;
- return to Dashboard if the user needs broad market context;
- route to Trade only after evidence review, not from thesis alone.

### 3. Supporting Evidence

Purpose:

- show evidence that supports the thesis;
- keep evidence compact, source-backed, and freshness-aware.

Enabled decision:

- decide what facts support the thesis and whether support is broad or narrow.

Expected inputs:

- market drivers;
- ETF flows;
- funding;
- open interest;
- liquidation evidence;
- exchange flow;
- treasury evidence;
- reserve intelligence;
- historical analog evidence;
- event impact evidence;
- market memory;
- decision brief supporting factors;
- source artifact IDs.

Expected outputs:

- compact evidence cards;
- evidence type;
- observation;
- source;
- freshness status;
- coverage status;
- artifact/source references where available.

Next navigation:

- continue to Conflicting Evidence;
- route to Markets for live structure validation;
- route to Replay if historical validation is required.

### 4. Conflicting Evidence

Purpose:

- make contradiction explicit;
- reduce confirmation bias;
- show adverse or weak evidence before narrative interpretation.

Enabled decision:

- decide whether the thesis is weakened, invalidated, or needs more validation.

Expected inputs:

- contradiction metadata;
- adverse event outcomes;
- negative historical analog cases;
- failure memories;
- weak consistency indicators;
- stale or partial source states.

Expected outputs:

- conflicting evidence cards;
- contradiction category;
- evidence summary;
- source and artifact references;
- freshness and coverage status;
- required next validation.

Next navigation:

- continue to Narrative Timeline;
- route to Replay for historical contradiction validation;
- route to Markets when conflict depends on live market structure.

### 5. Narrative Timeline

Purpose:

- show how the thesis context evolved over time;
- expose material observations in sequence.

Enabled decision:

- decide whether the narrative is strengthening, weakening, or changing.

Expected inputs:

- narrative intelligence;
- information flow;
- news or tagged observations;
- prediction market updates;
- event impact outputs;
- generatedAt and observedAt metadata.

Expected outputs:

- chronological observation rows;
- timestamp or observedAt;
- source;
- short observation;
- freshness status;
- explicit unavailable state when no tagged narrative items exist.

Next navigation:

- continue to Source Intelligence;
- route to Markets if the narrative requires live validation;
- route to Replay if the timeline references a historical event.

### 6. Source Intelligence

Purpose:

- reveal whether the evidence base is trustworthy enough;
- separate evidence quality from evidence direction.

Enabled decision:

- decide whether source coverage is strong, partial, stale, unavailable, or unknown.

Expected inputs:

- evidence validity metadata;
- data health;
- artifact freshness;
- source quality;
- generatedAt;
- observedAt;
- coverage status.

Expected outputs:

- source inventory;
- freshness status;
- coverage status;
- quality status;
- missing/stale/unavailable reasons;
- artifact/source references.

Next navigation:

- continue to Related Markets;
- route to Markets if live data coverage is weak;
- route to Replay if historical coverage needs validation.

### 7. Related Markets

Purpose:

- show nearby markets that may help validate or contextualize the thesis;
- avoid turning Research into Markets.

Enabled decision:

- decide whether the thesis should be checked against related symbols or exchanges.

Expected inputs:

- active symbol;
- related symbols if already available;
- market movers;
- sector rotation;
- exchange context;
- capital-flow context where available.

Expected outputs:

- related symbol rows;
- relationship label if available;
- source status;
- navigation to Markets.

Next navigation:

- Markets for live comparison;
- Scanner for new attention targets if the thesis loses relevance.

### 8. Navigation Actions

Purpose:

- route the user to the correct next surface;
- preserve investigation context.

Enabled decision:

- decide the next workflow step.

Expected inputs:

- active thesis;
- symbol;
- exchange;
- timeframe;
- evidence status;
- required next validation.

Expected outputs:

- handoff to Markets;
- handoff to Replay;
- handoff to Trade;
- optional return to Dashboard or Scanner.

Next navigation:

- Markets: need live market context;
- Replay: need historical validation;
- Trade: ready to plan execution;
- Dashboard: need market-level summary;
- Scanner: need a new opportunity target.

## Boundary Review

Research owns:

- evidence;
- narratives;
- source attribution;
- confidence context;
- thesis continuity;
- supporting and conflicting evidence.

Research does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Replay validation;
- Trade execution.

## Design System Alignment

Research should reuse the shared QuantTerminal design system:

| Token Group | Research Usage |
| --- | --- |
| Typography | section titles, thesis labels, evidence titles, source metadata, compact observation text |
| Color | dark terminal surfaces, amber hierarchy, cyan metadata, state colors for evidence health |
| Spacing | dense evidence cards, compact rows, readable section separation |
| Surface | summary surface, primary evidence surfaces, secondary narrative/source surfaces, supporting detail surfaces |
| Badge/Status | CURRENT, VERIFIED, PARTIAL, DEGRADED, STALE, LOADING, MISSING, UNAVAILABLE |

Research should not duplicate Dashboard, Markets, or Scanner layouts. It should reuse the same language while expressing its own role as an evidence evaluation workspace.

## Navigation Rules

| Condition | Handoff |
| --- | --- |
| Need live market context | Markets |
| Need historical validation | Replay |
| Ready to plan execution | Trade |
| Need broad market state | Dashboard |
| Need a new attention target | Scanner |

Navigation should preserve symbol, exchange, timeframe, and thesis context when available.

## Acceptance Criteria

The information architecture is acceptable when:

- thesis context appears before evidence detail;
- supporting evidence appears before narrative timeline;
- conflicting evidence is visible and not hidden below raw analytics;
- source quality and freshness are explicit;
- Research does not become Markets, Scanner, Replay, Trade, or Dashboard;
- all missing states are explicit and non-blocking.
