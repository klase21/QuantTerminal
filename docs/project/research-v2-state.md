# Research V2 State

## Purpose

This document records the frozen Research V2 state after Project Delta Sprint R7.

Future Research work must preserve this baseline unless a documented post-freeze sprint explicitly changes the Research constitution, hierarchy, ownership, data behavior, or implementation rules.

## Final Status

Research Status:

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

Acceptance is based on the approved Research constitution, R4 implementation, R5 certification, R6 acceptance review, and the established QuantTerminal freeze process.

Research V2 is the official QuantTerminal reference implementation for evidence evaluation and thesis validation.

## Approved Research V2 Purpose

Research answers:

```text
Why should I believe this market thesis?
```

Research is not Dashboard, Markets, Scanner, Replay, or Trade. It is the evidence evaluation layer where users inspect thesis context, supporting evidence, conflicting evidence, narrative context, source attribution, confidence context, and next validation actions.

## Approved Hierarchy

Research V2 follows this order:

1. Research Summary
2. Thesis
3. Supporting Evidence
4. Conflicting Evidence
5. Narrative Timeline
6. Source Intelligence
7. Related Markets
8. Navigation Actions

This hierarchy is frozen.

Rules:

- Thesis context appears before evidence detail.
- Supporting evidence appears before conflicting evidence.
- Conflicting evidence must remain visible and must not be hidden below narrative detail.
- Narrative context appears after support and conflict.
- Source quality appears before handoffs.
- Navigation Actions route the user onward; they do not turn Research into the destination page.
- Research must not become a Dashboard summary, Markets workspace, Scanner ranking surface, Replay validation surface, or Trade execution planner.

## Reference Boundaries

### Research Owns

Research owns:

- evidence organization;
- supporting evidence;
- conflicting evidence;
- narratives;
- source attribution;
- confidence context;
- investigation continuity;
- thesis context;
- evidence freshness and coverage display;
- links to deeper validation surfaces.

### Research Does Not Own

Research does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Replay validation;
- Trade execution;
- trade sizing;
- entries;
- exits;
- stop-loss workflows;
- take-profit workflows;
- opportunity ranking;
- live orderflow workspace;
- historical replay reconstruction.

## Freeze Rule

Once Research V2 is frozen, future runtime changes are permitted only for:

- implementation defects;
- objective bugs;
- Design System violations;
- documented product requirements;
- approved post-freeze roadmap items.

Future runtime changes must state:

1. what section they touch;
2. which frozen Research rule they preserve;
3. what they are not allowed to change;
4. whether they affect data, APIs, routing, fetch behavior, polling, scoring, evidence grouping, or hierarchy.

## Explicitly Prohibited

Future Research work must not introduce:

- subjective redesigns;
- aesthetic-only changes;
- undocumented feature additions;
- hierarchy drift;
- Dashboard behavior leakage;
- Markets behavior leakage;
- Scanner behavior leakage;
- Replay validation inside Research;
- Trade execution logic inside Research;
- synthetic data;
- generated narratives;
- fabricated confidence;
- invented rankings;
- unsupported scores;
- new intelligence systems;
- unreviewed request loops;
- new APIs without documented product requirement;
- automatic Historical Analog polling;
- automatic Market Memory polling;
- request-time historical replay reconstruction.

## Accepted Limitations

The following limitations are accepted as part of the frozen state. Do not resolve them inside unrelated polish, maintenance, or feature work.

### Source Coverage Limits

Source Intelligence can only report sources currently available to Research. Some rows remain `UNKNOWN`, `PARTIAL`, `UNAVAILABLE`, or manual-load dependent until the user loads prepared evidence.

Disposition:

- accepted for freeze;
- future source coverage expansion must use existing evidence contracts or a documented post-freeze data sprint.

### Incomplete Conflicting Evidence

Conflicting Evidence depends on existing contradiction metadata from loaded Historical Analog, Event Impact, Market Memory, and Decision Brief sources. If those sources are not loaded or do not expose contradictions, Research shows an explicit pending state.

Disposition:

