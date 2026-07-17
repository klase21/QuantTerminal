# MVP Refresh Run Report

## MVP-8A.2S Clean Generation

Implementation adds guarded successor creation, exact generation status/preflight/execution commands, generation-scoped Retrieval and Candidate lineage, and an atomic Refresh creation receipt. Runtime outcomes are recorded only after disposable certification and the guarded local workflow complete.

PostgreSQL certification time: 2026-07-16T00:39:34.756Z

## Outcome

`NOT_READY_FOR_ACQUISITION`

After the two-hour finalization delay, no UTC day beyond the active `2026-07-15T00:00:00.000Z` boundary was eligible at audit time. The planner returned `NO_CLOSED_WINDOW_AVAILABLE`. The next candidate interval is `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)` and cannot become eligible before `2026-07-16T02:00:00.000Z`. No acquisition, canonical commit, Evidence generation, Projection generation, Replay materialization, candidate build, publication, exposure, or Production activation occurred.

MVP-8A.1 removed the prior Funding-path blocker with a separate provider-native adapter. It was fixture-certified for all six instruments and PostgreSQL-certified through fenced `COMPLETE` state. The primary interval was still not finalized at `2026-07-16T01:15:25.194Z`, so no live request was made.

The previously missing bounded OHLCV, OI, AggTrades Segment, Consistency, Evidence, Projection, and Replay entry points are now extracted and fixture-certified.

At `2026-07-16T06:03:52.840Z`, wall-clock eligibility had passed. Binance Vision returned HTTP 404 for the exact target-day OHLCV, Open Interest metrics, and AggTrades archives for all six instruments; the immediately preceding archives returned HTTP 200. The state is therefore `TIME_ELIGIBLE`, `SOURCE_NOT_FINALIZED`, `NOT_READY_FOR_ACQUISITION`. Funding REST remains available. No target-day refresh units, payloads, Facts, candidate, or manifest were created.

The remaining bounded adapters and affected-window gates are now extracted and fixture-certified. The local inactive serving transaction contract is fixture-certified to preserve active exposure, but `MVP_SERVING_ISOLATED_POSTGRES_URL` was absent, so no local serving database transaction was attempted.

## MVP-8A.2C downstream certification

The bounded Evidence loader now accepts a complete exact-window contract while preserving the broad worker defaults and rolling baselines. Shared Consistency/Evidence and Projection persistence services were certified against the already governed BTCUSDT 2026-07-11 window: Evidence and Projection both returned `DUPLICATE`, and the existing 420 Results, 84 Packets, 868 crypto Projections, and 84 Replay snapshots remained unchanged.

Local serving migration `003` adds immutable corpus membership and candidate manifest records. Fault injection after header, membership, and manifest writes rolled back atomically, retained no fixture candidate, and left the active exposure unchanged. No live target-day candidate was assembled.

The target-window recovery audit found five OHLCV units across separate runs, all for BTCUSDT: four `COMMITTED` and one `ACQUIRED`. The committed attempts each have a `factDigest` checkpoint, but the four values differ; none has an artifact row or recorded source contract version. The acquired attempt has an artifact-checksum checkpoint but no artifact row or active lease. The other five instruments have no OHLCV unit, and no target-window OI, Funding, or AggTrades unit exists. This actual state was preserved without acquisition or unit creation.

## MVP-8A.2D reconciliation

The run-independent planner resolved 24 deterministic logical slots. The current result is zero reused slots, 23 missing slots, and one blocked BTCUSDT OHLCV slot. The committed attempts are `CONFLICTING_COMMITTED_ATTEMPTS` on canonical-output digest and missing contract-version evidence. No authoritative unit was selected. The acquired attempt is `CONTROL_PLANE_CONFLICT` and cannot resume or override a committed slot.

The clean-case algorithm is certified with fixtures as one `REUSE_COMMITTED` plus 23 `CREATE_NEW_ON_LIVE_RESUME`; it emits no BTCUSDT OHLCV unit in that case. On the actual control plane, the conflict prevents all unit creation. Read-only PostgreSQL certification confirmed unit, event, artifact, and lease row counts were unchanged.

## MVP-8A.2F controlled reacquisition

