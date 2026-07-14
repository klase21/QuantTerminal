# D3 Phase 3 Open Interest Backfill Report

## Baseline and Scope

- Branch: `epic/d2-canonical-persistence`
- Initial HEAD: `df94661ce67163b7dece9e13253e31e8e9343b88`
- Initial worktree: inherited modification only in `docs/project/d3-phase-3-ohlcv-progress.json`; it was not edited by this task.
- Database: `localhost:55432/quantterminal_backfill` using distinct D2 and D3 roles (credentials redacted).
- Artifact root: `D:\QuantTerminalData\raw-artifacts`; 667,802,304,512 bytes free at Canary completion.
- Frozen cutoff: `2026-07-12T00:00:00.000Z`.

## Source and Availability

The approved source is the public Binance Vision USD-M Futures daily metrics archive. The selected file is `data/futures/um/daily/metrics/{symbol}/{symbol}-metrics-{YYYY-MM-DD}.zip`. The source supplies native five-minute observations with `sum_open_interest` and `sum_open_interest_value`; these remain distinct provider-native quantity and explicitly supplied notional fields. No inference, forward-fill, zero substitution, or resampling occurs.

| Instrument | First archive | Final archive | Partitions | Compressed bytes |
| --- | --- | --- | ---: | ---: |
| BTCUSDT | 2020-09-01 | 2026-07-11 | 2,140 | 24,760,634 |
| ETHUSDT | 2021-12-01 | 2026-07-11 | 1,684 | 19,849,770 |
| SOLUSDT | 2021-12-01 | 2026-07-11 | 1,684 | 18,856,943 |
| BNBUSDT | 2021-12-01 | 2026-07-11 | 1,684 | 19,003,931 |
| XRPUSDT | 2021-12-01 | 2026-07-11 | 1,684 | 19,680,519 |
| DOGEUSDT | 2021-12-01 | 2026-07-11 | 1,684 | 19,649,706 |

All inventories were independently listed from the provider prefix and verified contiguous. The 2026-07-12 archive is excluded by the frozen cutoff.

## Contract and Migration

D2 migration `006_open_interest_observation_metadata.sql` adds bounded nullable metadata columns and constraints for canonical instrument identity, USD-M market type, provider-native notional value, and its typed unit. It applied once with SHA-256 `fd68d20cd5c18bef1f1e2191d703979a958bdf6da46a11d0a8c0dd74b2738b48`; the immediate complete D2 migration rerun skipped migrations 001 through 006. The migration was applied only after proving zero active Population leases.

## Execution Snapshot

- Snapshot ID: `open-interest-execution:6140af4cedb143579343f770350721f4e10cf0c79e243ac5424756c37b2eeb07`
- Checksum: `6140af4cedb143579343f770350721f4e10cf0c79e243ac5424756c37b2eeb07`
- Parent Manifest: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Exact partitions: 10,560
- Expected eligible observations: 3,041,274
- Measured compressed source bytes: 121,801,503
- Concurrency: one global partition and one provider request.
- Checkpoint policy: raw, candidate, then canonical boundaries.

## Canary and Idempotency

The real BTCUSDT `2026-07-11` archive was 10,855 bytes with SHA-256 `8c8c6fb6206021f63b7ef90f66bee72770798b9ff8d8b1bfd916a6c8fcb82e21`. The cutoff retained 287 observations and produced 287 Candidates, Canonical Facts, submission outcomes, and lineage edges, plus one Coverage decision and three checkpoints. No row was rejected and no conflict occurred.

The exact rerun returned `NO_ELIGIBLE_PARTITIONS` after identity-based authoritative completion reconciliation. Persisted counts remained 287 Facts, 287 lineage edges, one Artifact, one Retrieval, one Coverage decision, and three checkpoints. No second logical Unit or authoritative object was created.

Beginning, middle, and end sample comparisons all passed:

| Position | Timestamp | OI quantity | OI supplied value |
| --- | --- | ---: | ---: |
| Beginning | 2026-07-11T00:05:00.000Z | 103887.9290000000000000 | 6655883739.4412570000000000 |
| Middle | 2026-07-11T12:00:00.000Z | 103728.3020000000000000 | 6656877881.9822000000000000 |
| End | 2026-07-11T23:55:00.000Z | 101445.7800000000000000 | 6478584187.7367990000000000 |

Each Canonical value exactly matched the source decimal, retained five-minute cadence and canonical instrument identity, referenced the source checksum, and had exactly one lineage edge.

## Full-History Start and Progress

The full frozen snapshot started at its earliest partition. Six BTCUSDT partitions from 2020-09-01 through 2020-09-06 completed. Those provider archives contain exact duplicate row pairs: 1,728 duplicate source rows were explicitly rejected while 1,728 unique observations became Canonical Facts. No duplicate Fact or conflict was created.

At the safe stop boundary:

- Complete partitions: 7
- Pending partitions: 10,553
- Active leases: 0
- Canonical Facts / Candidates / submissions / lineage: 2,015 each
- Artifacts / Retrievals / Coverage decisions: 7 each
- Checkpoints: 21
- Downloaded bytes: 84,682
- Rejected exact duplicate source rows: 1,728
- Gaps / retryable failures / conflicts / retries: 0

Read-only reconciliation returned `consistent: true`, no reason codes, no affected partitions, and zero active leases.

## Commands

```text
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts run --max-partitions 1
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts resume --max-partitions 1
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts status
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts stop
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts retry-failed --max-partitions 1
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts retry-gaps --max-partitions 1
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts reconcile
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts validate-samples
```

## Remaining Work

Resume the exact immutable snapshot until all 10,560 partitions have explicit terminal classifications. Multi-instrument historical sample validation remains pending because only BTCUSDT partitions have completed. OHLCV and Funding histories remain independent and safely resumable; broader crash timing, final Gap Repair, and final Coverage certification remain D3 Phase V work.

The Funding read-only reconciler passed with 19 complete partitions and zero active leases. The exhaustive OHLCV reconciler was stopped because its per-Fact verification did not complete within the interactive validation window; a bounded persisted-state query independently found 312 completed OHLCV Units, zero completed Units missing canonical checkpoints or eligible Coverage decisions across OHLCV/Funding/OI, and zero active leases. No OHLCV or Funding execution process was stopped.

## Validation

Passed: TypeScript (`npx tsc --noEmit --incremental false`), D1 contract regression, D2 Phase 1, D2 Phase 2 unit, D2 durable boundary, D3 Phase 1, D3 Phase 2 unit, D3 enablement, D3 commit boundary, integrated topology, OHLCV unit, Funding unit, OI source/identity/enumeration unit, real OI Canary, exact identity-based Canary rerun, source-to-Canonical sample validation, OI reconciliation, Funding reconciliation, migration checksum/idempotency, JSON parsing, direct-D2-write scan, protected-D4 scan, credential scan, package/lockfile review, and `git diff --check`.

No package or lockfile changed. No D4 file changed. No credentials were emitted or stored. The complete OI history was not left running in the background.
