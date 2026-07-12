# Canonical Transaction Engine

## Transaction

One Canonical Commit persists one record version. The engine validates bindings and raw verification, derives deterministic identities, acquires a transaction-scoped advisory lock for the Canonical Record ID, classifies existing content, and writes the complete unit in one `READ COMMITTED` transaction:

```text
Canonical Commit
  + typed fact
  + Repository envelope
  + record version
  + required raw-to-fact lineage
  + initial PENDING decision
  + optional correction supersession
  + canonical outbox event
```

Failure injection points exist only behind explicit isolated-test authorization. They cover every boundary from commit-row insertion through the outbox. PostgreSQL rollback must leave no Canonical Commit when any injected failure occurs.

## Duplicate and Conflict

The advisory lock serializes concurrent attempts even before a record-version row exists. Same record/version and checksum returns `DUPLICATE` without another fact, event, or quarantine row. Different checksum at the same boundary commits only quarantine candidate/conflict metadata and returns `CONFLICT`; it creates no Canonical Commit or canonical outbox event.

## Corrections

An explicit correction must target the current maximum version and use exactly the next version. The predecessor is locked through the same Canonical Record ID boundary. A unique supersession predecessor prevents branching. Competing corrections elect one version; ambiguity is quarantined.

## Publication

Publication decisions remain append-only. The security-definer function locks the record version, validates a legal transition, appends a decision, updates materialized state, and appends a bounded publication outbox event atomically. Publishing a correction locks and supersedes its published predecessor before making the successor published, preserving the one-published-version constraint.

## Retry

Deadlocks and serialization failures use bounded linear backoff and the same identity/idempotency key. Connection interruption triggers deterministic commit-ID reconciliation before retry. Exhaustion returns `RETRYABLE_FAILURE`; unknown outcomes are never reported as success.

## Lineage and Reconciliation

Local SQL and TypeScript checks constrain edge direction. An explicit recursive verification query detects graph-wide cycles. Commit reconciliation compares commit, typed fact, envelope, version, initial decision, lineage, and canonical outbox counts. Projection and Evidence work are absent from this transaction.
