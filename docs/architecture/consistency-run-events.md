# Consistency Run Events

Run events are append-only and use the closed types `RUN_CREATED`, `RUN_STARTED`, `RUN_COMPLETED`, `RUN_PARTIAL`, `RUN_FAILED`, `RUN_CANCELLED`, and `RUN_EXPIRED`.

Event identity is deterministic from command ID, Run ID, event type, previous and next state, and specification checksum. Events retain actor, occurrence time, policy references, bounded reason codes, bounded key/value details, sequence, and checksum. Event Time is held in the Run specification; event occurrence time is execution metadata.

`ConsistencyRunStore` exposes no arbitrary state update or event mutation. Transaction failure leaves no authoritative event, false state, or completion summary.
