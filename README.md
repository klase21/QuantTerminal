# QuantTerminal

## Realtime Crypto Market Intelligence Terminal

QuantTerminal is a realtime crypto intelligence terminal for tracking market regime, liquidity rotation, narrative validation, and signal quality across global and Korean crypto markets.

It is not designed to be another price dashboard. The core question is:

> What is the market doing underneath the candles?

QuantTerminal focuses on:

- market regime detection
- sector rotation intelligence
- Upbit/Korean retail overlays
- Binance global liquidity flow
- narrative/news validation
- alert trust and false-positive control
- replay/backtest-style research surfaces
- live command-surface UX

---

## Current Stable Direction

The current product direction is:

```txt
Global Market Data
+ Korean Retail / Upbit DataLab
+ Narrative Intelligence
+ Signal Quality Control
= Realtime Crypto Market Intelligence OS
```

Recent work consolidated the earlier Regime Lab experiments into product surfaces:

- Live Command Surface
- Narrative Workspace
- Signal Inbox
- Research / Replay Workspace
- System Diagnostics

The old Regime Lab should remain archived/dev-only and should not be treated as the primary product UI.

---

## Core Surfaces

### Live Command Surface

Top-level operator surface showing:

- current market state
- top rotation sector
- sector heat radar
- live event rail
- alert trust status
- WebSocket / data health indicators

### Narrative Intelligence

Compresses market events and news flow into narrative stories:

- narrative heat
- regional divergence
- news/flow validation
- operator commentary
- story timeline

### Signal Inbox

Productized view of signals that passed quality checks:

- trusted signals only
- signal quality score
- false-positive penalties
- explanation stack
- operator action

### Research / Replay

Research surface for reviewing historical sequences:

- replay windows
- backtest-style alert markers
- regime transition review
- case-study generation

### Diagnostics

System health view:

- Binance connector status
- Upbit connector status
- Upbit DataLab status
- WebSocket freshness
- invalid symbol audit
- partial/degraded data state

---

## Architecture

```txt
Market Connectors
  ├─ Binance REST / WebSocket
  ├─ Upbit REST / WebSocket
  └─ Upbit DataLab
        ↓
Validation / Normalization
        ↓
Sector Aggregation
        ↓
Regime + Rotation Engines
        ↓
Narrative + Signal Quality Engines
        ↓
Live Command Surface / Signal Inbox / Research
```

Important directories:

```txt
core/
  alerts/
  event-bus/
  market/
  narrative/
  productization/
  regime/
  registry/
  replay/
  rotation/
  shared/
  signal-quality/
  stream/
  upbit-datalab/

components/
  command/
  narrative/
  product/
  research/
  diagnostics/

hooks/
  useSectorRotationFeed.ts
  useRealtimeFeed.ts
```

---

## Data Sources

See [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md).

Primary sources:

- Binance Spot market data
- Binance WebSocket streams
- Upbit KRW market data
- Upbit WebSocket streams
- Upbit DataLab indicators
- News feeds / translation pipeline

---

## Terminal Glossary

See [`docs/TERMINAL_GLOSSARY.md`](./docs/TERMINAL_GLOSSARY.md).

Core terms:

- Regime
- INFLOW
- OUTFLOW
- CHURN
- EXPANSION
- COMPRESSION
- EUPHORIA
- RISK_OFF
- HIGH_TRUST
- WATCH
- LOW_QUALITY

---

## Scoring

See [`docs/SCORING_FORMULAS.md`](./docs/SCORING_FORMULAS.md).

Main scoring systems:

- Rotation Score
- Signal Quality Score
- Narrative Validation
- Data Quality Penalty
- False Positive Penalty

---

## Running Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

The build-stabilization pass pinned TypeScript to a stable 5.x version and removed the unsupported `ignoreDeprecations: "6.0"` setting.

---

## Known Limitations

See [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md).

Current known areas:

- WebSocket stream is implemented as the realtime direction, but polling still remains as fallback.
- Some sector mappings require ongoing maintenance.
- Upbit DataLab is public but not deeply documented; endpoint shape may change.
- Signal quality weights are first-pass heuristics and should be tuned against real usage.
- UI is now product-surface oriented, but further polish is still needed.

---

## Release Notes

See [`docs/RELEASE_NOTES.md`](./docs/RELEASE_NOTES.md).

Current milestone:

```txt
Realtime Intelligence Terminal Stabilization
```

Key additions:

- Live Command Surface
- WebSocket realtime foundation
- Binance symbol validation and chunked fetch
- Upbit DataLab historical intelligence
- Signal quality / false-positive control
- Regime Lab decommission into product surfaces
- Build stabilization

---

## Suggested Next Work

1. Continue WebSocket hardening and fallback handling.
2. Tune signal quality weights using real usage.
3. Reduce remaining UI redundancy.
4. Add final responsive/mobile polish.
5. Maintain sector registry and invalid symbol diagnostics.
6. Move selected features into a production release branch.
