# Consistency Dependency Graph

## Boundary

D4 owns an immutable, version-aware dependency graph. It does not copy D2 Facts or mutate D2, D3, Results, Evidence, Projection, or consumers. Nodes are logical references to exact immutable objects.

Approved nodes are `CANONICAL_FACT_VERSION`, `RULE_VERSION`, `RULESET_VERSION`, `TEMPORAL_ALIGNMENT`, `CONSISTENCY_RESULT`, and `POLICY_VERSION`. Node identity is derived from kind, object identity, and exact version. Its checksum additionally binds sorted bounded metadata.

Approved dependency edges point from prerequisite to dependent. Edge identity binds kind and endpoints; the immutable checksum additionally binds the governing policy version. This lets the store distinguish an idempotent duplicate from incompatible content under the same semantic edge identity.

`RESULT_SUPERSEDES_RESULT` is a separate relation type. It is excluded from dependency traversal and validated for cycles independently. It is not lineage, replacement, or publication.

## Snapshots

A snapshot binds sorted node identities and checksums, sorted edge identities and checksums, completeness, missing-node identities, and graph schema version. Creation time, worker identity, insertion order, and prose are excluded. Incomplete snapshots remain explicitly incomplete and cannot authorize recomputation.

Database rows are append-only. Foreign keys enforce endpoints, checks reject self edges, bounded indexes support prerequisite-to-dependent and dependent-to-prerequisite lookup, and immutable triggers reject update/delete. Runtime validation rejects invalid kind pairs and dependency or supersession cycles before persistence.
