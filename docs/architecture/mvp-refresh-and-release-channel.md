# MVP Refresh And Release Channel

Status: MVP-8A local foundation and isolated PostgreSQL control plane certified; the bounded cycle remains a timing `NOOP`.

## Boundaries

The refresh control plane is operational metadata in the local PostgreSQL 16 database `quantterminal_mvp_refresh_isolated`. It is not canonical truth and has no Production, Neon, Vercel, D2, D3, D4, or D5 write capability. The only accepted connection variable is `MVP_REFRESH_ISOLATED_POSTGRES_URL`; its value is excluded from logs, identities, events, and reports.

The refresh client uses `postgres` 3.4.9. The factory reads the environment variable once and passes that exact string to the driver. Target validation parses a separate `URL` object only for database/local-host/alias checks; it neither reconstructs the connection string nor overrides username, password, database, or environment. The safe preflight uses this same factory and reports only booleans plus sanitized error code/class.

PostgreSQL certification applied migration `001`, reproduced its checksum, and returned `SKIPPED` on exact reapplication. The isolated schema contains 15 operational relations, 30 indexes, 77 constraints, and the append-only event trigger. Database tests certified lease renewal, fencing increments, concurrent rejection, expiry recovery, stale-worker rejection, released-lease rejection, and checkpoint recovery after acquisition, normalization, canonical commit, and inactive candidate construction. No credential literal was found in persisted rows.

The immutable chain remains Raw Artifact -> Candidate -> Canonical Fact -> Consistency Result -> Evidence Packet -> Consumer Projection -> Serving Corpus -> Active Release. Publication, exposure, and activation are separate decisions. MVP-8A creates no active release.

## Refresh blocker audit

| Stage | Existing surface | Incremental safety | Idempotency/checkpoint | MVP-8A disposition |
| --- | --- | --- | --- | --- |
| OHLCV acquisition | `runD3OhlcvBackfill.ts` / Binance Vision daily request | Request is bounded; runner is snapshot-oriented | Progress JSON and source checksums | Extract bounded commit entry point before use |
| Open Interest acquisition | `runD3OpenInterestBackfill.ts` / Binance Vision daily request | Request is bounded; runner is snapshot-oriented | Progress JSON and duplicate Facts | Extract bounded commit entry point before use; no forward fill |
| Funding acquisition | `runD3FundingBackfill.ts` and recent-gap helper | Not safe for MVP-8A | Compatibility snapshot owns resume/reconcile | `FUNDING_REFRESH_PATH_UNAVAILABLE`; protected runner not invoked |
| AggTrades acquisition | daily ZIP and Segment workers | Source interval is bounded; worker assumes backfill progress | ZIP checksum, Segment identity, manifests | Extract bounded Segment commit entry point; no full-history scan |
| Raw Artifact / Candidate / Fact | dataset-specific D3 workers | Contracts are append-only | Provider request and Candidate identities | Reuse only through bounded adapters |
| Coverage / Consistency / Evidence | `runMvpEvidence.ts` | Current command enforces whole 420/84 corpus | Immutable checksums | Bounded affected-window entry point required |
| Consumer Projection | `runMvpProjections.ts` | Current command enforces whole 868 corpus | Immutable Projection identity | Bounded affected-window entry point required |
| Replay snapshot | serving materializer | Deterministic per window, but publisher assembles whole release | Model and snapshot checksum | Materialize only newly eligible or source-version-changed windows |
| Macro / ETF | certified adapters and persisted Facts | Bounded and supplemental | Source checksum and duplicate classification | May refresh independently; cannot advance mandatory watermark |
| Serving publication | `runMvpServing.ts` | Atomic but publishes a complete serving corpus | Corpus checksum and DUPLICATE | Build local candidate only; Neon publication prohibited |
| Vercel exposure | pinned corpus ID/checksum | Blocks automatic recurring releases | Explicit expected identity | Preserve `PINNED_CORPUS`; add opt-in `RELEASE_CHANNEL` contract |

No audit command above was invoked. Existing operational progress files remain outside the new control plane.

## State machines

Plans move `DRAFT -> READY -> SUPERSEDED|CANCELLED`. Runs advance serially from `PLANNED` through acquisition, normalization, commit, validation, materialization, comparison, and `READY_FOR_RELEASE_REVIEW`; terminal `NOOP`, `BLOCKED`, `FAILED`, and `CANCELLED` states do not resume in place. Units follow the equivalent bounded stages. Candidates move `BUILDING -> VALIDATING -> INVALID|READY_FOR_RELEASE_REVIEW`; `RELEASED` is forbidden by the MVP-8A command surface.

Every run/unit transition is checked in code and recorded as an append-only event. Leases carry monotonically increasing fencing tokens and expiry. A worker must revalidate its owner and token before a protected commit; an expired lease may be acquired with a higher token, making the stale worker invalid.

## Window and watermarks

The planner subtracts the source finalization delay, floors to the last closed UTC day, starts at the active governed-through boundary, and selects at most the first next day. At `2026-07-15T23:42:12.251Z`, the two-hour delay left no new eligible day, so the initial result was `NOOP`. The next candidate interval is `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)` and cannot become eligible before `2026-07-16T02:00:00.000Z`.

Candidate governed-through is the minimum certified watermark across mandatory OHLCV, OI, discrete Funding, and AggTrades for all six instruments. Supplemental Macro, SPY, and ETF observations have a separate watermark and cannot advance it.

## Freshness

Page-ready states are `CURRENT`, `DELAYED`, `STALE`, `UNAVAILABLE`, `INCONSISTENT`, and `CANDIDATE_ONLY`. They are independent of Coverage, Consistency, Confidence, and exposure. Stable reason codes include source finalization, availability, gaps, checksums, mandatory/supplemental lag, failed validation, inactive candidate state, Funding path unavailability, and active-corpus lag.

`/api/health/mvp-freshness` is a local read-only foundation endpoint. It emits corpus and governance identities but no URL, hostname, credential, Raw Artifact path, or Parquet path.

## Release channels

`PINNED_CORPUS` preserves the current Production contract and remains the default. `RELEASE_CHANNEL` is opt-in and verifies the named channel, manifest checksum, corpus checksum, previous-manifest link, schema version, counts, and exposure eligibility. A missing or invalid manifest fails closed. MVP-8A permits only local `candidate` manifests and performs no Preview or Production channel mutation.

## Scheduler design

MVP-8B should evaluate once daily after a two-hour finalization delay, reacquire a one-hour overlap, retry at 15, 60, and 180 minutes, cap catch-up at seven days per run, use one worker with a bounded timeout, and alert on source gaps, lease loss, checksum conflict, or blocked readiness. Release review remains manual until a later sprint explicitly certifies automatic activation, rollback, and Production health gates.
