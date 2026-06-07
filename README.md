# QuantTerminal

QuantTerminal is an execution-aware tactical intelligence terminal for crypto markets.

It is designed to move beyond a traditional symbol-centric trading dashboard and evolve into a Tactical Decision OS: a system that compresses live market data, flow, macro context, narratives, and execution risk into actionable trading guidance.

## Core Direction

QuantTerminal is not intended to simply show more indicators.

The core goal is to reduce decision fatigue.

The system should help answer:

- Is this market tradable right now?
- Where should attention be focused?
- Should execution be aggressive, selective, defensive, or avoided?
- What possible narrative or macro drivers may explain the move?

## Product Philosophy

Traditional exchange interfaces usually follow this flow:

```txt
User selects symbol
→ User analyzes data
→ User decides what to do
```

QuantTerminal aims to reverse that flow:

```txt
System detects tactical opportunities
→ System ranks attention areas
→ User evaluates execution
→ User acts with better context
```

## Tactical Decision OS

The long-term architecture is centered around:

```txt
Market Data
→ Tactical Synthesis
→ Narrative Reasoning
→ Execution Guidance
```

The system should prioritize verdict-first UX rather than map-first or indicator-first UX.

## Key Concepts

### Tactical Verdict

A simplified execution-oriented market read.

Examples:

```txt
GOOD FOR SCALP
WAIT FOR CONFIRMATION
AVOID CHASING
HIGH EXECUTION RISK
SELECTIVE LONGS ONLY
```

### Execution Guidance

Actionable guidance derived from market structure, flow, liquidity, volatility, and macro/narrative context.

Examples:

```txt
Selective longs favored.
Avoid weak continuation setups.
Wait for liquidity stabilization.
Do not chase late breakout entries.
```

### Possible Drivers

Narrative reasoning should explain why a move may be happening without making overconfident claims.

Preferred wording:

```txt
Possible Drivers
Likely Catalysts
Potential Macro Influence
```

### Execution Risk

ATTENTION should function as an execution risk indicator, not as a generic button.

Examples of risk conditions:

```txt
Spread instability
Thin passive liquidity
High slippage risk
Weak continuation quality
Funding overheating
```

### Adaptive Execution

MIXED should be treated as an adaptive execution mode, not as a strategy label.

It may represent a combination of passive, limit, liquidity-aware, or adaptive execution behavior depending on market conditions.

## UX Direction

The interface should remain decision-first.

Default UI should emphasize:

```txt
Tactical Verdict
Execution Guidance
Possible Drivers
Execution Risks
Live Tactical Alerts
```

Advanced visualizations such as flow maps, sector pressure, lane analysis, smart money overlays, and threat overlays should be available on demand through Advanced Mode rather than occupying the primary decision area.

## Tactical Opportunity Router

The symbol selector should evolve into a Tactical Opportunity Router.

Instead of only asking users to choose a symbol, the system should surface opportunity categories such as:

```txt
High Quality Scalps
Breakout Continuations
Liquidity Traps
Funding Reversals
Whale Accumulation
Sector Momentum
Smart Money Rotation
```

The long-term goal is for users to discover what is worth watching now, not manually search every symbol.

## Macro Intelligence Direction

Macro Intelligence should not remain a static data panel.

It should follow this structure:

```txt
Macro Signal
→ Narrative Reasoning
→ Execution Impact
```

Example:

```txt
Macro Read:
Risk-on conditions are improving, but DXY strength may cap aggressive alt continuation.

Execution Impact:
Selective longs favored. Avoid chasing weak sectors.
```

## Narrative Reasoning Engine

Narrative intelligence should connect:

```txt
Market events
Volume expansion
Price movement
Flow changes
Macro context
News catalysts
Regional narratives
```

The goal is not just to show news, but to explain why a move may be happening using tentative reasoning.

## Realtime Runtime

QuantTerminal uses Binance Futures websocket streams and should preserve the following endpoint mapping:

```txt
trade           → /ws
aggTrade        → /market/ws
kline           → /market/ws
ticker array    → /market/ws
forceOrder      → /market/ws
depth/orderbook → /public/ws
```

The realtime runtime should move toward:

```txt
Shared WS Manager
→ Tactical Event Bus
→ Tactical Engine
→ Widgets
```

This avoids duplicate websocket subscriptions and improves consistency across widgets.

## Flow and CVD Semantics

For Binance `aggTrade`:

```txt
m === true  → buyer is maker → sell-initiated trade
m === false → buyer is taker → buy-initiated trade
```

Expected flow behavior:

```txt
Buy Volume  = session accumulated buy-initiated volume
Sell Volume = session accumulated sell-initiated volume
Delta       = Buy Volume - Sell Volume
CVD         = cumulative signed delta
```

Buy Volume and Sell Volume should not decrease during the same session. CVD may rise or fall depending on signed trade flow.

## Current Development Focus

Near-term implementation priorities:

```txt
Tactical Verdict Engine V1
Tactical Opportunity Router
Narrative Reasoning Engine
Macro Reasoning Integration
Actionable Tactical Alerts
Sector and Flow Intelligence
Advanced Overlay System
Realtime Runtime Finalization
```

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Binance Futures websocket streams
- Shared realtime websocket manager
- Tactical routing/context architecture

## Project Identity

QuantTerminal should remain aligned with this identity:

```txt
Execution-Aware Tactical Intelligence OS
```

The main goal is not to display more data.

The main goal is to help users make better tactical decisions faster.
