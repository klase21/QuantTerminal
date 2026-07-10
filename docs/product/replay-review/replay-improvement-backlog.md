# Replay V2 Improvement Backlog

**Status:** Post-design implementation backlog  
**Sprint:** F2  
**Rule:** This backlog does not authorize runtime, provider, or protected
historical-system changes by itself.

## Critical

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Align implementation hierarchy to Replay V2 | Move summary, chart/availability, timeline, and handoffs into canonical order without changing data behavior. | Component extraction, PDGM-102 | Existing provider and repository modes remain functional. |
| Preserve factual unavailable states | Remove any copy or visual that implies a fact when evidence is absent. | State model, Evidence First | No fabricated event, confidence, freshness, or causal statement. |
| Bind reasoning to evidence references | Prevent standalone generated explanation. | Approved reasoning contract | Every claim exposes supporting and counter-evidence or `UNAVAILABLE`. |
| Protect heavy dataset boundaries | Keep AggTrade paginated and orderbook manual/cached. | ADR-002, bounded query contract | No full event-stream or orderbook replay in request paths. |
| Preserve shared investigation context | Maintain symbol, exchange, date, hour, event, and evidence state across handoffs. | Product context contract | Dashboard, Research, Markets, Repository, and Trade receive bounded context. |

## High

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Implement chronological evidence timeline | Make event sequence the core investigation interaction. | Timeline Event component | Sorting uses source timestamps; missing timestamps remain unavailable. |
| Consolidate evidence quality | Replace repeated V1 metadata sections with availability rail and Repository audit panel. | Evidence Availability Row | No loss of source, coverage, freshness, or diagnostics. |
| Add chart/timeline synchronization | Selecting an event aligns chart cursor and detail. | Bounded Replay Chart | No automatic heavy-data loading. |
| Add explicit counter-evidence panel | Make contradiction visible near reasoning. | Reasoning Block | Empty counter-evidence does not imply none exists. |
| Establish context-preserving Research handoff | Turn evidence gaps into open research questions. | Shared product context | Research receives facts and gaps, not Replay-owned conclusions. |
| Add keyboard investigation controls | Improve professional workflow speed. | Design System accessibility | Controls are discoverable and have non-keyboard equivalents. |

## Medium

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Saved Replay windows | Support repeatable investigation without saving stale conclusions. | Workspace model | Saved state contains window and filters only. |
| Dataset filter presets | Accelerate derivatives, flow, and context review. | Timeline filters | Presets do not change evidence semantics. |
| Repository raw-record drawer | Inspect records without losing Replay context. | Repository query contract | Reads remain bounded and projection gated. |
| Exportable investigation brief | Support institutional handoff. | Provenance and evidence references | Export clearly distinguishes fact, reasoning, and unavailable evidence. |
| Responsive investigation mode | Preserve orientation on laptop and tablet. | Responsive system | Chart and summary remain first; heavy tools do not crowd mobile. |

## Low

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Collaborative annotations | Share human notes without mutating facts. | Workspace and identity model | Notes are separate from Repository evidence. |
| Multi-window comparison | Compare bounded Replay sessions. | Source-backed historical context | No fabricated similarity score. |
| Custom evidence lane order | Support professional workflows. | User preferences | Canonical default hierarchy remains available. |

## Future

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Precomputed orderbook states | Enable safe microstructure replay. | Background worker, cache, validated snapshots | Request path never reconstructs millions of events. |
| Source-backed historical analogs | Compare prior windows. | Historical Memory and approved pattern runtime | Analog identity and similarity method are explicit. |
| AI-assisted event navigation | Suggest evidence paths, not conclusions. | AI and reasoning governance | Human remains final authority; suggestions cite evidence. |
| Enterprise audit workflow | Support review, export, and approval. | Identity, collaboration, repository lineage | Immutable facts and reviewer actions remain distinct. |

## Implementation Sequence

```text
Shared state primitives
  -> Replay hierarchy
  -> Evidence availability
  -> Timeline
  -> Chart synchronization
  -> Cited reasoning
  -> Research / Repository handoffs
  -> Workspace productivity
```

## Out of Scope

- New providers;
- full orderbook reconstruction in request handlers;
- automatic historical analog generation;
- signal generation;
- trade recommendation;
- synthetic confidence;
- fabricated event or market data;
- replacement of the existing provider fallback path.

