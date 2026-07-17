# Inactive Serving Payload Staging

## Required Contract

An inactive candidate is release-reviewable only when its immutable membership and its durable Serving payload rows are committed together before the manifest. The required order is Projection payloads, Evidence payloads, Replay payloads, member set, common-watermark binding, manifest, and readback verification. The operation must leave lifecycle `WITHHELD`, exposure `INTERNAL_ONLY`, and active exposure count zero.

The existing `MvpServingStore` already verifies and writes published Projection, Evidence, and Replay payloads. The inactive `LocalInactiveCandidateAssemblyService` writes only corpus membership and a manifest. A future staging coordinator should reuse the existing serializers and payload inserts while retaining inactive lifecycle semantics; it must not route through active publication.

## MVP-8G Source Blocker

MVP-8E materialized six Replay sequence models in process memory. It then persisted only member checksums and sample counts. The serialized Replay models were not written to D4, Serving, or retained object storage. The common-watermark event contains the six model checksums but not the models.

Consequently, Projection and Evidence payloads remain recoverable from verified D4, but the six required Replay payloads have no durable source. Reconstructing them from Core and D4 would be a Replay rebuild and is outside the MVP-8G boundary. Inactive staging must fail before creating a target database or candidate when any durable source payload is absent.
