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

Branch creation, Green read-write endpoint creation, branch-scoped migration-owner creation, and release-database creation are separate operations. Each requires its own unexpired approval context under `mvp-green-infrastructure-approval/1.4.0`:

- `NEON_BRANCH_CREATE` binds the release, exact approved parent LSN, its parent-state evidence checksum, and target branch name. Green branch ID, database, target role, and owner role are null.
- `GREEN_ENDPOINT_CREATE` additionally binds the exact created Green branch ID and provider-supported read-write compute profile. Database, target-role, and owner-role fields are null.
- `GREEN_OWNER_ROLE_CREATE` additionally binds the exact created Green branch ID, the sole permitted target role `mvp_green_migration_owner`, and `targetRoleNoLogin: true`. Database and owner-role fields are null.
- `GREEN_DATABASE_CREATE` binds the exact created Green branch ID, deterministic database name, and exact owner `mvp_green_migration_owner`. The separate target-role field is null.
- `GREEN_ACQUISITION_START` binds the exact created Green branch ID and deterministic database name; infrastructure role fields are null. It remains reserved for the later acquisition command and cannot authorize infrastructure creation.

The exact 1.4 field inventory is `schemaVersion`, `operation`, `releaseChecksum`, `projectId`, `parentBranchId`, `expectedParentState`, `expectedParentLsn`, `targetBranchName`, `targetGreenBranchId`, `targetDatabaseName`, `targetRoleName`, `targetRoleNoLogin`, `targetOwnerRole`, `targetEndpointType`, `targetEndpointAutoscalingMinCu`, `targetEndpointAutoscalingMaxCu`, `targetEndpointSuspendTimeoutSeconds`, `targetEndpointPoolerEnabled`, `targetEndpointProvisioner`, `invocationId`, `actorId`, `issuedAt`, `expiresAt`, and `approvalChecksum`. Every non-checksum field participates in the canonical approval checksum, while exact-field validation also requires the checksum field itself. Endpoint fields are populated only for endpoint creation; `targetRoleNoLogin` is `true` only for owner-role creation and null for every other operation. The checksum protects canonical serialization and detects unrecomputed edits; operator authorization remains an external approval-channel responsibility rather than a cryptographic signer-identity claim. Older approvals are rejected for endpoint creation, while already emitted receipts remain historical evidence.

The certified command validates approval integrity and frozen-release binding before resolving parent state exactly once. The current project, branch, database, reader role, and read-only transaction must remain valid, including a recomputation of the runtime parent-state checksum. Current LSN equality or forward advancement is allowed, but a current LSN behind the approved LSN fails closed. Branch creation always uses the approved LSN, never the newer inspected LSN. A lost mutation response is reconciled by deterministic name and provider readback; an unexpected project, parent, approved LSN, region, inherited database, role, owner, or identity fails closed. No automatic branch, role, or database deletion is performed.

The endpoint is an independently approved Green resource. Read-only discovery compares the parent endpoint and project defaults, and retains only provider-supplied fields. For this frozen release the proposed Green profile mirrors Production: `read_write`, autoscaling `0.25` to `2` CU, suspend timeout `0`, pooler disabled, and provisioner `k8s-neonvm`. Creation uses `POST /projects/{projectId}/endpoints`; `branch_id`, `type`, and every optional setting come only from the approval. Endpoint IDs are provider-issued and are obtained from the response or deterministic Green-branch inventory. Returned operation IDs use the bounded shared polling policy. Ambiguous outcomes are deterministically read back before any later retry, and the adapter never issues an automatic second POST.

The migration owner is a branch-scoped release-infrastructure `NOLOGIN` role. It must be named exactly `mvp_green_migration_owner`, exist on the approved Green branch, be uniquely identified, and not be provider-protected. `neondb_owner`, serving roles, and inactive runtime roles are never substitutes. Before POST, the adapter lists branch endpoints and requires exactly one verified read-write endpoint; zero endpoints or read-only-only inventory fails `NEON_ENDPOINT_REQUIRED` without mutation. The POST body is derived only from approval-bound values and is exactly `{ role: { name, no_login: true } }`. Endpoint creation is never implicit in owner-role creation.

