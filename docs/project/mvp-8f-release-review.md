# MVP-8F Inactive Candidate Release Review

## Decision

SAFE BLOCKED. The candidate remains correctly WITHHELD and INTERNAL_ONLY, but it is not ready for controlled publication.

## Verified

- Reviewed commit: `7f0a69d642ed2b172e8fbef5a84aaecbf1d1cb03`
- Candidate identity and manifest are present and immutable.
- Core counts match the MVP-8E baseline.
- OHLCV and Open Interest each contain 288 gap-free records per required symbol.
- Funding contains three provider-native observations per required symbol.
- Six VALIDATED AggTrades manifests cover the target UTC day.
- D4 contains 24 Coverage results, 30 Consistency results, six Evidence packets, six assessments, and 62 conflict-free Projections.
- All 62 Projection member identities resolve to D4.
- The six Replay member checksums match the common-watermark Replay checksum set.
- Four dataset watermarks and one common watermark are present.
- Active exposure remains zero.

## Release Blocker

The inactive corpus is membership-only. Its declared 62 Projection, six Evidence, and six Replay members have no corresponding rows in `serving_projection`, `serving_evidence_summary`, or `serving_replay_sequence`.

The current application read port selects a `CONSUMER_VISIBLE` exposure and reads those serving payload tables. It therefore returns `SERVING_CORPUS_UNAVAILABLE`; Dashboard, Replay, Scanner, and Trade cannot be smoke-tested against this candidate. The manifest also carries the governed-through timestamp but no immutable common-watermark event identity or checksum.

## Required Follow-up

Add a controlled, inactive publication-staging operation that copies checksum-verified D4 Projection and Evidence payloads plus the six Replay payloads into the candidate's serving tables without creating exposure. Bind the manifest to the immutable common-watermark identity/checksum, then rerun MVP-8F read-only review before any Neon publish sprint.

No candidate, database, exposure, Production, Neon, Vercel, or protected operational state was modified by this review.
