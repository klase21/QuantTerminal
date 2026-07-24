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

### Live Green Infrastructure

`LiveMvpNeonGreenInfrastructureAdapter` is the certified provider boundary. Read operations inspect the exact project, branch, and database inventory. The parent-state reader connects as `mvp_serving_reader`, begins an explicit `READ ONLY` transaction, verifies the Neon branch ID and database, and captures the current WAL LSN. The parent-state checksum is approval evidence for the project, branch, database, approved LSN, and read-only result. The inspection timestamp remains receipt evidence but is excluded from state equality.

Branch creation and release-database creation are separate operations. Each requires its own unexpired approval context:

- `NEON_BRANCH_CREATE` binds the release, exact approved parent LSN, its parent-state evidence checksum, target branch name, actor, and invocation.
- `GREEN_DATABASE_CREATE` additionally binds the deterministic database name.
- `GREEN_ACQUISITION_START` is reserved for the later acquisition command and cannot authorize infrastructure creation.

The certified command validates approval integrity and release binding before resolving parent state exactly once. The current project, branch, database, reader role, and read-only transaction must remain valid. Current LSN equality or forward advancement is allowed, but a current LSN behind the approved LSN fails closed. Branch creation always uses the approved LSN, never the newer inspected LSN. A lost mutation response is reconciled by deterministic name and provider readback; an unexpected project, parent, approved LSN, region, inherited database, owner, or identity fails closed. No automatic branch or database deletion is performed.

The release database name is derived from the release profile, application commit, watermark transition, and full plan checksum. It is a bounded PostgreSQL identifier, never `neondb`, and never the retained rejected-release database. The sequence is:

1. Validate the approval checksum and static release binding.
2. Resolve and verify current parent identity once, requiring current LSN to be at or ahead of the approved LSN.
3. Create the child branch at the approved parent LSN.
4. Read back the child and verify project, parent, exact approved LSN, region, state, and inherited databases.
5. Derive the release database name.
6. Reject a conflicting name or owner.
7. Create the database and read it back.

Credential values remain process-injected and never enter receipts. Role metadata is bounded to purpose and scope. The migration owner, acquisition publisher, and `mvp_serving_reader` remain separate roles.

## Incremental Build

The acquisition worker accepts one exact closed UTC day and can run in ingest-only mode. MVP-8Z5 processes only `(2026-07-16T00:00:00.000Z, 2026-07-19T00:00:00.000Z]`. Logical-slot and canonical identities retain existing idempotency and checksum contracts. The final day is materialized through the existing evidence, projection, and Replay contracts, then staged through the official separate-target Serving adapter.

Candidate identity is content-derived from projections, evidence, Replay, watermark, and canonicalized manifest members. Branch names, timestamps, deployment IDs, and exposure state are not candidate-identity inputs.

## Freeze And Certification

Freeze requires publisher writes to be disabled, the reader role to be SELECT-only, pooled SSL, and `transaction_read_only=on` inside the managed transaction. Certification verifies the exact fingerprint, candidate identity, `62 / 6 / 6 / 74 / 1`, one manifest, no duplicate identities, no orphan members, no checksum mismatch, zero exposures, and unchanged blue and rollback releases.

Preview verification binds the pushed application commit to the exact green database and candidate. Health, Dashboard, Scanner, Trade x6, Replay x6, candidate review navigation, and browser Network projection parameters must pass before `PROMOTION_READY`.

### Certification-Only Mode

`runMvpBlueGreenCertificationOnlyPipeline` accepts only `GREEN_CERTIFICATION_ONLY` and a port set with no Preview capability. It runs through branch verification, bounded ingestion, materialization, publisher disablement, reader verification, and certification, persists the `CERTIFIED` release, and stops. Preview, Vercel, Production alias, serving exposure, and rollback operations are structurally unreachable from this entrypoint.

Stage receipts use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, and `NOT_APPLICABLE`:

- `FAIL` means the stage executed and violated its contract.
- `BLOCKED` means the stage was eligible but a prerequisite prevented execution.
- `NOT_RUN` means execution never reached the stage.
- `NOT_APPLICABLE` marks Preview in certification-only mode.

An earlier failure never becomes a chain of false downstream failures.

### Operator Commands

The stage-specific worker is `workers/data-platform/runMvpGreenRelease.ts`.

1. `plan` derives sanitized branch, database, and release identities without provider access.
2. `preflight` performs read-only project, parent branch, LSN, and database inventory inspection and emits the approved-LSN evidence basis.
3. `create-branch` requires an exact `NEON_BRANCH_CREATE` approval file.
4. `create-database` requires a separate `GREEN_DATABASE_CREATE` approval file and explicit migration-owner role.

Every command requires `--mode=GREEN_CERTIFICATION_ONLY`. The worker has no Preview, deployment, alias, Production-write, or deletion command. Migration, acquisition, corpus construction, and certification remain later resumable stages and require their own contracts and approvals.

## Prohibited Release Switches

- Same-database candidate activation
- Serving exposure writes
- Live corpus or checksum pin mutation
- Dual-corpus bridge selection
- Production database mutation
- Preview promotion during release construction
- Reuse of a rejected release artifact
