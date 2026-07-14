# D4 D2 Dependency Bootstrap

## Purpose

D4 requires D2-owned canonical schema contracts but runs in the separate `quantterminal_d4_isolated` database. The dependency bootstrap reproduces the certified D2 schema foundation from checked-in artifacts without reading or copying data from the D2 database.

## Certified Source

The original 001-004 foundation remains pinned to baseline `1cb1c8d:d2-canonical-persistence-v2.1`. Later additive migrations retain their own certified provenance so an existing exact 001-004 dependency-ledger prefix remains compatible while every newly accepted artifact is explicit.

| Sequence | Artifact | Certified provenance | SHA-256 |
|---|---|---|---|
| 001 | `001_control_and_raw.sql` | `1cb1c8d:d2-canonical-persistence-v2.1` | `564f40851b4a36462daababd88ec725908f767897bf697873e846a7d52ed1f9f` |
| 002 | `002_repository_lifecycle.sql` | `1cb1c8d:d2-canonical-persistence-v2.1` | `ef40fddfe0a566bfadf1ac18c1b8fc217c5677ae887bc08cab9d1a1bc10d6cd5` |
| 003 | `003_canonical_fact_tables.sql` | `1cb1c8d:d2-canonical-persistence-v2.1` | `fb6f0c11e349fadab3fa5ae07ee8f0ecd0a860175992962a727e264f7ba34188` |
| 004 | `004_governance_and_read_models.sql` | `1cb1c8d:d2-canonical-persistence-v2.1` | `3466a2ad2728ea905a39d3e539477d2b3e3c215560c6e2598d21f51f63a310ee` |
| 005 | `005_funding_event_metadata.sql` | `df94661:d2-funding-event-metadata` | `9919d859b5912df8472a510d9a42262e4b3553130f226973588eea5772c836df` |
| 006 | `006_open_interest_observation_metadata.sql` | `344d9e0:d2-open-interest-observation-metadata` | `fd68d20cd5c18bef1f1e2191d703979a958bdf6da46a11d0a8c0dd74b2738b48` |
| 007 | `007_agg_trade_facts.sql` | `4a6b1cd:d2-aggtrades-segment-storage` | `3cfe3df30f032c61f6f8d8897bb3625b9a4ba59716a6a630fa850a735229cb86` |
| 008 | `008_canonical_stream_segments.sql` | `4a6b1cd:d2-aggtrades-segment-storage` | `ef932bb8bd17924e80554728b6707f9c196cf35202e3f39c7ee15a75d84923ba` |

Missing, extra, malformed, duplicate, reordered, or byte-drifted artifacts fail closed before migration execution.

Migrations 005-008 are additive to the D2 schema foundation: they add governed Funding/Open Interest metadata, the AggTrade fact table and envelope discriminator, and Canonical Stream Segment metadata. D4 does not read those added fields or tables, so accepting the exact artifacts changes dependency bootstrap coverage without changing D4 runtime semantics.

## Ownership

| Objects | Logical owner | D4 use | Data required |
|---|---|---|---|
| `control.registry_snapshots`, `provider_snapshots`, `policy_versions` | D2 | Foreign-key governance foundation | No |
| `repository.record_versions`, `publication_state` | D2 | Canonical record and publication contracts | No |
| `canonical.*`, `raw.*`, `quality.*`, `coverage.*` | D2 | Certified schema foundation | No |
| D2 `consistency.runs/results`, `evidence.packets`, `projection.versions` | D2 | Namespace-compatible foundation | No |
| `consistency.rule_*`, D4 Evidence tables, Evidence projections | D4 | Native Part 01 contracts | No |
| `population.*` | D3 | Not used | Not applicable |

The local D2 objects remain logically D2-owned. Bootstrap grants no authority to change D2 migrations or execute D2 workflows.

## Ledger and Transactions

Each source migration and its dependency-ledger row share one PostgreSQL transaction. A failed SQL statement or failed ledger insert leaves neither migrated objects nor a success row for that migration. Compatible prefix history may resume; checksum or baseline mismatch and unledgered foundation objects fail closed.

The bootstrap ledger stores dependency owner, certified baseline, source filename and sequence, SHA-256 checksum, application time, exact D4 target identity, runner version, and status.

## Separation

The runner is constructed only with a verified D4 runtime. It never selects another URL and never discovers D3 migrations. Certification compared read-only D2/D3 snapshots before and after bootstrap, reset, and rebuild; both were unchanged. Canonical D2 tables in D4 contained zero rows after schema bootstrap.

## Reset Modes

- `D4_NATIVE_ONLY`: removes D4-native tables and native ledger; preserves D2 foundation and dependency ledger.
- `D4_FULL_ISOLATED_REBUILD`: removes D4-native objects, local D2 foundation, and both D4 ledgers; requires explicit destructive-test opt-in.

Both modes are bound to `quantterminal_d4_isolated` by the runtime safety gate.