- accepted for freeze;
- do not fabricate contradictions;
- future contradiction coverage must remain evidence-backed.

### Narrative Freshness Dependency

Narrative Timeline depends on `/api/narratives?range=24h` and `/api/macro`. If tagged narratives or macro items are unavailable, the section degrades to explicit unavailable states.

Disposition:

- accepted for freeze;
- do not generate narratives to mask missing source coverage.

### Handoff Depth Limitations

Markets, Replay/Explorer, and Trade handoffs preserve existing investigation context, but downstream readiness depends on those pages. Research does not validate downstream readiness.

Disposition:

- accepted for freeze;
- future handoff improvements must be scoped to navigation continuity and must not move destination-page ownership into Research.

### Related Markets Are Minimal

Related Markets displays the active subject, market attention context, and Markets handoff. It does not invent related symbols or build a new relation engine.

Disposition:

- accepted for freeze;
- do not invent related markets;
- future related-market expansion requires an existing source or documented data contract.

### Design Token Normalization Is Not Complete

Research is visually aligned with the terminal design system, but it does not yet implement a fully extracted token layer. Future polish should be scoped to token normalization only.

Disposition:

- accepted for freeze;
- future token work must not change hierarchy, data behavior, or ownership.

### Manual Evidence Loading Remains Required

Historical Analog, Event Impact, and Market Memory remain manual to preserve responsiveness and avoid heavy request-time workflows.

Disposition:

- accepted for freeze;
- do not auto-load heavy historical workflows without a documented product and performance review.

## Future Roadmap

All items below are backlog items. They are not part of the frozen Research V2 baseline and must not be implemented without a documented post-freeze sprint.

### Post-Freeze Improvements

- Design token normalization for Research surfaces, badges, and source rows.
- Responsive certification for desktop, tablet, and mobile.
- Section-level data health details.
- More explicit no-thesis empty state.
- Handoff continuity review for Markets, Replay, and Trade.
- Badge vocabulary normalization across all Research source states.

### Future Intelligence

- Broader contradiction metadata display when existing intelligence sources expose it.
- Evidence source rollups across additional prepared artifact types.
- Decision Brief display refinement without scoring changes.
- Market Memory compatibility expansion when existing artifacts support it.
- Evidence validity summaries across more Research sources.

### Future Data Sources

- ETF evidence when available through existing deployable artifacts.
- Treasury evidence when available through existing deployable artifacts.
- Exchange Flow evidence when available through existing deployable artifacts.
- Reserve Intelligence evidence when available through existing deployable artifacts.
- Liquidation intelligence evidence when available through existing contracts.
- Additional narrative sources when supported by existing source contracts.
- Related-market coverage from existing Markets or artifact contracts.

### Future UX

- Source drilldown within Research without creating new evidence.
- Compact evidence filtering if it does not create new ranking logic.
- Better manual-load affordances for evidence sources.
- More explicit evidence pending vs unavailable distinctions.
- Mobile-first Research certification.
- Context-preserving return links from Markets, Replay, and Trade.

## Review Gate

Every future Research sprint must verify:

- Research still answers `Why should I believe this market thesis?`;
- Research Summary remains first;
- Thesis remains before evidence detail;
- Supporting Evidence remains before Conflicting Evidence;
- Conflicting Evidence remains visible;
- Narrative Timeline remains below evidence;
- Source Intelligence remains before Navigation Actions;
- Dashboard conclusions are not duplicated;
- Markets exploration is not moved into Research;
- Scanner prioritization is not moved into Research;
- Replay validation is not moved into Research;
- Trade execution is not moved into Research;
- no synthetic data is introduced;
- no generated narratives are introduced;
- no unsupported score or fabricated confidence is introduced;
- existing APIs and artifacts are reused before adding new data paths;
- unavailable evidence remains explicit;
- manual evidence loading remains protected unless a documented sprint changes it.

## Validation

Validation for this sprint:

- `research-v2-state.md` exists.
- No runtime files changed.
- No Dashboard files changed.
- No Markets files changed.
- No Scanner files changed.
- No package changes.
- No build required.
