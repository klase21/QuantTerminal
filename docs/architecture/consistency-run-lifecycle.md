# Consistency Run Lifecycle

A logical Run is identified by the exact RuleSet version, normalized subject, Event-Time window, Knowledge-Time mode and cutoff, order-independent input-set identity, policy bindings, and execution profile. Worker identity and execution timestamps are excluded. Attempts are not introduced in Part 03.

The immutable specification is stored in `consistency.run_specifications`; incompatible content under the same Run ID is recorded in `run_creation_conflicts`. Identical creation is idempotent.

Legal transitions are `PENDING -> RUNNING|CANCELLED` and `RUNNING -> COMPLETED|PARTIAL|FAILED|CANCELLED|EXPIRED`. All terminal states are final. Start requires the exact approved RuleSet checksum and all policy identities.

Every operation locks the Run boundary and commits event plus materialized state atomically. Completion and partial states require bounded summaries; cancellation and expiration require reason codes. No retry attempt, provider, Evidence, publication, or consumer behavior is included.
