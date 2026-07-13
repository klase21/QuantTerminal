# D3 Phase 3 Integrated Migration Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial staged files: none
- Initial worktree: existing D2/D3 Phase 3 changes and inherited D4 changes present
- Inherited D4 changes: untouched
- Package and lockfiles: unchanged

## Target Preflight

| Item | Result |
|---|---|
| Host | `localhost` |
| Port | `55432` |
| Database | `quantterminal_backfill` |
| D2 role | `qt_d2_backfill_owner` |
| D3 role | `qt_d3_backfill_owner` |
| Authentication | PASS for both roles |
| Integrated profile | PASS |
| Object root | `D:\\QuantTerminalData\\raw-artifacts` |
| Object-root safety/write probe | PASS |
| Free capacity | 667807363072 bytes |

No full connection string, password, or signed credential was logged or stored.

## D2 Migration Results

| Migration | Checksum | First run | Rerun |
|---|---|---|---|
| `001_control_and_raw.sql` | `564f40851b4a36462daababd88ec725908f767897bf697873e846a7d52ed1f9f` | APPLIED | SKIPPED |
| `002_repository_lifecycle.sql` | `ef40fddfe0a566bfadf1ac18c1b8fc217c5677ae887bc08cab9d1a1bc10d6cd5` | APPLIED | SKIPPED |
| `003_canonical_fact_tables.sql` | `fb6f0c11e349fadab3fa5ae07ee8f0ecd0a860175992962a727e264f7ba34188` | APPLIED | SKIPPED |
| `004_governance_and_read_models.sql` | `3466a2ad2728ea905a39d3e539477d2b3e3c215560c6e2598d21f51f63a310ee` | APPLIED | SKIPPED |

The D2 ledger is complete and owned by `qt_d2_backfill_owner`. Catalog inspection confirmed D2 ownership of Canonical, Repository, raw-object, lineage, publication, outbox, governance, and quarantine objects. Authoritative fact and envelope counts remained zero after migration; no fixtures were inserted.

## D3 Migration Results

| Migration | Checksum | Result |
|---|---|---|
| `001_population_control_plane.sql` | `ce8d7f6a18221fb303a0d6cec5983d97bd59765ce5de2155634461ed6d8c2e67` | APPLIED |
| `002_population_roles.sql` | `15282384709e595158a1da55fe34b185f833f32389ed95a121ac2d8f0516e978` | FAILED: permission denied to create role |

The D3 ledger contains only `001`. Migration `002` did not produce a successful ledger row and none of its grants survived. The runner preserved the redacted message but did not expose SQLSTATE in its migration result; a bounded reproduction of the exact required `CREATE ROLE` operation returned SQLSTATE `42501` (`insufficient_privilege`).

The checked-in migration executes `CREATE ROLE` inside `DO` blocks. Precreating the NOLOGIN roles does not remove PostgreSQL's statement-level `CREATEROLE` authorization check. This proves that temporary role-administration authority is required by the unchanged migration.

## Temporary Grants And Revocation

The D3 migration owner received only the prerequisites derived from committed SQL: temporary database/shared-schema `CREATE`, exact D2 schema `USAGE`, and `REFERENCES` on the six D2 target tables. Temporary database and schema `CREATE` were revoked after the failure. No superuser, permanent `CREATEROLE`, D2 fact mutation, D2 ownership, or D2 ledger mutation was granted.

## Foreign-Key Certification

- Expected D3-to-D2 constraints: 16
- Live D3-to-D2 constraints: 16
- Missing or unexpected: 0
- Validated: 16 of 16
- `ON UPDATE`: `NO ACTION` for all
- `ON DELETE`: `NO ACTION` for all
- Source ownership: `qt_d3_backfill_owner`
- Target ownership: `qt_d2_backfill_owner`

Targets comprise `raw.objects`, `control.provider_snapshots`, `control.policy_versions`, `control.canonical_commits`, `quarantine.conflicts`, and `quarantine.candidates`. No copied D2 object or cross-database workaround exists.

## Privilege Probes

All probes used the actual D3 login; mutating probes were forced to roll back if unexpectedly allowed.

| Probe | Result | SQLSTATE |
|---|---|---|
| Read `canonical.ohlcv` directly | DENIED | `42501` |
| Insert `canonical.ohlcv` directly | DENIED | `42501` |
| Update `canonical.ohlcv` directly | DENIED | `42501` |
| Delete `canonical.ohlcv` directly | DENIED | `42501` |
| Alter D2 Canonical table | DENIED | `42501` |
| Modify D2 migration ledger | DENIED | `42501` |
| Self-grant D2 access | DENIED | `42501` |

