# MVP Live Resume Coordinator

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
