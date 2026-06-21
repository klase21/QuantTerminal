# Investigation Thesis Layer V1

## Purpose

The Shared Investigation Context already preserves the market identity:

- symbol;
- exchange;
- timeframe;
- investigation timestamp;
- selected historical case, Replay window, or event.

Investigation Thesis V1 preserves why that context exists.

```text
Market identity
  + active research question
  = continuous investigation
```

The thesis is not an intelligence conclusion, recommendation, confidence score, or decision-engine output. It is the user's active research question and its lifecycle metadata.

## Architecture

```text
Dashboard establishes thesis
  -> Shared Investigation Context
  -> URL serialization
  -> Research consumption
  -> Historical Intelligence consumption
  -> Replay compatibility
```

The URL remains the portable cross-page authority. No global store, database, session, cache, or server-side thesis service was added.

Page-local state continues to own loading, selected rows, chart controls, and manual-load behavior.

## Contract

The versioned contract is defined in:

```text
types/investigationThesis.ts
```

```ts
interface InvestigationThesis {
  thesisVersion: 1
  thesisId: string
  title: string
  question: string
  decisionHorizon: string
  status: "active" | "resolved" | "invalidated" | "archived"
  createdAt: string
  updatedAt: string
  hypothesis?: string
  currentView?: string
  tags?: string[]
}
```

### Required Fields

`thesisId`

A stable public identity for the active investigation. It must not expose cache ids, file paths, or storage keys.

`title`

A short human-readable investigation label.

`question`

The active question the user is attempting to answer.

`decisionHorizon`

The horizon over which the question matters. V1 stores a public string so tactical and future research horizons can coexist without changing the contract.

`status`

The thesis lifecycle state.

`createdAt`

When the thesis was established.

`updatedAt`

When thesis meaning or lifecycle last changed. Page navigation does not rewrite this timestamp.

### Optional Fields

`hypothesis`

A proposed explanation to test. V1 does not generate one automatically.

`currentView`

The current consuming product surface. This is navigation context, not lifecycle state.

`tags`

Small public discovery labels. They do not drive scoring or intelligence generation.

## Status Lifecycle

### Active

The question is still being investigated.

### Resolved

The investigation reached an explicit conclusion outside the scope of V1.

### Invalidated

The thesis no longer applies because its premise or compatible context was invalidated.

### Archived

The thesis is retained as historical context but is no longer active.

V1 defines and transports these states. It does not implement status-changing workflows, decision records, approval, or persistence.

## Dashboard Ownership

Dashboard establishes a default market-state thesis when it establishes investigation context.

Example:

```text
Title:
BTCUSDT Market Investigation

Question:
What is driving BTCUSDT over the 1h decision horizon?
```

The thesis is derived only from real public context:

- selected symbol;
- selected timeframe;
- investigation timestamp.

No market explanation, confidence, recommendation, or unsupported hypothesis is generated.

Dashboard remains lightweight. Creating and serializing the thesis performs no API request or historical computation.

## Shared Investigation Context

`InvestigationContext` now has an optional:

```text
thesis
```

New context URLs serialize:

- thesis version;
- thesis id;
- title;
- question;
- decision horizon;
- status;
- created and updated timestamps;
- optional hypothesis;
- current view;
- tags.

The parser requires a complete valid required field set. Invalid or incomplete thesis parameters are ignored while valid symbol, exchange, timeframe, and selected evidence remain usable.

Legacy URLs without thesis parameters remain fully supported.

## Context Propagation

The navigation shell preserves the thesis for:

- Dashboard;
- Research;
- Historical Intelligence;
- Replay.

When navigating, only `currentView` changes. The thesis id, question, decision horizon, status, creation time, and update time remain stable.

This distinction prevents route changes from appearing as new research questions.

## Research Consumption

Research exposes:

- current thesis title;
- current question;
- current decision horizon.

It does so inside the existing Current State section. No new workflow, automatic request, polling, or page architecture was introduced.

Historical Analog, Event Impact, and Market Memory remain manual-load/cache-backed according to existing policy.