Runtime scheduler/coordinator/worker/read-only grants could not be certified because migration `002` did not apply.

## Reconciliation

| Check | Result |
|---|---|
| D2 ledger/checksums | PASS |
| D3 ledger/checksums | PARTIAL: `001` present, `002` absent after failure |
| D2 ownership | PASS |
| D3 `001` object ownership | PASS |
| Live FK inventory | PASS |
| Temporary privilege revocation | PASS |
| Runtime role grants | BLOCKED by migration `002` |
| Integrated migration consistency | FAIL CLOSED |

## Canary Decision

The real Canary was not started. The task contract requires migration reconciliation to pass before provider access and explicitly requires stopping after a D3 migration failure. Consequently all Canary, rerun, correction, failure-injection, and unknown-outcome live counts remain zero or not run.

## Validation

- TypeScript: PASS
- D1 contract regression: PASS
- D2 Phase 1: PASS
- D2 Phase 2 unit: PASS
- D2 durable boundary: PASS
- D3 Phase 1: PASS
- D3 Phase 2 unit: PASS
- D3 Phase 3 enablement: PASS
- D3-to-D2 commit boundary: PASS
- Integrated topology: PASS
- D2 live migration/reapply: PASS
- D3 live migration: FAIL at `002`
- Live FK inventory: PASS
- D3 direct-mutation denial probes: PASS
- Runtime-role allow/deny certification: BLOCKED
- Real OHLCV Canary and rerun: NOT RUN

## Remediation

An administrator granted `CREATEROLE` temporarily to `qt_d3_backfill_owner`, the ordinary D3 runner executed the complete unchanged artifact, and a `finally` boundary restored `NOCREATEROLE`. Migration `002` progressed past role creation but failed with SQLSTATE `42501` at `REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC`, because the shared schema contains D2-owned tables including `control.migration_ledger`.

The migration transaction rolled back completely: `002` remains absent from the D3 ledger, runtime roles have no explicit grants or memberships, D2 ownership is unchanged, and all 16 cross-owner foreign keys remain validated. The D3 owner is confirmed non-superuser, `NOCREATEROLE`, `NOCREATEDB`, non-replication, and without `BYPASSRLS`.

The smallest bounded next change is an administrator-only migration runner that checksum-validates and executes the entire unchanged `002` artifact plus the D3 ledger insert in one transaction. It must use the local container administrator without adding a runtime connection string. After application, the ordinary D3 runner must report both migrations `SKIPPED`, and the full role/grant reconciliation must pass before Canary execution.

## Final Administrative Resolution - 2026-07-13

The previous failure above is preserved as history. `workers/data-platform/runD3AdministrativeRoleMigration.ts` now provides a fixed-purpose local-container boundary. It validates the integrated profile, exact host/port/database, preexisting role safety, the complete migration artifact, and SHA-256 before sending one transaction to container-local `psql`. It has no configurable administrator URL, stores no credential, and cannot target another database.

- Applied migration: `002_population_roles.sql`, unchanged
- SHA-256: `15282384709e595158a1da55fe34b185f833f32389ed95a121ac2d8f0516e978`
- Ledger operation: same transaction as the complete migration
- D3 ledger: `001`, `002`, distinct from the four-entry D2 ledger
- Ordinary D3 rerun: `001 SKIPPED`, `002 SKIPPED`, repeated twice with stable ledger
- D3 owner: login, non-superuser, `NOCREATEROLE`, `NOCREATEDB`, non-replication, no `BYPASSRLS`
- Four support roles: `NOLOGIN`, no elevated attributes
- Membership edges involving D3 roles: 0
- D3-to-D2 foreign keys: 16 live, 16 validated
- Unexpected D3-owned objects: 0

Essential live probes passed. Coordinator and Worker approved D3 operations/read boundaries succeeded. Direct D2 Fact mutation, D2 schema alteration, D2 ledger mutation, role creation, and privilege escalation were denied with SQLSTATE `42501`. The read-only role could select approved objects and was denied mutation with SQLSTATE `42501`.

Migration reconciliation is now `consistent=true`. No D2 migration, D2 ownership, D4 object, package file, lockfile, or environment file was changed by this resolution.
