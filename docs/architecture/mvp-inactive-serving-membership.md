# Immutable Inactive Serving Membership

Status: local PostgreSQL migration and rollback certification complete.

Migration `003_inactive_candidate_membership.sql` adds append-only `serving_corpus_member` and `serving_candidate_manifest` relations. Membership records Projection, Evidence summary, Replay snapshot, demo profile, supplemental context, release inventory, and release manifest identities with checksums, canonical sort keys, source-corpus linkage, schema version, and bounded metadata.

The candidate checksum is derived from canonically sorted membership, governed-through, and schema version. Duplicate logical identities or sort keys are rejected. A candidate that omits any required active member is blocked before insertion. Exact membership comparison reports retained, added, superseded, and removed identities by kind; unexpected deletion is always blocking.

`LocalInactiveCandidateAssemblyService` accepts only the local isolated `mvp_serving_publisher` client. In one serializable transaction it verifies active exposure, compares exact membership, inserts a `WITHHELD` / `INTERNAL_ONLY` header, inserts immutable members, writes previous-corpus manifest linkage, and verifies exposure is unchanged. It has no activation operation.

Fault injection after header, members, and manifest each rolled back completely. No fixture corpus, member, or manifest remained, and the single active exposure was unchanged. UPDATE of membership was rejected by the immutable trigger. The local serving database remains one published corpus, zero inactive corpora, and one active exposure.

Migration `001` has one explicit certified legacy checksum alias because commit `9c68f14` removed only its trailing blank line after initial application. The original applied checksum is pinned; all other drift still fails closed. Migration `003` applied locally and an exact rerun returned `SKIPPED`.
