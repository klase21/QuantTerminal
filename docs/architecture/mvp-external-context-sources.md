# MVP External Context Sources

## Governed Roles

External context is supplemental. It cannot rewrite the bounded crypto Evidence
corpus or imply realtime freshness.

| Provider | Source | Purpose | Tier | Frequency | MVP state |
| --- | --- | --- | --- | --- | --- |
| FRED | `FRED_OFFICIAL_API` | `OFFICIAL_MACRO_BASELINE` | Official | Daily | DGS10 bounded Canary certified |
| Alpha Vantage | `ALPHA_VANTAGE_OFFICIAL_API` | `DAILY_MARKET_CONTEXT` | Supplemental official API | Daily | SPY bounded Canary certified; public-demo license review required |
| Farside | `FARSIDE_PUBLIC_WEB` | `OBSERVED_BITCOIN_ETF_FLOW` | Supplemental public web | Source-updated daily | Server-side retrieval blocked (HTTP 403) |

FRED observations retain series metadata, units, frequency, seasonal adjustment,
observation date, realtime/vintage fields, retrieval time, Artifact checksum,
lineage, and Coverage. Alpha Vantage observations retain symbol, market role,
provider OHLCV fields in the Candidate and Raw Artifact, daily close in the typed
Fact, time zone, currency, entitlement state, lineage, and Coverage.

## Bounded Registry

The role registry is explicit and fail closed. This sprint certified DGS10 for
long-rate context and SPY for broad US equity context. DGS2, T10Y2Y, DTWEXBGS,
FEDFUNDS, WALCL, QQQ, GLD, WTI, and EUR/USD remain registered roles pending
individual bounded source certification. Their absence is not replaced by a
semantically different series.

Farside table semantics distinguish blank, dash, explicit zero, positive,
negative, malformed, missing-column, and changed-header states. Because the
worker could not obtain the Raw HTML Artifact, no ETF observation or flow
Projection was created.

## Secret Boundary

`FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY` are read only from the process
environment. Public request identities and logs exclude credentials, and Raw
Artifacts contain provider responses rather than credential-bearing request
URLs. No browser makes provider requests.

## Projection Boundary

`MacroContextProjection` combines the certified DGS10 and SPY facts as
`MIXED`, daily, supplemental context. It records unavailable roles and a
neutral relationship to crypto Evidence. `BitcoinEtfFlowProjection` remains
absent because source persistence is blocked. Missing external context never
blocks the core crypto Dashboard or Research page.