The unresolved BTCUSDT OHLCV slot was reacquired once through the committed bounded adapter under an explicit checksummed source contract. The finalized archive contained 13,617 bytes and exactly 288 aligned five-minute candles. Its provider stable-domain digest matched the prior non-retaining 8A.2E audit digest.

The recovery persisted one Retrieval, one Raw Artifact reference, 288 deterministic Candidates, one canonical commit set, and 288 attributable immutable canonical Facts. The canonical result was `CREATED` with no conflict. An append-only logical-slot reconciliation now makes this provenance chain authoritative while leaving all four unattributable legacy `COMMITTED` attempts and the evidence-free `ACQUIRED` attempt unchanged.

The exact worker rerun returned `DUPLICATE` before payload acquisition. The 24-slot dry run now returns one `REUSE_AUTHORITATIVE_RECOVERY_OUTPUT`, 23 `CREATE_NEW_ON_LIVE_RESUME`, and zero conflicts. No watermark, downstream product, serving corpus, exposure, Neon, Vercel, or Production write occurred.

## MVP-8A.2H Coordinator Certification

The dedicated coordinator verifies the certified 1+23 graph, caps local concurrency at two, resolves logical slots before insertion, and sequences 17 checksum-linked stages through inactive candidate comparison. Fixture certification injected a failure after every stage and resumed deterministically without duplicate unit intents or executor calls. A mandatory slot failure prevented both common-watermark persistence and downstream invocation.

The dedicated worker implements exact-day parsing, safe plan/preflight/dry-run/status surfaces, sanitized output, and an explicit live double-confirmation gate. No live target-day acquisition or unit creation was performed. The live command remains blocked because the archive adapters are parsers/builders rather than complete callable Retrieval-to-canonical executors; broad worker invocation is prohibited.

PostgreSQL checkpoint certification created and replayed a coordinator stage event inside a disposable transaction. The exact repeat returned `DUPLICATE`, the stored checksum reproduced, append-only mutation was rejected, and the transaction retained zero rows.

## MVP-8A.2I Environment Binding Certification

The shared environment contract represents 26 mandatory bindings and exposes no activation operation. Fixture certification completed the exact 1+23 graph with 23 executor calls, zero BTCUSDT OHLCV acquisition calls, and deterministic recovery across all 17 coordinator stages.

The non-mutating live preflight confirmed one authoritative reuse, 23 create intents, all 18 archives ready, and all six Funding checks ready. Refresh control and local object storage passed. D2, D3, and D4 failed authentication with sanitized SQLSTATE `28P01`; the serving database identity passed but its role did not match the required publisher. No fallback database, unit, payload, watermark, candidate, Neon, Vercel, or Production write was attempted.

## MVP-8A.2J Concrete Port Composition

The new concrete port layer implements fourteen callable dataset, watermark, downstream, and candidate boundaries. The complete fixture graph produced 23 executor calls, no BTCUSDT OHLCV acquisition, four complete dataset watermarks, one common watermark, five downstream stages, and one inactive candidate flow. Exact rerun was deterministic and all injected stage failures remained fail closed.

Environment factory modes and close lifecycle are certified. The environment-backed worker bootstrap is still missing, so `run` and `resume` remain fail closed after the explicit confirmation gate. Current D2/D3/D4 authentication and serving publisher role diagnostics are unchanged. No live target-day work occurred.

## MVP-8A.2K Local Adapter Bootstrap

The process-environment factory now owns concrete D2, D3, D4, refresh-control, object-storage, bounded dataset, downstream, Replay, and inactive serving-publisher bindings. Worker `run` and `resume` no longer contain the bootstrap-required failure and cannot inject partial bindings. Database capability probes are rollback-only, object-store probes require cleanup, and activation is absent.

The actual no-write preflight still fails closed before port construction because D2, D3, and D4 return sanitized SQLSTATE `28P01`, while the isolated serving target reports `WRONG_ROLE`. Refresh control, object storage, the authoritative recovery record, the 1+23 planner, all 18 archive checks, and all six Funding checks pass. No target-day unit, payload, Fact, watermark, downstream record, candidate, exposure, or external system was changed.

## MVP-8A.2L Integrated Durable Bootstrap Correction

