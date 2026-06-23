# Market Driver Evidence Integration V2

## Purpose

Market Driver Evidence Integration V2 expands the deterministic explanation
engine across Funding, Open Interest, Liquidation, Exchange Flow, Treasury,
ETF, Historical Analog, and Event Impact evidence.

It explains available observations. It does not predict future prices, produce
recommendations, or claim unsupported causality.

## Evidence Rules

### Funding

Current evidence uses Binance Futures premium index data:

- positive funding contributes positive evidence;
- negative funding contributes negative evidence;
- zero funding is neutral.

### Open Interest

Current evidence combines three Binance Futures 5m open-interest observations
with matching 5m price candles:

- increasing OI and rising price contributes positive evidence;
- increasing OI and falling price contributes negative evidence;
- contracting OI or flat price remains neutral.

The evidence record exposes both percentage changes.

### Liquidation

Prepared replay/liquidation evidence is used only when temporally aligned:

- short-liquidation dominance contributes positive evidence;
- long-liquidation dominance contributes negative evidence;
- total-only evidence remains neutral.

### Exchange Flow

Durable `exchange_flow` artifacts are used when temporally aligned:

- net exchange outflow contributes positive evidence;
- net exchange inflow contributes negative evidence.

### Treasury

Durable `treasury_snapshot` artifacts require an explicit change:

- accumulation contributes positive evidence;
- reduction contributes negative evidence;
- holdings without a reported change are not directional evidence.

### Existing Evidence

ETF, Historical Analog, and Event Impact behavior is preserved. Historical
Analog and Event Impact remain contextual evidence and are not described as
current causal observations.

## Freshness

Current evidence uses a 48-hour alignment tolerance around the newest
capital-flow observation. Binance Funding and OI calls have a six-second
timeout and degrade to missing evidence on failure.

Replay positioning, Liquidation, Exchange Flow, and Treasury evidence outside
the tolerance is excluded from ranking and reported under `staleCategories`.

## Confidence

Confidence continues to measure category coverage and evidence quality only.
Adding a category raises confidence only when usable evidence exists. Stale or
unavailable records do not raise confidence.

## Audit

Run:

```powershell
npm run audit:market-drivers
```

Driver Coverage Matrix:

| Symbol | Drivers | Confidence | Missing Categories |
| --- | ---: | ---: | --- |
| Discovered symbol | Ranked drivers | Coverage/quality | Explicit evidence gaps |

Failure categories:

- `missing_evidence`;
- `stale_evidence`;
- `incomplete_evidence`;
- `unsupported_symbol`;
- `unknown`.

## Failure Handling

- Binance unavailable or timed out: Funding/OI remain missing.
- Incomplete OI or price samples: OI remains missing.
- Missing prepared evidence: explicit missing category.
- Stale prepared evidence: excluded and reported.
- Invalid numeric evidence: ignored.

No missing value is replaced with zero.

## Limitations

- The OI/price relationship is a short observed sample, not causal proof.
- Current Liquidation direction requires a temporally aligned prepared source
  containing separate long and short totals.
- Exchange Flow and Treasury coverage depends on real durable artifacts.
- This sprint changes no UI and publishes no prediction.

## Initial Validation

The June 23, 2026 audit produced:

| Symbol | Drivers | Confidence | Missing Categories |
| --- | ---: | ---: | --- |
| BTCUSDT | 5 | 48.75 | liquidation, exchange_flow, treasury |
| ETHUSDT | 5 | 48.75 | liquidation, exchange_flow, treasury |

Both symbols added verified current Funding and Open Interest evidence. Driver
count increased from `3` to `5`, and coverage confidence increased from
`23.75` to `48.75`.

No current Liquidation, Exchange Flow, or Treasury evidence was available.
Those integrations remain active but correctly contribute no driver and no
confidence until temporally valid evidence exists.
