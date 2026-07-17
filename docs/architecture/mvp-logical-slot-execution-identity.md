# MVP Logical Slot And Execution Identity

## Immutable Logical Slot

`LogicalSlotId` identifies provider binding, dataset, canonical instrument, exact UTC interval, and source-contract binding. It is independent of coordinator run, Population run attempt, unit attempt, Retrieval attempt, lease, fence, checkpoint, retry ordinal, and time of execution.

The live executor invocation carries the logical slot explicitly together with separate execution-generation and fencing fields. Before source inspection or Population lease acquisition, the executor reconstructs the approved logical identity and validates dataset, instrument, interval, provider binding, and contract version. A mismatch fails with `LIVE_EXECUTOR_PREWRITE_LOGICAL_SLOT_MISMATCH` and performs no durable write.

## Contract Identity

Source-contract version and immutable source-contract identity are distinct. Ordinary bounded adapters currently use their committed version as the binding identity. The authoritative BTCUSDT OHLCV recovery returns its persisted `mrsrc_` identity and separately returns `mvp-bounded-ohlcv/1.0.0` as the version. Coordinator compatibility compares the version and provider binding while preserving the immutable identity in lineage.

## Execution Generation

Population job, unit-attempt, and Retrieval identities are scoped to an explicit execution generation. A retry within one generation retains the same logical slot and immutable lineage keys while run attempts and fences may change. A clean generation receives new Population execution lineage. It cannot reuse Retrievals, Candidates, leases, checkpoints, or partial downstream records from a quarantined generation.

## Failure Boundary

The authoritative reused result is read and validated before bounded concurrent executors start. Dataset invocations validate before acquisition. Executor results echo the original logical context and are verified before final success. An injected post-write mismatch appends a sanitized failure event and deterministic checkpoint, releases its lease, blocks downstream work, and preserves immutable evidence.

## Status Projection

Status groups Population run attempts by the unit's immutable logical partition. Counts use distinct Retrieval and Candidate identities and select the latest run attempt for stage projection. Multiple run attempts no longer inflate logical-slot or lineage counts.

