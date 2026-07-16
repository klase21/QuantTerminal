# MVP Bounded Downstream Execution

Status: locally certified without target-day acquisition.

## Contract

The bounded path accepts one exact UTC window, explicit instruments, immutable committed-input identities and checksums, and explicit model/schema versions. It preserves the chain from Canonical Fact through Consistency Result, Evidence Packet, Consumer Projection, Replay snapshot, and inactive serving candidate. Missing inputs return `INELIGIBLE`; immutable identity mismatches return `CONFLICT`; exact repeats return `DUPLICATE`.

`readMvpEvidenceWindows` now has two explicit modes. Its default mode preserves the certified broad corpus range. Bounded mode requires start, end, and instruments together, loads only the requested output window plus the governed 30-day baseline, and rejects partial bounded contracts. The rolling AggTrades baseline is calculated from prior eligible dates before the output-day filter, preserving broad-worker parity.

`persistMvpConsistencyWindow` and `persistMvpEvidenceWindow` are the reusable D4 services. The broad Evidence worker calls the same Evidence service. A historical one-window certification for BTCUSDT on 2026-07-11 returned `DUPLICATE` and left 420 Results and 84 Packets unchanged.

`loadMvpProjectionEvidenceInputs`, `persistMvpProjectionBatch`, and `persistBoundedMvpProjections` are shared by bounded and broad Projection paths. Bounded mode has no 84-window or 868-version assertion; the broad worker retains both whole-corpus assertions. The same historical certification persisted one instrument summary as `DUPLICATE` and left all 868 crypto Projection versions unchanged.

Replay receives a typed handoff containing price, OI, provider-native Funding, AggTrades buckets, Evidence, and source Projection identities/checksums. Missing identity, checksum, 288 price/OI samples, at least one native Funding event, or 48 flow buckets returns `INELIGIBLE`. No target-day Replay was materialized and the certified 84 snapshots remain unchanged.

## Recovery

The orchestrator checkpoint order is Canonical commit, Coverage, Consistency, Evidence, Projection, Replay, candidate, manifest, and comparison. Stage checkpoints are immutable, stored under the owning refresh unit, and require a current fencing lease. Exact repeats return `DUPLICATE`; stale workers and checksum mismatches fail closed.

The read-only precondition audit found five target-window OHLCV rows, all for BTCUSDT across separate runs: four `COMMITTED` and one `ACQUIRED`. They have no checkpoint, artifact, or active lease. ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, and DOGEUSDT have no target-window OHLCV unit. No OI, Funding, or AggTrades target-window units exist. MVP-8A.2C did not alter this state.
