# MVP Projection Publication Boundary

Source publication and projection exposure are independent state machines.

| Concern | States | MVP-3 terminal state |
| --- | --- | --- |
| D2 source publication | existing D2 states | `PENDING` |
| D4 Evidence | internal persistence | internally persisted |
| Projection lifecycle | `GENERATED`, `SUPERSEDED`, `WITHHELD`, `INVALID` | `GENERATED` |
| Consumer exposure | `INTERNAL_ONLY`, `READY_FOR_CUTOVER`, `CONSUMER_VISIBLE` | `READY_FOR_CUTOVER` |
| Page/API consumption | existing paths | unchanged |

`READY_FOR_CUTOVER` means a valid immutable projection can be inspected by the governed read port. It does not publish source data and does not authorize a page to consume the record. Migration 010 rejects `CONSUMER_VISIBLE`; MVP-4 must introduce the reviewed cutover boundary rather than silently changing exposure.

Exact recomputation is an idempotent duplicate reuse. Content disagreement under the same truth identity creates a persisted conflict and fails the worker. Supersession creates a new version and retains the old version; it never deletes history.
