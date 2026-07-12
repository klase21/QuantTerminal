# ADR-009 Population Orchestration

## Status

Approved by D3 Phase 0 direction and formalized in D3 Phase 1 contracts.

## Decision

Use one Population Engine with Backfill, Incremental, Correction, and Reconciliation profiles. PostgreSQL owns durable orchestration state. Execution is at least once and correctness relies on deterministic identities, immutable evidence, durable outcomes, and D2 idempotency.

Workers use fenced PostgreSQL row leases. Raw provider material is preserved before Candidate extraction. Candidates are typed and one Candidate maps to at most one D2 Canonical Commit submission. Population does not imply publication.

## Consequences

The initial implementation needs no external queue and makes no exactly-once claim. Long work runs outside Vercel request handlers. A future queue may accelerate delivery while PostgreSQL remains authoritative. Existing backfills and consumers remain untouched until separately migrated and certified.

## Phase 2 Clarification

The isolated runtime uses a dedicated `D3_ISOLATED_POSTGRES_URL`, a D3-only migration ledger, explicit reset authorization, and controlled PostgreSQL functions for claim, heartbeat, and fenced state advancement. It requires D2 schemas on the disposable D3 target but does not alter D2 migration contents or connect production consumers.
