# MVP Live Resume Coordinator

The one-shot successor workflow is defined in `mvp-one-shot-clean-execution-generation.md`. Clean generations carry an immutable generation context in the certified plan and must be addressed by exact generation ID; the quarantined interval-only execution is never selected.

## Scope

The live resume coordinator is a bounded orchestration service for one certified UTC day. It consumes an immutable reconciliation plan and rejects any graph other than one authoritative BTCUSDT OHLCV reuse plus 23 missing mandatory slots. It does not call the legacy initial-cycle worker.

## Execution Graph

The graph contains exactly 24 logical outcomes across OHLCV, Open Interest, Funding, and AggTrades for the six governed instruments. Logical-slot identity remains independent of run identity. The authoritative OHLCV output produces no new run, unit, Retrieval, Raw Artifact, Candidate, or Fact record.

Unit resolution occurs before acquisition. A missing slot produces a deterministic intent, a valid completed slot is reused, a recoverable nonterminal slot is resumed, and a conflict blocks the batch. Completeness is calculated from unique logical slots rather than physical attempt counts.

## Stage Contract

The ordered stages are plan verification, unit resolution, source acquisition, Raw Artifact persistence, Candidate normalization, canonical commit, dataset watermarks, common watermark, Coverage, Consistency, Evidence, Projections, Replay, candidate membership, manifest, comparison, and completion.

Every checkpoint records the exact interval, planner identity and checksum, deterministic stage-input checksum, output identities and checksum, previous-stage linkage, fencing token, failure classification, and resume eligibility. A stored stage is reusable only when its current input and linkage match exactly. Changed input fails closed.

The PostgreSQL control-plane adapter stores stage checkpoints as append-only refresh events under the coordinator run identity. Exact insertion replay returns `DUPLICATE`, checksum drift is rejected, mutation is rejected by the existing append-only trigger, and certification uses a rollback transaction that retains no fixture rows.

## Delegation Boundary

The coordinator contains no provider parser, normalizer, canonical persistence rule, Evidence model, Projection model, Replay model, or serving membership logic. Those behaviors remain behind bounded executor and downstream ports. Concurrency is capped at two slots. A mandatory slot failure preserves completed immutable work but prevents common-watermark advancement and all candidate stages.

## Candidate Safety

Candidate assembly is restricted to the isolated serving publisher contract. The coordinator exposes no activation operation. Candidate output remains `WITHHELD` and `INTERNAL_ONLY`, active membership is inherited exactly, unexpected deletion blocks comparison, and exposure must remain unchanged.

## Executability Finding

The orchestration service and dry-run worker are executable and certified. The environment-backed live command is not yet releasable: bounded OHLCV, Open Interest, and AggTrades parsing/building functions exist, but no shared callable executor currently binds each one through Retrieval, Raw Artifact, Candidate, and canonical persistence. The dedicated worker therefore fails closed with `LIVE_RESUME_ENVIRONMENT_EXECUTOR_BINDINGS_REQUIRED` after its explicit live confirmation and preflight gates. It never falls back to broad workers.

No scheduler, live acquisition, target-day unit, candidate, exposure, or external deployment is created by this certification.

## Environment Binding Follow-Up

MVP-8A.2I adds a shared local-only capability and diagnostic contract. The worker now uses it for target identity checks and reports dataset/downstream callability without exposing connection details. Fixture composition proves the complete 1+23 coordinator graph through the binding contract.

The environment-backed run remains blocked: the current D2/D3/D4 credentials fail authentication, the serving target does not authenticate as the publisher, and the final concrete live executor port composition is not yet installed. The worker does not substitute fixture ports or broad workers for a live run.

The typed port composition itself is now implemented and fixture-certified. It validates exact slot contracts, executes the shared bounded stage sequence, derives watermarks from logical slots, and propagates checksummed identities to downstream and candidate stages. The remaining code gap is limited to constructing that composition from real environment-backed adapter instances in the worker bootstrap.

## Parent-Child Transaction Correction

The environment bootstrap and authenticated preflight are complete. A subsequent first live setup exposed a control-plane persistence defect before acquisition: the coordinator supplied a synthetic run identity directly to `refresh_unit` persistence without first inserting the required `refresh_plan` and `refresh_run` parents. PostgreSQL rejected the child insert and retained no live setup rows.

The coordinator now delegates setup to one authoritative serializable operation. It resolves the immutable plan, resolves one deterministic live run, and resolves all 23 acquisition units inside one transaction. Every unit is bound to the actual persisted run identity returned by that operation. The public coordinator port no longer permits independent per-unit run identity derivation.

`run` creates only the first exact live execution and refuses an existing equivalent run. `resume` selects the same eligible live run or creates it only when no transaction committed parent-child state. Historical certification and recovery runs are excluded by the live execution profile and deterministic checksum. The status command now reads persisted plan, run, unit, checkpoint, lease, candidate, and watermark state instead of returning a certification placeholder.

Rollback-only PostgreSQL certification covers failures after plan creation, run creation, and first-unit creation. Each failure retained zero rows. Exact resume and concurrent identical resolution converge on one run and 23 units; no BTCUSDT OHLCV acquisition unit is created. This correction did not execute target-day acquisition or mutate Production, Neon, Vercel, serving exposure, or historical control-plane rows.

## Governance And Partial-State Repair

The first durable payload attempt exposed a missing integrated D2 provider-snapshot prerequisite. Governance verification now precedes execution setup and acquisition, and the explicit `bootstrap-governance` command provisions only approved missing immutable definitions through the canonical adapter. All sixteen definitions are READY and exact reapplication is `DUPLICATE`.

