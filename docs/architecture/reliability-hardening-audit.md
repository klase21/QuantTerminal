# Intelligence Platform Reliability Hardening Audit

## Scope

This audit evaluated failure tolerance across:

- durable intelligence artifacts;
- artifact lifecycle filtering;
- scheduler state and file locking;
- production run reports;
- orchestrator stage isolation;
- the Intelligence Operations Console data path.

No intelligence algorithms, product workflows, scheduler design, databases, or user-facing layouts were changed.

## Method

Fault injection ran against isolated temporary directories under `.data/`.

Artifact and scheduler scenarios used non-production fixtures. Orchestrator scenarios used a bounded slice of the existing real BTCUSDT 1h historical dataset plus the existing canonical Event Impact inputs.

The temporary audit directory and harness were removed after execution.

Result:

```text
24 scenarios passed
0 scenarios failed
```

## Artifact Store Scenarios

### Missing Index

Expected:

- reads return an empty result;
- no exception reaches consumers.

Result:

```text
PASS
```

### Corrupted Index

Initial finding:

Read paths threw while parsing the index, which could propagate through registry readers.

Fix:

- read-only registry operations tolerate index corruption and degrade to an empty result;
- publication and archive mutations remain strict and refuse to overwrite a corrupted index.

Result:

```text
PASS
```

### Missing Payload

Behavior:

- `get()` returns `null`;
- list and search skip the orphaned index entry.

Result:

```text
PASS
```

### Corrupted Payload

Behavior:

- payload parsing fails inside the artifact boundary;
- the artifact is omitted;
- other indexed artifacts remain readable.

Result:

```text
PASS
```

### Schema Version Mismatch

Behavior:

- artifact/index schema disagreement rejects the payload;
- the artifact is omitted without throwing.

Result:

```text
PASS
```

### Orphan Payload

Behavior:

- payloads absent from the index are not discoverable;
- registry search remains index-driven.

Result:

```text
PASS
```

### Orphan Index Entry

Behavior:

- missing payload is skipped;
- valid indexed artifacts remain visible.

Result:

```text
PASS
```

### Invalid Artifact

Initial finding:

The validator accessed required string fields before proving they existed. Severely malformed objects could cause property-access exceptions rather than a normal validation rejection.

Fix:

- required artifact, source, and evidence fields are type-checked before string operations;
- malformed artifacts now return validation errors and are rejected safely.

Result:

```text
PASS
```

## Artifact Lifecycle Scenarios

Tested:

- active artifact;
- expired artifact;
- archived artifact.

Verified:

- default list returns active artifacts only;
- `includeExpired` exposes expired artifacts;
- `includeArchived` exposes archived artifacts;
- combined visibility returned all three fixtures.

Result:

```text
PASS
```

## Scheduler Recovery Scenarios

### Active Lock

Behavior:

- first owner acquires the lock;
- concurrent acquisition returns `null`;
- production does not start twice.

Result:

```text
PASS
```

### Stale Lock

Behavior:

- expired lock is treated as abandoned;
- lock is removed;
- one exclusive acquisition retry succeeds.

Result:

```text
PASS
```

### Owner Mismatch

Behavior:

- lock release compares owner ids;
- a lock replaced by another owner is preserved.

Result:

```text
PASS
```

### Missing Scheduler State

Behavior:

- reader returns `null`;
- the scheduled runner can initialize the canonical default state.

Result:

```text
PASS
```

### Corrupted Scheduler State

Initial finding:

State parsing errors aborted `runScheduledProduction()` before it could return a controlled result.

Fix:

- scheduled execution records `state_unavailable`;
- production is skipped;
- the corrupted state is not overwritten automatically;
- no intelligence stage starts.

Result:

```text
PASS
```

### Missing Last-Skip Record

Behavior:

- reader returns `null`.

Result:

```text
PASS
```

## Run Report Recovery Scenarios

### Missing Directory

Behavior:

- recent run list returns empty.

Result:

```text
PASS
```

### Pending and Running Reports

Behavior:

- incomplete but valid reports remain readable;
- latest-run ordering still works.

