# Research Constitution

Status: constitutional foundation V1  
Scope: Research V2 product definition  
Runtime impact: none

## 1. Purpose

Research answers one question:

```text
Why should I believe this market thesis?
```

Research is the evidence evaluation layer of QuantTerminal. It organizes evidence, narrative context, source attribution, supporting signals, and conflicting signals so the user can decide whether a market thesis is believable.

Research is not:

- Dashboard;
- Markets;
- Scanner;
- Replay;
- Trade.

Research should help users understand why a thesis may or may not be supported. It must not generate trade decisions.

## 2. Primary User

Research serves three user modes.

| User | Need | Research Role |
| --- | --- | --- |
| Trader | Validate whether a trade thesis is supported | Organize evidence, contradictions, source quality, and confidence context before the user returns to Trade |
| Analyst | Understand why a market state matters | Connect market observations, narratives, flows, and historical context into a coherent evidence view |
| Researcher | Investigate a thesis deeply | Compare sources, inspect supporting and conflicting evidence, and decide what needs validation next |

### Entry Paths

Users may enter Research from:

- Dashboard when a market conclusion needs evidence;
- Markets when a live market opportunity needs explanation;
- Scanner when a signal needs deeper investigation;
- Replay when historical validation raises a question;
- Trade when an execution thesis requires evidence review.

### Exit Paths

Users may exit Research to:

- Markets for live structure validation;
- Replay for historical validation;
- Trade for execution planning;
- Dashboard for market-level context;
- Scanner for new attention targets.

Research should preserve symbol, exchange, timeframe, and thesis context when available.

## 3. Core Decisions

Research should enable users to decide:

- whether evidence supports the thesis;
- whether evidence conflicts with the thesis;
- whether source attribution is strong enough;
- whether narrative context is relevant;
- whether confidence context is adequate;
- whether additional validation is required in Markets or Replay;
- whether the user is ready to return to Trade for execution planning.

Research should not decide:

- market direction for the entire product;
- what opportunities deserve attention first;
- whether replay evidence is valid;
- whether to execute;
- position sizing;
- entries;
- exits;
- stop-losses;
- take-profits.

## 4. Ownership

Research owns:

- evidence organization;
- market narratives;
- supporting data;
- conflicting evidence;
- source attribution;
- confidence context;
- thesis context;
- investigation continuity;
- evidence freshness and coverage display;
- links to deeper validation surfaces.

Research does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Replay validation;
- Trade execution;
- trade sizing;
- live orderflow workspace;
- opportunity ranking;
- historical replay reconstruction.

## 5. Page Boundaries

### Research vs Dashboard

Dashboard answers:

```text
What is happening?
```

Research answers:

```text
Why should I believe the thesis?
```

Dashboard owns the conclusion-first market state. Research owns evidence evaluation and should not duplicate the Dashboard hero or become a fast market summary.

### Research vs Markets

Markets answers:

```text
Which live markets deserve attention?
```

Research answers:

```text
What evidence supports or contradicts this thesis?
```

Markets owns live market structure and dense real-time validation. Research may link to Markets when the user needs live structure, but it should not become a live orderflow or market structure workspace.

### Research vs Scanner

Scanner answers:

```text
What deserves my attention right now?
```

Research answers:

```text
Is the thesis believable?
```

Scanner owns prioritization and signal visibility. Research owns the deeper evidence evaluation once a signal or thesis is selected.

### Research vs Replay

Replay answers:

```text
What happened?
```

Research answers:

```text
What does the evidence imply about the thesis?
```

Replay owns historical validation and reconstruction. Research may reference replay evidence, but it should not run replay loaders or perform historical replay inside Research.

### Research vs Trade

Trade answers:

```text
How should I plan execution?
```

Research answers:

```text
Should I trust the evidence behind this thesis?
```

Research should not present entries, stops, take-profit levels, sizing, or trade recommendations. It may route a validated thesis back to Trade.

## 6. Inputs

Research may consume existing evidence and intelligence sources when available.

Expected inputs include:

- news;
- on-chain observations;
- ETF flows;
- funding;
- open interest;
- liquidation data;
- prediction markets;
- macro indicators;
- internal intelligence;
- market drivers;
- event impact;
- historical analogs;
- market memory;
- contradiction metadata;
- decision brief context;
- evidence validity metadata;
- investigation thesis context.

Rules:

- Do not invent new APIs in this constitution.
- Do not fabricate evidence.
- Do not fabricate confidence.
- If an input is unavailable, Research must show an explicit unavailable, missing, stale, partial, or unknown state.
- Heavy historical systems should remain manual-load or prepared-cache based.
- Research should prefer prepared intelligence and durable artifacts over request-time historical computation.

## 7. Outputs

Research should produce evidence-focused outputs.

Expected outputs include:

- evidence cards;
- narrative summaries;
- confidence context;
- supporting evidence;
- conflicting evidence;
- source attribution;
- freshness and coverage states;
- thesis summary;
- required next validation;
- linked navigation to Markets, Replay, and Trade.

Output rules:

- Evidence must be traceable.
- Confidence context must be evidence-backed.
- Contradictions must be visible.
- Missing data must be explicit.
- Research must not output trade recommendations.
- Research must not hide uncertainty behind narrative polish.

## 8. Information Hierarchy

Research should follow this hierarchy:

```text
Thesis
  -> Evidence Summary
  -> Supporting Evidence
  -> Conflicting Evidence
  -> Narrative Context
  -> Source Attribution
  -> Required Next Validation
  -> Navigation Actions
```

The first read should answer:

1. What thesis is being evaluated?
2. What evidence supports it?
3. What evidence conflicts with it?
4. How fresh and complete is the evidence?
5. What should be validated next?

## 9. Design Alignment

Research should reuse the QuantTerminal visual system:

- terminal-inspired identity;
- Bloomberg density for evidence tables and source attribution;
- Valley clarity for thesis and evidence summary;
- dark green surfaces;
- amber structural accents;
- cyan metadata;
- compact monospace typography;
- explicit health and status badges.

Research should not introduce a page-specific visual language. It should inherit the Dashboard, Markets, and Scanner design system while remaining distinct in purpose.

Research should avoid article-style layouts. It should feel like an investigation workspace, not a blog post or report generator.

## 10. Success Criteria

Research succeeds when a user can understand the evidence behind a market thesis within approximately 60 seconds.

Acceptance signals:

- the active thesis is visible;
- supporting evidence is organized;
- conflicting evidence is visible;
- source attribution is clear;
- confidence context is evidence-backed;
- missing data is explicit;
- the next validation step is obvious;
- Research does not generate a trade decision.

Research fails when:

- it duplicates Dashboard conclusions;
- it duplicates Markets exploration;
- it duplicates Scanner prioritization;
- it performs Replay validation;
- it presents Trade execution guidance;
- it hides conflicting evidence;
- it fabricates confidence;
- it turns into a long narrative page without scannable evidence.

## 11. Future Work Rules

Future Research implementation sprints must state:

- which Research responsibility they touch;
- which evidence inputs they consume;
- which outputs they create;
- which page boundary they preserve;
- how they expose unavailable or stale evidence;
- which validation proves no synthetic evidence was introduced.

Allowed future work:

- Research information architecture;
- evidence card design;
- supporting/conflicting evidence organization;
- source attribution model;
- confidence context presentation;
- navigation handoff behavior;
- responsive certification.

Forbidden without documented product review:

- trade recommendations;
- invented confidence;
- synthetic narratives;
- Dashboard conclusion duplication;
- Markets exploration duplication;
- Scanner ranking duplication;
- Replay reconstruction inside Research;
- new APIs without documented need.

