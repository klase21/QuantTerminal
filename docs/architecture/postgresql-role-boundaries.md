# PostgreSQL Role Boundaries

## Blueprint

`lib/data-platform/persistence/postgres/roles.sql` is an isolated, unapplied role blueprint. It contains no passwords or `LOGIN` credentials.

| Role | Allowed | Denied |
|---|---|---|
| Migration owner | DDL, migrations, grants, isolated reset | Application runtime use |
| Canonical writer | Bounded canonical inserts, reads required for validation, controlled publication function | Deletes, arbitrary updates, schema changes, migration-ledger mutation |
| Bounded writer | Explicit approved procedures only | Direct table mutation |
| Read-only | Bounded selects | Insert, update, delete, DDL, publication transitions |

Canonical and publication history tables receive no runtime `DELETE`. Fact columns and checksums receive no arbitrary runtime `UPDATE`. The materialized publication state changes only through `repository.append_publication_decision`, which is `SECURITY DEFINER` with an explicit safe search path.

## Verification

The isolated suite contains real denied-operation checks for read-only inserts, canonical-writer deletes, schema alteration, migration-ledger mutation, and direct publication-state updates. It also verifies approved publication-function execution under canonical-writer role intent.

These checks are currently `BLOCKED` because no isolated PostgreSQL URL is configured. The SQL blueprint is not evidence that privileges work in a target database.
