# D4 Phase 2V Integrated Certification Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial worktree: existing uncommitted D4 Part 01 through Phase 2C implementation; no pre-existing work was reset or overwritten.
- Isolated target: `localhost:55432/quantterminal_d4_isolated` (credentials redacted).
- PostgreSQL: `16.13 (Debian 16.13-1.pgdg13+1)`.
- Target safety: PASS. The D4 URL was required explicitly, the database allowlist passed, `DATABASE_URL` fallback was absent, and D2/D3 URLs were rejected as D4 targets.
- Production providers, object storage, AI, consumers, Evidence assembly, and production databases were not accessed.

## Inherited Limitation Register

| ID | Source | Affected area | Impact | Disposition | Owner / justification |
|---|---|---|---|---|---|
| D4V-L01 | Part 2C / 2B | Exact Fact read boundary | No physical D2 read port; exact logical record IDs, versions, checksums, governance, and lineage remain mandatory | `DEFERRED_TO_D5_INTEGRATION` | D5 physical integration; D4 must not connect to or recreate D2 |
| D4V-L02 | Part 2C / 2B | PostgreSQL privileges | Physical role denial had not been certified | `OBSOLETE` | Phase 2V created bounded worker/verifier roles and demonstrated actual denials |
| D4V-L03 | Part 2C | Recompute crash recovery | Durable lease expiration/reclaim and stale-worker fencing absent | `OBSOLETE` | Migration 007 and live tests certify monotonic fencing, heartbeat, reclaim, and stale-worker rejection |
| D4V-L04 | Part 2C / Part 04 | Performance | Fixture-scale plans cannot establish production throughput | `ACCEPTED_FOR_PHASE_3` | All known bounded paths use eligible indexes; no throughput claim is made |
| D4V-L05 | Part 03 / Part 02 | Rule onboarding | No production evaluator or active production RuleSet | `ACCEPTED_FOR_PHASE_3` | Certification uses a bounded deterministic evaluator; production Rule onboarding remains separate |
| D4V-L06 | Part 04 | Temporal persistence | Alignment is a deterministic immutable value referenced semantically by Results, not a standalone authoritative row | `ACCEPTED_FOR_PHASE_3` | Result identity/checksum preserve alignment identity, policy, exact inputs, Event Time, and Knowledge Time |
| D4V-L07 | Part 01 | Cross-database separation | Full rebuild and read-only D2/D3 probes were certified earlier but not rerun in Phase 2V | `DEFERRED_TO_D5_INTEGRATION` | This phase was prohibited from accessing D2/D3 databases; D4 target classification and imports prove no D2/D3 connection path was used |
| D4V-L08 | Phase 2V | Runtime credentials | Isolated tests assume NOLOGIN bounded roles through per-connection PostgreSQL `role` startup binding | `DEFERRED_TO_D5_INTEGRATION` | D5 must provision separate production credentials; actual privilege denial is already certified |

No `BLOCKING` limitation remains. None of the accepted or deferred items permits future knowledge, mutable history, ambiguous Fact versions, duplicate authority, silent conflict overwrite, false completion, incomplete traversal reported as complete, or unsafe D4 mutation privileges.

## Phase 2V Changes

Phase 2V-specific files changed:

- `lib/data-platform/consistency-evidence/postgres/client.ts`
- `lib/data-platform/consistency-evidence/postgres/dependencyStore.ts`
- `lib/data-platform/consistency-evidence/postgres/migrationOrder.ts`
- `lib/data-platform/consistency-evidence/postgres/reset.ts`
- `lib/data-platform/consistency-evidence/postgres/migrations/007_phase2v_certification_hardening.sql`
- `lib/data-platform/consistency/dependencyContracts.ts`
- `workers/data-platform-tests/d4SqlChecks.ts`
- `tests/data-platform/consistency-evidence/postgres/runUnitSuite.ts`
- `tests/data-platform/consistency/runs/runIsolatedPostgresSuite.ts`
- `tests/data-platform/consistency/results/runIsolatedVerificationSuite.ts`
- `tests/data-platform/consistency/dependencies/runIsolatedVerificationSuite.ts`
- `tests/data-platform/consistency/certification/runIntegratedSuite.ts`
- `docs/project/d4-phase-2v-certification-report.md`

