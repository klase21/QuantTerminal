# Incremental Consistency Recompute

Recompute request identity binds the changed-node impact, affected graph snapshot, Event-Time window, Knowledge-Time mode and cutoff, recompute policy version, and target Result identities. Worker, attempt, execution time, retry count, and prose are excluded.

Correction impact may be discovered against the prior snapshot while the request and plan bind a distinct replacement snapshot containing the new exact Fact version. This prevents an old dependency declaration from leaking V1 inputs into a V2 recomputation.

Plans contain only impacted Rule versions. Steps are deterministically topologically ordered and bind exact Fact nodes, policy nodes, prior Result nodes, and upstream step identities. Unaffected Rules are recorded as skipped. No-impact, incomplete graph, cycle, and invalid dependency remain closed fail-closed outcomes.

The PostgreSQL store atomically persists a request, plan, and every step. Claims and terminal events are append-only. One claim owns a step; dependencies must complete before a downstream Result can be linked. Result linkage and successful completion share one transaction. Completion racing with cancellation/failure yields one terminal event and cannot retain a false Result link.

The existing Phase 2A Run and Phase 2B Result stores remain the execution and immutable Result boundaries. Phase 2C does not create a second Rule engine. Crash lease/reclaim and physical role-grant certification remain Phase 2V responsibilities.