If no thesis is present, Research behaves exactly as before.

## Historical Intelligence Consumption

Historical Intelligence reads the shared thesis and displays compact thesis and horizon context in its existing header.

Selecting an analog case:

- preserves the active thesis;
- changes investigation type to `historical_case`;
- preserves the original question;
- updates the thesis `currentView`;
- attaches the selected case as evidence context.

The selected historical case does not replace the current research question.

Historical Analog algorithms, cache generation, similarity search, and outcomes are unchanged.

## Replay Compatibility

Replay reads the thesis from Shared Investigation Context and displays compact thesis and horizon provenance.

Replay continues to:

- prefill verified context;
- remain manual-load;
- own local Replay control changes;
- use existing data sources and failure handling.

No Replay request, cache, builder, decoder, or loading behavior was modified.

The thesis is context for why a window is being inspected. It is not used to alter the reconstructed data.

## Market Memory Compatibility

Market Memory contracts can optionally carry an Investigation Thesis.

Rules:

- a memory derived from one artifact preserves that artifact's thesis;
- a structural memory derived from multiple Replay artifacts preserves a thesis only when all relevant artifacts share one thesis id;
- incompatible or absent theses are omitted;
- Market Memory does not invent or merge thesis text.

The memory builder remains deterministic and artifact-only.

## Artifact Compatibility

Canonical Intelligence Artifacts can optionally carry:

```text
thesis
```

Artifact creation and producer adapters accept thesis metadata without requiring it.

This supports future publication of thesis-bound:

- Historical Analog artifacts;
- Event Impact artifacts;
- Replay Evidence artifacts;
- Market Memory artifacts.

Existing artifacts without thesis remain valid. No artifact schema-version migration was forced in V1.

Durable artifact payloads and index entries may store thesis metadata when present. Existing durable records remain readable.

## Compatibility Strategy

### Legacy Context

No thesis fields:

```text
continue with existing symbol/exchange/timeframe behavior
```

### Invalid Thesis Parameters

Invalid thesis:

```text
ignore thesis only
preserve remaining valid investigation context
```

### Legacy Artifacts

No thesis metadata:

```text
artifact remains valid
consumer treats thesis as unavailable
```

### New Artifacts

Producer has a valid thesis:

```text
publish optional canonical thesis metadata
```

No producer is required to fabricate a thesis when one is not available.

## Failure Handling

The thesis layer never blocks page rendering or data loading.

- Missing thesis: existing context fallback.
- Unsupported version: thesis ignored.
- Missing required field: thesis ignored.
- Invalid timestamp or status: thesis ignored.
- Missing artifact thesis: artifact remains usable.
- Incompatible Market Memory source theses: memory omits thesis.

No fallback thesis is generated outside Dashboard ownership.

## Future Extensions

The V1 contract permits future work without implementing it:

- explicit user-created hypotheses;
- thesis resolution and invalidation workflows;
- decision records;
- supporting and contradicting evidence roles;
- durable thesis history;
- artifact discovery by thesis id;
- Event Impact thesis handoff;
- Market Memory retrieval by thesis.

These are not part of V1.

## Non-Goals

Investigation Thesis V1 does not add:

- AI or Copilot;
- automatic explanations;
- recommendations;
- confidence scoring;
- decision scoring;
- a decision engine;
- a workflow engine;
- a global state store;
- persistence;
- new APIs;
- historical computation;
- Replay infrastructure changes;
- Dashboard or Research redesign.

## Known Limitations

- Thesis transport uses URL parameters and can create long URLs when optional prose is populated.
- V1 does not provide user controls to edit, resolve, invalidate, or archive a thesis.
- Dashboard creates a neutral research question from symbol and timeframe; it does not yet bind a specific market driver as a hypothesis.
- Direct navigation without thesis context retains existing page defaults.
- Artifact search does not yet filter by thesis id.
- Market Memory preserves only compatible existing thesis metadata and cannot recover intent from legacy artifacts.
