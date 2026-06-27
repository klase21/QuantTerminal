# Shared Product Context Contract

**Status:** Architecture specification  
**Version:** 1.0  
**Scope:** Dashboard, Markets, Scanner, Research, Replay, and Trade

## 1. Problem Statement

QuantTerminal has a coherent page pipeline, but it does not yet have one runtime contract for carrying context through that pipeline. Selected symbol, exchange, and timeframe state are repeated across pages; richer handoffs are incomplete; and the contracts defined in the Replay and Trade readiness review are not implemented consistently at runtime.

Thesis, evidence, validation, and execution context are therefore fragmented. A destination may receive only a symbol, receive differently named query parameters, or receive no inherited context at all. This creates four risks:

- pages may duplicate or reinterpret upstream state;
- missing context may be mistaken for negative evidence;
- stale context may survive a symbol, venue, or timeframe change;
- API expansion may formalize incompatible page-level contracts.

The shared product context is a versioned handoff envelope. It transports source-backed facts, summaries, and references between page owners. It is not a new intelligence engine, a global mutable page model, or permission for downstream pages to recompute upstream work.

## 2. Contract Model

### 2.1 Canonical Envelope

```ts
interface SharedProductContextV1 {
  schemaVersion: 1;
  contextId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;

  symbol: string;
  exchange?: string;
  timeframe?: string;

  thesis?: ContextValue<ThesisContext>;
  opportunityContext?: ContextValue<OpportunityContext>;
  signalContext?: ContextValue<SignalContext>;
  marketStructureContext?: ContextValue<MarketStructureContext>;
  evidenceSummary?: ContextValue<EvidenceSummary>;
  supportingEvidence?: ContextValue<EvidenceReference[]>;
  conflictingEvidence?: ContextValue<EvidenceReference[]>;
  confidenceContext?: ContextValue<ConfidenceContext>;
  freshness?: ContextValue<FreshnessContext>;
  replayTarget?: ContextValue<ReplayTarget>;
  validationResult?: ContextValue<ValidationResult>;
  replayResult?: ContextValue<ReplayResult>;
  executionContext?: ContextValue<ExecutionContext>;

  sourcePage: ProductPage;
  destinationIntent: DestinationIntent;
}

interface ContextValue<T> {
  value: T;
  owner: ProductPage;
  source: string;
  observedAt?: string;
  generatedAt?: string;
  freshness: "CURRENT" | "STALE" | "MISSING" | "UNAVAILABLE" | "UNKNOWN";
  revision: number;
}
```

`replayTarget` is included because a selected historical case or time window is required to execute the Research to Replay contract without choosing a case implicitly.

Large raw payloads do not belong in this envelope. Evidence arrays contain compact references and summaries, not raw market history, orderbooks, or downloaded datasets.

### 2.2 Mutation Model

- A handoff is an immutable snapshot.
- A page may update only fields it owns or is explicitly allowed to initialize.
- An update creates a new `revision`; it does not mutate the prior handoff.
- Downstream pages preserve upstream values and provenance.
- Explicit user selection is the only valid way to change identity fields.
- A change to `symbol`, `exchange`, or `timeframe` invalidates dependent opportunity, signal, structure, evidence, validation, replay, and execution fields until their owners refresh them.

### 2.3 Canonical Field Registry

