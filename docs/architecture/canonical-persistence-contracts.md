# Canonical Persistence Contracts

## Boundary

D2 canonical persistence is additive. It does not replace `lib/persistence`, SQLite, the generic PostgreSQL adapter, APIs, or consumers. Phase 1 defines contracts and unapplied schema artifacts only; it opens no database connection.

## Canonical Identity

```text
Ordered dataset business fields
  -> Canonical Business Identity
  -> stable Canonical Record ID
  -> positive immutable Record Version
  -> typed Physical Fact Row
```

The Canonical Record ID is stable across corrections. A correction increments the record version and creates a new physical fact row. The idempotency key converges retries but is never canonical identity. Canonical Commit IDs are deterministic hashes of idempotency key, canonical record ID, record version, and checksum; the same retry therefore addresses the same commit attempt without randomness or environment input.

Provider identity participation is dataset-specific:

| Dataset | Provider in business identity | Reason |
|---|---:|---|
| OHLCV, Funding | No | Venue, instrument, cadence/event time define the canonical observation; provider correction must retain identity |
| Open Interest, Liquidation | Yes | Provider/venue semantics and provider event IDs define the observation |
| Prediction, ETF, Reserve, Macro | Yes | Provider-specific market, instrument, series, and publication semantics are not interchangeable |
| AggTrade/Orderbook manifests | Yes | Provider stream and archive window identify the source artifact |

Identity inputs are explicit ordered tuples and use D1 canonical timestamp and identifier normalization. They contain no clock, environment, random value, URL, display order, or mutable label.

## Canonical Commit

The initial contract permits exactly one record version per Canonical Commit. This minimizes lock scope and makes duplicate/conflict outcomes deterministic. A D3 Population Job may produce many independent commits.

One transaction associates the commit, typed fact, Repository envelope, record version, required lineage, initial `PENDING` decision, and outbox event. Any failure rolls back the complete unit. Projection and Evidence work occur after commit through the outbox.

Logical sequence:

1. Validate immutable registry, provider, certification, policy, schema, and normalization bindings.
2. Verify the content-addressed raw manifest.
3. Derive deterministic business and canonical identities.
4. Lock the current record-version boundary.
5. Compare identity, version, and checksum.
6. Return `DUPLICATE` only for identical immutable content.
7. Quarantine and return `CONFLICT` for different immutable content at the same boundary.
8. Insert the commit, fact, envelope, version, lineage, initial decision, and outbox event.
9. Commit atomically.

Deadlocks and serialization failures retry with the same idempotency key. Connection interruption is retryable only after reading the deterministic commit identity to resolve an unknown commit outcome. Concurrent identical inserts converge on `DUPLICATE`; competing corrections lock the predecessor, and the losing correction is quarantined as ambiguous.

## Commit Results

The public result is a closed union: `SUCCESS`, `DUPLICATE`, `CONFLICT`, `REJECTED`, or `RETRYABLE_FAILURE`. Conflict is never a duplicate. Rejection denotes invalid bindings, identity, raw verification, or other non-retryable contract failure.

## Publication

Publication decisions are append-only. `record_versions.current_publication_state` is a bounded read projection, not historical truth. Its only authorized mutation path is a controlled transaction helper that locks the version, validates the legal transition, appends the decision event, and updates the projection atomically.

Legal transitions are only:

```text
PENDING -> CERTIFIED | REJECTED
CERTIFIED -> PUBLISHED | REJECTED
PUBLISHED -> SUPERSEDED | REVOKED
```

All terminal states fail closed. Facts are never deleted to model publication.

## Supersession

Supersession is distinct from lineage. It requires the same Canonical Record ID, a greater successor version, unique predecessor and successor boundaries, and a separate successor commit. Monotonic version edges prevent cycles locally. A unique predecessor constraint prevents silent correction branching. The predecessor stays published until the successor is published, at which point a controlled transaction appends its `SUPERSEDED` decision.

## Lineage

D2 lineage permits only:

```text
RAW_OBJECT -> CANONICAL_FACT -> PROJECTION_VERSION -> EVIDENCE_PACKET
```

Edges are append-only and reject self edges, reverse pairs, unsupported node types, and supersession. Local checks run in TypeScript and SQL. A later asynchronous consistency audit performs graph-wide cycle and orphan detection; Phase 1 does not introduce recursive triggers.

## Governance Binding

Every commit, fact, envelope, and record version stores exact immutable dataset registry, provider registry, provider certification where applicable, policy, schema, and normalization references. These never resolve to `latest`. Missing or invalid references fail before commit, and PostgreSQL foreign keys reject unknown snapshots.

## Immutability and Roles

| Role | Intended privilege |
|---|---|
| Application read-only | Bounded published read models only |
| Bounded application writer | Approved helper procedures only; no direct fact mutation |
| External canonical worker | Canonical commit transaction and quarantine paths |
| Migration owner | DDL and controlled grants; never used by application runtime |

Runtime roles receive no `DELETE` on commits, facts, envelopes, versions, decisions, lineage, or supersessions. They receive no arbitrary `UPDATE` on fact domain columns or checksums. Phase 1 defines this policy but creates no credentials or grants.
