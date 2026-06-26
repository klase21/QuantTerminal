# Research Certification

Status: Research V2 certification  
Scope: certification only  
Runtime impact: none

## Certification Basis

This certification reviews the Sprint R4 implementation against:

- `docs/project/research-constitution.md`
- `docs/project/research-information-architecture.md`
- `docs/project/research-gap-analysis.md`
- `docs/project/dashboard-v2-state.md`
- `docs/project/markets-v2-state.md`
- `docs/project/scanner-v2-state.md`
- `docs/project/dashboard-design-system.md`
- `docs/project/design-token-registry.md`

Implementation inspected:

```text
components/research/ResearchPage.tsx
```

## 1. Hierarchy Certification

Decision: PASS

Approved order:

```text
Research Summary
  -> Thesis
  -> Supporting Evidence
  -> Conflicting Evidence
  -> Narrative Timeline
  -> Source Intelligence
  -> Related Markets
  -> Navigation Actions
```

Observed implementation order:

1. `Research Summary`
2. `Thesis`
3. `Supporting Evidence`
4. `Conflicting Evidence`
5. `Narrative Timeline`
6. `Source Intelligence`
7. `Related Markets`
8. `Navigation Actions`

Certification notes:

- The active thesis and evidence readiness now appear before narrative, prediction market, historical detail, source detail, and handoffs.
- Supporting and conflicting evidence are separated.
- Narrative context and prediction markets are nested under Narrative Timeline rather than leading the page.
- Source freshness, coverage, generated time, and reasons are grouped in Source Intelligence.
- Handoffs appear at the end of the workflow.

## 2. Design System Certification

Decision: PASS WITH LIMITATIONS

### Typography

Result: PASS

Research uses compact uppercase section titles, dense metadata labels, compact body text, and monospace-oriented terminal styling consistent with the frozen Dashboard, Markets, and Scanner language.

### Spacing

Result: PASS

The page uses dense `gap-3`, compact card padding, and row-based source/evidence layouts. It remains readable while preserving terminal density.

### Colors

Result: PASS WITH LIMITATIONS

Research keeps the dark terminal identity and uses cyan metadata, amber summary emphasis, green support treatment, and rose conflict treatment.

Known limitation:

- Research still leans heavily on black/zinc surfaces inherited from the pre-R4 implementation. It is aligned enough for certification, but future polish may further normalize surfaces to the full token registry.

### Surfaces

Result: PASS

Research Summary receives the strongest page-level treatment without becoming a Dashboard hero. Evidence, narrative, source, and handoff sections remain compact evidence-workspace surfaces.

### Badges / Status

Result: PASS WITH LIMITATIONS

The implementation includes explicit badge/status treatment for active context, freshness, coverage, evidence pending, and source states.

Known limitation:

- Some states remain displayed as metric values or source-row text rather than fully normalized badge components.

### Visual Hierarchy

Result: PASS

The visual hierarchy now follows thesis context before evidence, contradiction before narrative interpretation, source quality before handoff, and navigation actions last.

### Consistency With Dashboard, Markets, And Scanner

Result: PASS

Research reuses the shared terminal language while keeping a distinct evidence-evaluation workflow. It does not duplicate Dashboard hero layout, Markets opportunity layout, or Scanner signal-feed layout.

## 3. Boundary Certification

Decision: PASS

Research owns:

- evidence organization;
- narratives;
- source attribution;
- confidence context;
- supporting evidence;
- conflicting evidence.

Boundary review:

| Boundary | Certification |
| --- | --- |
| Dashboard conclusions | PASS: Research does not create a market-direction hero or own market conclusion. |
| Markets exploration | PASS: Research provides a Markets handoff but does not become a live market exploration workspace. |
| Scanner prioritization | PASS: Research does not rank opportunities or create attention triage. |
| Replay validation | PASS: Research provides Replay/Explorer handoffs but does not run replay loaders or validate replay evidence inline. |
| Trade execution | PASS: Research provides a Trade handoff but does not expose entries, stops, sizing, take-profits, or execution plans. |

