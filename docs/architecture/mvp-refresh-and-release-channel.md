# MVP Refresh And Release Channel

Status: MVP-8A control plane, provider-native Funding, bounded adapters, executable affected-window downstream services, and immutable inactive serving membership locally certified. The target-day live cycle has not resumed.

## Boundaries

The refresh control plane is operational metadata in the local PostgreSQL 16 database `quantterminal_mvp_refresh_isolated`. It is not canonical truth and has no Production, Neon, Vercel, D2, D3, D4, or D5 write capability. The only accepted connection variable is `MVP_REFRESH_ISOLATED_POSTGRES_URL`; its value is excluded from logs, identities, events, and reports.

The refresh client uses `postgres` 3.4.9. The factory reads the environment variable once and passes that exact string to the driver. Target validation parses a separate `URL` object only for database/local-host/alias checks; it neither reconstructs the connection string nor overrides username, password, database, or environment. The safe preflight uses this same factory and reports only booleans plus sanitized error code/class.

PostgreSQL certification applied migration `001`, reproduced its checksum, and returned `SKIPPED` on exact reapplication. The isolated schema contains 15 operational relations, 30 indexes, 77 constraints, and the append-only event trigger. Database tests certified lease renewal, fencing increments, concurrent rejection, expiry recovery, stale-worker rejection, released-lease rejection, and checkpoint recovery after acquisition, normalization, canonical commit, and inactive candidate construction. No credential literal was found in persisted rows.

The immutable chain remains Raw Artifact -> Candidate -> Canonical Fact -> Consistency Result -> Evidence Packet -> Consumer Projection -> Serving Corpus -> Active Release. Publication, exposure, and activation are separate decisions. MVP-8A creates no active release.

## Refresh blocker audit

| Stage | Existing surface | Incremental safety | Idempotency/checkpoint | MVP-8A disposition |
| --- | --- | --- | --- | --- |
| OHLCV acquisition | `boundedAdapters.ts` / Binance Vision daily archive | Exact one-day request and record cap | Source checksum, batch identity, fenced commit | Extracted and fixture-certified; target archive HTTP 404 |
| Open Interest acquisition | `boundedAdapters.ts` / Binance Vision daily metrics | Exact one-day request and record cap | Source checksum, duplicate observation checks, fenced commit | Extracted and fixture-certified; no forward fill; target archive HTTP 404 |
| Funding acquisition | isolated official REST bounded adapter | Safe for one finalized UTC day | exact-byte artifact, deterministic Candidate/Fact identity, fenced checkpoints | Locally certified; legacy compatibility runner rejected and not invoked |
| AggTrades acquisition | `boundedAdapters.ts` plus certified Segment builder | Exact one-day ZIP and event cap | ZIP checksum, Segment identity, fenced commit | Extracted and fixture-certified; target archive HTTP 404 |
| Raw Artifact / Candidate / Fact | dataset-specific D3 workers | Contracts are append-only | Provider request and Candidate identities | Reuse only through bounded adapters |
| Coverage / Consistency / Evidence | shared bounded Evidence loader and D4 persistence services | One validated interval only | Immutable Result and Packet identities | Historical exact rerun certified `DUPLICATE`; no target-day execution |
| Consumer Projection | shared bounded input and persistence services | One validated interval only | Immutable Projection identities | Historical exact rerun certified `DUPLICATE`; broad 868 assertion retained |
| Replay snapshot | typed identity-complete handoff to existing materializer | One validated interval only | Model and snapshot checksum | Incomplete input is `INELIGIBLE`; no target-day execution |
| Macro / ETF | certified adapters and persisted Facts | Bounded and supplemental | Source checksum and duplicate classification | May refresh independently; cannot advance mandatory watermark |
| Serving publication | `runMvpServing.ts` | Atomic but publishes a complete serving corpus | Corpus checksum and DUPLICATE | Build local candidate only; Neon publication prohibited |
| Vercel exposure | pinned corpus ID/checksum | Blocks automatic recurring releases | Explicit expected identity | Preserve `PINNED_CORPUS`; add opt-in `RELEASE_CHANNEL` contract |

The local serving schema now has immutable candidate membership and manifest relations. Atomic fault injection after candidate header, membership, and manifest insertion left no partial records and did not change active exposure. The candidate service is local-publisher-only and exposes no activation operation.

No audit command above was invoked. Existing operational progress files remain outside the new control plane.

## Target-window logical reconciliation

Mandatory planning now resolves run-independent logical slots before creating physical units. The slot identity covers provider, dataset, canonical instrument, exact interval, and source contract version. A clean target plan is exactly one reused committed BTCUSDT OHLCV slot plus 23 new slots; duplicate attempts never increase the mandatory-slot count.

