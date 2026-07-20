# MVP Blue-Green Database Releases

## Decision

MVP Serving releases are immutable application-and-database pairs. The blue release remains the current Vercel deployment connected to its existing Neon database. A green release is built on a new Neon child branch, materialized into a new release database, frozen, certified, and Preview-smoked before it can become promotion-ready.

Production cutover is an alias-only operation. It does not mutate a corpus pin, insert a serving exposure, activate a same-database candidate, or write either release database. Rollback restores the runtime-captured healthy blue deployment.

## Release Lifecycle

The durable states are `BUILDING`, `FROZEN`, `CERTIFIED`, `PREVIEW_VERIFIED`, `PROMOTION_READY`, `PROMOTED`, `ROLLED_BACK`, `REJECTED`, and `ARCHIVED`. Transitions are forward-only. Once `FROZEN`, candidate identity, checksums, watermark, branch, database, role, counts, and Replay projection IDs are immutable.

For MVP-8Z5 the terminal state is `PROMOTION_READY`, `NO_NEW_COMPLETE_WATERMARK`, or `SAFE_BLOCKED`. This sprint never promotes a deployment.

## Watermark Gate

Discovery starts at the current Production governed-through watermark and checks consecutive closed UTC days. A day is accepted only when all six symbols have checksum-verified OHLCV, open-interest, aggregate-trade, and funding inputs. Funding requires the exact three-event daily shape. Discovery stops at the first incomplete day; it never skips a gap.

The final release additionally requires six complete Replay models. Replay counts are derived from the certified interval. One UTC day requires `288 / 288 / 3 / 48` price, OI, funding, and flow samples.

## Branch And Databases

The Neon branch parent is the currently verified blue branch. The branch name is deterministic from project, parent branch/database, application commit, watermark transition, and six-symbol scope.

The cloned `neondb` remains untouched. Build data uses isolated databases and roles on the new branch. The application release database is new and contains no inherited exposure. The temporary publisher can write only during `BUILDING`; after materialization it is disabled or removed. `mvp_serving_reader` is the only application role and all reads use explicit `READ ONLY` transactions.

## Incremental Build

The acquisition worker accepts one exact closed UTC day and can run in ingest-only mode. MVP-8Z5 processes only `(2026-07-16T00:00:00.000Z, 2026-07-19T00:00:00.000Z]`. Logical-slot and canonical identities retain existing idempotency and checksum contracts. The final day is materialized through the existing evidence, projection, and Replay contracts, then staged through the official separate-target Serving adapter.

Candidate identity is content-derived from projections, evidence, Replay, watermark, and canonicalized manifest members. Branch names, timestamps, deployment IDs, and exposure state are not candidate-identity inputs.

## Freeze And Certification

Freeze requires publisher writes to be disabled, the reader role to be SELECT-only, pooled SSL, and `transaction_read_only=on` inside the managed transaction. Certification verifies the exact fingerprint, candidate identity, `62 / 6 / 6 / 74 / 1`, one manifest, no duplicate identities, no orphan members, no checksum mismatch, zero exposures, and unchanged blue and rollback releases.

Preview verification binds the pushed application commit to the exact green database and candidate. Health, Dashboard, Scanner, Trade x6, Replay x6, candidate review navigation, and browser Network projection parameters must pass before `PROMOTION_READY`.

## Prohibited Release Switches

- Same-database candidate activation
- Serving exposure writes
- Live corpus or checksum pin mutation
- Dual-corpus bridge selection
- Production database mutation
- Preview promotion during release construction
- Reuse of a rejected release artifact
