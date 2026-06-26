# Markets V2 State

## Purpose

This document records the frozen Markets V2 state after Project Beta Sprint M6.

Future Markets work must preserve this baseline unless a documented post-freeze sprint explicitly changes the Markets constitution, hierarchy, data ownership, or implementation rules.

## Final Status

Markets Status:

```text
Reference Implementation
```

Freeze Status:

```text
FROZEN
```

Acceptance:

```text
PASS
```

Certification:

```text
PASS
```

Markets V2 is the official QuantTerminal reference implementation for live opportunity discovery.

## Approved Markets V2 Purpose

Markets answers:

```text
Which live markets deserve attention?
```

Markets is not Dashboard, Scanner, Trade, Research, or Replay. It is the dense real-time workspace where users compare live symbols, validate market structure, and decide what to inspect next.

## Approved Hierarchy

Markets V2 follows this order:

1. Market Context
2. Ranked Opportunities
3. Market Breadth
4. Sector Rotation
5. Exchange Overview
6. ETF / Capital Flow
7. Market Movers
8. Supporting Analytics

This hierarchy is frozen.

Rules:

- Opportunities appear before analytics.
- Comparable rows beat isolated widgets.
- Live structure appears before historical context.
- Supporting Analytics must remain below discovery, breadth, rotation, exchange, capital-flow, and mover sections.
- Markets must not become a broad Dashboard conclusion surface.

## Reference Boundaries

### Markets Owns

Markets owns:

- live opportunity discovery;
- ranked symbols;
- market breadth;
- sector rotation;
- exchange overview;
- market movers;
- selected-symbol live verification;
- dense live market detail;
- symbol-level evidence health where available.

### Markets Does Not Own

Markets does not own:

- Dashboard conclusions;
- Scanner opportunity generation;
- Research narratives;
- Replay analysis;
- Trade execution;
- trade sizing;
- stop-loss or take-profit workflows;
- deep Historical Analog workflows;
- Event Impact workflows;
- Market Memory synthesis.

## Freeze Rule

Once Markets V2 is frozen, future runtime changes are permitted only for:

- implementation defects;
- objective bugs;
- Design System violations;
- documented product requirements;
- approved post-freeze roadmap items.

Future runtime changes must state:

1. what section they touch;
2. which frozen Markets rule they preserve;
3. what they are not allowed to change;
4. whether they affect data, APIs, routing, fetch behavior, or hierarchy.

## Explicitly Prohibited

Future Markets work must not introduce:

- subjective redesigns;
- aesthetic-only changes;
- undocumented feature additions;
- hierarchy drift;
- Dashboard behavior leakage;
- synthetic data;
- invented rankings;
- unsupported scores;
- unreviewed request loops;
- new APIs without documented product requirement;
- historical-heavy workflows inside Markets;
- Trade execution logic inside Markets.

## Accepted Limitations

The following limitations are accepted as part of the frozen state. Do not resolve them inside unrelated polish or maintenance work.

### Incomplete Capital Flow

Markets currently consumes ETF Flow and Reserve Intelligence.

Markets does not yet directly expose:

- Treasury;
- Exchange Flow;
- Reserve Delta;
- full deployable capital-flow artifact coverage.

Disposition:

- accepted for freeze;
- defer to a scoped post-freeze capital-flow integration sprint.

### Dependency On Market Movers Endpoint

Ranked Opportunities depends on:

```text
/api/market/movers
```

If the endpoint is unavailable, Markets degrades to an explicit unavailable state.

Disposition:

- accepted for freeze;
- do not invent fallback rankings.

### Non-Interactive Filters

Market Context displays:

- universe;
- exchange;
- focus symbol;
- source health.

These are not yet full interactive filters.

Disposition:

- accepted for freeze;
- defer to a dedicated Markets filter sprint.

### Dense Supporting Analytics

Supporting Analytics contains:

- chart;
- orderbook;
- trade flow;
- funding;
- open interest;
- liquidation history;
- market structure insights.

Disposition:

- accepted for freeze;
- these sections must remain visually secondary.

### Existing Polling Remains

Ticker and futures intelligence retain existing 30-second refresh behavior.

Disposition:

- accepted for freeze;
- future data additions should avoid adding unreviewed polling loops.

## Future Roadmap

All items below are backlog items. They are not part of the frozen Markets V2 baseline and must not be implemented without a documented post-freeze sprint.

### Post-Freeze Improvements

- Interactive Markets filters.
- Explicit sort controls.
- Row-level handoff actions to Trade and Research.
- Responsive certification for dense rows.
- Section-level health detail expansion.

### Future Intelligence

- Broader opportunity evidence coverage.
- Venue divergence summaries.
- OI and funding mover diagnostics.
- Liquidation spike summaries.
- Market structure contradiction indicators.

### Future Data Sources

- Treasury artifacts in ETF / Capital Flow.
- Exchange Flow artifacts in ETF / Capital Flow.
- Reserve Delta artifacts in ETF / Capital Flow.
- Additional venue coverage when existing source contracts support it.
- Deployable artifact health surfaced per Markets section.

### Future UX

- User-controlled universe filters.
- Sector drilldown.
- Exchange drilldown.
- Symbol comparison mode.
- Compact handoff links to Trade and Research.

## Review Gate

Every future Markets sprint must verify:

- Markets still answers `Which live markets deserve attention?`;
- Ranked Opportunities remains before Supporting Analytics;
- Dashboard conclusions are not duplicated;
- no synthetic data is introduced;
- no unsupported score or fallback ranking is introduced;
- existing APIs and artifacts are reused before adding new data paths;
- unavailable evidence remains explicit;
- supporting analytics remain secondary.

Review should reject work that:

- changes hierarchy without explicit approval;
- moves chart, orderbook, trade flow, or liquidation history above Ranked Opportunities;
- turns Markets into a Dashboard-style hero page;
- adds Trade execution planning;
- adds Research narrative workflows;
- adds Replay analysis workflows;
- adds aesthetic-only redesigns after freeze.

## Validation

Sprint M6 validation:

- `docs/project/markets-v2-state.md` exists.
- No runtime files were modified for this sprint.
- No Dashboard files were modified for this sprint.
- No package files were modified for this sprint.
- No build was required.

Markets V2 is now the canonical frozen reference implementation until a documented post-freeze sprint explicitly changes it.
