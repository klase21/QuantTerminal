# Replay V2 State

Project Epsilon - Replay V2 Sprint P7  
Status: Frozen reference record  
Runtime scope: no runtime changes in this sprint

## 1. Freeze Summary

Replay Status: Reference Implementation

Freeze Status: FROZEN

Certification: PASS

Acceptance: PASS

Replay V2 is the official QuantTerminal reference implementation for historical validation. It is the canonical page for answering:

```text
Did this thesis work in comparable historical conditions?
```

Approved hierarchy:

```text
Replay Summary
  -> Validation Status
  -> Comparable Historical Cases
  -> Outcome Analysis
  -> Failure Patterns
  -> Evidence Quality
  -> Replay Metadata
  -> Navigation Actions
```

## 2. Replay Ownership

Replay owns:

- historical validation;
- comparable historical cases;
- outcome analysis;
- failure modes;
- replay metadata;
- validation context.

Replay does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Research evidence generation;
- Trade execution.

Replay inherits upstream context. It must not recreate upstream conclusions, evidence, narratives, opportunities, rankings, or execution plans.

## 3. Accepted Limitations

These limitations are accepted from Replay Certification and Replay Acceptance. They are not defects in the frozen baseline.

- Comparable cases depend on inherited selected historical case context.
- Comparable cases are display-only and unavailable when no selected historical case is inherited.
- Validation Status depends on existing replay data availability; there is no standalone validation engine.
- Failure Patterns may be unavailable when no comparable failure-pattern dataset is loaded.
- Orderbook remains manual/cache-based and must not block Replay.
- Orderbook status may be partial or degraded; Replay does not claim complete deterministic orderbook replay.
- Navigation handoffs are compact links, not rich immutable handoff payloads.
- The legacy `If You Traded It` terminology is retained until future language normalization.
- Existing replay data availability depends on CryptoHFTData coverage, Binance fallback availability, cache state, and selected window support.
- Flow Replay artifacts exist elsewhere in the architecture but are not consumed by Replay V2.
- `NO DATA` remains an allowed legacy unavailable metric label pending future badge/language normalization.

## 4. Future Roadmap

Backlog only. This section does not define implementation.

### Post-Freeze Improvements

- Richer Replay handoff payloads from Research and into Trade.
- Language normalization for execution-adjacent labels such as `If You Traded It`.
- Badge normalization for `NO DATA`, `MISSING`, and `UNAVAILABLE` where source reason is known.
- Section-level handoff clarity for compact navigation actions.

### Future Intelligence

- Future validation intelligence that remains source-backed and non-synthetic.
- Future comparable-case outcome coverage.
- Future failure-pattern evidence when durable comparable outcomes exist.

### Future Data Sources

- Expanded replay source coverage where real data exists.
- Improved orderbook cache/checkpoint architecture outside request handlers.
- Flow Replay consumption if promoted into the Replay runtime through a dedicated sprint.

### Future UX

- Context-preserving Replay-to-Trade handoff.
- Clearer selected-case continuity from Research.
- Responsive and accessibility review after any documented post-freeze changes.

## 5. Freeze Policy

Replay V2 is frozen.

Future Replay V2 runtime changes are permitted only for:

- objective implementation defects;
- objective bugs;
- Design System violations;
- documented product requirements;
- approved post-freeze roadmap items.

Explicitly prohibited:

- subjective redesigns;
- aesthetic-only changes;
- undocumented feature additions;
- hierarchy drift;
- new APIs without a dedicated sprint;
- synthetic validation or scoring;
- generated narratives;
- historical matching changes;
- Dashboard, Markets, Scanner, Research, or Trade ownership leakage.

Substantial future changes must occur through Replay V3 or a dedicated Replay improvement sprint.

## 6. Validation

Freeze validation:

- `docs/project/replay-v2-state.md` exists.
- No runtime code changed in Sprint P7.
- No Dashboard, Markets, Scanner, or Research files changed in Sprint P7.
- No package changes in Sprint P7.
- No build required.

Replay V2 remains the canonical historical validation reference until superseded by a documented future sprint.