Result:

```text
PASS
```

### Corrupted Report

Initial finding:

One corrupted report file caused the complete recent-run read to fail.

Fix:

- corrupted or incompatible report files return `null`;
- recent-run readers skip them;
- valid reports remain available.

Result:

```text
PASS
```

## Orchestrator Failure Isolation

### Historical Analog Failure

Injected:

- missing Historical Analog source file.

Observed:

```text
historical_analog: failed
event_impact: succeeded
market_memory: succeeded
artifact_publication: succeeded
```

The durable run report finalized successfully.

### Event Impact Failure

Injected:

- unsupported Event Impact category.

Observed:

```text
historical_analog: succeeded
event_impact: failed
market_memory: succeeded
artifact_publication: failed
```

Market Memory correctly used the successful Historical Analog artifact.

### Market Memory Failure

Injected:

- Historical Analog output below the deterministic Market Memory evidence threshold;
- Event Impact unavailable.

Observed:

```text
historical_analog: succeeded
event_impact: failed
market_memory: failed
artifact_publication: succeeded
```

Prepared Historical Analog evidence still published.

### Artifact Publication Failure

Injected:

- registry publication rejection.

Observed:

- earlier cache and memory stages remained recorded;
- publication stage failed;
- durable run report finalized;
- overall status was `partial`.

### Overall Status Correction

Initial finding:

Runs with failures but no successful or partial stages could be summarized as `partial`.

Fix:

- failures with no successful output now produce `failed`;
- all-skipped runs produce `skipped`;
- mixed successful and failed stages remain `partial`.

## Operations Console Recovery

Tested with:

- no artifact index;
- no report directory;
- no scheduler state.

Observed:

```text
artifactStore: empty
runReportStore: empty
schedulerState: empty
recentRuns: []
```

The operations snapshot completed without exceptions. The `/ops/intelligence` client already renders these values as compact degraded states.

Result:

```text
PASS
```

## Files Hardened

- `core/intelligence-artifacts/artifactValidation.ts`
- `lib/intelligence-artifacts/fileBackedArtifactRegistry.ts`
- `core/intelligence-production/intelligenceSchedulerTypes.ts`
- `lib/intelligence-production/runScheduledProduction.ts`
- `lib/intelligence-production/productionRunReportStore.ts`
- `lib/intelligence-production/buildIntelligenceSuite.ts`
- `lib/intelligence-production/intelligenceOperationsSnapshot.ts`

## Remaining Risks

### Read Degradation Hides Corruption From Generic Registry Consumers

Registry read methods return empty or missing results for corrupted indexes and payloads because the registry interface has no degraded-state contract.

The Operations Console independently validates index metadata and reports the artifact store as unavailable. Future work may add a read-only diagnostics interface without changing the core registry contract.

### No Checksums

Payload and report integrity relies on JSON parsing, schema validation, and identity checks. There are no content hashes.

### No Orphan Cleanup

Orphan payloads are safely ignored but remain on disk.

### Corrupted Scheduler State Requires Operator Repair

The runner skips production and preserves the file. It does not automatically replace or migrate corrupted state.

### Running Reports Are Not Automatically Finalized

A process crash may leave a valid report in `running` state. Readers expose it accurately, but there is no abandoned-run reconciliation.

### Single-Filesystem Coordination

Artifact writes, reports, scheduler state, and locking assume processes share one filesystem. They do not provide distributed coordination across ephemeral hosts.

### No Cross-Process Artifact Index Lock

The scheduled runner prevents concurrent production runs, but direct independent artifact publishers can still race at the index level.

## Recommended Follow-Up Work

1. Add read-only store diagnostics contracts that distinguish missing, corrupted, and incompatible states.
2. Add optional content hashes to artifact payload and report metadata.
3. Add a manual orphan inventory and cleanup command.
4. Add abandoned-run reconciliation based on scheduler lock expiry.
5. Add cross-process artifact index locking if independent publishers become operationally necessary.

These should be implemented only when operational evidence justifies them. No database or monitoring framework is required for the current scale.
