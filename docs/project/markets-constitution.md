# Markets Constitution

Status: Project Beta Sprint M1  
Scope: Markets V2 design foundation  
Non-goals: runtime implementation, UI code, API changes, Dashboard changes

Markets exists to help users discover and verify live market opportunities.

It is not the Dashboard. It is not Scanner. It is not Trade. It is the dense, real-time workspace where a user decides which live symbols deserve attention and whether live structure confirms or contradicts a market read.

## Purpose

Markets answers:

```text
Which live markets deserve attention?
```

It should let expert users scan many symbols quickly, rank opportunities, compare live structure, and decide what to inspect next.

The page should optimize for:

- opportunity discovery;
- live symbol verification;
- dense comparison;
- fast filtering;
- handoff to Trade or Research.

## Primary User

Primary user:

```text
Active crypto researcher or trader validating live market structure.
```

This user already has some market context and wants to know where attention should go next. They do not need a broad product explanation. They need ranked, current, comparable market evidence.

## Core Decisions

Markets should support these decisions:

1. Which symbols deserve attention now?
2. Which symbols are gaining or losing structural support?
3. Does live OI, funding, liquidation, volume, or flow confirm the read?
4. Which opportunity should move to Trade for conviction building?
5. Which opportunity should move to Research for deeper investigation?

Markets must not make trade recommendations. It prepares live evidence.

## What Belongs On Markets

Markets owns live market discovery and verification.

Belongs:

- ranked assets or symbols;
- active filters;
- price and volume context;
- market breadth;
- sector or category rotation;
- exchange overview;
- funding;
- open interest;
- liquidation context;
- orderflow when available;
- capital flow summary when it helps compare symbols;
- ETF, reserve, treasury, or exchange-flow evidence when symbol or asset scoped;
- market movers;
- symbol-level evidence health;
- dense supporting analytics below the first-read layer;
- handoff actions to Trade, Research, or Scanner.

## What Does Not Belong On Markets

Markets must not absorb other page responsibilities.

Does not belong:

- Dashboard-level market direction as the main purpose;
- broad conclusion hero that replaces Dashboard;
- Scanner lifecycle state as the primary workflow;
- Trade execution plans;
- stop/target/sizing workflows;
- deep Historical Analog case exploration;
- Replay timeline inspection;
- Market Memory synthesis;
- Event Impact research workflows;
- request-time historical computation;
- system settings or credentials;
- raw source tables that do not support opportunity comparison;
- long narrative panels.

## Dashboard Boundary

Dashboard remains responsible for:

- current market direction;
- top market drivers;
- compact supporting evidence;
- high-level data health;
- immediate 5-second market understanding.

Markets is responsible for:

- live opportunity discovery;
- symbol comparison;
- live structure validation;
- ranked market movers;
- dense market detail.

Should move later from Dashboard to Markets if present:

- broad symbol rankings;
- dense funding/OI/liquidation tables;
- exchange-by-exchange comparison;
- sector rotation grids;
- full market breadth analytics.

Dashboard may link to Markets when the user wants to validate the conclusion across symbols.

## Design Laws For Markets

### Law 001: Opportunities Before Analytics

Markets may be dense, but ranked opportunities must appear before deep analytics.

### Law 002: Filters Are State

Active filters must be visible. Users must know what universe they are viewing.

### Law 003: Live Structure Before Historical Context

Historical systems belong in Research or Replay. Markets can hand off to them but should not become them.

### Law 004: Comparable Rows Beat Isolated Widgets

Markets should favor ranked, comparable rows over disconnected cards.

### Law 005: Every Metric Must Support Selection

Visible metrics must help users compare symbols, validate structure, or choose a next action.

## Acceptance Criteria

Markets V2 design is acceptable when:

- a user can identify top opportunities within 30 seconds;
- ranked assets appear before deep analytics;
- Dashboard remains the owner of broad market direction;
- Scanner remains the owner of change detection;
- Trade remains the owner of conviction and execution planning;
- Research remains the owner of deep investigation;
- no historical-heavy processing is implied on Markets.
