# ADR-008: Additive Canonical Persistence

**Status:** Accepted for D2 Phase 1  
**Date:** 2026-07-12

## Context

QuantTerminal already has protected generic SQLite and PostgreSQL Repository adapters. They provide opaque envelope durability but do not provide typed canonical facts, immutable governance bindings, checksum-aware conflict classification, atomic fact/envelope/version/lineage commits, publication history, or separate supersession.

## Decision

Introduce an additive canonical PostgreSQL persistence boundary using the existing Postgres.js dependency. Keep current Repository adapters and consumers unchanged. Use typed fact tables, immutable raw manifests, one-record Canonical Commits, append-only publication decisions, separate supersession and lineage relations, immutable registry/policy snapshots, and an outbox for asynchronous Projection and Evidence work.

SQLite remains a development adapter and migration source. Migration is one-way and parity-gated. There is no dual write or immediate cutover.

## Consequences

- Canonical writes gain explicit transactions, deterministic duplicate/conflict behavior, and database constraints.
- Corrections preserve prior versions and publication history.
- Storage and migration complexity increase because generic envelopes and typed facts coexist until D5.
- Current consumers receive no immediate benefit and no regression surface.
- Phase 2 must prove migrations, roles, transactions, and parity against an isolated PostgreSQL test environment before any production connection.

## Alternatives

An ORM was rejected because it adds generation and migration complexity without improving the required explicit constraints. Immediate Repository replacement was rejected because it couples persistence construction to consumer cutover. Dual write was rejected because it creates a second inconsistency problem before parity is certified.

## Invariants

Population is not commit; commit is not publication. Duplicate requires identical checksum. Conflict never becomes duplicate. Supersession is not lineage. Required governance bindings never resolve to latest. Facts and audit history are never silently overwritten or deleted.