| Field | Owner page | Allowed writers | Allowed readers | Requirement | Mutation | Stale handling |
|---|---|---|---|---|---|---|
| `symbol` | Shared navigation identity | Source page after explicit user selection | All pages | Required | New revision only | Not age-based; identity change invalidates dependent fields |
| `exchange` | Markets | Dashboard may initialize; Markets may refine; explicit user selection | All pages | Optional globally; required for venue-specific work | New revision only | Venue mismatch invalidates venue-specific context |
| `timeframe` | Markets | Dashboard may initialize; Markets or explicit user selection may refine | All pages | Optional globally; required when analysis is interval-bound | New revision only | Interval mismatch invalidates interval-bound context |
| `thesis` | Research | Research or explicit user-authored Research action | Replay, Trade; Research on return | Optional until Research; required to validate a thesis | Immutable downstream | Mark stale when supporting sources are stale; never silently rewrite |
| `opportunityContext` | Scanner | Scanner; Markets may initialize an unranked candidate | Research, Replay, Trade, Markets | Optional | Owner creates replacement revision | Apply source policy; stale remains visible and labelled |
| `signalContext` | Scanner | Scanner | Research, Replay, Trade | Optional | Immutable downstream | Apply signal source policy; missing is not a neutral signal |
| `marketStructureContext` | Markets | Markets | Scanner, Research, Replay, Trade | Optional | Immutable downstream | Apply market-data policy; identity mismatch invalidates |
| `evidenceSummary` | Research | Research from existing evidence | Replay, Trade | Optional until evidence review | Immutable downstream | Aggregate status cannot exceed its underlying evidence freshness |
| `supportingEvidence` | Research | Research from source-backed evidence | Replay, Trade | Optional | Immutable downstream | Preserve each reference status and source time |
| `conflictingEvidence` | Research | Research from source-backed evidence | Replay, Trade | Optional | Immutable downstream | Preserve absence as unavailable; do not infer no conflict |
| `confidenceContext` | Research | Research; Dashboard or Scanner may initialize only an existing source-backed value | Replay, Trade; upstream page on return | Optional | Immutable downstream | Status follows the inputs that produced the value |
| `freshness` | Field owner / Data Health | Each owning page from existing metadata | All pages | Optional; absence means `UNKNOWN` | New revision by owner | Never infer `CURRENT` without a valid timestamp and policy |
| `replayTarget` | Research / Replay | Research selects; Replay may refine by explicit user action | Replay, Research on return | Required to load a specific replay | New revision only | Case or window mismatch invalidates validation and replay results |
| `validationResult` | Replay | Replay | Trade; Research on return | Optional until Replay completes | Immutable outside Replay | Mark stale or invalid when replay target or upstream revision changes |
| `replayResult` | Replay | Replay | Trade; Research on return | Optional until replay data resolves | Immutable outside Replay | Preserve partial and unavailable source states |
| `executionContext` | Trade | Trade | Dashboard for compact monitoring; Replay/Research on return | Optional until Trade | Immutable outside Trade | Invalidate readiness when inherited validation or identity changes |
| `sourcePage` | Handoff origin | Originating page | All pages | Required | Immutable per handoff | Not age-based |
| `destinationIntent` | Handoff origin / user action | Originating page | Destination page | Required | Immutable per handoff | Not age-based; unknown intent must remain explicit |

The field name `validationResult` means historical validation owned by Replay. It must not be used for QA validation, source verification, or trade readiness.

## 3. Page Responsibilities

### Dashboard

- May initialize broad identity and market context from existing data.
- May pass existing direction, confidence, and freshness summaries as optional context.
- Must not create a thesis, historical validation, or execution context.
- Must not restore historical workflows or treat historical context as Dashboard-owned.

### Markets

- May refine exchange, timeframe, and market structure context.
- May identify a market candidate for Scanner or Research without assigning Scanner priority.
- Must not generate a thesis, evidence conclusion, validation result, or execution plan.

### Scanner

- May select and rank existing opportunity and signal context.
- May attach source-backed confidence metadata already produced by Scanner intelligence.
- Must not generate Research evidence, a thesis, historical validation, or execution context.

### Research

- May attach the thesis, evidence summary, supporting evidence, conflicting evidence, narrative references, and confidence context.
- May select a Replay target explicitly.
- Must not generate validation or execution context.

### Replay

- May attach validation and replay results for the inherited thesis and selected target.
- May refine a replay target only through explicit user selection.
- Must not generate or rewrite the thesis, evidence, opportunity, or execution context.

