# D3 Phase 3 Role Migration Remediation Report

## Baseline

- Target: `localhost:55432/quantterminal_backfill`
- D2 ledger: migrations `001` through `004`, checksums verified
- D3 ledger: migration `001` only
- D3-to-D2 foreign keys: 16, all validated
- D3 owner before attempt: login, non-superuser, `NOCREATEROLE`, `NOCREATEDB`, no replication, no `BYPASSRLS`
- Support roles before attempt: exact `NOLOGIN` placeholders, no memberships, no owned relations, no explicit grants

The support roles were created during the earlier local administrative bootstrap. Their attributes match the four idempotent role declarations in migration `002`.

## Statement Inventory

Migration checksum: `15282384709e595158a1da55fe34b185f833f32389ed95a121ac2d8f0516e978`.

| Order | Classification | Count | Purpose |
|---:|---|---:|---|
| 1-4 | `CREATE ROLE` | 4 | Idempotently declare scheduler, coordinator, worker, and read-only as `NOLOGIN` |
| 5-7 | `REVOKE` | 3 | Remove PUBLIC schema/table privileges from `population` and `control` |
| 8-9 | Schema `GRANT` | 2 | Grant bounded schema usage |
| 10-19 | Table `GRANT` | 10 | Grant scheduler, coordinator, worker, and verifier data operations |
| 20-22 | Function `GRANT` | 3 | Permit worker claim, heartbeat, and state advancement procedures |

There are no `ALTER ROLE`, role-membership grants, database grants, sequence grants, password changes, or login grants.

## Referenced Roles

| Role | Login | Intended purpose | Existing attributes before attempt | Memberships | Owned relations | Explicit grants |
|---|---|---|---|---:|---:|---:|
| `qt_d3_scheduler` | NOLOGIN | Create and inspect Jobs | Exact | 0 | 0 | 0 |
| `qt_d3_coordinator` | NOLOGIN | Coordinate Runs and Units | Exact | 0 | 0 | 0 |
| `qt_d3_worker` | NOLOGIN | Process Units and persist bounded Population state | Exact | 0 | 0 | 0 |
| `qt_d3_read_only` | NOLOGIN | Bounded verification reads | Exact | 0 | 0 | 0 |

All four are non-superuser, `NOCREATEROLE`, `NOCREATEDB`, non-replication, without `BYPASSRLS`, and have no unexpected membership or administration path.

## Administrative Attempt

The local container administrator executed only:

1. temporary `ALTER ROLE qt_d3_backfill_owner CREATEROLE`;
2. the ordinary D3 migration runner against the unchanged checked-in migration;
3. unconditional restoration with `ALTER ROLE qt_d3_backfill_owner NOCREATEROLE` in a `finally` boundary.

No administrator URL, password, or application runtime configuration was created.

## Failure

Migration `001` correctly returned `SKIPPED`. Migration `002` failed with SQLSTATE `42501` at:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC;
```

The integrated `control` schema contains both D2-owned and D3-owned tables. The D3 migration owner cannot revoke privileges on D2-owned objects such as `control.migration_ledger`. Temporary role-management authority does not confer table ownership or schema-wide grant authority.

## Rollback And Reconciliation

- D3 ledger `002`: absent
- D3 ledger `001`: unchanged
- D2 ledger: unchanged
- Runtime-role grants from `002`: zero
- Runtime-role memberships: zero
- D3 owner `CREATEROLE`: false
- D3 owner superuser/createdb/replication/BYPASSRLS: false
- D3-to-D2 foreign keys: 16, all validated
- D2 and D3 object ownership: unchanged
- Canary/provider/filesystem mutation: none

## Required Additive Boundary

The ordinary migration runner cannot apply the authoritative migration in a mixed-owner schema. The smallest safe remediation is an administrator-only runner that:

1. accepts only `quantterminal_backfill` through the existing integrated safety gate;
2. loads and checksum-validates the checked-in `002` artifact;
3. checks that D3 ledger `001` is present and `002` is absent;
4. executes the entire unchanged migration and D3 ledger insert in one administrator transaction;
5. stores no administrator credentials and is invoked only through local container administration;
6. leaves all historical migration files unchanged;
7. proves the ordinary D3 runner subsequently skips `001` and `002`;
8. runs complete role attributes, grants, memberships, ownership, and denial reconciliation.

The Canary remains blocked until that boundary is implemented and certified.

## Validation

- TypeScript: PASS
- D1 regression: PASS
- D2 Phase 1: PASS
- D2 Phase 2 unit: PASS
- D2 durable target suite: PASS
- D2 live integrated migration rerun: PASS, all four migrations skipped with matching checksums
- D3 Phase 1: PASS
- D3 Phase 2 unit: PASS
- D3 Phase 3 enablement: PASS
- D3-to-D2 commit boundary: PASS
- Integrated topology: PASS
- Migration `002` administrative attempt: FAIL CLOSED at the mixed-owner `control` revocation
- Exact revocation privilege probe: DENIED with SQLSTATE `42501`
- D3 owner restoration to `NOCREATEROLE`: PASS
- Post-failure ledger/grant/membership reconciliation: PASS
- Real Canary, rerun, correction, failure injection, and unknown-outcome certification: NOT RUN

## Final Role Migration Certification - 2026-07-13

The blocked attempt above remains the historical record. The fixed-purpose administrative runner subsequently executed the complete unchanged migration under the local PostgreSQL container administrator and inserted the D3 ledger row in the same transaction.

### Runner Boundary

- Fixed container: `quantterminal-d2-postgres`
- Fixed database: `quantterminal_backfill`
- Fixed migration: `002_population_roles.sql`
- Expected and observed SHA-256: `15282384709e595158a1da55fe34b185f833f32389ed95a121ac2d8f0516e978`
- Input: full migration content through standard input to container-local `psql`
- Secrets: no administrator URL, password, or application configuration
- Failure behavior: `ON_ERROR_STOP`, explicit transaction, no ledger record outside that transaction

The first successful administrative transaction was followed by a false-negative process result because the post-check compared psql's textual `false` values with abbreviated `f` values. Persisted inspection proved the migration and ledger insert had committed atomically. The bounded correction changed only the post-check representation; no SQL, migration, grant, or ledger content changed. `inspect` and the ordinary runner then passed.

### Certified State

| Role | LOGIN | SUPERUSER | CREATEROLE | CREATEDB | REPLICATION | BYPASSRLS |
|---|---|---|---|---|---|---|
| `qt_d3_backfill_owner` | yes | no | no | no | no | no |
| `qt_d3_scheduler` | no | no | no | no | no | no |
| `qt_d3_coordinator` | no | no | no | no | no | no |
| `qt_d3_worker` | no | no | no | no | no | no |
| `qt_d3_read_only` | no | no | no | no | no | no |

No D3 role membership edge or administrative escalation path exists. Preexisting support roles owned no objects and had no unexpected grants before application. After application, grants match the unchanged migration and D2/D3 ownership remains separate.

### Essential Live Probes

- Coordinator approved Job read/write boundary: PASS
- Worker approved Unit read and Retrieval/Candidate/checkpoint/outcome privileges: PASS
- Read-only approved SELECT: PASS
- Worker direct D2 Fact insert: DENIED `42501`
- Coordinator D2 migration-ledger alteration: DENIED `42501`
- Read-only Population insert: DENIED `42501`
- Worker role creation: DENIED `42501`
- Persisted mutation after denied probes: none

The ordinary D3 migration runner now reports both `001` and `002` as `SKIPPED`; the ledger and checksum remain stable. All 16 D3-to-D2 foreign keys remain validated.