Earlier uncommitted D4 files remain part of their original Part 01-2C history and are not reclassified as Phase 2V work.

## Bounded Corrections

| Failure | Root cause | Correction | Invariant restored |
|---|---|---|---|
| Role denials varied across pooled connections | One-time `SET ROLE` affected only one physical connection | Apply role and timeout settings as startup parameters on every pooled connection | Privilege boundary and bounded timeout |
| Read-only preflight required `control` schema usage | `to_regclass` probe crossed the verifier boundary | Use read-only `pg_catalog` existence probes | Least privilege |
| Recompute owner could be lost after crash | Phase 2C claim had no lease/fence lifecycle | Add controlled lease state, append-only events, monotonic fencing functions, heartbeat and reclaim | Single owner, stale-worker rejection |
| Legacy Run suite cleanup failed after Result integration | Manual deletes bypassed D4 reset dependencies | Use certified D4-native reset and migration runner | Isolated deterministic reset |
| Legacy immutability tests expected only trigger code `55000` | New role denial rejects earlier with `42501` | Accept either valid physical denial layer | Immutable history |
| Certification policy fixture was absent | Repeated-digit checksum collided with an existing D2 policy checksum and `ON CONFLICT` skipped it | Use deterministic content checksums | Exact governance binding |

Migration 007 is additive. No historical migration was rewritten to resolve a certification failure.

## Migration Inventory

| Migration | SHA-256 |
|---|---|
| `001_consistency_contracts.sql` | `61a2f300037fd7b98cd7ca361bca69df94607f8c54b4dbef02a1aac2e1019cdb` |
| `002_evidence_contracts.sql` | `eec8339863c8003afa922fa8dd739be55503a83c4970840a3cd206a51daf2d74` |
| `003_projection_and_roles.sql` | `2cd927ae638017ffc5b8d18f4bc19c65953b58ea4936fa5d845076ed68d2b214` |
| `004_consistency_run_lifecycle.sql` | `b8cfa0fc3399124f8a9d83ddfb03d245bd259d2d94bbfd63bfd5193f3786054f` |
| `005_immutable_consistency_results.sql` | `5564fd7ac422c6ce6ea3ea26912d64b8168e98d6a5538c37b54f7f9e8dc6b1f6` |
| `006_dependency_recompute.sql` | `06a44960e9f66991007726ef126526748bb19ec951e5b59d715b1a8ba4063896` |
| `007_phase2v_certification_hardening.sql` | `b66becbba8bee45cf9f9fea90a0226fd085ea8cc8f3d251a91fe7ca34d40d78e` |

Fresh apply, deterministic rerun skip, checksum-drift rejection, interrupted-migration rollback, ledger completeness, D4-native reset, and reapplication all passed. Native reset preserved the certified D2 foundation inside the D4 disposable target.

## Integrated Certification

The deterministic fixture certified this chain:

`Exact Fact reference -> temporal alignment -> Rule evaluation -> Run -> immutable Result -> dependency snapshot -> impact -> recompute -> historical/current selection`

- Exact Fact versions and roles are identity defining.
- `AS_KNOWN_THEN` no-lookahead fixtures pass for delayed publication, late correction, macro revision, ETF publication, nearest-prior, timestamp boundaries, interval boundaries, unknown publication time, and UTC boundaries.
- V1 remains immutable and historically selectable after a corrected V2 Result is created.
- `LATEST_CORRECTED` and `RETROSPECTIVE` remain explicit identities and cannot masquerade as historical knowledge.
- Run specifications and events reconcile; terminal races create one governed transition.
- Result `CREATED`, `DUPLICATE`, `REUSED`, and `CONFLICT` semantics remain distinct.
- Dependency and supersession remain distinct. Graph identities, snapshots, impact, cycle checks, traversal completeness, and plans are deterministic.
- Correction impact recomputes only the affected bounded plan. Old Results remain unchanged.

## Concurrency And Recovery

Real parallel PostgreSQL operations passed for concurrent Run creation/start/completion, Result creation/conflict, edge registration, recompute requests, and terminal races. No duplicate logical authoritative object survived.

