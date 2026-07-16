# MVP Canonical Output Equivalence Audit

## Scope

This audit evaluates the BTCUSDT five-minute OHLCV logical slot for the closed UTC day beginning 2026-07-15. It is forensic and read-only. It does not reconcile attempts, select an authority, acquire canonical data, or mutate refresh, truth-plane, serving, or exposure state.

## Stable-Domain Digest Contract

The independent audit digest uses SHA-256 over UTF-8 JSON encoded with `JSON.stringify`. Facts are sorted by event timestamp and then canonical Fact identity. Decimal values remain canonical strings.

The full stable-domain tuple is:

1. canonical Fact identity
2. dataset
3. instrument
4. event timestamp
5. interval
6. open
7. high
8. low
9. close
10. volume
11. provider
12. source event identity
13. canonical version
14. supersession identity
15. immutable payload checksum

The timestamp-sequence digest includes only the ordered event timestamps. The value-only digest includes timestamp, interval, and OHLCV values. Run IDs, unit IDs, insertion times, worker IDs, lease and fence values, database sequence IDs, and transient status metadata are excluded.

## Findings

Five refresh-control attempts exist for the logical slot. Four are marked `COMMITTED`; one is marked `ACQUIRED`. None has a refresh artifact row, D3 Candidate identity, canonical commit identity, canonical Fact identity, source-contract version, parser version, normalizer version, or model version.

The four recorded `factDigest` values are reproducible as checksums of an object containing the attempt unit ID and the literal stage `COMMITTED`. They therefore classify as `DIGEST_INCLUDED_ATTEMPT_METADATA`. They are not digests of canonical Facts and cannot establish either equivalence or conflict.

The configured D2 audit target does not contain the canonical OHLCV and record-version relations required to extract the alleged outputs. The configured D3 audit target does not contain the population Candidate relation needed to bridge a refresh unit to canonical persistence. No attempt-attributable Fact set can be assembled.

All six committed-attempt pairs classify as `INSUFFICIENT_EVIDENCE`. Their differing-row count is zero only because no rows are available for comparison; it does not indicate equality.

The `ACQUIRED` attempt has no artifact row, checkpoint row beyond the attempt-derived acquisition checksum, active lease, retrieval identity, Candidate identity, canonical output, or matching persisted object. It classifies as `ORPHANED_NO_EVIDENCE`.

## Provider Comparison

One non-retaining bounded read of the currently published provider archive succeeded. The certified bounded parser produced 288 five-minute candles spanning the expected closed UTC day. The payload was held only in memory and was released after hashing and parsing.

The provider output has an independently reproducible stable-domain digest, but no immutable lineage connects it to any of the four committed attempts. The comparison therefore classifies as `PROVIDER_COMPARISON_INCONCLUSIVE`.

## Final Classification

The slot classification is `INSUFFICIENT_EVIDENCE_TO_RESOLVE`. No authoritative attempt is eligible for selection.

The next sprint should perform controlled reacquisition with an explicit source contract and immutable provenance capture, compare that output against any recoverable historical canonical versions, and design append-only correction or supersession behavior if a historical conflict is found. Existing attempts and Facts must remain unchanged.
