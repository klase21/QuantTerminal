# Consistency Run Reconciliation

Reconciliation is read-only. It compares ordered event history with materialized state, reconstructs specification checksum, checks event sequence continuity, terminal timestamps, completion-summary presence, and duplicate terminal events.

It returns a boolean, closed reason codes, and affected Run identities. It never repairs state. Unknown write outcomes must be resolved by reading the deterministic Run and event identities, then reconciling before retry.
