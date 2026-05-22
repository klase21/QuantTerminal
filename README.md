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

---

## Research-Informed Product Thesis

QuantTerminal is not intended to be a simple price-prediction dashboard. The research direction is based on a practical conclusion from recent crypto market, social sentiment, pump-and-dump, and noisy financial forecasting studies:

> Raw bullish/bearish sentiment is weak on its own. What matters more is participation velocity, narrative propagation, liquidity confirmation, breadth expansion, regional divergence, crowding risk, and whether the market is in a tradeable opportunity regime.

The core product hypothesis is:

> QuantTerminal should detect when a narrative becomes tradable, crowded, fragile, or exhausted.

This means the terminal should focus less on predicting every candle and more on filtering high-quality market states. Most market data is noisy; the system should promote only signals with enough confirmation and suppress weak, social-only, or duplicated signals.

---

## Research Lessons Applied to QuantTerminal

### 1. Sentiment alone is not enough

A simple positive/negative sentiment score is not treated as a standalone trading signal. QuantTerminal instead combines sentiment-like inputs with liquidity, breadth, rotation, and data-quality confirmation.

Useful signal structure:

```txt
Narrative heat
+ Participation velocity
+ Liquidity confirmation
+ Sector breadth
+ Data quality
= Operator-grade signal
```

### 2. Attention can be late liquidity

Large social-media attention spikes may represent late retail participation rather than early alpha. The terminal should distinguish between:

```txt
Early accumulation
Narrative expansion
Retail FOMO
Overcrowded consensus
Exit-liquidity risk
```

This is why the system should track not only mention volume, but also timing, propagation path, and whether liquidity moved before or after attention increased.

### 3. Extremity matters more than direction

Bullish and bearish direction are less important than how extreme and crowded the market has become. Extreme fear and extreme greed can both represent higher uncertainty and liquidity risk.

QuantTerminal should therefore monitor:

- narrative conviction
- crowding intensity
- funding / OI pressure
- volatility expansion
- spread or liquidity deterioration
- cross-region synchronization

### 4. Region changes meaning

The same crypto narrative can mean different things across regions. A bullish DeFi discussion in one country may represent institutional adoption, while in another it may represent inflation escape, speculation, or retail gambling behavior.

QuantTerminal should treat region as context, not just a label:

```txt
US        → institutional / ETF / macro framing
Korea     → retail rotation / premium / fast speculation
China     → policy / liquidity proxy / offshore narrative
Turkey    → inflation hedge / currency protection
SEA       → retail adoption / high-beta speculation
```

### 5. Tradeable opportunities are sparse

Financial markets have low signal-to-noise ratios. QuantTerminal should not try to turn every market tick into a signal. The better direction is opportunity filtering:

```txt
Suppress weak signals
Watch partial confirmations
Promote multi-confirmed opportunities
Warn when narratives become overcrowded
```

---

## Intelligence Framework

QuantTerminal's long-term framework can be summarized as:

```txt
Market Data
  → Rotation Pressure
  → Breadth Confirmation
  → Narrative Propagation
  → Regional Divergence
  → Liquidity Confirmation
  → Signal Quality
  → Operator Decision Support
```

The terminal should answer questions like:

- Is this move broad or isolated?
- Is liquidity confirming the narrative?
- Is social attention early or late?
- Which region is leading the narrative?
- Is the market becoming overcrowded?
- Should this be promoted, watched, or suppressed?

---

## Product Philosophy

QuantTerminal is evolving toward a realtime behavioral market intelligence system. It is designed to interpret crowd behavior, liquidity movement, and narrative lifecycle rather than simply display prices.

The ideal operator experience is:

```txt
Fewer signals.
Higher trust.
Clearer context.
Better timing.
```


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

If TypeScript 6.x is installed locally and reports `baseUrl` deprecation, keep `ignoreDeprecations: "6.0"` in `tsconfig.json` until a dedicated TS7 migration pass is done.

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

## Phase 15 — Narrative Lifecycle Engine

QuantTerminal now compresses live market structure into narrative lifecycle states:

```txt
Early → Expanding → Viral → Overcrowded → Exiting
```

