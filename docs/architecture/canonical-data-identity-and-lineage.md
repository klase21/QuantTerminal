# Canonical Data Identity and Lineage

## Identity Domains

Canonical identity distinguishes business identity, provider identity, canonical record identity, record version, lineage identity, projection identity, evidence identity, and local UI context identity. UI order, mutable labels, URLs, and random client identifiers are never fact identity.

## Deterministic Identity

Each dataset owns an identity rule declaring required fields. Identity inputs are canonically serialized with sorted keys, explicit nulls, normalized timestamps and identifiers, stable finite numbers, and deterministic nested values. SHA-256 produces checksums and identifiers from that representation.

The same normalized business identity produces the same canonical ID. A changed business identity produces a different ID. Provider corrections create a new record version with an explicit supersession edge; they do not overwrite prior facts.

## Canonical Serialization

Canonical serialization:

- sorts object keys recursively;
- preserves array order;
- represents `null` explicitly;
- rejects `undefined`, `NaN`, and infinities;
- normalizes timestamps to ISO 8601 UTC;
- normalizes governed symbol and venue identifiers;
- avoids locale-dependent formatting;
- includes schema and version inputs when the identity rule requires them.

## Lineage Chain

```text
Raw Object
  -> Normalization Run
  -> Canonical Record Version
  -> Quality Evaluation
  -> Projection
  -> Evidence Packet
  -> Canonical Scope
  -> Consumer Read Model
```

Every edge names source, destination, relationship, version, creation time, process identity, and an optional checksum or record-set digest. Supported relationships are `NORMALIZED_FROM`, `VALIDATED_BY`, `SUPERSEDES`, `PROJECTED_FROM`, `EVIDENCED_BY`, `PUBLISHED_IN`, and `CONSUMED_BY`.

## Scope Compatibility

A decision surface may not mix different canonical scope IDs or fact watermarks. Projection and evidence versions remain explicit and nullable where they do not yet exist. Missing dimensions remain `NOT_EVALUATED` or unavailable rather than receiving fabricated percentages.

## Deferred Work

D2 will map these contracts to PostgreSQL and object-storage designs. Persistence, transactional enforcement, collision handling at scale, and lineage queries are intentionally outside D1.
