# Research User Journey

Status: Research V2 journey foundation  
Scope: documentation only  
Runtime impact: none

## Purpose

Research answers:

```text
Why should I believe this market thesis?
```

The Research journey starts after a user already has a thesis, signal, market state, or trade idea. Research organizes evidence, contradictions, narrative context, freshness, and source quality so the user can decide whether the thesis deserves further validation.

Research does not create trade recommendations, execution plans, or Dashboard-level market conclusions.

## Journey A: 10-Second Orientation

The first screen should let the user immediately answer:

- what thesis is being evaluated;
- what symbol, exchange, and timeframe the thesis applies to;
- whether evidence is current, stale, partial, missing, or unavailable;
- whether the evidence context is strong enough to continue investigating.

### First Read

The first read should follow:

```text
Research Summary
  -> Thesis
  -> Confidence Context
  -> Evidence Freshness
```

### User Questions

| Question | Research Response |
| --- | --- |
| What am I investigating? | Active thesis title, question, symbol, exchange, timeframe, and decision horizon |
| Is the evidence usable? | Freshness and coverage badges using approved status language |
| Is there enough to continue? | Evidence counts, source quality, and explicit missing states |

### Required States

Research must support:

- CURRENT;
- PARTIAL;
- STALE;
- MISSING;
- UNAVAILABLE;
- LOADING;
- ERROR.

Unavailable evidence should be explicit. The page must not imply that missing evidence exists.

### Success Criteria

The 10-second orientation succeeds when a user can say:

```text
I know what thesis is being evaluated, how fresh the evidence is, and whether this investigation is worth continuing.
```

## Journey B: 60-Second Investigation

The next minute should let the user understand why the thesis is or is not believable.

### Investigation Flow

```text
Supporting Evidence
  -> Conflicting Evidence
  -> Narrative Timeline
  -> Source Intelligence
```

### User Questions

| Question | Research Response |
| --- | --- |
| What supports the thesis? | Evidence cards grouped by source and type |
| What contradicts the thesis? | Explicit conflicting evidence with source attribution |
| Is the narrative changing? | Timeline of material observations, not article-style prose |
| Can I trust the sources? | Source quality, freshness, coverage, and missing-state indicators |

### Evidence Rules

- Supporting evidence must be traceable.
- Conflicting evidence must be visible.
- Narrative context must be concise and source-backed.
- Source quality must be shown before dense raw detail.
- Confidence context must not become a recommendation.
- No synthetic evidence, fabricated confidence, or unsupported summaries are allowed.

### Success Criteria

The 60-second investigation succeeds when a user can say:

```text
I understand the strongest evidence, the strongest contradiction, how fresh the sources are, and what needs validation next.
```

## Journey C: Deep Investigation

Deep investigation begins when Research reveals that the user needs another surface.

Research should route the user onward instead of becoming Markets, Replay, or Trade.

| Need | Destination | Why |
| --- | --- | --- |
| Need live market context | Markets | Markets owns live structure, ranked symbols, breadth, and exchange context |
| Need historical validation | Replay | Replay owns historical reconstruction and event validation |
| Ready to plan execution | Trade | Trade owns execution planning, candidate stability, and trade preparation |

### Deep Investigation Rules

- Research may link to Markets, Replay, and Trade.
- Research must preserve symbol, exchange, timeframe, and thesis context where available.
- Research must not run replay loaders.
- Research must not become a live orderflow workspace.
- Research must not present entries, exits, sizing, stops, or take-profit levels.

## Role-Based Journey

| User | Entry | Research Task | Exit |
| --- | --- | --- | --- |
| Trader | Scanner, Markets, or Trade | Validate evidence behind a possible trade thesis | Trade for execution planning or Replay for validation |
| Analyst | Dashboard or Markets | Understand why the market state matters | Markets for live context or Dashboard for summary context |
| Researcher | Dashboard, Scanner, or Replay | Compare evidence, contradictions, narratives, and source quality | Replay for historical validation or Markets for current structure |

## Boundary Review

Research owns:

- evidence organization;
- narratives;
- source attribution;
- confidence context;
- supporting evidence;
- conflicting evidence;
- evidence freshness and coverage;
- thesis continuity.

Research does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Replay validation;
- Trade execution.

## Design System Alignment

Research should reuse the QuantTerminal visual system:

- typography tokens for section titles, evidence labels, metadata, and compact body text;
- color tokens for dark terminal surfaces, amber hierarchy, cyan metadata, and state colors;
- spacing tokens for dense but readable evidence groups;
- surface tokens for summary, primary evidence, secondary narrative context, and supporting detail;
- badge/status tokens for freshness, coverage, source quality, and unavailable states.

Research should reuse the design language without duplicating Dashboard, Markets, or Scanner layouts.

## Acceptance Criteria

Research V2 journey is acceptable when:

- the user understands the active thesis within 10 seconds;
- supporting and conflicting evidence are both visible within 60 seconds;
- evidence freshness and source quality are explicit;
- missing data is not hidden;
- navigation to Markets, Replay, and Trade is clear;
- Research does not drift into conclusions, exploration, prioritization, replay validation, or execution.
