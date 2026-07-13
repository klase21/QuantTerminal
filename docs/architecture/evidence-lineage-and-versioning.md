# Evidence Lineage and Versioning

## Lineage DAG

~~~mermaid
flowchart LR
  A["Raw Artifact"] --> F["Canonical Fact Version"]
  F --> C["Consistency Result"]
  C --> E["Evidence Packet Version"]
  F --> E
  E --> I["Interpretation / Consumer Projection"]
~~~

Every edge references immutable node identity/version. Lineage is append-only, acyclic, queryable, and never hidden solely in JSON. Supersession is a separate relation.

Existing D2 vocabulary includes EVIDENCE_PACKET but not CONSISTENCY_RESULT. Phase 1 should add bounded D4 contracts without altering D2 migrations. D4 may own a derived-lineage relation referencing D2 identities, subject to reconciliation.

Required paths are raw-to-fact (D2-owned), fact-to-Result, Result-to-Packet, selected fact-to-Packet, and Packet-to-projection. Generated explanation text references Packet version plus renderer/model version.

## Event-Time and Knowledge-Time

Event time describes when a fact applies. Knowledge time describes when the system could validly know that version.

~~~mermaid
sequenceDiagram
  participant M as Market Event
  participant F1 as Fact V1
  participant E1 as Evidence V1
  participant F2 as Later Correction V2
  participant E2 as Evidence V2
  M->>F1: effective at T0
  F1->>E1: known at T1
  F2->>E2: correction known at T2
  Note over E1: historical cutoff before T2 uses V1
  Note over E2: corrected/retrospective mode may use V2
~~~

Proposed modes for Phase 1 reconciliation are AS_KNOWN_THEN, LATEST_CORRECTED, and RETROSPECTIVE. Replay must use an explicit mode and never leak versions known after its cutoff.

## Current Selection

Current reads match stable Evidence identity, select one published non-revoked version valid for the requested knowledge mode, retain superseded versions for historical reads, and fail closed on ambiguous active versions.

## Recompute and Invalidation

| Trigger | Treatment |
|---|---|
| New/corrected fact | Recompute affected dependency nodes; old packet unchanged |
| Revoked fact | Append invalidation; review or withdraw publication |
| Quality/coverage change | Recompute eligibility/completeness |
| Freshness transition | Mark read projection stale; preserve packet |
| Rule/policy/Profile change | New Results and/or Packet version |
| Publication policy change | New decision; content changes only if assembly changes |

Requests are durable and idempotent. History is not deleted. Consumer projections are replaceable; fact, Result, Packet, lineage, supersession, invalidation, and publication histories are durable.
