# Population Worker Boundary

Workers claim Units through a controlled row-lock function using `FOR UPDATE SKIP LOCKED`. The claim increments a monotonic fencing token, creates a lease, updates Unit state, and appends an event atomically.

Heartbeat, checkpoints, and D2 outcome recording require Unit ID, Lease ID, owner ID, and current fencing token. Expired, reclaimed, or mismatched ownership fails closed. Cancellation prevents new claims and blocks stale completion.

The bounded test ports include an in-memory immutable object store, fixture Normalizer Registry, and deterministic D2 port. They make no provider or production storage request and are not production adapters.

Typed Candidates retain Retrieval Attempt, Raw Manifest, parser/schema versions, source identity, checksum, and separate validation/quality/normalization eligibility. One Candidate has one unique canonical submission. D2 `CONFLICT` becomes a quarantined outcome and cannot be watermark eligible.
