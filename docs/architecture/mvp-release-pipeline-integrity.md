# MVP Release Pipeline Integrity

## Scope

The MVP incremental release path uses D2 canonical persistence and D3 Population
orchestration in separate PostgreSQL transactions. The system therefore makes
no distributed-transaction claim. Correctness comes from fenced ownership,
deterministic identities, append-only submission events, and D2 readback.

## Lease Boundary

Every live-release mutation carries the Population Unit ID, lease ID, owner,
monotonic fencing token, and operation timestamp. The D3 adapter validates those
values in the same transaction as bounded retrieval and Candidate persistence,
submission preparation, outcome recording, checkpoint advancement, and Unit
state changes.

A lease is stale when it is released, cancelled, superseded, or when
`expires_at <= operation_time`. Reclaim creates a new lease identity and a
higher fencing token. An expired worker cannot heartbeat, add bounded lineage,
prepare a canonical submission, record an outcome, advance a checkpoint, or
complete the Unit.

## Canonical Reconciliation

The durable sequence is:

```text
SUBMISSION_PREPARED
-> D2_COMMIT_REQUESTED
-> COMMIT_RESULT_RECONCILED
-> POPULATION_OUTCOME_RECORDED
-> CHECKPOINT_RECORDED
```

Submission identity binds the Unit, Candidate, D2 idempotency key, expected
canonical record/version/checksum, raw manifest, and command checksum. A timeout
or connection interruption is reconciled by reading D2 with the deterministic
canonical identity before any resubmission. A matching existing version maps to
one logical duplicate outcome. A checksum mismatch is a visible conflict.
Unknown state remains retryable and cannot advance the checkpoint.

Submission lifecycle events are append-only. Existing Population and canonical
history is not rewritten.

## Provider Snapshot Ordering

The live release adapter verifies the exact immutable dataset, provider,
certification, and policy snapshots before raw registration. The resulting
provider snapshot identity is reused by the raw manifest, Retrieval Attempt,
Candidate, and D2 command. Missing or mismatched governance fails before
dependent persistence; placeholder snapshots are not permitted.

## Recovery

Reconciliation reports incomplete sequences such as a D2 result without a
Population outcome or an outcome without a checkpoint. It does not fabricate
lineage. A provable D2 result may be completed only through the deterministic,
fenced append-only sequence above.