The 8A.2K authentication findings were caused by an incorrect live topology contract: isolated D2/D3 certification URLs were passed to guards that correctly require the integrated durable profile. The live bootstrap now uses the existing integrated client factory with `D2_CANONICAL_POSTGRES_URL`, `D3_POPULATION_POSTGRES_URL`, and `D3_BACKFILL_OBJECT_ROOT`. D2 and D3 share `quantterminal_backfill` under distinct approved roles; D4, refresh, and serving remain isolated.

The corrected authenticated no-write preflight passed all 26 mandatory bindings, all five database/runtime identities, durable object storage cleanup, one authoritative recovery record, the exact 1+23 planner, all 18 archive checks, and all six Funding checks. No target-day unit, payload, Fact, watermark, downstream record, candidate, exposure, Neon, Vercel, or Production write occurred.

## MVP-8A.2M Parent-Child Transaction Repair

The first live setup failed before lease acquisition because a synthetic coordinator execution identity was used as `refresh_unit.run_id` without a persisted `refresh_run` parent. PostgreSQL enforced the foreign key and retained no invalid child row. Read-only audit found no orphan unit, no retained live 23-slot run, no failed-attempt watermark, and one intact authoritative BTCUSDT OHLCV recovery record.

Plan, run, and 23 units are now resolved in one serializable transaction. Unit persistence can use only the persisted run identity returned by the transaction. Exact resume reuses the same run and unit identities; `run` refuses a second equivalent execution. Certification injected failures after plan, run, and first-unit insertion and retained zero rows in every case.

The status command now reads persisted live state. Current status is no persisted live run, one authoritative reuse, 23 missing acquisition slots, no lease, no coordinator checkpoint, no run-scoped candidate, and no common watermark. No acquisition, downstream generation, candidate assembly, exposure change, or external-system mutation occurred.

## Reproducible commands

```powershell
npx tsc --noEmit
npx tsx tests/data-platform/mvp-refresh/runUnitSuite.ts
npx tsx tests/data-platform/mvp-refresh/bounded/runUnitSuite.ts
npx tsx workers/data-platform/runMvpBoundedAvailability.ts --start=2026-07-15T00:00:00.000Z --end=2026-07-16T00:00:00.000Z
npx tsx workers/data-platform/runMvpRefresh.ts plan
npx tsx workers/data-platform/runMvpRefresh.ts availability
npx tsx workers/data-platform/runMvpRefresh.ts migrate
npx tsx workers/data-platform/runMvpRefresh.ts run
npx tsx workers/data-platform/runMvpControlledOhlcvRecovery.ts preflight
npx tsx workers/data-platform/runMvpControlledOhlcvRecovery.ts run
npx tsx tests/data-platform/mvp-refresh/controlled-reacquisition/runUnitSuite.ts
npx tsx tests/data-platform/mvp-refresh/controlled-reacquisition/runPostgresSuite.ts
```

Only the first four commands are environment-independent. `migrate` and `run` require the isolated URL to be present in the worker environment. No command prints it.

## Results

