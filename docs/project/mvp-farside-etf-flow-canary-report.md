# MVP Farside Bitcoin ETF Flow Canary Report

## Result

`SOURCE_ACCESS_BLOCKED`

Two exact server-side attempts to
`https://farside.co.uk/bitcoin-etf-flow-all-data/` returned HTTP 403. The
public page was independently readable and identified the `Bitcoin ETF Flow -
All Data (US$m)` table and its expected fund columns, but that read path does
not provide the Raw HTML required by the governed worker.

## Persistence

Zero Raw Artifacts, observations, lineage edges, Coverage decisions, and ETF
Flow Projections were created. No flow value was inferred from the visible
page, cached elsewhere, converted from blank or dash, or substituted with zero.

## Parser Contract

The deterministic parser recognizes source date, fund columns, Total, source
units, header identity, row order, blank, dash, explicit zero, positive,
negative, malformed, missing-column, and changed-header states.

## Certification

Not certified. The source remains a public supplemental candidate pending an
approved server-side acquisition method that yields a durable Raw HTML
Artifact. This limitation does not block FRED, Alpha Vantage, or core crypto
pages.
