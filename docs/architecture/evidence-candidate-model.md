# Evidence Candidate Model

## Boundary

An Evidence Candidate is a deterministic, consumer-neutral adaptation of one certified immutable Consistency Result. It is not a Fact, Result, Packet, projection, publication, confidence score, narrative, or recommendation.

Candidate normalization binds the subject and topic, assigned Evidence role, exact Result identity and checksum, Rule and RuleSet versions, Event-Time window, Knowledge-Time mode and cutoff, exact inherited Fact versions, policy versions, dependency snapshot reference, and bounded diagnostic codes. Canonical serialization sorts semantically unordered Facts, policies, and diagnostic codes before hashing.

## Governed Roles

Only a versioned assembly profile assigns `SUPPORTING`, `CONFLICTING`, `CONTEXTUAL`, or `BLOCKING`. `MISSING`, `UNSUPPORTED`, and `INAPPLICABLE` are explicit requirement states and are never converted to candidates, zero values, or one another. An unrecognized Result-to-role mapping fails closed.

Provider tier, Result count, UI route, execution time, and generated prose cannot assign a role or participate in identity. Supporting evidence never hides conflicting evidence.

## Temporal Gate

The assembly request and every selected Result must agree on Event Time and Knowledge Time. `AS_KNOWN_THEN` rejects any inherited Fact with `knowledgeAvailableAt` later than the bound cutoff. Mixed modes, cutoffs, or time windows fail closed. Exact record ID, positive record version, checksum, publication state, supersession state, and lineage identity remain attached to every inherited Fact reference.

## Identity

Candidate identity is the SHA-256 checksum of normalized immutable candidate material. Equivalent input order produces the same identity. A changed Result, Fact version, role, policy, temporal binding, or assembly policy produces a different identity. Same identity plus different immutable checksum is a conflict, never a duplicate.
