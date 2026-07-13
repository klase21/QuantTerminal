# Consistency No-Lookahead

## Rule

Historical alignment must not use information unavailable at the immutable Run cutoff. For `AS_KNOWN_THEN`, both conditions apply independently:

1. The selected Fact version was knowable by the Knowledge-Time cutoff.
2. The Event-Time selection rule does not choose a future event where historical no-lookahead applies.

Effective time alone never establishes eligibility.

## Enforcement

- Exact Fact versions are supplied; current/latest pointers are not accepted as substitutes.
- `knowledgeAvailableAt` after the cutoff is rejected as `FUTURE_KNOWLEDGE`.
- Missing knowledge availability fails closed.
- `NEAREST_PRIOR` and `AS_OF` select only events at or before the target.
- `NEAREST_OBSERVATION` cannot select a future event in `AS_KNOWN_THEN`, even if a policy mistakenly requests bidirectional selection.
- Corrections are filtered by Knowledge Time before version selection.
- UTC-only timestamp handling prevents implicit local-time and daylight-saving changes.
- Input ordering cannot influence identity or deterministic tie-breaking.
- Window mapping does not aggregate, interpolate, forward-fill, or synthesize observations.

## Required Scenarios

The Part 04 suite verifies facts known before cutoff, delayed knowledge, late corrections, delayed ETF publication, later macro revision, provider delay, unknown daily publication time, and future nearest observations. It also verifies that `LATEST_CORRECTED` and `RETROSPECTIVE` remain explicit and distinct.

## Failure Behavior

Missing, unsupported, inapplicable, future knowledge, and invalid inputs produce separate structured reasons. None is converted to zero, neutral, false, or a fabricated observation. Failure injection at each pure-runtime boundary yields no authoritative partial write because Part 04 performs no persistence.
