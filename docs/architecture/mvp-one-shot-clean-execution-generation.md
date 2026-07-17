# MVP One-Shot Clean Execution Generation

## Boundary

The clean generation is a fresh execution lineage derived from the certified target-day plan, source commit, predecessor quarantine receipt, clean input-manifest checksum, and generation ordinal. Logical slot identities remain unchanged. Refresh plan, run, unit, Population attempt, Retrieval, Candidate, checkpoint, and downstream identities are successor-specific.

The quarantined predecessor is read-only evidence. Its Retrievals, Candidates, Facts, checkpoints, leases, downstream outputs, Replay outputs, and manifests are never imported into the successor.

## Byte Reuse

Raw Objects remain content-addressed. Exact immutable bytes may resolve as duplicate storage content only when checksum and bounded source scope agree. A clean generation always creates fresh Retrieval and Candidate lineage. Ambiguous payload authority fails before generation creation.

## Guarded Creation

`create-clean-generation` performs quarantine receipt, saga, governance, source availability, local target, planner, authority, and executor-callability checks before its first durable write. It then creates one clean plan, one run, 23 units, the authoritative OHLCV reuse reference, and one creation receipt in the Refresh transaction. Exact retry is duplicate; changed context is conflict.

## Execution

Status, preflight, and execution require the exact clean `ExecutionGenerationId`. The legacy interval-only path is not used. Execution can create only an inactive local candidate and exposes no activation operation.
