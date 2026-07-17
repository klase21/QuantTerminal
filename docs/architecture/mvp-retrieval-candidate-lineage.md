# MVP Retrieval-Candidate Lineage

## Scope

MVP-8A.2O corrects the bounded live-resume acquisition lineage at the D3 population boundary. It does not execute a live resume, advance a watermark, create a serving candidate, or change Production.

## Root Cause

The Funding/DOGEUSDT Candidate path used the provider retrieval identity as its parent. The D3 parent of a Candidate is instead the persisted population Retrieval attempt created for that acquisition. Those identities are distinct, so the former parent reference failed the D3 retrieval-to-Candidate lineage contract.

## Integrated Durable Ownership

D3 owns `control.retrieval_attempts` and `population.candidates` in the integrated backfill database. D2 owns `raw.objects` in the same physical database under its separate approved role. Shared physical storage does not change the ownership boundary or permit a Candidate to use a provider retrieval identity in place of its persisted D3 parent.

## Atomic Persistence Contract

The D3 adapter now persists each bounded acquisition through `persistBoundedAcquisitionResult`. Its D3 transaction injects the persisted Retrieval attempt as the Candidate parent and classifies an exact replay as `DUPLICATE`; any incompatible persisted lineage is a conflict and fails closed. D2 Raw Object persistence remains a separate immutable role boundary, and D3 records its identity/checksum as external lineage rather than pretending a cross-database transaction exists.

## Certification And Retained State

Authenticated preflight includes rollback-only probes for the D2 Raw Artifact object path and the D3 Retrieval/Candidate path. Both probes retained zero rows or objects.

The existing live refresh execution remains one persisted plan, one persisted run, and 23 `PENDING` units. Its failure is at `SOURCES_ACQUIRED`; it has no common watermark and no refresh candidate corpus. The persisted D3 partials are retained for diagnosis: Funding/DOGEUSDT is `RAW_PERSISTED` with one attempt, one object, and zero Candidates; Open Interest/ETHUSDT is `RAW_PERSISTED` with one attempt, one object, and two Candidates. Their leases are expired. These partials do not authorize downstream stages or candidate publication.

## Population Resume Reconciliation Correction

The post-2O retry exposed a separate Population event defect. Fence 2 reused each fence-1 `live-retrieving` event identity, so PostgreSQL rejected the retry before a durable resume checkpoint could be recorded. The DOGE Funding collision was a true immutable conflict: the retained event has fence 1 and checksum `b468e5bc046427b01d4085222c0ac5f82cbaf8ccd419cb0ac7663e0785681125`; the attempted fence-2 payload has checksum `0cf96d84bfb7fbe25c98591b6484c43065b761c34f76d9e86076355f86c6d9d9`. The equivalent ETH Open Interest collision is also a conflict, with retained checksum `27a48a45951f844daf11b34d7279b9fee070ad42230c7d6294b8a15b9ab6dde1` and attempted checksum `53bb96b1f419f011415691184493332847a6564b12d35d3d2ae2e5b45a027596`.

Resume now derives its boundary from durable D3 lineage. DOGE Funding resolves to `CANDIDATE_LINEAGE`; its existing Retrieval and Raw Object are reused. ETH Open Interest resolves to `CANONICAL_COMMIT`; its Retrieval, Raw Object, and two Candidates are reused. Resume-stage event identities include the fencing token. Exact event identity plus exact immutable payload returns `DUPLICATE`; changed immutable payload returns `CONFLICT`. Failure event, durable-boundary checkpoint, lease release, and retryable unit state are committed in one D3 transaction.

Rollback-only certification reconciled both exact partial shapes twice. It advanced fences, injected failures, released both leases, created no duplicate Retrieval/Object/Candidate lineage, raised no duplicate-event exception, and retained zero event, checkpoint, attempt, or Candidate deltas. The real run and its historical Population rows were read only.
