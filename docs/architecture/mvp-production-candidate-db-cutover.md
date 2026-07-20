# Production Candidate Database Cutover

## Selection Boundary

`PRODUCTION_EXACT_CANDIDATE_DB` is a deployment-bound Serving policy. It reads one exact candidate from the physically separate Candidate Neon branch and does not consult the active exposure in the old Production database.

The policy requires the Production Vercel environment, the exact QuantTerminal project identity, the exact Candidate target fingerprint, the dedicated pooled SSL connection, `mvp_serving_reader`, and the frozen candidate, member-set, and watermark checksums. Managed reads remain inside the existing explicit `READ ONLY` transaction and verify the database, role, and transaction state before any Serving query.

## Deployment And Rollback

The current Production deployment retains its immutable old-database environment snapshot. The prepared cutover deployment uses the dedicated `MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL` and exact Candidate bindings. Promoting the new deployment changes the application deployment boundary only; it creates no database exposure and writes neither database.

Rollback restores the deployment captured as healthy immediately before promotion. No static historical deployment may substitute for that runtime baseline.

## Fail-Closed Rules

The policy rejects Preview or Development, the old Production branch, non-reader roles, non-pooled connections, missing SSL, wildcard bindings, conflicting Preview or Bridge modes, checksum drift, target drift, and fallback to the generic Serving or application database URL. Candidate readback must remain exactly `62 / 6 / 6 / 74 / 1`, `WITHHELD`, `INTERNAL_ONLY`, and unexposed.
