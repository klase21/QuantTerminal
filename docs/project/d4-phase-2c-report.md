# D4 Phase 2C Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- Initial HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial worktree: existing uncommitted D4 Part 01 through Phase 2B implementation
- Target: redacted `localhost:55432/quantterminal_d4_isolated`

## Inherited Limitations

| Limitation | Classification | Disposition |
|---|---|---|
| Logical exact-Fact references; no physical D2 read port | Non-blocking | Preserved; physical integration deferred to Phase 2V/D5 |
| Full database role grant/denial certification absent | Deferred to Phase 2V | Append-only triggers and bounded logical role intent enforced |
| Fixture-scale performance only | Non-blocking | No production throughput claim |
| Dependency graph and recompute absent | Blocking | Resolved in Phase 2C |
| Crash lease/reclaim absent | Deferred to Phase 2V | Single immutable claim boundary certified; no implicit retry loop added |

No inherited limitation permits ambiguous Fact versions, future-knowledge leakage, nondeterministic impact, or mutable historical Results.

## Changed Files

- `lib/data-platform/consistency/dependencyContracts.ts`
- `lib/data-platform/consistency/dependencyRuntime.ts`
- `lib/data-platform/consistency/index.ts`
- `lib/data-platform/consistency-evidence/postgres/dependencyStore.ts`
- `lib/data-platform/consistency-evidence/postgres/migrations/006_dependency_recompute.sql`
- `lib/data-platform/consistency-evidence/postgres/migrationOrder.ts`
- `lib/data-platform/consistency-evidence/postgres/reset.ts`
- `lib/data-platform/consistency-evidence/postgres/index.ts`
- `workers/data-platform-tests/d4SqlChecks.ts`
- `tests/data-platform/consistency-evidence/postgres/runUnitSuite.ts`
- `tests/data-platform/consistency-evidence/postgres/runIsolatedVerificationSuite.ts`
- `tests/data-platform/consistency/results/runIsolatedVerificationSuite.ts`
- `tests/data-platform/consistency/dependencies/runUnitSuite.ts`
- `tests/data-platform/consistency/dependencies/runIsolatedVerificationSuite.ts`
- `docs/architecture/consistency-dependency-graph.md`
- `docs/architecture/consistency-impact-analysis.md`
- `docs/architecture/consistency-incremental-recompute.md`
- `docs/architecture/consistency-result-selection.md`
- `docs/project/d4-phase-2c-report.md`

Pre-existing uncommitted D4 files were preserved.

## Architecture

Semantic node and edge identities are distinct from immutable content checksums, enabling physical `DUPLICATE` versus `CONFLICT` behavior. Dependency and supersession edges remain separate and both cycle classes fail closed. Snapshots bind exact versions, checksums, completeness, and graph schema independent of insertion order.

Reverse traversal supports direct/transitive impact for corrections, newly available Facts, Rule versions, policy versions, and dependency changes. Incomplete metadata never triggers broad recomputation. Plans include only impacted Rules, deterministic topological steps, exact Fact/policy/prior-Result bindings, and explicit skipped Rules.

Correction discovery binds the prior snapshot while recompute identity and planning bind the replacement snapshot. Live certification created new V2 Results through the existing Phase 2B Result store and rejected any completion whose Result Rule or exact Fact versions did not match its step.

Migration `006` adds D4-owned graph, snapshot, request, plan, claim/event, Result-link, conflict, and selection-decision tables. All history is append-only. Request plus complete plan is atomic; Result link plus successful completion is atomic. Existing Run/Result boundaries remain authoritative.

Selection binds subject, Event Time, Knowledge Time, Rule policy, exact input knowledge eligibility, and explicit supersession state. It does not use latest-created ordering.

## Certification

| Check | Result |
|---|---|
| TypeScript | PASS |
| D1 regression | PASS |
| D2 Phase 1 / Phase 2 unit | PASS |
| D3 Phase 1 / Phase 2 unit | PASS |
| D4 Phase 1 / Parts 01-04 unit | PASS |
| Inherited Part 01B isolated suite | NOT RERUN after bounded assertion fix; initial run failed only three stale four-migration count assertions while all operational checks passed |
| D4 Phase 2B unit and isolated PostgreSQL | PASS |
| D4 Phase 2C unit and isolated PostgreSQL | PASS |
| Six migrations apply and rerun skips | PASS |
| Node/edge/snapshot deterministic identity | PASS |
| Dependency and supersession cycle rejection | PASS |
| Direct/transitive and correction impact | PASS |
| Incomplete graph / no-impact handling | PASS |
| Deterministic topological plan | PASS |
| Parallel edge duplicate/conflict | PASS |
| Parallel recompute deduplication | PASS |
| Parallel single-owner step claim | PASS |
| Completion/cancellation terminal race | PASS |
| Graph and plan rollback injection | PASS |
| Unknown commit reconciliation | PASS |
| Result linkage and persisted reconciliation | PASS |
| Immutable update denial | PASS (`55000`) |
| Package and lockfile changes | PASS: none |
| Consumer/runtime imports | PASS: none |

The inherited Part 01B integration suite was run once and performed its built-in read-only separation probes against separately configured D2/D3 targets. Its operational checks passed, including both targets unchanged, but the suite reported `FAIL` because three assertions still expected four D4 migrations. Those assertions now use `D4_MIGRATION_ORDER.length`. The suite was not rerun because Phase 2C forbids D2/D3 access. No D2/D3 write or migration was performed.

## Limitations

- Full physical PostgreSQL role creation/grant/denial certification is deferred to Phase 2V.
- Durable claim lease expiration and crash reclaim are deferred to Phase 2V; Phase 2C certifies one immutable owner and deterministic retry/reconciliation.
- Physical D2 exact-Fact read-port integration remains deferred.
- Fixture-scale concurrency does not certify production throughput.

## Protected Systems

No consumer, API, page, scheduler, production worker, Evidence assembly, Projection, Coverage, provider, package, lockfile, D2 runtime/migration, or D3 runtime/migration was modified. No production database, provider, object storage, or AI was invoked.

## Final Gate

`SAFE TO IMPLEMENT D4 PHASE 2V WITH LIMITATIONS`