The goal is not to show every metric on the main surface. The engine combines liquidity pressure, breadth, rotation strength, news heat, validation, premium overlay, and crowding risk, then exposes a simple operator-facing state such as:

```txt
AI — Expanding — High Participation
```

This follows the core product principle:

```txt
Complexity inside. Simplicity outside.
```

## Phase 16-17: Participation & Crowding Engine

QuantTerminal now extends narrative lifecycle tracking with participation velocity and crowding risk detection.

The system does not treat social activity or liquidity pressure as standalone signals. Instead, it compresses them into operator-readable market states:

- **Participation Velocity** — whether a narrative is quiet, emerging, active, highly participated, or overheating.
- **Crowding Risk** — whether participation is healthy or becoming one-sided, euphoric, and vulnerable to late-stage reversal.

The main surface remains intentionally simple. Rather than exposing every internal factor, the terminal summarizes narrative state as compact operator language such as:

```txt
AI
Expanding
High Participation
Moderate Crowding
```

The deeper workspace retains the underlying velocity, acceleration, breadth support, and crowding diagnostics for drill-down analysis.

## Phase 18 — Geo Narrative Intelligence

QuantTerminal now treats region as market context rather than a simple label.

The Geo Narrative layer compresses global, Korean, English/US, and Chinese news/flow overlays into a small operator surface:

```txt
Global Leads
US → KR
KR → Global
Global Sync
Korea Overheat
No Clear Flow
```

The goal is not to show every regional datapoint. The goal is to answer one question quickly:

> Which region is leading the narrative, and is the move confirmed or only locally overheated?

This supports the broader research thesis that crypto narratives are regionally contextualized: the same asset move can represent institutional adoption in one region, retail speculation in another, and policy-sensitive rotation elsewhere.


## Phase 19 — Historical Replay Intelligence

QuantTerminal now includes a Research Replay workspace that compresses narrative lifecycle, participation velocity, crowding risk, liquidity pressure, breadth, and geo-diffusion into a time-sequenced replay view.

The goal is not to show every metric, but to answer a simple operator question:

> How did this narrative move from formation to acceleration, crowding, or fading?

Current implementation derives replay frames from live market and narrative state, while keeping the architecture ready for persisted historical snapshots later.

## Phase 20 — Opportunity Filtering Engine

QuantTerminal now adds an opportunity compression layer.

The terminal should not promote every signal. It filters noisy market events and surfaces only the setups that have enough confirmation from liquidity, breadth, participation, crowding safety, regional confirmation, and large-flow proxies.

Operator-facing states are intentionally simple:

```txt
High Opportunity
Emerging Setup
Watchlist
Overcrowded
Exiting
Suppressed
```

The main surface shows the compressed state. The narrative workspace keeps the evidence stack for drill-down.

This phase turns QuantTerminal from a signal display into an opportunity filtering system:

```txt
Raw market events → confirmation checks → operator-readable opportunity state
```

## KR Retail Reaction Layer

QuantTerminal now treats SaveTicker as a Korean retail reaction source, not as a simple news feed. The integration uses views, positive/negative votes, total vote participation, top-story flags, and story timing to estimate Korean retail attention, conviction, and crowding pressure.

The output is compressed into simple operator states such as `KR Retail Euphoric`, `KR Retail Constructive`, `KR Retail Divided`, `KR Retail Defensive`, or `KR Retail Quiet`. This gives the terminal a behavioral read on Korean retail reaction that can support geo narrative diffusion, crowding risk, and opportunity filtering.


## KR Retail Intelligence Layer

QuantTerminal now combines Coinness and SaveTicker as a Korean retail behavior layer, not as a generic news feed.

- **Coinness** is treated as the fast reaction layer through bull/bear counts on breaking news.
- **SaveTicker** is treated as the conviction layer through views, votes, top-story flags, and positive/negative ratios.
- The combined KR Retail Intelligence surface compresses these inputs into participation, conviction, reaction velocity, and crowd-risk context.

The goal is to detect whether Korean retail is quiet, constructive, euphoric, defensive, or divided, then feed that state into geo narrative, crowding, and opportunity filtering.
