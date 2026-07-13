# Integrated Backfill PostgreSQL Topology

## Decision

Durable D2 Canonical persistence and D3 Population use one non-production physical database:

```text
quantterminal_backfill
  D2-owned base schemas and immutable Canonical objects
  D3-owned population schema and Population objects
  distinct D2 and D3 migration ledgers
  distinct authenticated roles
```

PostgreSQL foreign keys cannot cross databases. Separate physical targets, copied D2 tables, removed constraints, `dblink`, and `postgres_fdw` are rejected. Certification databases remain physically separate.

## Committed Dependencies

Migration `lib/data-platform/population/postgres/migrations/001_population_control_plane.sql` contains 16 D3-to-D2 physical foreign keys. The prompt-reported subset is six, not seven: four references to `raw.objects` and two to `control.canonical_commits`. Ten additional references bind provider snapshots, policy versions, and quarantine records.

All foreign keys use PostgreSQL defaults: `ON UPDATE NO ACTION` and `ON DELETE NO ACTION`. This is compatible with append-only D2 history.

| D3 source | D2 target | Purpose |
|---|---|---|
| `control.population_units.provider_snapshot_id` | `control.provider_snapshots.snapshot_id` | Provider governance |
| `control.population_units.policy_version_id` | `control.policy_versions.policy_version_id` | Policy governance |
| `control.population_checkpoints.raw_manifest_id` | `raw.objects.object_id` | Raw checkpoint |
| `control.retrieval_attempts.provider_snapshot_id` | `control.provider_snapshots.snapshot_id` | Retrieval governance |
| `control.retrieval_attempts.raw_manifest_id` | `raw.objects.object_id` | Retrieved artifact |
| `population.candidates.raw_manifest_id` | `raw.objects.object_id` | Candidate lineage |
| `population.candidates.provider_snapshot_id` | `control.provider_snapshots.snapshot_id` | Candidate governance |
| `quality.candidate_validation_results.policy_version_id` | `control.policy_versions.policy_version_id` | Validation policy |
| `quality.candidate_evaluation_runs.policy_version_id` | `control.policy_versions.policy_version_id` | Evaluation policy |
| `quality.candidate_evaluation_runs.provider_certification_snapshot_id` | `control.provider_snapshots.snapshot_id` | Provider certification |
| `population.canonical_submissions.canonical_commit_id` | `control.canonical_commits.commit_id` | D2 commit result |
| `control.population_outcomes.raw_manifest_id` | `raw.objects.object_id` | Outcome lineage |
| `control.population_outcomes.canonical_commit_id` | `control.canonical_commits.commit_id` | Outcome commit |
| `control.population_outcomes.conflict_id` | `quarantine.conflicts.conflict_id` | Conflict audit |
| `control.population_outcomes.quarantine_id` | `quarantine.candidates.quarantine_id` | Quarantine audit |
| `coverage.watermark_eligibility_decisions.policy_version_id` | `control.policy_versions.policy_version_id` | Watermark policy |

Creating these constraints requires `USAGE` on target schemas and `REFERENCES` on the six target tables. D3 migration also needs temporary `CREATE` on the D2-owned shared schemas `control`, `quality`, and `coverage` because committed D3 objects live there.

## Ownership and Roles

D2 owns the database and base schemas `control`, `raw`, `canonical`, `repository`, `quality`, `coverage`, `projection`, `evidence`, `consistency`, and `quarantine`. D3 owns `population` and every D3-created table, type, and function. Because committed D3 objects also live in `control`, `quality`, and `coverage`, separation is object-level within those shared namespaces rather than exclusive schema-level ownership.

The existing PostgreSQL administrator creates the database and performs temporary privilege bootstrap. It is never a worker role. The D2 owner applies D2 migrations. The D3 owner applies D3 migrations after receiving bounded temporary DDL and `REFERENCES` privileges. Runtime memberships receive no arbitrary D2 fact writes.

## Migration Order

1. Validate the complete `INTEGRATED_BACKFILL` profile.
2. Apply D2 migrations `001` through `004` using `qt_d2_backfill_owner`.
3. Verify `control.migration_ledger`, `raw.objects`, and `control.canonical_commits`.
4. Grant the D3 owner bounded bootstrap privileges.
5. Apply D3 migrations `001` and `002` using `qt_d3_backfill_owner`.
6. Verify `control.population_migration_ledger` and all 16 cross-owner constraints.
7. Revoke temporary database/schema creation and role-creation privileges.
8. Verify runtime allows and denials, ownership, checksums, and reconciliation.
9. Run the real OHLCV canary only in a later approved task.

The D2 ledger is `control.migration_ledger`; the D3 ledger is `control.population_migration_ledger`. Neither runner may treat the other ledger as authoritative.

## Bootstrap Commands

Connect to the administrative database as the existing PostgreSQL administrator and inspect first:

```sql
SELECT datname, pg_get_userbyid(datdba) AS owner
FROM pg_database
WHERE datname = 'quantterminal_backfill';
```

Only when absent:

```sql
CREATE DATABASE quantterminal_backfill OWNER qt_d2_backfill_owner;
GRANT CONNECT ON DATABASE quantterminal_backfill TO qt_d2_backfill_owner, qt_d3_backfill_owner;
```

After D2 migrations, connect to `quantterminal_backfill` as `qt_d2_backfill_owner`:

```sql
GRANT USAGE ON SCHEMA raw, control, quality, coverage, quarantine TO qt_d3_backfill_owner;
GRANT CREATE ON SCHEMA control, quality, coverage TO qt_d3_backfill_owner;
GRANT REFERENCES ON TABLE
  raw.objects,
  control.provider_snapshots,
  control.policy_versions,
  control.canonical_commits,
  quarantine.conflicts,
  quarantine.candidates
TO qt_d3_backfill_owner;
```

The administrator grants temporary migration capabilities immediately before D3 migration:

```sql
GRANT CREATE ON DATABASE quantterminal_backfill TO qt_d3_backfill_owner;
ALTER ROLE qt_d3_backfill_owner CREATEROLE;
```

Immediately after D3 migration:

```sql
REVOKE CREATE ON DATABASE quantterminal_backfill FROM qt_d3_backfill_owner;
REVOKE CREATE ON SCHEMA control, quality, coverage FROM qt_d3_backfill_owner;
ALTER ROLE qt_d3_backfill_owner NOCREATEROLE;
```

The `REFERENCES` and `USAGE` privileges remain so constraints remain governed and future bounded reads can be granted explicitly. No password appears in SQL.

## Environment Commands

Run in PowerShell with user-managed URL-encoded passwords:

```powershell
[Environment]::SetEnvironmentVariable('D2_CANONICAL_POSTGRES_URL', 'postgresql://qt_d2_backfill_owner:<D2_PASSWORD_URL_ENCODED>@localhost:55432/quantterminal_backfill', 'User')
[Environment]::SetEnvironmentVariable('D3_POPULATION_POSTGRES_URL', 'postgresql://qt_d3_backfill_owner:<D3_PASSWORD_URL_ENCODED>@localhost:55432/quantterminal_backfill', 'User')
[Environment]::SetEnvironmentVariable('D3_BACKFILL_OBJECT_ROOT', 'D:\QuantTerminalData\raw-artifacts', 'User')
```

Close and reopen PowerShell and Codex after user-level environment changes. Passwords stay user-managed and do not need to be sent in chat.
