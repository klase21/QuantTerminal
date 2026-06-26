# Scanner V2 State

## Purpose

This document records the frozen Scanner V2 state after Project Gamma Sprint S6.

Future Scanner work must preserve this baseline unless a documented post-freeze sprint explicitly changes the Scanner constitution, hierarchy, ownership, data behavior, or implementation rules.

## Final Status

Scanner Status:

```text
Reference Implementation
```

Freeze Status:

```text
FROZEN
```

Certification:

```text
PASS
```

Acceptance:

```text
PASS
```

Acceptance is based on the approved Scanner constitution, S4 implementation, S5 certification, and the established QuantTerminal freeze process.

Scanner V2 is the official QuantTerminal reference implementation for attention triage and opportunity discovery.

## Approved Scanner V2 Purpose

Scanner answers:

```text
What deserves my attention right now?
```

Scanner is not Dashboard, Markets, Research, Replay, or Trade. It is the lightweight attention layer where users discover, prioritize, filter, and route signals into the correct deeper workflow.

## Approved Hierarchy

Scanner V2 follows this order:

1. Scanner Summary
2. Priority Opportunities
3. Signal Feed
4. Opportunity Filters
5. Watchlist Candidates
6. Supporting Context
7. Navigation Actions

This hierarchy is frozen.

Rules:

- Priority Opportunities appear before broad context.
- Ranking appears before dense signal rows.
- Filters and category readiness support triage; they do not create new signals.
- Supporting Context remains secondary.
- Navigation Actions route the user onward; they do not turn Scanner into the destination page.
- Scanner must not become a Dashboard summary, Markets workspace, Research page, Replay surface, or Trade execution planner.

## Reference Boundaries

### Scanner Owns

Scanner owns:

- opportunity discovery;
- prioritization;
- ranking;
- filtering;
- signal visibility;
- alert surfacing;
- attention triage;
- handoff intent to Markets, Research, Replay, or Trade.

### Scanner Does Not Own

Scanner does not own:

- Dashboard conclusions;
- Markets exploration;
- Markets structure analysis;
- Research narratives;
- Replay validation;
- Trade execution;
- trade sizing;
- stop-loss or take-profit workflows;
- long-form historical workflows;
- portfolio management.

## Freeze Rule

Once Scanner V2 is frozen, future runtime changes are permitted only for:

- implementation defects;
- objective bugs;
- Design System violations;
- documented product requirements;
- approved post-freeze roadmap items.

Future runtime changes must state:

1. what section they touch;
2. which frozen Scanner rule they preserve;
3. what they are not allowed to change;
4. whether they affect data, APIs, routing, fetch behavior, polling, websocket behavior, scoring, or hierarchy.

## Explicitly Prohibited

Future Scanner work must not introduce:

- subjective redesigns;
- aesthetic-only changes;
- undocumented feature additions;
- hierarchy drift;
- Dashboard behavior leakage;
- Markets behavior leakage;
- Research narrative workflows inside Scanner;
- Replay validation inside Scanner;
- Trade execution logic inside Scanner;
- synthetic data;
- invented rankings;
- unsupported scores;
- new intelligence systems;
- unreviewed request loops;
- new APIs without documented product requirement.

## Accepted Limitations

The following limitations are accepted as part of the frozen state. Do not resolve them inside unrelated polish, maintenance, or feature work.

### Duplicate Market-Mover Fetch

Current behavior:

- `ScannerPage.tsx` fetches market movers through `useMarketMovers`.
- `/api/scanner/opportunities` also fetches `/api/market/movers`.

Disposition:

- accepted limitation for certification;
- future optimization should consolidate data flow without changing ranking behavior.

### Non-Interactive Filters

Current behavior:

- `Opportunity Filters` displays category readiness from existing signal groups.
- It does not yet filter the signal feed interactively.

Disposition:

- accepted limitation for certification;
- future Scanner filter sprint may add interaction if it avoids URL churn and synthetic data.

