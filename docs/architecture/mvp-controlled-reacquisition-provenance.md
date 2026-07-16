# Controlled OHLCV Reacquisition Provenance

## Purpose

MVP-8A.2F establishes authority for one previously unresolved logical slot without selecting or rewriting any legacy attempt. The bounded target is Binance Vision BTCUSDT five-minute OHLCV for `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)`.

## Immutable Chain

The recovery chain is append-only:

`source contract -> Retrieval -> Raw Artifact -> 288 Candidates -> canonical commit set -> 288 attributable Facts -> logical-slot reconciliation`

The source contract is derived from the committed bounded adapter, ProductionNormalizerRegistry, canonical schema migration, and repository revision. It records the daily archive class, five-minute cadence, exact interval, expected 288-row rule, implementation checksums, SHA-256 policy, finalization rule, stable-domain canonicalization contract, and provider-correction limitation. The provider returned an archive media-type spelling within the adapter's certified `zip-or-octet-stream` class rather than one of the representative exact strings; the same class rule was used by preflight and acquisition.

The refresh control plane migration adds immutable source-contract, retrieval, Candidate-set, canonical-commit-set, and logical-slot reconciliation relations. UPDATE and DELETE are rejected. Exact identity/checksum repeats are duplicates; immutable mismatches are conflicts.

## Authority Rule

Authority can be inserted only while the recovery unit holds a valid fencing lease and only after the database verifies the complete 288-Fact lineage. The canonical result must be `CREATED` or exact `DUPLICATE`; `CONFLICT` cannot establish authority. Authority insertion and verification are one serializable transaction.

The authority comes from the new provenance chain. It does not assert that the four legacy `COMMITTED` attempts are equivalent. Their disposition remains `LEGACY_COMMITTED_UNATTRIBUTABLE_NON_AUTHORITATIVE`. The evidence-free `ACQUIRED` attempt remains `ORPHANED_NO_EVIDENCE_QUARANTINED`.

## Resume Semantics

The planner resolves an explicit authority before evaluating unattributable legacy attempts. The target 24-slot dry run therefore yields one `REUSE_AUTHORITATIVE_RECOVERY_OUTPUT`, 23 `CREATE_NEW_ON_LIVE_RESUME`, and zero conflicts. Dry-run reconciliation creates no unit.

Exact recovery reruns read the existing authority and return `DUPLICATE` before payload acquisition. Failure injection before authority insertion and after insertion but before verification leaves no partial authority. A stale fencing token is rejected.

## Boundaries

MVP-8A.2F writes no source watermark, Coverage, Consistency Result, Evidence Packet, Consumer Projection, Replay snapshot, serving corpus, exposure, or Production state. The recovery run is intentionally terminal `BLOCKED` with downstream work deferred to the one-day inactive candidate cycle.
