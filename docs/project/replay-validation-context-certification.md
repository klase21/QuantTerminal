# Replay Validation Context Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D20  
**Implementation under review:** D19 - Replay Validation Context  
**Decision:** CERTIFIED WITH LIMITATIONS

## 1. Certification Scope

This certification reviews only the D19 shared-context continuity path into
Replay:

```text
Markets context
  -> Scanner opportunity/signal handoff
  -> Research thesis/evidence handoff
  -> Replay read-only validation context display
```

It does not certify or introduce a validation engine, historical matcher,
comparable-case generator, score, outcome generator, or execution workflow.
Replay datasets remain independent of shared context.

## 2. Context Certification

**Decision: PASS**

Replay consumes only fields already present in the validated Shared Product
Context:

- thesis title and question;
- evidence summary coverage/freshness and supporting/conflicting counts;
- source-backed Scanner confidence when present;
- canonical context freshness;
- Markets-owned market structure, sector, and breadth when preserved upstream;
- Research-owned replay target as the investigation state;
- symbol, exchange, and timeframe through the existing handoff and investigation
  URL contract.

Replay displays these values without modifying their wrapper owner, source,
observation time, freshness, or revision. Missing fields remain `UNAVAILABLE`.
The inherited context badge becomes `CURRENT` only when canonical freshness is
`CURRENT` and both thesis and evidence are present. Unknown or incomplete
context remains `PARTIAL`; unavailable freshness remains `DEGRADED`.

## 3. Ownership Certification

**Decision: PASS**

### Scanner

- Scanner creates only Scanner-owned opportunity, signal, confidence, and
  Scanner freshness context from existing candidates.
- Scanner does not create a thesis, Research evidence, validation result,
  replay result, or execution context.
- Markets-owned `marketStructureContext` is forwarded unchanged; Scanner does
  not rewrite it or claim ownership.

### Research

- Research creates Research-owned thesis, evidence summary, supporting
  evidence, conflicting evidence, freshness, and replay-target context from
  already loaded Research data.
- Existing Scanner and Markets wrappers are forwarded unchanged when present.
- Research does not create a validation result, replay result, or execution
  context.

### Replay

- Replay presents inherited context and its own dataset availability.
- Replay does not generate or rewrite Research evidence.
- Replay owns only its display-level validation/replay availability when the
  user explicitly hands existing Replay state to Trade.
- Replay does not create entries, exits, sizing, risk, or execution context.

Ownership follows the wrapper `owner` field rather than the page transporting
the wrapper. Passthrough does not transfer ownership.

## 4. No-Fabrication Certification

**Decision: PASS**

D19 contains:

- no validation score;
- no synthetic confidence;
- no generated comparable cases;
- no fake replay outcome;
- no placeholder historical match;
- no inferred thesis;
- no inferred supporting or conflicting evidence.

The displayed confidence is an existing Scanner candidate value. The selected
investigation target is an existing Research-selected replay case. Replay
continues to state explicitly that no separate validation score is generated.

## 5. Compatibility Certification

**Decision: PASS**

Static D19 diff review confirms no changes to:

- Replay exchange, symbol, date, or hour controls;
- chart loading, candle transformation, or chart rendering;
- orderbook manual-load/cache behavior;
- open-interest loading or Binance positioning fallback;
- funding loading or display;
- liquidation loading, aggregation, or display;
- Replay dataset selection or sequencing;
- Replay API paths, request parameters, timeouts, or abort handling;
- polling, WebSocket behavior, or package dependencies.

The protected orderbook path remains manual and non-blocking. D19 adds only
handoff preservation, status derivation, and read-only context presentation.

## 6. Fallback Certification

**Decision: PASS**

- Missing `contextId`: inherited context is `UNAVAILABLE`; direct Replay
  controls and loading remain available.
- Missing session storage record: structured load failure becomes
  `UNAVAILABLE`; Replay continues normally.
- Expired context: lifecycle validation rejects activation and Replay displays
  `UNAVAILABLE`.
- Invalid schema, timestamps, source page, or destination intent: context is
  rejected or degraded without throwing and without replacing data.
- Partial context: available fields render; missing fields remain
  `UNAVAILABLE`.

D20 corrected the direct-entry inherited-context label from `MISSING` to
`UNAVAILABLE`. This is a display-state correction only and does not alter
Replay loading or navigation.

## 7. Known Limitations

1. A valid Research-to-Replay handoff and matching browser session storage are
   required for resolved inherited context.
2. Direct Replay entry correctly has unavailable inherited context.
3. Context is session-scoped and cannot be reconstructed from `contextId`
   alone in another browser or session.
4. Context remains snapshot-based per handoff rather than one merged context ID.
5. No validation engine was added.
6. No historical matching was added.
7. No comparable cases or outcomes are generated when source data is absent.
8. Replay validation status still depends on explicitly loaded Replay evidence.

These limitations are intentional safeguards against ownership leakage and
fabricated validation.

## 8. Certification Decision

**CERTIFIED WITH LIMITATIONS**

D19 safely improves context continuity without expanding Replay intelligence.
Valid inherited context now exposes thesis, evidence, confidence, freshness,
market structure, and investigation target while unavailable context remains
explicit. Replay controls and datasets are unchanged.

The requirement for a valid session-scoped handoff and real Replay evidence is
an accepted limitation, not a defect.

## 9. Validation Record

Certification validation includes:

- TypeScript compilation;
- Dashboard integration audit;
- intelligence smoke tests;
- production build;
- static context ownership and passthrough review;
- static no-fabrication scan;
- protected Replay diff review for controls, datasets, APIs, orderbook,
  positioning, funding, liquidations, polling, and execution changes;
- fallback-state review for missing, expired, invalid, and direct-entry context.

Final command results are recorded in the Sprint D20 completion summary.
