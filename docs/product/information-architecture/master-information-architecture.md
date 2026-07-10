# Master Information Architecture

**Status:** Canonical product information architecture  
**Owner:** Product / Design  
**Scope:** Product structure only. No UI design or implementation.  
**Related documents:** `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `docs/product/pattern-library/`  

## Purpose

The Master Information Architecture defines what information exists in
QuantTerminal, where it belongs, how users discover it, and why each layer is
placed where it is.

It is the canonical blueprint for future screens, diagrams, design system
work, Figma, and frontend implementation.

## Core Information Model

QuantTerminal information is organized as:

```text
Repository Facts
  -> Source / Freshness / Availability
  -> Evidence
  -> Visualization
  -> Reasoning Boundary
  -> Product Context
  -> User Decision
```

Facts are not user experience by themselves. They become useful when they are
organized into evidence, made visible, placed in context, and bounded by clear
ownership.

## Information Ownership

| Information type | Owner screen / layer | Why |
| --- | --- | --- |
| Market direction | Dashboard | Dashboard owns the fastest product-level read. |
| Live market structure | Markets | Markets owns real-time monitoring and verification. |
| Opportunity candidates | Scanner | Scanner owns discovery and triage. |
| Trade thesis and execution planning | Trade | Trade owns candidate-specific decision support. |
| Historical movement explanation | Replay | Replay owns historical event reconstruction. |
| Deep thesis understanding | Research | Research owns investigation, support, and conflict. |
| Source-backed evidence | Evidence Cards / Repository | Evidence must remain traceable to facts. |
| Raw records | Repository | Repository owns durable truth, not first-read UX. |

## Information Priority

Information priority follows:

```text
1. What is happening?
2. Why does it matter?
3. What evidence supports it?
4. What contradicts it?
5. What should I inspect next?
6. What raw records prove it?
```

Screens may emphasize different steps, but no screen should invert evidence
and reasoning or bury the primary user question below secondary metrics.

## Global Navigation

Primary navigation remains:

```text
Dashboard
Markets
Scanner
Trade
Research
Replay
Settings / Operations
```

Each primary destination owns one durable question. New destinations require
product and architecture review.

## Context Preservation

Navigation should preserve:

- symbol;
- exchange;
- timeframe;
- date and hour;
- selected evidence;
- active opportunity;
- selected replay window;
- selected research thesis;
- availability state.

Context may be dropped only when it is not source-backed, not relevant, or
would mislead the next screen.

## Progressive Disclosure

Progressive disclosure expands in this order:

```text
Headline
  -> Evidence Cards
  -> Charts
  -> Replay
  -> Research
  -> Repository
```

The first screen should never require repository-level literacy. The deepest
screen should never hide the source trail.

## Visual Hierarchy

Visual hierarchy must communicate:

1. primary state;
2. evidence quality;
3. market or workflow context;
4. drilldown path;
5. unavailable or stale states.

Visuals should explain before text expands. Tables and raw records belong
below the first-read layer unless precision is the primary purpose.

## Search Philosophy

Search is a product accelerator, not a replacement for navigation.

Search should find:

- symbols;
- markets;
- evidence;
- replay windows;
- research contexts;
- opportunities;
- datasets;
- future entities.

Search results must distinguish source-backed records from unavailable,
future, or unsupported material.

## Filtering Philosophy

Filters refine visible evidence. They must not hide important warnings.

Canonical filter dimensions include:

- symbol;
- exchange;
- timeframe;
- UTC date / hour;
- evidence category;
- source status;
- freshness;
- confidence or provider tier when source-backed;
- opportunity status;
- market sector.

## Workspace Philosophy

Workspace exists to preserve repeated context:

- saved symbols;
- saved layouts;
- evidence groups;
- replay windows;
- research trails;
- watchlists;
- preferred density.

Personalization may change layout and defaults. It must not alter canonical
facts, evidence state, or source transparency.

## Product Principles Validation

| Principle | IA validation |
| --- | --- |
| Visual First | Every hierarchy starts with state, evidence, or visual context before raw detail. |
| Evidence First | Evidence appears before reasoning and decision support. |
| Explain, Don't Predict | Reasoning layers explain observed evidence without forecast certainty. |
| Progressive Disclosure | Depth expands from summary to repository, not the reverse. |
| 5-Second Rule | Each primary screen owns one immediate question. |
| Human Decision Authority | IA supports decisions but does not force action. |

## Final Decision

**MASTER INFORMATION ARCHITECTURE APPROVED.**

Future screens must conform to this ownership, hierarchy, navigation, and
context-preservation model before UI design begins.