Certification notes:

- `Selected Analog Cases` and `Outcome Summary` remain bounded inside evidence context.
- Replay is treated as a navigation destination, not a Research-owned validation workflow.
- Trade is treated as a handoff, not an execution surface.

## 4. Implementation Certification

Decision: PASS

### Existing APIs Reused

Result: PASS

Research continues to use existing APIs and data paths:

- `/api/narratives?range=24h`
- `/api/research/prediction-markets`
- `/api/macro`
- `/api/historical-analog`
- `/api/event-impact`
- `/api/research/market-memory`

### No Synthetic Intelligence

Result: PASS

The implementation derives display groups from already-loaded Decision Brief, Evidence Validity, Contradiction metadata, Historical Analog, Event Impact, Market Memory, narrative, macro, and prediction market data.

No synthetic confidence scores, rankings, predictions, or unsupported claims were introduced.

### No Generated Narratives

Result: PASS

Narrative Timeline uses existing narrative heatmap, top narrative, macro, and prediction market data. It does not generate new narrative prose.

### No Scoring Changes

Result: PASS

No scoring logic was changed. Existing Decision Brief and intelligence outputs are displayed only.

### No Polling Changes

Result: PASS

Existing polling remains:

- narratives every 60 seconds;
- prediction markets every 60 seconds;
- macro every 60 seconds.

Manual loaders remain manual:

- Historical Analog;
- Event Impact;
- Market Memory.

### No Router/Search-Param Changes

Result: PASS

The page continues to use existing investigation context helpers and handoff builders. No URL churn, render-time timestamp generation, or search-param synchronization behavior was added.

### No New Request Paths

Result: PASS

No new API routes or new fetch paths were introduced.

## 5. Known Limitations

The following limitations are accepted for certification and must not be fixed inside unrelated work.

### Source Coverage Limits

Source Intelligence can only report sources currently available to Research. Some rows are `UNKNOWN`, `PARTIAL`, `UNAVAILABLE`, or manual-load dependent until the user loads prepared evidence.

### Incomplete Conflicting Evidence

Conflicting Evidence depends on existing contradiction metadata from loaded Historical Analog, Event Impact, Market Memory, and Decision Brief sources. If those sources are not loaded or do not expose contradictions, Research shows an explicit pending state.

### Narrative Freshness Dependency

Narrative Timeline depends on `/api/narratives?range=24h` and `/api/macro`. If tagged narratives or macro items are unavailable, the section degrades to explicit unavailable states.

### Handoff Depth Limitations

Markets, Replay/Explorer, and Trade handoffs preserve existing investigation context, but the depth of downstream behavior depends on those pages. Research does not validate downstream readiness.

### Related Markets Are Minimal

Related Markets currently displays the active subject, market attention context, and Markets handoff. It does not invent related symbols or build a new relation engine.

### Design Token Normalization Is Not Complete

Research is visually aligned with the terminal design system, but it does not yet implement a fully extracted token layer. Future polish should be scoped to token normalization only.

### Manual Evidence Loading Remains Required

Historical Analog, Event Impact, and Market Memory remain manual to preserve responsiveness and avoid heavy request-time workflows.

## 6. Certification Decision

Decision:

```text
CERTIFIED WITH LIMITATIONS
```

Justification:

Research V2 now satisfies the approved constitutional purpose and information architecture. It presents thesis context first, separates supporting and conflicting evidence, moves narratives after evidence, groups source quality, and provides clear handoffs to Markets, Replay, and Trade. It reuses existing APIs and intelligence without new scoring, new polling, generated narratives, or synthetic evidence.

The remaining limitations are objective data coverage and visual-token normalization limitations, not blockers to certification.

## 7. Validation

Required validation for this sprint:

```text
npx.cmd tsc --noEmit --pretty false --incremental false
npm run audit:dashboard-integration
npm run test:intelligence
```

Validation results should be recorded in the sprint output.