### Trade

- May attach execution readiness, setup, entry, exit, risk, sizing context, and checklist state using existing execution functionality.
- Must not rewrite inherited thesis, evidence, market structure, validation, or replay results.
- Must not imply validation when Replay context is missing or unavailable.

## 4. Canonical Handoff Rules

Every handoff creates a new revision, identifies its source and destination intent, and preserves provenance. A destination may continue in a reduced mode when optional context is absent, but it must expose the reduction explicitly.

### Dashboard to Markets

- **Minimum:** `symbol`, `sourcePage=dashboard`, `destinationIntent=explore_market`.
- **Optional:** `exchange`, `timeframe`, source-backed confidence, freshness, and compact evidence references.
- **If missing:** Markets uses an explicit local selection or established default; it must not claim the value was inherited.
- **Unavailable state:** Show market context unavailable with the source reason; continue with responsive sections that have real data.

### Dashboard to Scanner

- **Minimum:** `sourcePage=dashboard`, `destinationIntent=triage_opportunities`.
- **Optional:** `symbol`, `exchange`, `timeframe`, broad market context, confidence, and freshness.
- **If missing:** Scanner opens in global triage mode with no inherited symbol focus.
- **Unavailable state:** Mark inherited context unavailable while preserving Scanner's existing independent data flow.

### Markets to Scanner

- **Minimum:** `symbol`, `sourcePage=markets`, `destinationIntent=prioritize_symbol`.
- **Optional:** `exchange`, `timeframe`, market structure, an unranked candidate, and freshness.
- **If missing:** Scanner remains in global triage mode and does not manufacture a selected opportunity.
- **Unavailable state:** Preserve the symbol when valid; label unavailable structure or candidate context separately.

### Markets to Research

- **Minimum:** `symbol`, `sourcePage=markets`, `destinationIntent=investigate_evidence`.
- **Optional:** `exchange`, `timeframe`, market structure, opportunity context, and freshness.
- **If missing:** Research may open without an active thesis but must not generate one from absent context.
- **Unavailable state:** Show which market context is unavailable and allow manual, source-backed investigation.

### Scanner to Research

- **Minimum:** `symbol`, at least one of `opportunityContext` or `signalContext`, `sourcePage=scanner`, `destinationIntent=evaluate_thesis`.
- **Optional:** `exchange`, `timeframe`, confidence, market structure, and freshness.
- **If missing:** Research may open symbol-only; opportunity and signal context remain explicitly missing.
- **Unavailable state:** Do not convert unavailable signal evidence into a thesis or confidence value.

### Research to Replay

- **Minimum:** `symbol`, `thesis`, `replayTarget`, `sourcePage=research`, `destinationIntent=validate_historically`.
- **Optional:** `exchange`, `timeframe`, evidence summary, supporting and conflicting evidence, confidence, market structure, and freshness.
- **If missing:** Without a thesis or target, Replay enters a selection-required state and does not choose an arbitrary case.
- **Unavailable state:** Replay shows `UNAVAILABLE` or `PARTIAL` with the exact missing input and preserves responsive access to existing supported data.

### Replay to Trade

- **Minimum:** `symbol`, `validationResult`, `replayResult`, `sourcePage=replay`, `destinationIntent=prepare_execution`.
- **Optional:** `exchange`, `timeframe`, thesis, evidence summary, confidence, structure, opportunity, and freshness.
- **If missing:** Trade may show existing symbol-level execution context, but readiness must remain partial or unavailable and must not claim historical validation.
- **Unavailable state:** Display Replay validation as unavailable with its reason; never infer approval to execute.

### Trade to Dashboard

- **Minimum:** `symbol`, `sourcePage=trade`, `destinationIntent=monitor_market`.
- **Optional:** compact execution status, exchange, timeframe, and freshness.
- **If missing:** Dashboard returns to broad market monitoring without an execution status.
- **Unavailable state:** Execution context remains unavailable; Dashboard must not reconstruct or summarize a missing plan.