- TypeScript: PASS.
- Pure refresh suite: PASS, 58 assertions.
- Migration artifact checksum: `894968a8b5540af3a396a6cb2860f0850d553b126ff66cd7795a6059519abf7f`.
- PostgreSQL driver: `postgres` 3.4.9.
- Static client trace: the original environment string is passed directly to the driver; safety parsing is separate; no username, password, database, or environment object is overridden; no decoded or redacted URL is used for connection.
- Environment inheritance: PASS in root shell and Node child.
- Prior authentication SQLSTATE: `28P01`, resolved before certification.
- Current same-factory preflight: PASS with expected database, role, and PostgreSQL 16.
- Migration application/reapplication: APPLIED / SKIPPED with identical checksum.
- Relations/indexes/constraints: 15 / 30 / 77.
- PostgreSQL lease/fencing, expired recovery, stale-worker rejection: PASS.
- Persisted checkpoint recovery: PASS at ACQUIRED, NORMALIZED, and COMMITTED.
- Candidate-build crash recovery: PASS, lifecycle remained BUILDING and inactive.
- Secret-bearing persisted rows: 0.
- Database/control-plane bytes: 8,657,943 / 573,440.
- Planned units for the next eligible day: 24 (six instruments x four mandatory datasets).
- Funding bounded unit integration: PASS through artifact, normalization, duplicate canonical result, validation, and watermark persistence.
- Funding fixture coverage: six instruments, three provider-native events each.
- Funding primary live acquisition: not attempted because the source-finalization gate had not elapsed.
- Raw Artifact bytes: 0.
- New canonical/D4/serving/Replay bytes: 0.
- Candidate release: not generated.
- Production mutation: none.
- Target archive probes: 18 HTTP 404; immediately preceding archive probes: 18 HTTP 200.
- Target acquisition: not attempted.
- Bounded adapter/downstream foundation suite: PASS.
- Isolated serving target: not configured; no substitute database used.
- Controlled provenance migration: `002` SKIPPED on exact reapplication.
- Refresh-control relations/indexes/constraints after provenance migration: 20 / 48 / 125.
- Controlled BTCUSDT archive bytes: 13,617; parsed rows: 288.
- Controlled canonical result: `CREATED`, 288 attributable Facts, zero conflicts.
- Controlled exact rerun: `DUPLICATE` before payload acquisition.
- Controlled authority rollback injections: PASS before insertion and after insertion-before-verification.
- Controlled stale-fence rejection: PASS.
- Controlled recovery watermark/downstream/serving/exposure writes: 0 / 0 / 0 / 0.

## MVP-8A.2N Governance And Partial-State Repair

The first live durable object registration failed because integrated D2 did not contain the provider snapshot referenced by the live Funding path. The live binding was also using broad Funding governance rather than the committed bounded provider-native contract. The explicit governance service created the missing bounded provider, certification, and policy definitions through the canonical adapter. All sixteen prerequisites are READY; exact bootstrap reapplication returned `DUPLICATE`.

The failed setup remains intact as one plan, one run, and 23 `PENDING` units. No refresh artifact, Candidate, watermark, downstream record, Replay, or serving candidate is attributable to the run. Two immutable local object payloads were retained before the D2 failure; exact object retry remains content-addressed and canonical manifest conflicts fail closed. No payload was added to Git.

Status now reads the persisted execution first and no longer rejects its post-setup unit shape. It reports the last completed coordinator stage as `UNITS_RESOLVED`, the lease as `RELEASED`, and effective execution state as `BLOCKED` from the append-only source-acquisition failure event. The authenticated no-write preflight passes governance 16/16, archives 18/18, Funding 6/6, the authoritative recovery, the 1+23 planner, and all rollback-only port checks. The live resume itself was not executed.

## MVP-8A.2O Retrieval-Candidate Lineage Certification

The Funding/DOGEUSDT Candidate failure was traced to its parent identity: the bounded path supplied the provider retrieval identity, while the D3 Candidate parent must be the persisted population Retrieval attempt. D3 owns `control.retrieval_attempts` and `population.candidates`; D2 owns `raw.objects` in the same integrated backfill database under a separate approved role.

`persistBoundedAcquisitionResult` now atomically persists the D3 Retrieval/Candidate boundary with the persisted D3 Retrieval attempt injected as the Candidate parent. D2 Raw Object persistence remains a separate immutable role boundary. Exact replay returns `DUPLICATE`; an incompatible persisted lineage is a conflict and fails closed. Authenticated preflight passed governance 16/16, archives 18/18, and Funding 6/6. Its rollback-only D2 Raw Artifact object probe and D3 Retrieval/Candidate probe each retained zero state.

The existing live refresh execution is preserved with 23 `PENDING` units and an append-only `SOURCES_ACQUIRED` failure. It has no common watermark and no refresh candidate corpus. D3 partials are retained with expired leases: Funding/DOGEUSDT is `RAW_PERSISTED` with one attempt, one object, and zero Candidates; Open Interest/ETHUSDT is `RAW_PERSISTED` with one attempt, one object, and two Candidates. No live resume, downstream stage, candidate publication, or Production change occurred.

## Population Event And Resume Reconciliation Correction

