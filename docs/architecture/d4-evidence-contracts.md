# D4 Evidence Contracts

Canonical D4 contracts live under lib/data-platform/evidence-platform to avoid collision with the protected legacy lib/evidence runtime.

Evidence Candidate is an unpublished assembly proposal. Core Evidence Packet is an immutable versioned artifact. Both preserve exact fact versions, Consistency Results, separate requirement categories, confidence components, explanation codes, policy/schema bindings, and lineage.

Evidence identity is deterministic from Profile, subject, bounded time window, knowledge mode, exact fact versions, and an identity-defining policy only when declared. Generated prose never participates.

Packet versions are positive and append-only. Duplicate immutable content is distinct from conflict. Correction creates a new version and never mutates an old Packet.

The Evidence Assembly result is a closed union: ELIGIBLE, BLOCKED, DUPLICATE, CONFLICT, or RETRYABLE_FAILURE. Assembly does not publish.
