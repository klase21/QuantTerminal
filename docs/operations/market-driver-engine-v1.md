# Market Driver Engine V1

## Purpose

Market Driver Engine V1 produces a deterministic, evidence-backed explanation
of the forces represented in prepared intelligence artifacts.

It answers:

```text
Which available evidence is most material, and what direction does that
evidence support?
```

It does not predict future prices, generate recommendations, establish
causality, or use AI inference.

## Contract

Location:

```text
core/market-driver-engine/
```

Schema version:

```text
1
```

Driver categories:

- funding;
- open interest;
- liquidation;
- exchange flow;
- treasury;
- ETF;
- historical analog;
- event impact.

Summary:

```text
symbol
timestamp
marketDirection
confidence
drivers
availableCategories
missingCategories
quality
```

`marketDirection` is the balance of signed evidence:

- `positive`;
- `negative`;
- `mixed`;
- `unknown`.

It is not a price forecast.

## Evidence Rules

The engine reads durable intelligence artifacts only.

- ETF net flow uses the provider-reported USD value.
- Exchange net outflow is positive capital-flow evidence; net inflow is
  negative capital-flow evidence.
- Treasury change requires an explicit reported change amount.
- Funding and open interest levels remain neutral when no comparison baseline
  exists.
- Replay-derived funding, open interest, and liquidation evidence must be
  within 48 hours of the latest current-flow observation. Older replay windows
  are excluded from the current explanation.
- Liquidation evidence requires an explicit total.
- Historical Analog uses cached 24h average outcomes as context.
- Event Impact uses cached 24h average verified-event outcomes as context.

Historical and event outcomes are contextual evidence, not proof that they
caused the current move.

## Impact Scoring

Scores are bounded from `0` to `100`.

- USD ETF and liquidation magnitudes use a logarithmic scale.
- Exchange and treasury changes use change relative to reported holdings when
  available.
- Historical and event scores use absolute 24h average return, reduced for
  small samples.
- Funding uses absolute observed rate magnitude.
- Open interest without a baseline receives a bounded level-evidence score
  based on source point coverage.

Ranking is deterministic: impact score descending, then category name.

## Confidence

Confidence measures evidence coverage and quality only:

```text
category coverage × average quality weight
```

Quality weights:

- verified: `1.0`;
- degraded: `0.6`;
- unknown: `0.3`;
- unavailable: `0`.

Confidence is not predictive confidence and does not measure causal certainty.

## Audit

Run:

```powershell
npm run audit:market-drivers
```

Coverage matrix:

| Symbol | Drivers | Confidence | Quality |
| --- | ---: | ---: | --- |
| Discovered from durable artifacts | Ranked available evidence | Coverage/quality | Aggregate evidence quality |

For each symbol the audit reports:

- driver count;
- available categories;
- missing categories;
- confidence;
- quality;
- market direction;
- ranked drivers and supporting evidence.

Failure categories:

- `missing_evidence`;
- `incomplete_evidence`;
- `unsupported_symbol`;
- `unknown`.

## Limitations

- Evidence produced at different observation times is not treated as
  contemporaneous causality.
- Funding and open interest need change baselines before they can contribute a
  signed direction.
- Provider-native exchange-flow units are not compared across assets.
- Missing Treasury, Exchange Flow, or Liquidation artifacts remain explicit
  missing categories.
- V1 is a library and audit surface; it does not modify Dashboard or other UI.

## Initial Coverage

The initial durable-artifact audit discovered:

| Symbol | Drivers | Confidence | Quality |
| --- | ---: | ---: | --- |
| BTCUSDT | 3 | 23.75 | degraded |
| ETHUSDT | 3 | 23.75 | degraded |

Available categories for both symbols:

- ETF;
- Historical Analog;
- Event Impact.

Replay funding and open-interest evidence from February 22, 2026 was excluded
because it was not temporally aligned with the June 21, 2026 ETF observation.
Liquidation, Exchange Flow, and Treasury evidence were unavailable.
