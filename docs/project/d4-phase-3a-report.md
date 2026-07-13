# D4 Phase 3A Implementation Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD before Phase 3A: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial worktree: contained the existing uncommitted D4 Part 01 through Phase 2V implementation. No pre-existing work was reset, reverted, or overwritten.
- Isolated target: `localhost:55432/quantterminal_d4_isolated`; credentials redacted.
- D2/D3 isolated databases, production databases, providers, object storage, AI, consumers, Evidence publication, and projections were not accessed.
- Final worktree: remains intentionally dirty with the inherited uncommitted D4 Part 01-2V files plus the Phase 3A files listed below; no files are staged and the generated `tsconfig.tsbuildinfo` validation change was removed.

## Inherited Limitations

| ID | Source | Classification | Disposition |
|---|---|---|---|
| D4V-L01 | Phase 2V | Non-blocking for 3A | `DEFERRED_TO_D5`: exact logical Fact references are preserved; physical D2 read-port integration remains D5 work. |
| D4V-L02 | Phase 2V | Obsolete | Physical role denial was certified in 2V and extended for the Evidence assembler in 3A. |
| D4V-L03 | Phase 2V | Obsolete | Recompute lease/fencing was certified in 2V and is outside assembly. |
| D4V-L04 | Phase 2V | Non-blocking | Fixture-scale query plans do not establish production throughput. |
| D4V-L05 | Phase 2V | Non-blocking | Production Rule onboarding is outside Core Evidence assembly. |
| D4V-L06 | Phase 2V | Non-blocking | Deterministic alignment remains embedded in immutable Result bindings rather than a separate row. |
| D4V-L07 | Phase 2V | Non-blocking | D2/D3 separation probes are deferred to D5; Phase 3A had no D2/D3 connection path. |

No inherited limitation permits ambiguous Result selection, future-knowledge leakage, mutable history, nondeterministic Evidence identity, silent conflict overwrite, or Fact/Result traceability loss.

## Changed Files

Phase 3A added or changed:

- `lib/data-platform/evidence-platform/assemblyContracts.ts`
- `lib/data-platform/evidence-platform/assemblyRuntime.ts`
- `lib/data-platform/evidence-platform/assemblyReconciliation.ts`
- `lib/data-platform/evidence-platform/index.ts`
- `lib/data-platform/consistency-evidence/postgres/evidenceStore.ts`
- `lib/data-platform/consistency-evidence/postgres/client.ts`
- `lib/data-platform/consistency-evidence/postgres/index.ts`
- `lib/data-platform/consistency-evidence/postgres/migrationOrder.ts`
- `lib/data-platform/consistency-evidence/postgres/reset.ts`
- `lib/data-platform/consistency-evidence/postgres/migrations/008_core_evidence_assembly.sql`
- `workers/data-platform-tests/d4SqlChecks.ts`
- `tests/data-platform/consistency/certification/runIntegratedSuite.ts`
- `tests/data-platform/consistency/evidence/fixtures.ts`
- `tests/data-platform/consistency/evidence/runUnitSuite.ts`
- `tests/data-platform/consistency/evidence/runPostgresSuite.ts`
- `docs/architecture/evidence-candidate-model.md`
- `docs/architecture/core-evidence-packet.md`
- `docs/architecture/evidence-identity-versioning.md`
- `docs/architecture/evidence-lineage.md`
- `docs/project/d4-phase-3a-report.md`

Other dirty files belong to the inherited uncommitted D4 implementation history.

## Implementation

The bounded assembly contracts are closed discriminated unions with no `any`. Profile-owned rules classify immutable Results as supporting, conflicting, contextual, or blocking. Missing, unsupported, and inapplicable requirements remain separate. Inputs must match the request's Event-Time and Knowledge-Time exactly; `AS_KNOWN_THEN` rejects future-known Facts.

Business identity represents the same analytical question. Packet version identity adds exact Candidate, Result, Fact, profile, policy, temporal, and checksum dimensions. Canonical sorting makes identities independent of semantically irrelevant input order. No generated prose, provider tier, consumer, route, confidence, or execution metadata participates.

