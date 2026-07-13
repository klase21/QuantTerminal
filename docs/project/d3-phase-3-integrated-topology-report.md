# D3 Phase 3 Integrated Topology Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial staged files: none
- Existing D2/D3 Phase 3 and inherited D4 work: present
- Package and lockfile changes at baseline: none
- Separate-target authentication: PASS, supplied and confirmed by the user
- Existing separate databases: not mutated or migrated
- Provider and canary execution: not run

## Dependency Audit

The committed D3 migration requires physical locality with D2. The prompt reported seven Raw Object and Canonical Commit references, but committed SQL contains six: four `raw.objects` references and two `control.canonical_commits` references. The complete D3-to-D2 inventory is 16 after including four provider-snapshot, four policy-version, and two quarantine references.

All are physical PostgreSQL foreign keys with default `NO ACTION` update/delete behavior. The complete machine-readable inventory is `D3_TO_D2_FOREIGN_KEY_DEPENDENCIES`; the static suite verifies it against the checked-in migration.

## Topology Decision

Adopt one physical non-production database, `quantterminal_backfill`. D2 and D3 retain separate login roles, migration runners, ledgers, runtime boundaries, and object ownership. Certification databases remain separate. Separate durable databases, copied D2 tables, removed foreign keys, FDW, and dblink are rejected.

The committed schema uses D2-owned `control`, `quality`, `coverage`, and `quarantine` namespaces for some D3 objects. Consequently, ownership separation is object-level in shared schemas, not exclusive schema-level separation. D3 owns `population` and every D3-created object; D2 owns the base schemas and Canonical objects.

## Integrated Target Policy

The explicit `INTEGRATED_BACKFILL` profile requires:

- database exactly `quantterminal_backfill`;
- same host, port, and database for D2 and D3;
- exact distinct roles `qt_d2_backfill_owner` and `qt_d3_backfill_owner`;
- configured artifact root outside the repository and temporary directories;
- no certification, D4, production-like, malformed, or previous separate backfill target;
- credential-redacted inspection.

Dedicated D2/D3 and isolated certification profiles remain the defaults and are unchanged.

## Role and Privilege Model

| Authority | Allowed | Denied |
|---|---|---|
| Administrative/bootstrap | Create database, assign owner, grant/revoke temporary migration privileges | Ordinary worker execution |
| D2 migration owner | Apply D2 migrations, own D2 schemas/objects, grant bounded references | D3 runtime execution |
| D3 migration owner | Apply D3 migrations after D2, own D3 objects, create approved FKs | Direct D2 fact mutation; retained unrestricted DDL |
| D2 runtime | Approved Canonical adapter operations | Arbitrary update/delete and migration ledger mutation |
| D3 runtime | D3 Population state and approved D2 adapter calls | Direct insert/update/delete of D2 Canonical Facts |
| Read-only verifier | Bounded reads | Insert, update, delete, DDL, mutation procedures |

D3 bootstrap needs temporary `CREATE` on database/shared schemas and temporary `CREATEROLE` for the checked-in role migration. These are revoked immediately after D3 migration. It retains only required schema `USAGE`, table `REFERENCES`, and separately certified runtime grants.

## Migration and Ledger Order

1. Validate the integrated profile and object root.
2. Apply D2 `001_control_and_raw.sql`, `002_repository_lifecycle.sql`, `003_canonical_fact_tables.sql`, and `004_governance_and_read_models.sql`.
3. Verify `control.migration_ledger` and D2 dependency objects.
4. Grant bounded D3 migration prerequisites.
5. Apply D3 `001_population_control_plane.sql` and `002_population_roles.sql`.
6. Verify `control.population_migration_ledger`, all 16 foreign keys, and ownership.
7. Revoke temporary privileges and certify runtime denials.

The D2 and D3 ledgers remain distinct and checksum-authoritative only for their own migration sets.

## Exact Bootstrap Commands

PowerShell, outside psql:

```powershell
psql -h localhost -p 55432 -U postgres -d postgres
```

psql meta-command:

```text
\set ON_ERROR_STOP on
```

SQL inside psql, inspect first and create only if absent:

```sql
SELECT datname, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = 'quantterminal_backfill';
CREATE DATABASE quantterminal_backfill OWNER qt_d2_backfill_owner;
GRANT CONNECT ON DATABASE quantterminal_backfill TO qt_d2_backfill_owner, qt_d3_backfill_owner;
```

Do not run `CREATE DATABASE` when the inspection already returns a row. No existing database is dropped or altered.

