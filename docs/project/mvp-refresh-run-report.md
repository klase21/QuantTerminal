# MVP Refresh Run Report

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
