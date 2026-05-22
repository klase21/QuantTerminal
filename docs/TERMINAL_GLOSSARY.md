# Terminal Glossary

QuantTerminal intentionally uses terminal/trading language. UI labels may remain specialized as long as this glossary explains them clearly.

---

## Regime

The current operating mode of the market.

A regime is not a single indicator. It is an interpreted state based on sentiment, volatility, dominance, liquidity, rotation, and data quality.

Examples:

- `BTC_DEFENSIVE`
- `ALT_ROTATION`
- `RISK_OFF`
- `EUPHORIA`
- `COMPRESSION`
- `EXPANSION`

---

## INFLOW

Liquidity is entering a sector or asset group.

Typical pattern:

```txt
volume up + volatility up + price up + breadth confirmation
```

---

## OUTFLOW

Liquidity is leaving a sector or asset group.

Typical pattern:

```txt
volume up + volatility up + price down
```

This may indicate distribution, panic selling, or capital rotation out of the sector.

---

## CHURN

High activity without confirmed direction.

Typical pattern:

```txt
volume up + volatility up + price flat/mixed
```

Interpretation:

- position transfer
- accumulation/distribution uncertainty
- pre-breakout compression
- high market disagreement

---

## COMPRESSION

Volatility is low or contracting.

This may precede a larger directional move.

---

## EXPANSION

Volatility and participation are expanding.

If supported by price momentum and breadth, expansion can confirm trend continuation.

---

## EUPHORIA

High sentiment, high volatility, high participation, and speculative pressure.

This can be profitable but fragile.

---

## RISK_OFF

Market participants are reducing risk.

Typical signs:

- BTC dominance rising
- altseason weakening
- volume contraction or defensive rotation
- negative premium / weak retail activity

---

## HIGH_TRUST

A signal with strong confirmation across liquidity, breadth, narrative, regime fit, and data quality.

---

## WATCH

A signal worth monitoring but not strong enough for high-confidence action.

---

## LOW_QUALITY

A noisy or weak signal, often suppressed from the main signal inbox.

Common causes:

- weak data quality
- no breadth confirmation
- news buzz without liquidity
- duplicate alert inside cooldown
- weak regime fit