After D2 migrations, connect as the D2 owner and grant prerequisites:

```sql
GRANT USAGE ON SCHEMA raw, control, quality, coverage, quarantine TO qt_d3_backfill_owner;
GRANT CREATE ON SCHEMA control, quality, coverage TO qt_d3_backfill_owner;
GRANT REFERENCES ON TABLE raw.objects, control.provider_snapshots, control.policy_versions, control.canonical_commits, quarantine.conflicts, quarantine.candidates TO qt_d3_backfill_owner;
```

As administrator immediately before D3 migration:

```sql
GRANT CREATE ON DATABASE quantterminal_backfill TO qt_d3_backfill_owner;
ALTER ROLE qt_d3_backfill_owner CREATEROLE;
```

As administrator immediately after D3 migration:

```sql
REVOKE CREATE ON DATABASE quantterminal_backfill FROM qt_d3_backfill_owner;
REVOKE CREATE ON SCHEMA control, quality, coverage FROM qt_d3_backfill_owner;
ALTER ROLE qt_d3_backfill_owner NOCREATEROLE;
```

## Exact Environment Commands

PowerShell with placeholders, never actual passwords in logs or chat:

```powershell
[Environment]::SetEnvironmentVariable('D2_CANONICAL_POSTGRES_URL', 'postgresql://qt_d2_backfill_owner:<D2_PASSWORD_URL_ENCODED>@localhost:55432/quantterminal_backfill', 'User')
[Environment]::SetEnvironmentVariable('D3_POPULATION_POSTGRES_URL', 'postgresql://qt_d3_backfill_owner:<D3_PASSWORD_URL_ENCODED>@localhost:55432/quantterminal_backfill', 'User')
[Environment]::SetEnvironmentVariable('D3_BACKFILL_OBJECT_ROOT', 'D:\QuantTerminalData\raw-artifacts', 'User')
```

Close and reopen PowerShell and Codex. In the new PowerShell, verify without printing passwords:

```powershell
$d2 = [Uri]$env:D2_CANONICAL_POSTGRES_URL
$d3 = [Uri]$env:D3_POPULATION_POSTGRES_URL
$d2Role = ($d2.UserInfo -split ':', 2)[0]
$d3Role = ($d3.UserInfo -split ':', 2)[0]
[pscustomobject]@{ D2Present=[bool]$env:D2_CANONICAL_POSTGRES_URL; D3Present=[bool]$env:D3_POPULATION_POSTGRES_URL; Host=$d2.Host; Port=$d2.Port; D2Database=$d2.AbsolutePath.TrimStart('/'); D3Database=$d3.AbsolutePath.TrimStart('/'); D2Role=$d2Role; D3Role=$d3Role; SameDatabase=($d2.Host -eq $d3.Host -and $d2.Port -eq $d3.Port -and $d2.AbsolutePath -eq $d3.AbsolutePath); DistinctRoles=($d2Role -ne $d3Role); ObjectRoot=$env:D3_BACKFILL_OBJECT_ROOT }
psql -h localhost -p 55432 -U qt_d2_backfill_owner -d quantterminal_backfill -c "select current_database(), current_user"
psql -h localhost -p 55432 -U qt_d3_backfill_owner -d quantterminal_backfill -c "select current_database(), current_user"
```

## Validation

- TypeScript: PASS
- Integrated topology static suite: PASS
- Dedicated target profiles unchanged: PASS
- Shared target, exact roles, redaction, object-root, and negative cases: PASS
- Migration ordering and ledger separation: PASS
- Complete 16-FK inventory: PASS
- Cross-database workaround scan: PASS
- Live integrated migration/privilege verification: NOT RUN; database is not created/configured
- Real OHLCV canary: NOT RUN by task boundary

## Files Changed

D2 target policy: durable safety, client, and factory.

D3 target policy: durable safety, client, and factory.

Integrated validation: target safety, topology inventory, and client factory under `lib/data-platform/population/backfill`.

Tests: integrated topology static suite.

Documentation: D2 integration, full backfill, topology architecture, readiness, blockers, canary history, and this report.

No migration, package, lockfile, environment, consumer, API, D4, WebSocket, or certification database was changed.

## Remaining Blockers and Next Step

The integrated database does not yet exist or is not configured in the current process. No integrated migrations or role-denial checks have run. The next action is `CREATE_INTEGRATED_BACKFILL_DATABASE`, then update both URLs and restart PowerShell/Codex. A later approved task applies and certifies D2 then D3 migrations before the canary.