Provider failures preserve only allowlisted status, code, bounded redacted message, request ID, operation IDs, retry delay, request path, response-received state, and timeout state. Raw response bodies, headers, credentials, passwords, URLs, and connection strings never enter errors or receipts. Successful role responses may contain a generated password and asynchronous operations; the password is discarded, operation IDs are polled with a finite policy, and deterministic role readback remains the final authority. Timeout, conflict, provider 5xx, malformed success, and operation uncertainty always read back before returning; no automatic second POST is issued.

The release database name is derived from the release profile, application commit, watermark transition, and full plan checksum. It is a bounded PostgreSQL identifier, never `neondb`, and never the retained rejected-release database. The sequence is:

1. Validate the approval checksum and static release binding.
2. Resolve and verify current parent identity once, requiring current LSN to be at or ahead of the approved LSN.
3. Create the child branch at the approved parent LSN.
4. Read back the child and verify project, parent, exact approved LSN, region, state, and inherited databases.
5. Separately approve the Green read-write endpoint profile on the exact Green branch.
6. Verify endpoint absence, issue at most one approval-derived endpoint POST, poll returned operation IDs, and deterministically read back the exact endpoint after success or an uncertain response.
7. Separately approve creation of `mvp_green_migration_owner` on the exact Green branch.
8. Verify role absence and the read-write endpoint prerequisite, issue at most one approval-derived `NOLOGIN` role POST, poll returned operation IDs, and deterministically read back the exact non-protected role after success or an uncertain response.
9. Separately approve the deterministic database name and owner on the exact Green branch.
10. Verify the exact branch, inherited `neondb`, owner role, and database collision state.
11. Issue at most one database POST using only approval-bound values and deterministically read the database back.

Credential values remain process-injected and never enter receipts. Role metadata is bounded to purpose and scope. The migration owner, acquisition publisher, and `mvp_serving_reader` remain separate roles.

### Frozen Release Identity And Tooling

The release application commit and release-tooling commit are different identities. This release remains frozen to application commit `a4590b21dd8929df679f9eb2aa823d6c019a0b31`, release checksum `894b0cea24a869817d2cdbb3ca94c3b240c18ae5d0ec128353893a4dfcf9587a`, branch `mvp-release-2026-07-21-ef67d73549b7`, and database `mvp_release_20260721_9c177d6309`. Later commits may change certified tooling, but they never replace `--application-commit` and never rotate those release resources. The worker rejects a derived identity that differs from this frozen release.

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

1. `plan` derives sanitized branch, database, and frozen release identities without provider access.
2. `preflight` performs read-only project, parent branch, LSN, and database inventory inspection and emits the approved-LSN evidence basis.
3. `create-branch` requires an exact `NEON_BRANCH_CREATE` approval file.
4. `preflight-endpoint` verifies the exact Green branch, inherited `neondb`, endpoint inventory, project defaults, and parent read-write profile without mutation.
5. `create-endpoint` requires a separate `GREEN_ENDPOINT_CREATE` approval and performs at most one endpoint POST.
6. `preflight-role` verifies the exact Green branch and reports the dedicated owner-role collision without mutation.
7. `create-owner-role` requires a separate `GREEN_OWNER_ROLE_CREATE` approval and performs at most one role POST.
8. `preflight-database` verifies the exact Green branch, owner role, inherited `neondb`, and target database collision without mutation.
9. `create-database` requires a separate `GREEN_DATABASE_CREATE` approval and performs at most one database POST. The branch ID, database name, and owner role come only from the approval; `--owner-role` is rejected.

Every command requires `--mode=GREEN_CERTIFICATION_ONLY`. The worker has no Preview, deployment, alias, Production-write, or deletion command. Migration, acquisition, corpus construction, and certification remain later resumable stages and require their own contracts and approvals.

## Prohibited Release Switches

- Same-database candidate activation
- Serving exposure writes
- Live corpus or checksum pin mutation
- Dual-corpus bridge selection
- Production database mutation
- Preview promotion during release construction
- Reuse of a rejected release artifact