Recompute steps now use durable leases and monotonic fencing tokens. Expired leases are reclaimed, stale heartbeats and stale completion are rejected, active heartbeats extend only the matching fence, and Result linkage plus completion remains atomic.

Failure injection passed at Run, Result, graph snapshot, edge, plan, Result-link, and terminal boundaries. Persisted queries proved no partial authoritative state. Unknown commit responses reconcile by deterministic identity and checksum; they are never assumed successful.

## Privileges

- `qt_d4_consistency_worker` and `qt_d4_read_only` are bounded NOLOGIN roles used through per-connection startup role binding.
- The worker can execute controlled Run, Result, dependency, recompute, and lease operations.
- Worker update/delete of immutable Results/events/dependencies, schema alteration, migration-ledger mutation, and Evidence writes were denied.
- The verifier can perform bounded reads and cannot insert or execute mutation functions.
- Runtime sessions used statement timeout `15s`, lock timeout `5s`, and idle-in-transaction timeout `15s`.

## Reconciliation And Plans

Read-only reconciliation passed for Run state versus events, Result content/checksum/input links, dependency snapshots/plans, orphan edges, Result links, false completion, and lease completion. A transaction-local deliberate dependency checksum corruption was detected and rolled back; no silent repair occurred.

`EXPLAIN` with sequential scans disabled demonstrated eligible indexes for Result identity, exact Fact input links, Run event history, reverse dependency lookup, recompute identity, expired lease claims, and historical Result selection. Fixture timings are not production performance evidence.

## Validation

| Validation | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | PASS |
| D1 regression | PASS |
| D2 Phase 1 | PASS |
| D2 Phase 2 unit | PASS |
| D3 Phase 1 | PASS |
| D3 Phase 2 unit / certification-safe regression | PASS |
| D4 Phase 1 | PASS |
| D4 Part 01 unit | PASS |
| D4 Part 02 Rule suite | PASS |
| D4 Part 03 Run unit and isolated PostgreSQL | PASS |
| D4 temporal / no-lookahead | PASS |
| D4 Phase 2B Result unit and isolated PostgreSQL | PASS |
| D4 Phase 2C dependency unit and isolated PostgreSQL | PASS |
| D4 Phase 2V integrated PostgreSQL | PASS |
| Migration inventory/order/checksum | PASS |
| Physical role and privilege denial | PASS |
| Failure/crash injection | PASS |
| Persisted reconciliation and corruption detection | PASS |
| Bounded query-plan review | PASS |
| Active consumer import scan | PASS: no imports |
| Protected-system scan | PASS: no protected diffs |
| Package and lockfile review | PASS: unchanged |
| Credential/environment-file scan | PASS: no credentials added or logged |
| `git diff --check` | PASS; line-ending warnings only |
| Production build | NOT RUN: prohibited by `AGENTS.md` |
| D2/D3 live certification suites | NOT RUN: Phase 2V prohibited D2/D3 database access; certified unit regressions passed |

## Protected Systems

No D2/D3 runtime or migration, Repository, SQLite, historical backfill, Coverage, Projection, existing Evidence runtime, API, page, Dashboard, Replay, Research, Markets, Scanner, Trade, scheduler, production worker, package, lockfile, environment file, Next.js, or Vercel configuration was modified. No consumer imports the isolated D4 runtime. No Evidence functionality was introduced.

## Remaining Limitations

- Physical D2 exact-Fact read-port integration remains a D5 concern; D4 preserves exact deterministic logical references without cross-database coupling.
- Production credentials must authenticate through separately provisioned bounded roles at deployment; the isolated target certified the resulting privileges via PostgreSQL role startup binding.
- Query plans are fixture-scale and do not certify production throughput.
- Production Rule onboarding and operational scheduling remain outside Phase 2V.

These limitations do not undermine deterministic identity, no-lookahead, immutability, concurrency safety, privilege denial, or reconciliation.

## Final Gate

`SAFE TO IMPLEMENT D4 PHASE 3 WITH LIMITATIONS`

Phase 3 may consume certified immutable Consistency Results through bounded contracts. It must not weaken exact Fact references, Knowledge-Time identity, conflict handling, history immutability, graph completeness, or role boundaries.
