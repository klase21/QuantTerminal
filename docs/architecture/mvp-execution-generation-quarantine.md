# MVP Execution Generation Quarantine

Execution generation disposition is independent from Refresh run state and Population unit state. A generation is implicitly `ACTIVE` until one immutable `EXECUTION_GENERATION_DISPOSITION` event records `QUARANTINED` or `SUPERSEDED`. Historical run, unit, event, checkpoint, Retrieval, Raw Object, Candidate, Fact, and downstream rows are never rewritten to express this disposition.

The quarantine identity is the exact persisted Refresh run ID. Interval-only selection is forbidden. The event records the generation, plan, run, exact interval, reason, incident checksum, source revision, quarantine time, operator confirmation identity, and evidence summary checksum. Exact payload replay is `DUPLICATE`; the same generation with different immutable evidence is `CONFLICT`.

## Effects

Refresh execution setup checks disposition inside its parent-child transaction. Worker preflight checks it before source availability or executor probes. A quarantined generation cannot resolve units, reconcile Population leases, extend lineage, advance watermarks, invoke bounded downstream stages, assemble a manifest, or reach serving activation.

The operator transition is a cross-database saga. `QUARANTINE_INTENT` is represented by the immutable Refresh disposition and immediately establishes the fail-closed guard. Population fencing then appends one deterministic quarantine event per affected logical unit through the native JSON object binding. Active leases are released without changing unit state; expired historical leases remain audit evidence. After verifying all unit events and zero active leases, Refresh records one deterministic `EXECUTION_GENERATION_QUARANTINE_COMPLETED` receipt.

Saga state is derived from durable records:

- `INTENT_RECORDED`: the Refresh guard exists; Population fencing and completion receipt are missing.
- `POPULATION_FENCED`: every Population unit has its immutable audit event and active leases are zero; the receipt is missing.
- `COMPLETE`: Population fencing is verified and the completion receipt exists.

Exact event and receipt replay is `DUPLICATE`. The same identity with changed immutable details, reason, evidence, or incident checksum is `CONFLICT`. A partial retry executes only missing saga steps.

Immutable Raw Object bytes remain audit-readable. They may be reused later only after checksum verification and with a fresh execution generation, Retrieval, Candidate, Fact, downstream, watermark, Replay, and manifest lineage.

## Operator Boundary

The original quarantine command is not rerun after an intent exists. `reconcile-quarantine` reads the committed intent and previews missing saga steps without writes. Confirmation requires the exact run ID, committed incident checksum, and explicit operator identity. It cannot alter disposition or incident evidence and can only append missing Population audit records and the completion receipt.
