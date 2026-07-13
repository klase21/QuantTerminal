# D4 D2 Dependency Bootstrap

## Purpose

D4 requires D2-owned canonical schema contracts but runs in the separate `quantterminal_d4_isolated` database. The dependency bootstrap reproduces the certified D2 schema foundation from checked-in artifacts without reading or copying data from the D2 database.

## Certified Source

Baseline: `1cb1c8d:d2-canonical-persistence-v2.1`.

| Sequence | Artifact | SHA-256 |
|---|---|---|
| 001 | `001_control_and_raw.sql` | `564f40851b4a36462daababd88ec725908f767897bf697873e846a7d52ed1f9f` |
| 002 | `002_repository_lifecycle.sql` | `ef40fddfe0a566bfadf1ac18c1b8fc217c5677ae887bc08cab9d1a1bc10d6cd5` |
| 003 | `003_canonical_fact_tables.sql` | `fb6f0c11e349fadab3fa5ae07ee8f0ecd0a860175992962a727e264f7ba34188` |
| 004 | `004_governance_and_read_models.sql` | `3466a2ad2728ea905a39d3e539477d2b3e3c215560c6e2598d21f51f63a310ee` |

Missing, extra, malformed, duplicate, reordered, or byte-drifted artifacts fail closed before migration execution.

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
