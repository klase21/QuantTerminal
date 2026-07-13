# D4 Phase 2 Part 03 Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Initial worktree: existing uncommitted certified Part 01 and Part 02 D4 changes

## Inherited Limitations

| Limitation | Classification |
|---|---|
| No production evaluator or active rule | Non-blocking for lifecycle; deferred to rule onboarding |
| Part 02 execution records not persisted | Non-blocking for Run lifecycle; Result persistence deferred |
| PostgreSQL role certification absent | Non-blocking; deferred to privilege certification |
| Historic replay uses immutable original records | Non-blocking and preserved |
| No durable Run persistence | Blocking; resolved by Part 03 |

## Implementation

Part 03 adds deterministic Run contracts and identity, a closed lifecycle, append-only events, completion summaries, read-only reconciliation, and `ConsistencyRunStore`. Run identity excludes workers and execution timestamps. Physical attempts remain unapproved and were not added.

Creation uses transaction-scoped advisory locking. Identical specifications return `DUPLICATE`; incompatible checksums produce an auditable `CONFLICT` without overwriting the original. Transitions lock materialized state, validate specification, RuleSet checksum, policies, legal transition, and terminal obligations, then append event and update state atomically.

Cancellation and expiration are bounded state transitions, not process interruption. Expiration requires an explicit reason/policy reference and rejects late completion.

## Migration

Added `004_consistency_run_lifecycle.sql` with D4-owned specification, state, event, summary, and conflict tables. Existing migration contents and ledger semantics were not changed. The migration was applied only to `quantterminal_d4_isolated`.

## Live Certification

- Concurrent identical creation: one `CREATED`, one `DUPLICATE`.
- Conflicting specification: original preserved, conflict recorded.
- Concurrent start: one start transition and one start event.
- Concurrent completion: one terminal transition and one terminal event.
- Completion/cancellation race: one governed terminal outcome.
- Expiration: terminal; late completion rejected.
- Failure injection after specification, created event, state creation, transition event, state update, and summary: full rollback verified by queries.
- Materialized state and event history reconciliation: PASS.

## Validation

TypeScript, D1, D2 Phase 1/2, D3 Phase 1/2, D4 Phase 1, Part 01, Part 02, Part 03 unit, migration checks, and live isolated PostgreSQL suite passed. No providers, object storage, AI, Evidence assembly, projections, publication, or consumers were invoked.

## Bounded Corrections

- Specifications now persist the same normalized subject and timestamps used by identity, enabling exact checksum reconstruction.
- Test setup SQL was split into bounded statements and normalized RuleSet identity.
- Start validation was strengthened to require exact RuleSet checksum and all policy identities.

## Protected Systems

D2/D3 runtime and databases, Repository, SQLite, Coverage, Projection runtime, Evidence runtime, APIs, pages, schedulers, production workers, packages, lockfiles, environment, Next.js, and Vercel are unchanged.

## Limitations

- Single execution lifecycle only; attempts and retry scheduling are deferred.
- Result persistence/caching and full temporal alignment are not implemented.
- Full database role-denial certification remains deferred.
- Completion summaries are explicit lifecycle inputs and do not fabricate persisted Results.

## Next Step

Part 04 may build on reconciled terminal Runs but must not infer missing Results or introduce Evidence outside its approved boundary.

## Final Gate

SAFE TO IMPLEMENT D4 PHASE 2 PART 04 WITH LIMITATIONS
