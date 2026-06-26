# Research Gap Analysis

Status: Research V2 gap analysis  
Scope: analysis only  
Runtime impact: none

## 1. Current Research Implementation

### Actual Implementation File

The active Research route is:

```text
app/research/page.tsx
```

It renders:

```text
components/research/ResearchPage.tsx
```

`app/research/page.tsx` wraps `ResearchPage` in `Suspense`, which is appropriate because `ResearchPage` uses `useSearchParams`.

Related Research component found:

```text
components/research/ResearchReplayWorkspace.tsx
```

This component is not the main `/research` route. It behaves like a research replay/sector-rotation workspace and should be treated as a boundary-sensitive related component.

### Current Section Order

Current `ResearchPage.tsx` renders sections in this order:

1. Current State
2. Narrative Context
3. Prediction Markets
4. Historical Analog Summary
5. Selected Analog Cases
6. Outcome Summary
7. Event Impact
8. Market Memory
9. Replay Access
10. Evidence
11. Information Flow
12. Investigation Status

### Current User Flow

The current flow starts with market context and narrative context, then moves into prediction markets, manual historical intelligence, event impact, Market Memory, replay handoff, evidence metadata, and investigation status.

The page supports useful manual investigation behavior:

- historical analog loading is manual;
- event impact loading is manual;
- Market Memory loading is manual;
- Replay access requires a selected historical case;
- unavailable states are explicit;
- heavy historical workflows are not auto-polled.

The current flow is not yet thesis-first. It asks the user to assemble a thesis from current state, narratives, prediction markets, historical analogs, event impact, and Market Memory rather than presenting the active thesis and evidence status first.

### Current Visual Hierarchy

The visual hierarchy is a uniform terminal card grid:

- `Card` uses consistent `rounded-lg border border-zinc-900 bg-zinc-950/80 p-3`.
- `Metric` uses small compact stat cards.
- most sections have equal visual weight.
- manual load controls are visually clear.
- unavailable states are compact and explicit.

The hierarchy is dense and functional, but not yet aligned to Research V2:

- Research Summary is not a distinct first-read layer.
- Thesis is embedded inside Current State rather than treated as the page anchor.
- Supporting and conflicting evidence are scattered across Historical Analog, Event Impact, Market Memory, and Investigation Status.
- Source Intelligence exists only as the Historical Analog `Evidence` card and scattered validity metrics.
- Navigation Actions exist as Replay Access, but Markets and Trade handoffs are not formalized.

### Current Interaction Model

Current interactions:

- URL/search params define investigation context.
- Narrative, prediction market, and macro data poll with `useSafePolling`.
- Historical Analog, Event Impact, and Market Memory load manually using buttons.
- Historical Analog case selection is local state.
- Replay handoff is generated only after Historical Analog is loaded and a case is selected.
- full Historical Intelligence explorer link is available from selected analog context.

Current reset behavior:

- Historical Analog state resets when symbol or historical timeframe changes.
- Event Impact state resets when exchange, selected event, or symbol changes.
- Market Memory state resets when exchange, symbol, or timeframe changes.

This is broadly safe for responsiveness, but the page contains multiple distinct data pathways that need careful handling during R4 to avoid request loops or scope creep.

### Existing APIs and Data Sources

Current Research data dependencies include:

| Data | Source |
| --- | --- |
| Investigation context | `readInvestigationContext`, `createInvestigationContext`, URL search params |
| Narrative Context | `/api/narratives?range=24h` |
| Prediction Markets | `/api/research/prediction-markets` |
| Macro / Information Flow | `/api/macro` |
| Historical Analog | `/api/historical-analog` |
| Event Impact | `/api/event-impact` |
| Market Memory | `/api/research/market-memory` |
| Decision Brief | local `buildDecisionBrief` from loaded Historical Analog, Event Impact, and Market Memory sources |
| Replay handoff | `buildInvestigationHref("/replay", replayContextForCase(...))` |
| Historical Intelligence handoff | `buildInvestigationHref("/historical-intelligence", ...)` |

Related but not active in the main route:

| Component | Source |
| --- | --- |
| `ResearchReplayWorkspace.tsx` | `/api/market/sector-rotation` |

## 2. Alignment Review

Target Research V2 hierarchy:

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

