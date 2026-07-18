# MVP-8I Serving Staging Report

## Result

The final isolated Serving target was migrated from zero and staged exactly once from verified read-only sources. The resulting candidate is `mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57`.

## Durable State

- Projection payloads: 62
- Evidence payloads: 6
- Replay payloads: 6
- Manifest members: 74
- Candidate manifests: 1
- Active exposures: 0
- Missing, orphan, duplicate, or checksum-conflicting payloads: 0

The candidate is `WITHHELD`, `INTERNAL_ONLY`, and manifest eligibility is `INELIGIBLE`. No publication event or exposure row exists.

## Immutable Bindings

- Common watermark: `2026-07-16T00:00:00.000Z`
- Common-watermark ID/checksum: verified against the retained MVP-8E Refresh event
- Member-set checksum: `021b8ad9ea4710060dd5ab380174ade2a54ac1e57fa5a229affe6807e62a527e`
- Manifest checksum: `df394d92051d3838bf737ecd6edebdfe360b3096a03b2be07bc011abc27e63a4`

The failed MVP-8E candidate was used only as a read-only cross-check. Its identity is absent from the new corpus source binding, member lineage, metadata, and manifest.

## Reader Certification

The separate read-only role selected the withheld candidate explicitly and completed Dashboard, Scanner, six Trade Decision Context, and six Replay reads. No active corpus selection was created or changed.