## 5. Runtime Strategy

### Options

| Approach | Appropriate use | Limitation |
|---|---|---|
| URL query parameters | Stable, shareable identity such as symbol and timeframe | Unsuitable for large, sensitive, or evolving context; volatile values can cause hydration and request churn |
| `sessionStorage` | Lightweight, tab-scoped handoff snapshots | Not shareable across devices and unavailable during server rendering |
| Local state store | Reactive access to the active context within a client session | Memory-only state is lost on refresh unless paired with persistence |
| Future server-side context store | Durable, authenticated, cross-device handoffs | Requires API, retention, authorization, and privacy design |

### Recommended V1

Use a hybrid contract:

1. Put only stable identity in the URL: `contextId`, `symbol`, `exchange`, `timeframe`, `sourcePage`, and `destinationIntent` when present.
2. Store the serialized rich context in `sessionStorage`, keyed by `contextId`.
3. Use a small in-memory adapter only as a reactive mirror of the stored snapshot, not as a second source of truth.
4. Resolve absent or invalid stored context to an explicit partial or unavailable state.
5. Do not generate timestamps during render or continuously synchronize volatile context into the URL.

This approach preserves refresh continuity within a tab, keeps navigation links compact, avoids exposing full evidence in URLs, and does not require API expansion. Deep links with no stored payload remain valid identity-only links and degrade explicitly.

## 6. Data Safety Rules

- No synthetic context or fallback metrics.
- No invented thesis, opportunity, signal, evidence, confidence, validation, or execution state.
- No inferred validation from a successful replay request or available chart.
- No automatic execution context from a symbol alone.
- No raw historical datasets, orderbooks, credentials, or sensitive user inputs in URLs.
- Every derived field retains its owner, source, observation time when available, freshness, and revision.
- Missing timestamps do not become current; they resolve to `UNKNOWN`, `STALE`, or `UNAVAILABLE` according to existing policy.
- Invalid or unsupported payloads fail closed and retain an explicit reason.
- Partial context must remain partial throughout downstream handoffs unless the owning page supplies the missing real data.
- Context transport must not block page rendering or trigger expensive historical processing.

## 7. A25-2 Implementation Boundary

The next sprint should implement contract infrastructure only:

- TypeScript types for `SharedProductContextV1` and its owned value types;
- versioned serialization and deserialization;
- strict validation of identity, ownership, provenance, timestamps, and enum values;
- dependency invalidation helpers;
- safe `sessionStorage` repository and identity-only URL helpers;
- unit tests for round trips, invalid payloads, stale handling, and version rejection.

A25-2 must not wire pages to the contract, redesign UI, add APIs, change scoring, add data sources, or expand product behavior. Page integration should occur later through page-specific, reviewable handoff sprints.

## 8. Validation

- `docs/project/shared-product-context-contract.md` exists.
- The contract covers all six frozen product pages and all required handoffs.
- Every canonical field specifies ownership, writers, readers, requirement, mutation, and stale handling.
- Runtime implementation is explicitly deferred.
- No runtime files were modified.
- No API files were modified.
- No package files were modified.
- No build is required for this documentation-only sprint.

## References

- [Whole Product Review](./whole-product-review.md)
- [Replay and Trade Readiness](./replay-trade-readiness.md)
- [Navigation and Handoff Audit](./navigation-handoff-audit.md)
- [Product Language Audit](./product-language-audit.md)
- [Dashboard V2 State](./dashboard-v2-state.md)
- [Markets V2 State](./markets-v2-state.md)
- [Scanner V2 State](./scanner-v2-state.md)
- [Research V2 State](./research-v2-state.md)
- [Replay V2 State](./replay-v2-state.md)
- [Trade V2 State](./trade-v2-state.md)
