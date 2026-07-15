# MVP External Context Sources

## Governed Roles

External context is supplemental. It cannot rewrite the bounded crypto Evidence
corpus or imply realtime freshness.

| Provider | Source | Purpose | Tier | Frequency | MVP state |
| --- | --- | --- | --- | --- | --- |
| FRED | `FRED_OFFICIAL_API` | `OFFICIAL_MACRO_BASELINE` | Official | Daily | DGS10 bounded Canary certified |
| Alpha Vantage | `ALPHA_VANTAGE_OFFICIAL_API` | `DAILY_MARKET_CONTEXT` | Supplemental official API | Daily | SPY bounded Canary certified; public-demo license review required |
| Farside | `FARSIDE_PUBLIC_WEB` | `OBSERVED_BITCOIN_ETF_FLOW` | Supplemental public web | Source-updated daily | Public embedded table; browser-backed scheduled Canary certified |

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

Farside is publicly available as `HTML_EMBEDDED_TABLE`. Direct Node HTTP is
`UNCERTIFIED_OR_EDGE_REJECTED`; the certified path uses an ordinary Chrome
context to retrieve WordPress page 1321 and stores `content.rendered` as the
Raw HTML Artifact before strict `table.etf` parsing. Blank, dash, explicit zero,
positive, negative, malformed, missing-column, changed-header, and cumulative
Total states remain distinct. All 643 dated totals reconcile exactly.

## Secret Boundary

`FRED_API_KEY` and `ALPHA_VANTAGE_API_KEY` are read only from the process
environment. Public request identities and logs exclude credentials, and Raw
Artifacts contain provider responses rather than credential-bearing request
URLs. Farside has no credential; its scheduled browser context uses no stored
session or authentication state.

## Scheduled Browser Runtime

The certified Farside acquisition worker uses `playwright-core` and therefore
requires an installed Chrome or Chromium executable. The scheduled runtime must
provide `CHROME_EXECUTABLE_PATH`, or run on a host where the worker can resolve
the documented platform Chrome location. Vercel page rendering never launches
the browser and never retrieves Farside; product requests read only persisted
Facts and the immutable supplemental Projection.

## Projection Boundary

`MacroContextProjection` combines the certified DGS10 and SPY facts as
`MIXED`, daily, supplemental context. It records unavailable roles and a
neutral relationship to crypto Evidence. `BitcoinEtfFlowProjection` supplies
daily observed totals and bounded five- and twenty-trading-day summaries from
persisted certified Facts. Both remain supplemental; missing external context
never blocks the core crypto Dashboard or Research page.
