# Disposable MVP Refresh Certification Database

The PostgreSQL certification suite continues to use `quantterminal_mvp_refresh_isolated` by default.
Disposable execution is test-only and requires both:

- `MVP_REFRESH_CERTIFICATION_DATABASE_NAME` set to an exact unique name beginning with `quantterminal_mvp_refresh_dbprovider_cert_`
- `MVP_REFRESH_ALLOW_DISPOSABLE_DATABASE=true`

`MVP_REFRESH_ISOLATED_POSTGRES_URL` must select that exact database through an explicit local Docker port
as role `qt_d2_owner`. The helper rejects remote hosts, mismatched database names, invalid identifiers, fixed
or system databases, absent opt-in, and absent approved names. It verifies `current_database()`, `current_user`,
and PostgreSQL 16 before migrations. Errors and receipts expose only the host classification, port, role, and
database name; passwords and full connection URLs are never emitted.

Database creation and exact-name cleanup remain the responsibility of the local certification orchestration.
The suite and helper never create, reset, rename, drop, or migrate the fixed fixture.