The next retry was not executed to completion. Read-only audit found two expired fence-2 Population leases. The retry reused fence-1 `live-retrieving` primary keys, while the attempted immutable payloads carried fence 2; both collisions therefore classify as `CONFLICT`, not `DUPLICATE`. No fence-2 retrieving event, checkpoint, Candidate for DOGE, watermark, downstream output, or serving candidate was retained.

The Population resume path now derives its boundary from durable D3 lineage rather than the Refresh coordinator checkpoint alone. DOGE Funding resumes at missing Candidate lineage. ETH Open Interest reuses its two durable Candidates and resumes at canonical commit. Fence-scoped event identities prevent cross-fence collisions, exact immutable event replay returns `DUPLICATE`, and immutable mismatch returns `CONFLICT`. Failure handling atomically appends the failure event, records the last durable checkpoint, releases the lease, and marks the unit retryable.

Rollback-only certification ran the exact DOGE/ETH partial-state reconciliation twice. Both second passes used higher fences, injected failures released leases, Retrieval/Object/Candidate counts remained 2/2/2, and rollback retained zero rows. Read-only status now reports Refresh stage `UNITS_RESOLVED`, durable Population stage `CANDIDATE_LINEAGE`, and effective coordinator stage `CANDIDATE_LINEAGE`. The live resume command was not run.

## Canonical Scope And Lease-Failure Repair

Read-only incident audit identified BTCUSDT AggTrades as the first Canonical Commit failure. The retained Candidate and Raw Object agree on dataset, instrument, provider snapshot, source contract, and exact UTC day. The validator rejected only provider-native venue `binance-usdm-futures` against canonical venue `BINANCE`. This was a validator namespace defect, not incorrect producer scope; no Raw Object was reacquired or reclassified.

The scope contract now uses provider snapshot and source contract for authority, normalized instrument identity, and dataset-aware time containment. Funding and Open Interest record Candidates may occupy subintervals or points inside one day Raw Objects. The one-Segment AggTrades contract remains exact-day. Non-contained and cross-instrument cases fail closed.

Canonical exceptions now atomically append a sanitized failure event, persist the Candidate-boundary checkpoint, transition the unit to retryable, clear its active lease, and release that lease. Rollback certification used the actual retained 3 Funding, 288 Open Interest, one AggTrades, and two ETH partial Candidates. Two complete runs produced `SUCCESS` then `DUPLICATE` for the same D2 Segment, released both injected-failure leases per run, invoked no downstream stage, and retained zero rows or artifacts. The real run and all external systems remained unchanged.

## Population Resume Lease Reconciliation

Read-only audit identified ETHUSDT Open Interest as the first lease rejection. Its unit was `PROCESSING` at Candidate-boundary Canonical Commit, its fence-3 lease was released, and its parent Population run was `SUCCEEDED`. The old claim predicate required a `RUNNING` run plus `PENDING|RETRYABLE`, so the fallback could not reacquire it.

Resume reconciliation now preserves terminal runs and appends a deterministic next run attempt, projects durable partial units to `RETRYABLE` through an immutable event, and acquires the exact unit with a strictly higher fence. Running-parent BTC AggTrades and SOL Open Interest reuse their current runs; DOGE Funding and ETH Open Interest reuse all durable lineage beneath new run attempts. Canonical failure remains atomic across checkpoint, event, unit state, and lease release.

Rollback certification seeded all four real shapes and ran twice: eight winners, eight rejected competitors, eight duplicate reconciliation classifications on exact retry, zero repeated Retrieval/Object/Candidate records, zero duplicate events/checkpoints, and zero retained rows/artifacts. Authenticated preflight now reports all four persisted partials as lease-eligible and would fail for an active unexpired lease. The live resume command was not run.

## MVP-8A.2Q Logical Slot Identity Repair

Read-only audit found the first identity rejection on authoritative BTCUSDT OHLCV reuse. The result correctly returned its immutable source-contract identity, but the coordinator compared that field to `mvp-bounded-ohlcv/1.0.0`, its contract version. Two concurrent Population run attempts started before the late rejection.

The reported Retrieval increase from four to six and Candidate increase from 294 to 299 was not durable insertion. The old status join repeated the original DOGE Funding and ETH Open Interest lineage beneath their newer run attempts. Direct table inspection found four Retrievals, four Raw Objects, and 294 Candidates. The newer run attempts have no Retrieval or Candidate children and are non-authoritative execution evidence.

