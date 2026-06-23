# Market Driver Evidence Integration V3

## Purpose

Market Driver Evidence Integration V3 completes the deterministic evidence
adapters for:

- Liquidation;
- Exchange Flow;
- Treasury.

The engine continues to explain observed evidence only. It does not predict
future prices, recommend trades, or infer unsupported causes.

## Evidence Sources

### Liquidation

The engine reads the newest prepared, symbol-level Liquidation Intelligence
cache for `binance_futures`.

Directional rules:

- short liquidations greater than long liquidations: positive;
- long liquidations greater than short liquidations: negative;
- equal totals: neutral.

The driver exposes the real long, short, and total notional values. Invalid or
zero-total evidence is ignored.

Standalone Liquidation Intelligence evidence takes precedence over the
Liquidation section of a Replay Intelligence artifact. This prevents duplicate
category coverage and confidence inflation.

### Exchange Flow

The engine consumes durable `exchange_flow` artifacts.

Directional rules:

- net outflow: positive;
- net inflow: negative;
- zero net flow: neutral.

Artifacts with `STALE` or `EXPIRED` validity, or observations outside the
48-hour current-evidence alignment window, are rejected.

### Treasury

The engine consumes durable `treasury_snapshot` artifacts with an explicit
non-zero holdings change.

Directional rules:

- accumulation: positive;
- reduction: negative.

Artifacts with `STALE` or `EXPIRED` validity, or observations outside the
48-hour current-evidence alignment window, are rejected. Holdings without a
reported change do not become directional evidence.

## Preserved Evidence

V3 preserves the existing:

- ETF;
- Funding;
- Open Interest;
- Historical Analog;
- Event Impact.

No producer, scoring rule, historical algorithm, or Replay system is changed.

## Ranking and Confidence

Drivers remain ordered by `impactScore` descending, with category name as the
deterministic tie-breaker.

Confidence remains a coverage-and-quality measure. Missing or stale evidence
does not increase confidence. A category contributes at most one driver.

## Freshness and Failure Handling

The engine reports rejected current evidence through `staleCategories`.

Failure categories:

- `missing_evidence`: no usable drivers;
- `stale_evidence`: prepared evidence exists but is outside validity policy;
- `incomplete_evidence`: at least one driver exists but categories are missing;
- `unsupported_symbol`: reserved for an unsupported explicit symbol;
- `unknown`: uncategorized failures.

Missing values are never replaced with zero and stale evidence is never ranked
as current evidence.

## Audit

Run:

```powershell
npm run audit:market-drivers
```

The report includes:

- total drivers per symbol;
- confidence;
- available categories;
- missing categories;
- stale categories;
- market direction;
- aggregate Driver Category Coverage.

Driver Category Coverage has the form:

| Category | Available | Missing | Stale |
| --- | ---: | ---: | ---: |
| Evidence category | Symbols with a usable driver | Symbols without a usable driver | Symbols with rejected stale evidence |

## Current Coverage Limitation

Prepared evidence coverage determines whether the three V3 categories appear.
The repository currently contains historical BTC Liquidation Intelligence
windows, but they may be rejected as stale relative to current ETF or capital
flow observations. Durable Exchange Flow and Treasury artifacts must also exist
for the selected asset and satisfy freshness policy.

Therefore integration can be complete while current driver count and confidence
remain unchanged. This is intentional: real, current evidence is required.
