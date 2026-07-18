# Common Watermark Manifest Binding

An inactive Serving manifest binds immutable `commonWatermarkId`, `commonWatermarkValue`, `commonWatermarkChecksum`, and `memberSetChecksum` fields. Candidate identity includes all four values, the exact member count, every member identity and payload checksum, and every member schema version.

The MVP-8E manifest contains the governed-through timestamp and member digest but does not contain the common-watermark event identity or checksum. The Refresh event payload is stored as a JSON string and contains dataset names plus Replay checksums. This is sufficient audit evidence, but it is not the required immutable manifest binding.

Forward migration `004_inactive_serving_staging_bindings.sql` adds those four fields. Legacy manifests may retain an all-null binding set as historical evidence, while the `mvp-inactive-serving-stage/1.0.0` schema requires all fields. Immutable triggers remain unchanged.

`stageInactiveServingCandidate` computes the member-set checksum only after canonical sorting and writes the manifest only after all 74 payload-backed members have been persisted and verified. The new manifest is `INELIGIBLE` for activation, and no exposure row is created.
