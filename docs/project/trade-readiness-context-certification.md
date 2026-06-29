# Trade Readiness Context Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D22  
**Date:** 2026-06-28  
**Scope:** D21 Trade Readiness Context implementation  
**Decision:** CERTIFIED WITH LIMITATIONS

## Certification Summary

The D21 implementation correctly extends the Replay-to-Trade handoff with
available upstream context and presents that context read-only inside Trade's
existing Execution Readiness section. Inherited context does not participate
in candidate selection, execution calculations, setup tracking, outcome
memory, sizing, risk calculation, or readiness scoring.

Two objective certification defects were corrected during D22:

1. Trade now displays inherited confidence when a real scalar value exists in
   `confidenceContext` or the inherited opportunity context.
2. A context with a non-Replay source or non-Trade destination is now
   `UNAVAILABLE`, rather than `DEGRADED`.

No API, package, fetch, polling, execution, sizing, risk, or validation logic
was introduced.

## 1. Shared Context Certification

**Decision: PASS**

| Context field | Certification evidence |
| --- | --- |
| Symbol | Read directly from the validated shared context envelope; absent values display `UNAVAILABLE`. |
| Exchange | Read directly from the validated envelope; no exchange is inferred from the selected candidate. |
| Timeframe | Read directly from the validated envelope; no default timeframe is substituted. |
| Thesis | Replay forwards an inherited Research thesis when available; Trade reads only its title. |
| Evidence summary | Replay forwards the inherited evidence wrapper; Trade displays its existing coverage, freshness, or status field. |
| Opportunity | Replay preserves inherited Scanner opportunity context; Trade displays an existing setup, direction, or status value only. |
| Signal | Replay preserves inherited Scanner signal context; Trade displays an existing reason, setup, direction, or status value only. |
| Market structure | Replay preserves inherited Markets structure; Trade displays existing structure, sector, and breadth fields only. |
| Freshness | Trade uses the inherited context or evidence freshness state and otherwise displays `UNAVAILABLE`. |
| Confidence | Trade displays an inherited scalar confidence value only; it does not calculate or infer confidence. |
| Replay validation context | Replay creates the validation and replay-result wrappers from its existing display state; Trade reads their status, detail, and availability without recomputation. |

Replay's handoff helper preserves optional upstream wrappers without creating
missing values. Trade loads the context by `contextId`, validates its lifecycle
state and handoff identity, and keeps all inherited values display-only.

## 2. Ownership Certification

**Decision: PASS**

Replay remains the owner of:

- validation context;
- replay metadata;
- replay outcome availability and evidence-state context.

Trade remains the owner of:

- execution presentation;
- setup presentation;
- entry and exit presentation;
- risk checklist presentation;
- execution checklist and local setup tracking.

Trade does not generate validation, Research evidence, Scanner prioritization,
or Dashboard conclusions. Its existing execution plan continues to derive from
the selected Market Movers candidate, independently of inherited Replay
context.

## 3. No-Fabrication Certification

**Decision: PASS**

The implementation contains:

- no readiness score;
- no synthetic sizing;
- no generated risk model;
- no inferred validation;
- no fake replay outcome;
- no placeholder execution plan;
- no fabricated confidence.

Replay explicitly describes loaded evidence as partial validation and states
that no separate validation score is generated. Trade preserves unavailable
user risk inputs and position sizing instead of replacing them.

## 4. Compatibility Certification

**Decision: PASS**

The following behavior remains unchanged:

- candidate selection and candidate retention;
- candidate-driven execution calculations;
- local setup tracking;
- active setup outcome memory;
- Trade V2 section hierarchy;
- direct Trade navigation;
- existing symbol query behavior;
- Replay and Trade routing behavior apart from the existing optional
  `contextId` handoff;
- existing fetch, websocket, and polling behavior.

The D21/D22 changes are limited to preserving context wrappers, lifecycle-safe
loading, status classification, and read-only display.

## 5. Fallback Certification

**Decision: PASS**

| Failure mode | Certified behavior |
| --- | --- |
| Missing inherited context | Trade displays `UNAVAILABLE` and continues normal direct-entry behavior. |
| Invalid or malformed context | Loading returns a structured failure and Trade displays `UNAVAILABLE`. |
| Expired context | Lifecycle inspection rejects activation and Trade displays `UNAVAILABLE`. |
| Wrong source or destination | Trade rejects the handoff as `UNAVAILABLE`. |
| Missing optional field | That field remains `UNAVAILABLE`; no replacement is generated. |
| Storage unavailable | Replay falls back to direct Trade navigation and Trade remains usable. |

Lifecycle validation remains non-throwing. Direct Trade entry still loads its
existing candidates, market data, execution presentation, and local setup
memory without requiring shared context.

## 6. Known Limitations

- A valid Replay-to-Trade handoff is required to resolve inherited validation
  context.
- Shared context is session-scoped and is not portable across browser sessions,
  devices, or copied URLs without the corresponding storage entry.
- Direct Trade entry may have unavailable inherited context.
- No execution engine exists.
- No sizing engine exists.
- No risk engine exists.
- No broker integration exists.
- No readiness scoring exists.

These are accepted constraints. They must not be reduced through inferred,
synthetic, or placeholder data.

## 7. Certification Decision

**CERTIFIED WITH LIMITATIONS**

D21 satisfies the audited TRD-01 context-continuity objective while preserving
the TRD-05 and TRD-06 no-fabrication boundaries. Trade can inspect verified
upstream and Replay-owned context, but that context does not manufacture or
upgrade execution readiness. The remaining limitations are explicit product
and infrastructure constraints, not certification failures.

## 8. Validation Results

- TypeScript: PASS.
- Dashboard integration audit: PASS.
- Intelligence smoke test: PASS.
- Production build: PASS.
- Runtime files changed during certification: one objective fix in
  `components/trade/TradePage.tsx`.
- API changes: none.
- Package changes: none.