| Target Section | Current Status | Evidence |
| --- | --- | --- |
| Research Summary | Partial | `Current State` shows symbol, exchange, timeframe, investigation time, market regime, return, and optional thesis metadata. It does not summarize evidence readiness, freshness, coverage, support count, conflict count, or source quality as the first-read layer. |
| Thesis | Partial | Thesis title, question, and decision horizon appear inside `Current State` only when available. The thesis is not the primary page anchor and does not expose status, current view, required validation, or evidence context. |
| Supporting Evidence | Partial | Supporting counts exist inside Historical Analog, Event Impact, Market Memory, and Decision Brief. Evidence is not grouped into a dedicated supporting evidence layer. |
| Conflicting Evidence | Partial | Contradicting counts appear for Historical Analog, Event Impact, Market Memory, and Decision Brief. Specific conflicting evidence is not elevated into its own section. |
| Narrative Timeline | Misplaced / Partial | `Narrative Context` appears before thesis evidence and is heatmap-based, not timeline-based. `Information Flow` appears near the bottom and mixes macro and narrative rows. |
| Source Intelligence | Partial / Misplaced | Historical Analog validity appears in `Evidence`; Event Impact validity appears inside Event Impact; Market Memory validity appears inside memory cards. There is no unified source inventory. |
| Related Markets | Missing | The current page does not expose related markets or symbol-context handoffs beyond Replay and Historical Intelligence. |
| Navigation Actions | Partial | Replay and Historical Intelligence handoffs exist. Markets and Trade handoffs are not formalized as next-step actions. |

### Overall Alignment

Research currently has many of the raw building blocks needed for Research V2, but the hierarchy is not yet aligned.

The main gap is presentation and organization, not missing core evidence systems. R4 should restructure the page around existing data and manual loaders rather than add new intelligence.

## 3. Boundary Review

### Dashboard Boundary

Potential Dashboard overlap:

- `Current State` includes market regime and 24h return, which can read like a mini Dashboard summary.
- `Prediction Markets` near the top can feel like secondary Dashboard decision support rather than thesis evidence.

Disposition:

- keep these inputs if useful, but in R4 they should serve the thesis and evidence evaluation flow rather than lead the page.

### Markets Boundary

Potential Markets overlap:

- Current State includes symbol/exchange/timeframe and market regime.
- Related live market structure is not currently present, which is good for boundary safety.
- `ResearchReplayWorkspace.tsx` consumes sector rotation and includes a case study generator feel; if surfaced inside Research, it could drift into Markets/Replay territory.

Disposition:

- Research should link to Markets for live market context instead of becoming a market exploration workspace.

### Scanner Boundary

Potential Scanner overlap:

- Prediction markets and narrative heat can resemble attention/signal discovery if placed too high.
- The page does not currently rank opportunities, which is correct.

Disposition:

- do not add ranking or prioritization in R4.
- use narratives and prediction markets only as evidence/source context.

### Replay Boundary

Potential Replay overlap:

- `Replay Access` is appropriate as a handoff.
- `Selected Analog Cases` and `Outcome Summary` can become replay-like if expanded too far.
- `ResearchReplayWorkspace.tsx` includes replay controls and should not be merged into the main Research IA without a separate product review.

Disposition:

- keep Replay as a handoff.
- do not run replay loaders or create replay validation inside Research.

### Trade Boundary

Potential Trade overlap:

- `Decision Brief` current view and next validation can be useful, but Research must not translate it into entries, sizing, stops, take-profits, or trade recommendations.

Disposition:

- add a Trade handoff only as navigation.
- no execution details in Research.

## 4. Design System Gap

### Typography

Current:

- compact monospace-like terminal typography is present.
- section titles use small uppercase cyan labels.
- many metrics share the same small value style.

Expected:

- Research should reuse token roles for section titles, evidence titles, evidence metadata, source rows, and compact observations.
- Thesis and evidence status should be more readable in the first-read layer without becoming a Dashboard hero.

Gap:

- typography is consistent but flat.
- thesis, evidence, source quality, and navigation actions do not yet have distinct hierarchy.

### Spacing

Current:

- dense `gap-3`, `p-3`, compact metric spacing.
- good terminal density.

Expected:

- same density, but grouped by Research V2 hierarchy.
- evidence groups should have readable separation between support, contradiction, narrative, source, and handoff.

