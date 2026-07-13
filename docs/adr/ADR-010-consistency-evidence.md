# ADR-010: Canonical Consistency and Evidence Contracts

## Status

Accepted for isolated D4 implementation.

## Decision

D4 uses a hybrid dependency graph. Versioned Evidence Profiles declare exact fact roles and Consistency Rules. Rules produce reusable append-only Results. A consumer-neutral Core Evidence Packet references immutable D2 fact versions and Results. Consumers receive bounded projections and may not reconstruct or reclassify Evidence.

Event time and knowledge time are distinct. Packet versions are immutable. Correction creates new Results and Packet versions. Lineage and supersession are separate. Supporting, conflicting, missing, unsupported, and inapplicable Evidence remain distinct. Confidence is component-based with no Phase 1 aggregate.

Generated prose is secondary, excluded from identity, and cannot change facts, Results, classifications, confidence, lineage, or publication.

Future live D4 work must use D4_ISOLATED_POSTGRES_URL selecting quantterminal_d4_isolated and must fail closed rather than reuse D2 or D3 targets.

## Consequences

- Evidence remains reversibly queryable from conclusion codes to raw lineage.
- Consumers share facts without sharing presentation.
- Corrections preserve historical event-time and knowledge-time truth.
- Phase 2 requires isolated runtime and PostgreSQL certification before any consumer pilot.
- Proposed Rules and Profiles are not production approval.
