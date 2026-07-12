# Population Leases and Checkpoints

The approved model is a PostgreSQL row lease with `FOR UPDATE SKIP LOCKED` and a monotonic per-Unit fencing token. Claim atomically selects an eligible Unit, increments its token, creates the lease, updates materialized state, and appends an event.

Heartbeat and state advancement require Unit, owner, and the exact current token. Expired or reclaimed tokens fail closed. Lease expiry never undoes a successful D2 commit; recovery reconciles D2 before recording a missing outcome.

## Checkpoint Ordering

```text
raw object durable + manifest verified -> RAW_BOUNDARY
candidates durable                    -> CANDIDATE_BOUNDARY
D2 result and outcome durable         -> CANONICAL_BOUNDARY
```

Checkpoints reference Job, Run, Unit, token, completed stage, manifest, candidate cursor, canonical submission, and last durable outcome. Arbitrary byte offsets are disallowed unless a provider format defines a deterministic governed cursor.

PostgreSQL advisory locks alone lack durable fencing. External queue leases are not introduced. A future hybrid queue may accelerate delivery but cannot replace PostgreSQL ownership.
