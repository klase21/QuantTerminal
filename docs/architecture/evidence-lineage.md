# Evidence Lineage

Core Evidence lineage is explicit and append-only:

```text
Packet -> Candidate -> Consistency Result -> exact Canonical Fact version
Packet -> assembly profile and policy version
```

The contracts also reserve `PACKET_REPLACES_PACKET` for an explicitly governed correction relationship. Phase 3A does not infer replacement or current preference merely from shared business identity; automated recompute and preferred-version selection belong to Phase 3B.

Each semantic edge has a deterministic checksum. Its PostgreSQL row identity additionally binds the Packet version so the same immutable Result-to-Fact edge may be referenced by multiple Packets without collision. This persistence identity does not alter semantic lineage or Packet content identity.

Lineage is distinct from Fact supersession, Packet replacement, dependency edges, and publication. No relation is inferred from co-location, provider tier, or timestamps alone. Reconciliation verifies exact Candidate, Result, Fact, temporal, profile, policy, checksum, and lineage bindings and reports mismatch without repair.
