# Consistency Result Persistence

## Schema

Migration `005_immutable_consistency_results.sql` adds D4-owned tables:

- `consistency.immutable_results`
- `consistency.result_run_links`
- `consistency.result_input_references`
- `consistency.result_temporal_references`
- `consistency.immutable_result_diagnostics`
- `consistency.result_conflicts`

No D2 or D3 migration is changed. Exact Fact references are logical, bounded references because the isolated D4 architecture does not establish physical cross-database foreign keys. D2-owned schemas are not recreated for convenience.

## Transaction

`ConsistencyResultStore.write` validates the immutable Run, Rule/RuleSet, policy, temporal alignment, no-lookahead, and exact selected Fact references before persistence. A transaction-scoped advisory lock serializes one deterministic Result identity.

Creation atomically inserts the Result core, every exact input link, semantic temporal reference, bounded diagnostics, and an exact Run/source-alignment link. Any injected failure rolls back every authoritative row. The store never updates Run state.

## Reuse

An identical submission for an already linked Run returns `DUPLICATE`. An identical semantic Result requested by a different valid Run appends only a Run/source-alignment link and returns `REUSED`. It does not copy the Result row. Reuse requires the same Result identity and checksum.

## Immutability

Database triggers reject `UPDATE` and `DELETE` on every Phase 2B Result-history table with PostgreSQL code `55000`. The store exposes no update/delete operation. D4 reset drops D4-owned tables and the trigger function only under the existing explicit isolated-reset authorization.

## Unknown Outcome

If the client loses certainty after commit, the store performs a bounded lookup by deterministic Result identity and checksum. A matching persisted Result plus exact Run link returns reconciled `DUPLICATE`; an unresolved state returns `RETRYABLE_FAILURE`. Unknown outcomes are never assumed successful.

## Deferred Integration

Full physical D2 read-port integration and database role-grant denial certification are deferred to Phase 2V/D5 integration certification. The tested Result transaction uses logical exact Fact references and physically enforced immutable history.
