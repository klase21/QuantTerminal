# MVP Execution Generation Quarantine

Execution generation disposition is independent from Refresh run state and Population unit state. A generation is implicitly `ACTIVE` until one immutable `EXECUTION_GENERATION_DISPOSITION` event records `QUARANTINED` or `SUPERSEDED`. Historical run, unit, event, checkpoint, Retrieval, Raw Object, Candidate, Fact, and downstream rows are never rewritten to express this disposition.

The quarantine identity is the exact persisted Refresh run ID. Interval-only selection is forbidden. The event records the generation, plan, run, exact interval, reason, incident checksum, source revision, quarantine time, operator confirmation identity, and evidence summary checksum. Exact payload replay is `DUPLICATE`; the same generation with different immutable evidence is `CONFLICT`.

## Effects

Refresh execution setup checks disposition inside its parent-child transaction. Worker preflight checks it before source availability or executor probes. A quarantined generation cannot resolve units, reconcile Population leases, extend lineage, advance watermarks, invoke bounded downstream stages, assemble a manifest, or reach serving activation.

The operator transition appends the Refresh disposition first, establishing the fail-closed guard. It then appends one deterministic Population quarantine event per affected logical unit and releases every unreleased lease without changing unit state. A retry completes any interrupted lease fencing and returns `DUPLICATE` for already persisted immutable events.

Immutable Raw Object bytes remain audit-readable. They may be reused later only after checksum verification and with a fresh execution generation, Retrieval, Candidate, Fact, downstream, watermark, Replay, and manifest lineage.

## Operator Boundary

Run the command without confirmation for a read-only preview. Confirmation requires the exact previewed incident checksum and an explicit operator identity. The current generation is not quarantined by repository certification; operator execution is a separate controlled action.
