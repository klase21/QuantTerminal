# Inactive Serving Payload Staging

## Required Contract

An inactive candidate is release-reviewable only when its immutable membership and its durable Serving payload rows are committed together before the manifest. The required order is Projection payloads, Evidence payloads, Replay payloads, member set, common-watermark binding, manifest, and readback verification. The operation must leave lifecycle `WITHHELD`, exposure `INTERNAL_ONLY`, and active exposure count zero.

The existing `MvpServingStore` verifies and writes published Projection, Evidence, and Replay payloads. MVP-8I adds `stageInactiveServingCandidate`, which reuses those validators and payload adapters without routing through active publication. The serializable write order is Projection payloads, Evidence payloads, Replay payloads, exact payload readback, 74 immutable members, member readback, manifest, and final readback.

The staged corpus is deterministic from the verified D4 Projection set, derived Evidence summaries, the certified MVP-8H Replay source corpus, and the exact common-watermark binding. The failed MVP-8E candidate is used only as a read-only historical cross-check and cannot appear in the new candidate identity, source corpus, member lineage, or metadata.

Internal review uses an explicit reader-only corpus selection. It does not create `serving_exposure`, does not change active corpus selection, and cannot publish or activate the candidate.

## MVP-8G Source Blocker Resolved

MVP-8E materialized six Replay sequence models in process memory. It then persisted only member checksums and sample counts. The serialized Replay models were not written to D4, Serving, or retained object storage. The common-watermark event contains the six model checksums but not the models.

MVP-8H rematerialized and certified the six complete Replay payloads in the immutable internal corpus `mvp-replay-source:6a2903a60d274f05a88eb9dd501d07aa927918115d4688ef1914b6351b86a6d7`. MVP-8I reads that source corpus without reconstructing Replay and verifies all six certified model and snapshot checksums before staging.
