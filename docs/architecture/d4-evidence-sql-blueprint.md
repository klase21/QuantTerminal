# D4 Evidence SQL Blueprint

## Migration Inventory

1. 001_consistency_contracts.sql
2. 002_evidence_contracts.sql
3. 003_projection_and_roles.sql

These files are unapplied blueprints. No migration runner or database client is introduced.

## Ownership

- consistency owns Rule metadata, Runs, ordered Inputs, Results, diagnostics, and recompute requests.
- evidence owns Profiles, Candidates, Packet identities/versions, exact fact and Result references, requirements, confidence components, explanation codes, supersession, and invalidation.
- projection owns consumer definitions and immutable projection versions.

The blueprint assumes certified D2 schemas and references D2 publication state and immutable governance snapshots. D4 never owns canonical facts.

## Immutability

Audit histories are insert-only. Current read state may be materialized only in later controlled procedures. Packet supersession is physically separate from lineage. No generic Packet JSON or duplicate canonical fact payload exists.

## Indexes

Indexes support known bounded reads: Run scope, input fact version, Result history, Candidate scope, current Packet version, fact lineage, and Result-to-Packet lookup. No speculative partitioning is defined.

## Roles

Role comments define Consistency Worker, Evidence Assembler, Publication Coordinator, read-only Consumer, and Migration Owner. Executable role DDL is deferred to isolated Phase 2 review.