### Existing Dependency Limitations

Current dependencies:

- `/api/market/movers`;
- `/api/scanner/opportunities`;
- Binance ticker availability and websocket fallback;
- local active setup memory;
- internal narrative, sector rotation, and futures intelligence calls inside the Scanner opportunities API.

Disposition:

- accepted limitation for certification;
- failure must continue to degrade gracefully.

### Badge Vocabulary Normalization

Current behavior:

- Scanner visual badges support approved state styles.
- Some source labels remain from existing market mover and setup lifecycle vocabulary.

Disposition:

- accepted limitation for certification;
- future badge normalization should be scoped and must not change data semantics.

### Trade Handoff Sensitivity

Current behavior:

- Scanner includes Trade handoffs and displays existing RR text.
- It does not expose entries, stops, take-profit levels, sizing, or execution plans.

Disposition:

- accepted limitation for certification;
- future work should keep Trade execution details inside Trade.

### Responsive Certification Pending

Current behavior:

- Responsive classes exist and sections stack naturally.
- Scanner has not yet received a dedicated desktop, tablet, and mobile certification sprint.

Disposition:

- accepted limitation for certification;
- recommend a future Scanner responsive certification sprint before freeze.

## Future Roadmap

All items below are backlog items. They are not part of the frozen Scanner V2 baseline and must not be implemented without a documented post-freeze sprint.

### Post-Freeze Improvements

- Interactive Scanner filters.
- Explicit sort controls.
- Responsive certification for desktop, tablet, and mobile.
- Badge vocabulary normalization.
- Duplicate market-mover fetch consolidation.
- Section-level data health details.
- More explicit selected-signal handoff state.

### Future Intelligence

- Broader opportunity evidence coverage.
- Signal contradiction indicators.
- Funding and OI spike diagnostics.
- Liquidation spike summaries.
- Market structure evidence summaries.
- Scanner-specific evidence health rollups.

### Future Data Sources

- ETF signal support when existing deployable artifacts are ready.
- Treasury signal support when existing artifacts are available.
- Exchange Flow signal support.
- Reserve Intelligence signal support.
- Liquidation intelligence signal support.
- Prediction market signal support.
- News or narrative signals when supported by existing source contracts.

### Future UX

- User-controlled signal filters.
- Category drilldown.
- Watchlist candidate pinning.
- Compact handoff links to Markets, Research, Replay, and Trade.
- Mobile-first Scanner certification.
- Empty state refinement for no-match vs unavailable data.

## Review Gate

Every future Scanner sprint must verify:

- Scanner still answers `What deserves my attention right now?`;
- Priority Opportunities remain before Supporting Context;
- ranking remains evidence-backed;
- Dashboard conclusions are not duplicated;
- Markets exploration is not duplicated;
- Research narratives are not embedded;
- Replay validation is not performed in Scanner;
- Trade execution details remain inside Trade;
- no synthetic data is introduced;
- no unsupported score or fallback ranking is introduced;
- existing APIs and artifacts are reused before adding new data paths;
- unavailable evidence remains explicit.

Review should reject work that:

- changes hierarchy without explicit approval;
- moves Supporting Context above Priority Opportunities;
- turns Scanner into a Dashboard-style market summary;
- turns Scanner into a Markets-style dense workspace;
- adds Trade execution planning;
- adds Research narrative panels;
- adds Replay analysis workflows;
- adds aesthetic-only redesigns after freeze;
- modifies polling, websocket, routing, URL state, or scoring without documented product requirement.

## Validation

Sprint S6 validation:

- `docs/project/scanner-v2-state.md` exists.
- No runtime files were modified for this sprint.
- No Dashboard files were modified for this sprint.
- No Markets files were modified for this sprint.
- No package files were modified for this sprint.
- No build was required.

Scanner V2 is now the canonical frozen reference implementation until a documented post-freeze sprint explicitly changes it.