Migration 008 is additive and has SHA-256 `df2b2f3fb8e9d6e517b279a7476b6032c47fbe5eaeb7d632699f07c46df718cd`. It was necessary because the legacy Phase 1 Evidence blueprint points at the pre-certification Result table. It creates only D4 Evidence-owned immutable objects and a bounded `qt_d4_evidence_assembler` role.

## Persistence and Certification

- Concurrent identical assembly produced one `CREATED` and one `REUSED` Packet.
- Repeated command produced `DUPLICATE`; incompatible immutable content produced idempotent `CONFLICT` without overwrite.
- P1 and corrected P2 share business identity for the same question, have distinct Packet version identities, and P1 remains queryable.
- Every implemented write failure boundary rolled back with no authoritative Packet row or orphan link.
- A simulated lost commit acknowledgement reconciled to persisted identity/checksum and returned reconciled `DUPLICATE`.
- Actual PostgreSQL role tests denied assembler update/delete, schema alteration, and migration-ledger mutation; the verifier was read-only.
- Reconciliation found no orphan Packet, Result, or Fact links. `EXPLAIN` demonstrated eligible indexes for Packet identity, exact Fact lookup, and conflict history.

One bounded correction was required: persistence lineage row IDs now bind Packet version plus semantic edge checksum. Without that binding, reuse of one immutable Result in multiple Packets collided even though semantic lineage was valid.

## Validation

| Validation | Result |
|---|---|
| TypeScript | PASS |
| D1 regression | PASS |
| D2 Phase 1 | PASS |
| D2 Phase 2 certification-safe unit | PASS |
| D3 Phase 1 | PASS |
| D3 Phase 2 certification-safe unit | PASS |
| D4 Phase 1 | PASS |
| D4 runtime foundation | PASS: unit and isolated PostgreSQL |
| D4 Rule and Run lifecycle | PASS: unit and isolated PostgreSQL |
| D4 temporal alignment / no-lookahead | PASS |
| D4 immutable Results | PASS: unit and isolated PostgreSQL |
| D4 dependency/recompute | PASS: unit and isolated PostgreSQL |
| D4 Phase 2V integrated regression | PASS |
| D4 Phase 3A unit | PASS |
| D4 Phase 3A isolated PostgreSQL | PASS |
| Migration ordering/checksum | PASS |
| Failure injection and unknown-outcome reconciliation | PASS |
| Real concurrent Evidence assembly | PASS |
| Physical Evidence role denials | PASS |
| Evidence reconciliation and query-plan review | PASS |
| Protected-system scan | PASS |
| Active consumer import scan | PASS: no imports |
| Package and lockfile review | PASS: unchanged |
| Credential and environment-file scan | PASS |
| `git diff --check` | PASS: line-ending warnings only |
| Production build | NOT RUN: prohibited by `AGENTS.md` |
| D2/D3 live suites | NOT RUN: Phase 3A prohibits D2/D3 database access; certification-safe unit regressions passed |

## Limitations and Next Step

- Physical D2 Fact reads and production credential provisioning remain D5 integration concerns.
- Query-plan observations are fixture-scale and do not certify production throughput.
- Phase 3A certified real parallel identical assembly and parallel conflict auditing. The broader correction/profile-change race matrix may be repeated in a later integrated D4 certification phase; exact immutable snapshots and advisory identity locks are already enforced.
- Automatic Evidence recompute, preferred Packet selection, confidence, explainability, and richer correction/replacement policy remain Phase 3B work.
- Phase 3A deliberately provides no publication, projection, consumer, provider, AI, or generated narrative behavior.

These limitations do not undermine Core Packet identity, exact references, no-lookahead, immutability, transaction atomicity, conflict safety, or reconciliation.

## Gate

`SAFE TO IMPLEMENT D4 PHASE 3B WITH LIMITATIONS`