The current target audit is not clean. Four BTCUSDT OHLCV attempts are `COMMITTED` with four different recorded `factDigest` values, no artifact rows, and no recorded source contract version. They are classified `CONFLICTING_COMMITTED_ATTEMPTS`. The associated `ACQUIRED` attempt has no artifact row or active lease and is `CONTROL_PLANE_CONFLICT`. The planner returns 24 outcomes but blocks unit creation until authoritative read-only canonical evidence resolves the committed mismatch.

## State machines

Plans move `DRAFT -> READY -> SUPERSEDED|CANCELLED`. Runs advance serially from `PLANNED` through acquisition, normalization, commit, validation, materialization, comparison, and `READY_FOR_RELEASE_REVIEW`; terminal `NOOP`, `BLOCKED`, `FAILED`, and `CANCELLED` states do not resume in place. Units follow the equivalent bounded stages. Candidates move `BUILDING -> VALIDATING -> INVALID|READY_FOR_RELEASE_REVIEW`; `RELEASED` is forbidden by the MVP-8A command surface.

Every run/unit transition is checked in code and recorded as an append-only event. Leases carry monotonically increasing fencing tokens and expiry. A worker must revalidate its owner and token before a protected commit; an expired lease may be acquired with a higher token, making the stale worker invalid.

## Window and watermarks

The planner subtracts the source finalization delay, floors to the last closed UTC day, starts at the active governed-through boundary, and selects at most the first next day. At `2026-07-15T23:42:12.251Z`, the two-hour delay left no new eligible day, so the initial result was `NOOP`. The next candidate interval is `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)` and cannot become eligible before `2026-07-16T02:00:00.000Z`.

At the MVP-8A.1 decision time (`2026-07-16T01:15:25.194Z`) the next interval remained ineligible, so no live Funding request was made. Candidate governed-through is the minimum certified watermark across mandatory OHLCV, OI, discrete Funding, and AggTrades for all six instruments. Supplemental Macro, SPY, and ETF observations have a separate watermark and cannot advance it.

At the MVP-8A.2A check, the wall-clock gate had elapsed but all 18 required Binance Vision daily archive probes for OHLCV, Open Interest, and AggTrades returned HTTP 404. The preceding day returned HTTP 200. This is `TIME_ELIGIBLE`, `SOURCE_NOT_FINALIZED`, and `NOT_READY_FOR_ACQUISITION`; the fixed two-hour delay does not imply archive readiness.

## Freshness

Page-ready states are `CURRENT`, `DELAYED`, `STALE`, `UNAVAILABLE`, `INCONSISTENT`, and `CANDIDATE_ONLY`. They are independent of Coverage, Consistency, Confidence, and exposure. Stable reason codes include source finalization, availability, gaps, checksums, mandatory/supplemental lag, failed validation, inactive candidate state, Funding path unavailability, and active-corpus lag.

## Live Resume Coordinator

The bounded release foundation now includes a strict 24-slot coordinator contract. It accepts only the certified one-day reconciliation graph, reuses the attributable BTCUSDT OHLCV authority without a new unit, and resolves at most 23 unit intents. Seventeen append-only stages carry deterministic input/output checksums, previous-stage linkage, and fence identity. Dataset and common watermarks derive from unique logical slots, never attempt counts.

The coordinator, dry-run worker, confirmation gate, checkpoint recovery, fault policy, and concrete bounded executor bindings are certified. The legacy initial-cycle route is not an allowed substitute.

The local environment binding contract now centralizes sanitized database/role diagnostics and capability metadata for all mandatory ports. Durable D2/D3 use the integrated `quantterminal_backfill` profile under distinct owner roles and durable object storage; D4, refresh, and serving remain isolated. Provider readiness is green for the target day (18 archives and six Funding checks), and the authenticated no-write preflight passes without creating units or retaining payloads.

`/api/health/mvp-freshness` is a local read-only foundation endpoint. It emits corpus and governance identities but no URL, hostname, credential, Raw Artifact path, or Parquet path.

## Release channels

`PINNED_CORPUS` preserves the current Production contract and remains the default. `RELEASE_CHANNEL` is opt-in and verifies the named channel, manifest checksum, corpus checksum, previous-manifest link, schema version, counts, and exposure eligibility. A missing or invalid manifest fails closed. MVP-8A permits only local `candidate` manifests and performs no Preview or Production channel mutation.

## Scheduler design

MVP-8B should evaluate once daily after a two-hour finalization delay, reacquire a one-hour overlap, retry at 15, 60, and 180 minutes, cap catch-up at seven days per run, use one worker with a bounded timeout, and alert on source gaps, lease loss, checksum conflict, or blocked readiness. Release review remains manual until a later sprint explicitly certifies automatic activation, rollback, and Production health gates.
