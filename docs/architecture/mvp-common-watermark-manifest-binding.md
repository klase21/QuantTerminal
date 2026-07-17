# Common Watermark Manifest Binding

An inactive Serving manifest must bind immutable `commonWatermarkId`, `commonWatermarkValue`, `commonWatermarkChecksum`, and `memberSetChecksum` fields. Candidate identity must include all four values and every member payload checksum.

The MVP-8E manifest contains the governed-through timestamp and member digest but does not contain the common-watermark event identity or checksum. The Refresh event payload is stored as a JSON string and contains dataset names plus Replay checksums. This is sufficient audit evidence, but it is not the required immutable manifest binding.

The smallest future schema change is one forward-only Serving migration adding required watermark identity, value, and checksum fields to the immutable candidate manifest contract. Manifest insertion must reject absent bindings and must occur only after exact payload readback.
