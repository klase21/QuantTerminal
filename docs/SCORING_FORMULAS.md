# Scoring Formulas

This document describes the current heuristic scoring model. These formulas are first-pass operating rules and should be tuned with real usage.

---

## Sector Rotation Score

Purpose:

Detect which sector is attracting meaningful liquidity and participation.

Conceptual formula:

```txt
rotationScore =
  volumePressure       * 0.35 +
  volatilityExpansion  * 0.20 +
  priceMomentum        * 0.20 +
  breadth              * 0.15 +
  premiumBoost         * 0.10
```

### Inputs

| Input | Meaning |
|---|---|
| volumePressure | relative trading activity / liquidity pressure |
| volatilityExpansion | sector volatility becoming active |
| priceMomentum | sector price direction |
| breadth | share of sector symbols participating |
| premiumBoost | Korean retail / Upbit premium support |

---

## Direction Classification

```txt
INFLOW  = high volume + high volatility + positive price momentum
OUTFLOW = high volume + high volatility + negative price momentum
CHURN   = high volume + high volatility + flat/mixed price
QUIET   = weak volume and weak movement
```

---

## Signal Quality Score

Purpose:

Reduce false positives and promote only signals that are supported by multiple confirmations.

Conceptual formula:

```txt
signalQuality =
  liquidityConfirmation * 0.25 +
  narrativeValidation   * 0.20 +
  breadthConfirmation   * 0.20 +
  regimeFit             * 0.15 +
  dataQuality           * 0.15 +
  noiseControl          * 0.05
```

### Trust Labels

| Label | Meaning |
|---|---|
| HIGH_TRUST | strong confirmation, visible in signal inbox |
| WATCH | useful but not fully confirmed |
| LOW_QUALITY | weak/noisy, usually suppressed |

---

## False Positive Penalties

Signals lose score when:

- news heat rises but liquidity does not confirm
- sector breadth is weak
- data quality is degraded or partial
- the same signal repeats inside cooldown
- regime fit is weak
- volume spike is too small to matter

---

## Narrative Validation

```txt
Validated Narrative = News Heat + Liquidity Flow + Regime Fit
```

States:

| State | Meaning |
|---|---|
| VALIDATED | news and liquidity confirm each other |
| NEWS_ONLY | news buzz without flow |
| FLOW_ONLY | liquidity flow without matching news |
| WEAK | neither side is strong enough |

---

## Data Quality Impact

Data quality should affect confidence.

Examples:

```txt
all connectors live      → full confidence
partial upstream failure → confidence penalty
stale websocket          → confidence penalty
low sector coverage      → confidence penalty
invalid symbol spike     → diagnostics warning
```