Status and resume now prefer the persisted execution over rebuilding a pre-setup plan. The retained execution is one plan, one deterministic run, and 23 `PENDING` units. Its append-only failure event identifies `SOURCES_ACQUIRED`, its lease is released, and no refresh artifact, Candidate, common watermark, or inactive serving candidate exists. The persisted run remains resumable; status reports an effective `BLOCKED` state from the failure event.

The worker accepts the immutable 1+23 action contract before setup and the persisted 23-unit outcome contract afterward. Resume therefore reuses the same run and units and continues at the first incomplete checkpoint. No live resume was executed during this repair.

## MVP-8A.2O Retrieval-Candidate Lineage

The Funding/DOGEUSDT failure was a D3 lineage defect: Candidate persistence used the provider retrieval identity rather than the persisted D3 population Retrieval attempt. D3 owns `control.retrieval_attempts` and `population.candidates`; D2 owns `raw.objects` in the same integrated backfill database under a separate approved role.

`persistBoundedAcquisitionResult` now atomically injects the persisted D3 Retrieval attempt as the Candidate parent within D3. D2 Raw Object persistence stays a separate immutable role boundary. Exact replay is `DUPLICATE`; incompatible lineage is an exact conflict and fails closed. Authenticated preflight passed governance 16/16, archives 18/18, and Funding 6/6, including rollback-only D2 Raw Artifact object and D3 Retrieval/Candidate probes with zero retained state.

The existing live run remains unchanged: 23 `PENDING` units, a `SOURCES_ACQUIRED` failure, and no common watermark or refresh candidate corpus. D3 retains expired `RAW_PERSISTED` partials for Funding/DOGEUSDT (one attempt, one object, zero Candidates) and Open Interest/ETHUSDT (one attempt, one object, two Candidates). No live resume or Production change occurred.

## Population Lease Reconciliation

Population resume now derives lease eligibility from durable unit lineage and the actual parent-run state. A `PROCESSING` unit with a Candidate-boundary resume stage and no active unexpired lease is append-only reconciled to `RETRYABLE`. Running parent attempts are reused; terminal parents remain historical and receive a deterministic next run attempt.

Lease acquisition is unit-specific and occurs in the same transaction as the reconciliation event and checkpoint. The fence advances exactly once, concurrent contenders lose to the active lease, and Canonical failure atomically checkpoints, releases, and returns the unit to `RETRYABLE`. Authenticated preflight includes this persisted-state lease gate and fails closed for active leases or incomplete durable boundaries.

## Canonical Scope And Failure Recovery

The later live execution reached Canonical Commit and exposed a scope-validator namespace defect. The retained BTCUSDT AggTrades Raw Object and Segment agree on dataset, instrument, provider snapshot, source contract, and exact day. The rejected field was provider-native venue `binance-usdm-futures` versus canonical venue `BINANCE`; these are not the same identity domain.

Canonical scope validation is now dataset-aware. Funding and Open Interest observations must be contained by their immutable day-scoped Raw Object. The bounded AggTrades contract requires its one daily Segment to match the Raw Object interval exactly. Cross-instrument, non-contained, provider-snapshot, dataset, or source-contract mismatch fails closed.

Canonical exceptions now invoke the atomic Population failure boundary. A sanitized event, Candidate checkpoint, retryable transition, and lease release commit together; any failure rolls them all back. The coordinator receives the exception and invokes no downstream stage. Authenticated rollback certification ran the retained 3 Funding, 288 Open Interest, one AggTrades, and two-Candidate ETH partial shapes twice. Exact D2 retry returned `DUPLICATE`, both injected unit failures released their leases, and zero rows or artifacts remained.

## Logical Slot Identity Boundary

The next incident exposed a late comparison between the authoritative OHLCV source-contract identity and its human-readable contract version. The authoritative result is now validated before concurrent acquisition starts. Every ordinary executor reconstructs and validates its Logical Slot ID, dataset, instrument, exact interval, provider binding, and contract version before source inspection or Population lease acquisition.

Executor results carry the Logical Slot ID unchanged and keep execution generation, Population attempts, leases, fences, and checkpoints separate. A higher fence remains compatible with the same slot. Cross-slot output fails closed. Injected post-write mismatch records failure and checkpoint state, releases the lease, and blocks all downstream work.

Status now selects one latest Population run attempt per logical unit and counts distinct lineage identities. The previously reported increase from four to six Retrievals and 294 to 299 Candidates was join amplification across two run attempts; read-only durable inspection found no extra Retrieval or Candidate rows.

The affected live execution is not eligible for resume. It requires an append-only quarantine transition followed by a clean execution generation under this repaired contract.

## Execution Generation Quarantine

The worker now resolves an immutable generation disposition before source availability or executor checks. `QUARANTINED` and `SUPERSEDED` fail closed before acquisition, lease reconciliation, watermark, downstream, Replay, manifest, or serving work. The same guard runs inside atomic Refresh execution setup.

Quarantine is an explicit exact-run operator action. Preview is read-only. The committed Refresh disposition is the fail-closed saga intent. Population fencing events and active-lease releases are one D3 transaction, followed by a verified append-only Refresh completion receipt. Historical run and unit state remain unchanged.

## Clean-Generation Population Event Identity

Live Population events use the `live-population-event-v2` identity contract. The execution generation, Logical Slot, Population run/unit attempts, fence, stage, source contract, and provider binding are immutable identity inputs. This prevents predecessor-generation collisions while preserving strict duplicate and conflict semantics. Clean-generation preflight reads generation-filtered durable Population state and rejects any unit that cannot safely reacquire its next certified stage.

Status projects `resumeEligible: false` and exposes `INTENT_RECORDED`, `POPULATION_FENCED`, or `COMPLETE` with exact missing steps and receipt identity. `reconcile-quarantine` may fill only missing saga records for an already quarantined exact run; it cannot alter disposition, incident checksum, lineage, watermarks, or serving state.