Gap:

- spacing is consistent but does not communicate section priority.

### Colors

Current:

- black and zinc dominate.
- cyan is used for titles and actions.
- green/rose appears for outcomes.

Expected:

- dark green-black terminal surfaces, amber structural hierarchy, cyan metadata, explicit state colors.

Gap:

- current styling is more black/zinc than the frozen Dashboard/Markets/Scanner visual language.
- amber hierarchy is minimal.
- state language is often text-driven rather than badge-driven.

### Surfaces

Current:

- all major cards use similar visual weight.
- metric cards are visually equal across section types.

Expected:

- Research Summary and Thesis should be the first-read surface.
- Supporting/Conflicting Evidence should be primary evidence surfaces.
- Narrative and Source Intelligence should be secondary/dense surfaces.
- Navigation Actions should be compact handoff surface.

Gap:

- no clear surface levels yet.
- all cards compete for attention.

### Badges

Current:

- state words exist in text and metric values.
- `EmptyState` explicitly shows reasons.
- validity states appear as metric values.

Expected:

- approved vocabulary should be visible and consistent: CURRENT, VERIFIED, PARTIAL, DEGRADED, STALE, LOADING, MISSING, UNAVAILABLE.

Gap:

- badges are not consistently used.
- `NO DATA`, `UNKNOWN`, manual load, unavailable, and validity states are not visually normalized.

### Density

Current:

- high density.
- useful for advanced research users.

Expected:

- Bloomberg density below the orientation layer, but Valley clarity for the first read.

Gap:

- density starts immediately.
- the first-read orientation is not compressed into thesis, freshness, coverage, and evidence readiness.

### Responsive Behavior

Current:

- uses responsive grids such as `sm:grid-cols-2`, `md:grid-cols-2`, `xl:grid-cols-*`.
- likely stacks reasonably on smaller screens.

Expected:

- mobile should preserve order: Research Summary, Thesis, Evidence Snapshot, Supporting Evidence, Conflicting Evidence, Narrative Timeline, Source Intelligence, Related Markets, Navigation Actions.

Gap:

- because the section order is not aligned, responsive stacking also follows the wrong IA.

## 5. Data Dependency Review

### Reusable Existing APIs

R4 can reuse:

- `/api/narratives?range=24h`;
- `/api/research/prediction-markets`;
- `/api/macro`;
- `/api/historical-analog`;
- `/api/research/historical-analogs` if a lighter analog shape is useful;
- `/api/event-impact`;
- `/api/research/market-memory`.

### Reusable Existing Intelligence

R4 can reuse:

- Investigation Thesis context from URL/search params;
- Evidence Validity metadata from Historical Analog, Event Impact, and Market Memory;
- Contradiction metadata from Historical Analog, Event Impact, and Market Memory;
- Decision Brief built locally from loaded sources;
- Historical Analog cached cases and statistics;
- Event Impact result statistics;
- durable Market Memory artifacts;
- narrative heatmap and information flow;
- prediction market attention markets;
- Replay handoff from selected Historical Analog case.

### Missing Data

Missing or incomplete relative to Research V2:

- unified Research Summary evidence readiness object;
- dedicated source inventory across all Research sources;
- explicit Related Markets section;
- formal Navigation Actions for Markets and Trade;
- direct display of individual supporting and conflicting evidence items;
- narrative timeline shape with observedAt/source/observation/status rows;
- unified badge vocabulary for freshness, coverage, and quality.

### Stale or Weak Data

Potential stale/weak areas:

- Historical Analog, Event Impact, and Market Memory depend on prepared caches/artifacts.
- Narrative Context can return no tagged items.
- Prediction Markets can return no attention markets.
- Macro data depends on available external/local source responses.
- Market Memory may be unavailable for selected symbols.

The current code generally exposes unavailable reasons, which should be preserved.

### APIs That Must Not Be Invented

R4 should not invent:

- a new Research summary API;
- a new evidence scoring API;
- a new confidence engine;
- new historical loaders;
- new replay validation APIs;
- new trade recommendation APIs;
- new opportunity ranking APIs.

Any summary, source inventory, supporting evidence grouping, or contradiction grouping should be derived from already-loaded data in the component.

## 6. Implementation Risk

