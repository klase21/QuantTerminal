# Consistency Result Conflicts

## Duplicate Versus Conflict

`DUPLICATE` means the same deterministic Result identity and the same immutable checksum already exist for the same Run link. `REUSED` means the same immutable Result is valid for another Run and only a new append-only Run association is required.

`CONFLICT` means the same deterministic Result identity is presented with a different immutable checksum. The existing Result remains authoritative and unchanged.

## Audit Record

A conflict records only bounded metadata:

- deterministic conflict ID;
- Result identity;
- existing Result ID and checksum;
- incoming checksum;
- Rule ID/version;
- input-set identity;
- detection time;
- `IMMUTABLE_CONTENT_MISMATCH` reason.

No raw provider payload, credential, generated prose, or unbounded diagnostic text is stored. Repeating the same conflict is idempotent through deterministic identity and a database uniqueness constraint.

## Concurrency

Transaction-scoped advisory locking ensures concurrent identical submissions yield one `CREATED` and one `DUPLICATE`. Concurrent incompatible submissions yield one authoritative Result and one `CONFLICT`. Input order cannot create a second logical Result.

No automatic repair, latest-row selection, overwrite, deletion, Evidence eligibility, or consumer publication occurs in Phase 2B.
