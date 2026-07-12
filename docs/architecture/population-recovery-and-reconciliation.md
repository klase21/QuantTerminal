# Population Recovery and Reconciliation

Recovery uses deterministic Job/Unit/Candidate/submission identities and append-only events. A new Run resumes only `PENDING` or `RETRYABLE` Units. A committed D2 operation that lacks a Population outcome must be reconciled through D2 before any retry; lease loss does not undo the commit.

Checkpoints are durable only after their referenced boundary exists: verified manifest for raw, Candidate cursor for Candidate, and submission plus outcome for canonical. Identical checkpoint identity is idempotent. Stale tokens cannot advance checkpoints.

The adapter compares materialized Job and Unit states with the latest append-only events and reports mismatches without repair. Full lease, retry, cancellation, outcome, and watermark reconciliation queries require live certification.

Controlled crash-point and concurrent recovery proofs remain blocked until a dedicated D3 PostgreSQL target is supplied.
