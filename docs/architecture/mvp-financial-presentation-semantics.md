# MVP Financial Presentation Semantics

## Purpose

Financial presentation is a rendering boundary. It formats a governed value;
it does not calculate an observation, infer missing precision, or turn
evidence strength into a forecast.

## Distinct Roles

| Role | Input meaning | Presentation rule |
| --- | --- | --- |
| Probability | Ratio from `0` through `1` | Render as an unsigned percentage. Invalid ratios are `UNAVAILABLE`. |
| Return | Percentage points | Render with an explicit sign. |
| Open-interest change | Percentage points | Render with an explicit sign; it is not a funding rate. |
| Funding rate | Ratio | Convert to percentage once and retain four decimal places. |
| Directional flow | Ratio | Render Buy, Sell, or Balanced with magnitude. |
| ETF flow | USD amount | Render signed USD millions; inflow/outflow sign is retained. |
| Price | Absolute market price | Render with magnitude-aware decimal precision. |
| Evidence strength | Governed classification | Render as evidence strength, never forecast probability. |
| Coverage | Governed classification | Render the coverage state, never a numerical completion estimate. |

`null`, `undefined`, non-finite values, invalid ranges, and unsupported
classifications render as `UNAVAILABLE`. A missing value never becomes zero,
an empty string, a current timestamp, or a directional label.

## Precision And Sign

Negative zero is normalized to zero. Small non-zero percentages and ETF flows
remain signed and are shown below the stated display threshold rather than
rounded to zero. Compact counts and prices are display-only transformations.
They do not alter source units, coverage, freshness, provenance, or the
underlying governed value.
