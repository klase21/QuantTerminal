# Rolled-Back Serving Candidate Retry

## Purpose

A candidate with immutable activation history is retryable only when the latest active exposure selects the verified rollback corpus and every candidate activation has exactly one later, linked rollback.

## Invariants

- The original never-activated path still requires zero historical candidate exposures.
- Retry approval is a separate typed operation.
- Retry approval binds candidate, watermark, member set, prior activation, prior rollback, current rollback exposure, rollback corpus, pin checksum, deployment, target, operator, commit, and expiry.
- Retry lineage is derived from immutable migration-005 events, authorization consumption, and append-only exposures.
- Every candidate exposure must resolve to one activation event and every activation must resolve to one later rollback event.
- The current active exposure must be the bound rollback exposure and must select the bound rollback corpus/checksum.
- Activation compare-and-swap uses that current rollback exposure.
- Preview selection requires the same unexpired retry approval and lineage proof.

## Failure Behavior

Current selection, unresolved activation, ambiguous lineage, stale rollback exposure, changed candidate data, wrong rollback corpus, event checksum mismatch, or approval-binding mismatch fails closed. Historical rows are never updated or deleted.

## Schema

No migration 006 is required. Migration 005 already stores immutable activation/rollback linkage, request IDs, authorization consumption, target identity, checksums, exposure linkage, and approval artifact checksums. Retry-specific identities are cryptographically bound in the immutable approval artifact map.