### Request Loops

Risk: medium.

Current polling is limited to:

- narratives every 60 seconds;
- prediction markets every 60 seconds;
- macro every 60 seconds.

Manual loaders use abort controllers and do not auto-run. R4 must not change polling intervals, add auto-load historical intelligence, or introduce search-param churn.

### Duplicate Fetches

Risk: low to medium.

The main page has separate data paths for narratives, predictions, macro, historical, event impact, and memory. R4 should reuse these as-is and avoid adding parallel fetches for the same resources.

### Hydration Risk

Risk: low if R4 stays inside `ResearchPage.tsx` presentation.

`app/research/page.tsx` already uses `Suspense` around a client component that reads search params. R4 should not introduce render-time timestamps or volatile Link href params.

### Performance Risk

Risk: medium.

Historical Analog, Event Impact, and Market Memory are manual, which is good. The risk is turning Research Summary into a reason to auto-load everything. R4 must preserve manual load behavior for heavy evidence.

### Scope Creep

Risk: high.

Research touches many intelligence systems. R4 must avoid adding new intelligence, new source adapters, new APIs, new confidence scores, or Trade-style conclusions.

### Design Drift

Risk: medium.

Current Research styling is compact but not yet aligned with frozen Dashboard/Markets/Scanner token language. R4 should reuse token roles without copying page layouts.

## 7. Recommendation for R4

R4 should be limited to hierarchy restructuring and design-system alignment using existing data only.

### R4 Scope

Modify only:

```text
components/research/ResearchPage.tsx
```

Minor supporting Research-only components may be considered only if strictly required, but the preferred path is a single-file presentation restructure.

Do not modify:

- Dashboard;
- Markets;
- Scanner;
- Replay;
- Trade;
- APIs;
- package.json;
- polling intervals;
- URL/search param behavior;
- investigation context semantics;
- historical, event impact, Market Memory, or replay algorithms.

### Proposed R4 Hierarchy

Restructure presentation to:

1. Research Summary
2. Thesis
3. Supporting Evidence
4. Conflicting Evidence
5. Narrative Timeline
6. Source Intelligence
7. Related Markets
8. Navigation Actions

### R4 Data Mapping

| R4 Section | Existing Data To Reuse |
| --- | --- |
| Research Summary | investigation context, thesis, loaded evidence counts, freshness/coverage from loaded sources, manual-load states |
| Thesis | `investigationContext.thesis`, symbol, exchange, timeframe, decision horizon |
| Supporting Evidence | `decisionBrief.keySupportingFactors`, contradiction supporting evidence from Historical/Event/Memory, loaded source summaries |
| Conflicting Evidence | `decisionBrief.keyContradictingFactors`, contradiction contradicting evidence from Historical/Event/Memory |
| Narrative Timeline | `informationItems`, narrative heatmap/top narratives, macro items |
| Source Intelligence | Historical diagnostics/validity, Event Impact validity/source, Market Memory validity/source, polling source states |
| Related Markets | existing symbol context only, plus links to Markets; do not invent related symbols |
| Navigation Actions | links to Markets, Replay when selected case exists, Trade handoff preserving context where possible |

### R4 Constraints

- Keep manual loaders manual.
- Keep unavailable states explicit.
- Do not auto-load Historical Analog, Event Impact, or Market Memory.
- Do not add new APIs.
- Do not invent related markets.
- Do not invent confidence scores.
- Do not add trade recommendations.
- Do not merge `ResearchReplayWorkspace.tsx` into the main Research page.
- Preserve existing responsiveness and graceful degradation.

### R4 Acceptance Criteria

R4 should pass if:

- page order matches the approved Research V2 hierarchy;
- active thesis is visible before narrative/prediction/historical detail;
- supporting and conflicting evidence are separate sections;
- source freshness and coverage are grouped in Source Intelligence;
- Markets, Replay, and Trade handoffs are present as navigation actions;
- existing APIs and manual load behavior are preserved;
- no Dashboard, Markets, or Scanner files are modified.

## 8. Validation

Validation performed for this sprint:

- `docs/project/research-gap-analysis.md` created.
- No runtime code changes required.
- No Dashboard changes required.
- No Markets changes required.
- No Scanner changes required.
- No package changes required.
- No build required for analysis-only sprint.
