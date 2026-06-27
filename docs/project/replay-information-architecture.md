# Replay Information Architecture

Project Epsilon - Replay V2 Sprint P2  
Status: Information architecture definition  
Runtime behavior: none

## Approved Hierarchy

Replay V2 follows this page hierarchy:

```text
Replay Summary
  -> Validation Status
  -> Comparable Historical Cases
  -> Outcome Analysis
  -> Failure Patterns
  -> Evidence Quality
  -> Replay Metadata
  -> Navigation Actions
```

Replay validates inherited context. It must not recreate upstream analysis or execution logic.

## 1. Replay Summary

Purpose:

- Orient the user to the inherited thesis and replay scope.

Enabled decision:

- Decide whether the current Replay page is validating the intended thesis or case.

Expected inputs:

- symbol;
- exchange;
- timeframe;
- thesis;
- selected historical case;
- replay time window;
- investigation state.

Expected outputs:

- active thesis;
- active symbol and venue;
- replay window;
- selected case identity;
- high-level readiness state.

Next navigation:

- Research if the thesis or evidence context is missing.
- Validation Status if context is sufficient.

## 2. Validation Status

Purpose:

- Show whether the replay can validate the inherited thesis.

Enabled decision:

- Decide whether validation is complete, partial, degraded, unavailable, or blocked by missing context.

Expected inputs:

- validation result;
- replay source availability;
- historical coverage;
- evidence freshness;
- selected case or time window.

Expected outputs:

- validation state;
- coverage state;
- source quality state;
- reason for unavailable or degraded validation.

Next navigation:

- Outcome Analysis when validation exists.
- Research when validation is blocked by evidence/context gaps.

## 3. Comparable Historical Cases

Purpose:

- Show which historical cases make the replay comparable.

Enabled decision:

- Decide whether the selected case or case set is relevant enough for validation.

Expected inputs:

- selected historical case;
- comparable case list;
- similarity metadata;
- inherited thesis context.

Expected outputs:

- selected case;
- similar cases;
- similarity context;
- case timestamp or replay window.

Next navigation:

- Outcome Analysis for selected case behavior.
- Research if case selection needs evidence review.

## 4. Outcome Analysis

Purpose:

- Explain what happened after the selected historical condition.

Enabled decision:

- Decide whether the historical outcome supports, contradicts, or leaves the thesis unresolved.

Expected inputs:

- selected case;
- replay time window;
- price path;
- liquidation, OI, funding, and orderbook evidence where available;
- outcome metrics from existing historical/replay sources.

Expected outputs:

- outcome path;
- distribution summary;
- support/contradiction context;
- post-condition behavior.

Next navigation:

- Failure Patterns when outcome is mixed or adverse.
- Trade when validation is sufficient for planning.

## 5. Failure Patterns

Purpose:

- Surface why comparable cases failed or contradicted the thesis.

Enabled decision:

- Decide whether failure modes are serious enough to return to Research or avoid Trade progression.

Expected inputs:

- adverse cases;
- contradicting evidence;
- outcome distribution;
- replay evidence quality.

Expected outputs:

- repeated failure modes;
- adverse outcome summary;
- invalidation context;
- missing-failure-data state when unavailable.

Next navigation:

- Research for evidence reinterpretation.
- Evidence Quality for source reliability.

## 6. Evidence Quality

Purpose:

- Show whether replay evidence is reliable enough to use.

Enabled decision:

- Decide whether validation can be trusted.

Expected inputs:

- source availability;
- freshness;
- coverage;
- replay data quality;
- orderbook quality state;
- chart, liquidation, OI, funding availability.

Expected outputs:

- evidence quality state;
- source availability matrix;
- degraded/missing/unavailable reasons;
- warnings for partial replay evidence.

Next navigation:

- Replay Metadata for source details.
- Research if evidence quality is insufficient.

## 7. Replay Metadata

Purpose:

- Provide operational and source context for the replay.

Enabled decision:

- Decide whether the replay was properly scoped and sourced.

Expected inputs:

- generatedAt;
- observedAt;
- source artifact IDs;
- source file/window metadata;
- selected case metadata;
- replay version/state metadata.

Expected outputs:

- replay scope;
- source references;
- freshness and coverage metadata;
- replay constraints and limitations.

Next navigation:

- Navigation Actions.

## 8. Navigation Actions

Purpose:

- Route the user to the correct next page without making Replay into Research or Trade.

Enabled decision:

- Decide whether to continue evidence review, proceed to execution planning, inspect live context, or find new opportunities.

Expected inputs:

- validation result;
- evidence quality;
- thesis;
- selected case;
- symbol/exchange/timeframe.

Expected outputs:

- Research handoff;
- Trade handoff;
- Markets handoff;
- Scanner handoff.

Next navigation:

- Research: evidence gaps or thesis reinterpretation.
- Trade: validation complete enough for execution planning.
- Markets: broader live market context.
- Scanner: new opportunities.

## Boundary Review

Replay owns:

- validation;
- comparable cases;
- outcome analysis;
- failure modes;
- replay metadata.

Replay does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Research evidence generation;
- Trade execution.

## Design System Alignment

Replay should reuse the existing QuantTerminal design language:

- typography tokens from `docs/project/design-token-registry.md`;
- color tokens from `docs/project/design-token-registry.md`;
- spacing tokens from `docs/project/design-token-registry.md`;
- surface tokens from `docs/project/design-token-registry.md`;
- badge/status tokens from `docs/project/design-token-registry.md`.

Replay should not duplicate Dashboard, Markets, Scanner, or Research layouts. It should preserve:

- terminal identity;
- dark green/black surfaces;
- amber structural accents;
- cyan metadata accents;
- dense professional presentation;
- clear hierarchy.

## Navigation Rules

Canonical handoffs:

- Need evidence -> Research.
- Validation complete -> Trade.
- Need broader market context -> Markets.
- Need new opportunities -> Scanner.

Replay should always explain why a handoff is available or unavailable.

## Validation

- `docs/project/replay-information-architecture.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research changes: none.
- Package changes: none.