Source-contract identity and version are now separate fields. The authoritative result is validated before concurrent acquisition. Dataset executors validate Logical Slot ID, provider binding, dataset, instrument, exact interval, and contract version before source inspection or lease acquisition. Population execution generations are explicit; run attempt and fence changes cannot alter Logical Slot ID.

Commit-bearing certification created disposable integrated D2/D3, isolated D4, refresh, and serving databases plus disposable object storage. First execution and higher-fence resume committed successfully. Two exact resumes retained one Retrieval, one Raw Object, one Candidate, one Fact, and one logical slot. Cross-slot output failed closed. Injected post-write mismatch committed one failure event and one checkpoint, released all leases, and wrote no downstream output. Cleanup retained zero databases, roles, or artifacts.

The current live execution remains read-only incident evidence and must be quarantined append-only. No live resume, watermark, Replay, candidate, Production, Neon, Vercel, or exposure mutation occurred.

## MVP-8A.2R Append-Only Execution Generation Quarantine

The quarantine contract uses one immutable Refresh generation-disposition event and deterministic Population quarantine events. It does not rewrite Refresh run state, Population unit state, lineage, checkpoints, or historical leases. Exact replay is `DUPLICATE`; changed reason or evidence is `CONFLICT`.

The real operator preview verified one plan/run, 23 Refresh units, six Population run attempts collapsed into four logical units, four Retrievals, four Raw Objects, 294 Candidates, no active leases, one unreleased expired lease, no common watermark, and no serving candidate. It produced incident checksum `bc716619be2df7afe0899c69b368f8d8f9dba76a201310a19eb55b04ce0140eb` with zero writes.

Commit-bearing disposable certification returned `CREATED`, then exact `DUPLICATE`, and `CONFLICT` for changed evidence. It released the active disposable lease, rejected resume before writes, retained immutable evidence, wrote no downstream output, and removed all disposable databases, roles, and storage.

The original operator action committed the immutable Refresh disposition, then the Population transaction failed its JSON object details constraint. Read-only audit confirmed no Population quarantine events and no Population lease release committed. The generation is nevertheless `QUARANTINED`, `resumeEligible=false`, and blocked before every live write.

## MVP-8A.2R Quarantine Saga Reconciliation Repair

Quarantine now executes as an idempotent cross-database saga: Refresh intent, Population fencing, verification, then Refresh completion receipt. Population event details use the existing native JSON object binding. Status and preflight expose `quarantineSagaState`, `missingQuarantineSteps`, and `quarantineReceiptId`.

The real generation remains at `INTENT_RECORDED`. It has zero active leases, four missing Population fencing events, and no completion receipt. The guarded `reconcile-quarantine` preview performed zero writes. Disposable committed certification recovered failures after intent, Population fencing, and completion; exact retries were `DUPLICATE`, changed incident checksum was `CONFLICT`, and cleanup retained no databases, roles, or artifacts. Operator reconciliation remains required; the original quarantine and live resume commands were not rerun.

## MVP-8A.2T Clean Generation Population Event Repair

The first clean-generation failure was an immutable Population `RETRIEVING` event collision. Its legacy identity used Logical Slot and fence but omitted execution generation and Population attempt identity. BTCUSDT AggTrades therefore collided with a predecessor-generation fence-1 event before any Retrieval, Raw Object, Candidate, or Fact was written for that clean slot.

Population stage event identities now include execution generation, Logical Slot, Population run and unit attempts, fence, stage, source contract, and provider binding. Exact immutable replay remains `DUPLICATE`; changed content remains `CONFLICT`. Successor preflight now evaluates durable lease eligibility for the successor generation instead of skipping Population units.

The clean generation retains one DOGEUSDT Funding Retrieval, Raw Object, and three Candidates, plus one ETHUSDT Open Interest Retrieval, Raw Object, and 288 Candidates. Those units continue at Canonical Commit; BTCUSDT AggTrades continues at source acquisition. Failure handling retains zero active leases and no watermark, Replay, or candidate manifest progression.
