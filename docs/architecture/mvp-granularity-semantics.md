# MVP Granularity Semantics

## Governed Five-Minute Value

The semantic identity is `FIVE_MINUTE`, represented canonically as `5m`, ISO duration `PT5M`, and `300000` milliseconds. Accepted legacy inputs are exactly `5m`, `PT5M`, `FIVE_MINUTE`, and `FIVE_MINUTES`; other values fail closed.

Five-minute duration does not imply identical timestamp meaning.

| Dataset | Five-minute role | Timestamp meaning |
|---|---|---|
| OHLCV | aggregation interval | interval start; terminal time is the provider close boundary |
| Open Interest | observation cadence | provider observation time; the certification day begins at `00:05Z` because the real archive contains 287 unique observations |
| Coinalyze liquidation bars | aggregation window | provider bar timestamp; experimental and lower-bound |
| Replay | query/display alignment | derived alignment only; it does not rewrite source Event Time |

Funding remains provider-native event cadence (`EVENT_8H`) and is never expanded to five-minute rows. AggTrades remain provider-native tick events inside daily Canonical Stream Segments.

## Distinct Dimensions

- **Observation interval:** spacing or duration represented by a source record.
- **Publication cadence:** when a provider makes records available.
- **Aggregation window:** period summarized by a bar.
- **Query resolution:** reader-selected sampling or alignment.
- **Display resolution:** UI presentation choice.

Event Time remains the governed market timestamp. Retrieval, ingestion, Knowledge, and publication times are separate and may not replace it.

