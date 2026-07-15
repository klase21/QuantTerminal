# MVP Farside Bitcoin ETF Flow Canary Report

## Result

`CERTIFIED_BOUNDED_CANARY`

Source availability is `PUBLICLY_AVAILABLE` and the representation is
`HTML_EMBEDDED_TABLE`. Ordinary direct server requests to both the public page
and official WordPress page endpoint are edge-rejected with HTTP 403 in this
runtime, so that transport remains `UNCERTIFIED_OR_EDGE_REJECTED`.

The official WordPress endpoint `/wp-json/wp/v2/pages/1321` was then retrieved
through an ordinary Playwright-controlled Chrome context. It returned HTTP 200
without cookies, login, Authorization, API keys, challenge solvers, proxies, or
stealth plugins. `content.rendered` supplied the complete HTML containing
`table.etf`; this HTML was stored as the Raw Artifact before parsing. The
certified acquisition mode is `BROWSER_BACKED_SCHEDULED_RETRIEVAL`.

## Source Contract

- Raw Artifact SHA-256: `b4cc0b5d0d4adc9b4f90d94cfededa40b2b8650fc280f078b2381105bf10a6bc`
- Raw Artifact bytes: 699,484
- Exact headers: Date, IBIT, FBTC, BITB, ARKB, BTCO, EZBC, BRRR, HODL,
  BTCW, MSBT, GBTC, BTC, Total
- Dated rows: 643
- Cumulative summary rows: 1 final Total row
- Earliest source date: 2024-01-11
- Latest source date: 2026-07-14
- Unit: source-reported US$ millions
- Daily Total reconciliation: 643/643 matched; zero mismatches

Blank and dash remain missing, while `0.0` remains an explicit zero.
Parenthesized values are negative. Header changes, row-width changes, malformed
values, or Total reconciliation failure reject publication eligibility.

## Persistence And Rerun

The bounded Canary created one Raw Artifact, 7,468 deterministic Candidates,
7,468 append-only Canonical Facts, 7,468 lineage edges, and one eligible
Coverage decision. All source publication decisions remain `PENDING`.

The exact rerun reproduced the Raw Artifact checksum and returned
`RERUN_DUPLICATE`: 7,468 Candidate duplicates, 7,468 Fact duplicates, and
7,468 submission duplicates. Counts before and after were identical, no false
conflict was created, and active leases returned to zero.

## Projection

`BitcoinEtfFlowProjection` is `GENERATED` and `READY_FOR_CUTOVER`:

- Projection version: `mvpv_1a28580aebc99079a4aab906f7f23e09b35ed50c316f3b3bf430625ef91cb68b`
- Checksum: `028007160d1b9939843d0fb4c8057a0215dbb22b6d95daeac39f3171b95123b9`
- Exact recompute: `DUPLICATE`

The Projection is daily supplemental context. Observed ETF flow is not
estimated institutional demand and does not rewrite governed crypto Evidence.
