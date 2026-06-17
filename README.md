# QuantTerminal

**Execution-Aware Crypto Market Intelligence Platform**

QuantTerminal is an open-source crypto market intelligence platform designed to help traders, researchers, and builders understand what is happening in the market, why it is happening, and how similar environments evolved in the past.

Unlike traditional trading terminals that focus primarily on charts and indicators, QuantTerminal combines market structure, information flow, positioning, prediction markets, narratives, and historical context into a unified decision and research workflow.

---

# Vision

Most crypto participants face the same problem:

Information is everywhere, but intelligence is fragmented.

Price action, funding rates, open interest, liquidations, prediction markets, narratives, news, and macro events are scattered across dozens of platforms.

QuantTerminal aims to reduce this information asymmetry by transforming fragmented signals into actionable market intelligence.

The goal is not to display more data.

The goal is to help users make better tactical decisions faster.

---

# Core Direction

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
→ User verifies market structure
→ User evaluates execution
→ User researches context and outcomes
```

The platform prioritizes workflow-first and decision-first UX instead of indicator-first UX.

---

# Product Philosophy

QuantTerminal is built around the following framework:

```txt
Market Data
→ Tactical Synthesis
→ Market Structure Verification
→ Execution Guidance
→ Historical / Research Context
```

The platform should help answer:

* What is happening right now?
* Which opportunities deserve attention?
* Is this setup actually confirmed by market structure?
* What might be driving the move?
* What did similar market environments look like?
* How did expectations, positioning, and narratives affect outcomes?

---

# Core Product Flow

```txt
Dashboard
→ Scanner
→ Markets
→ Trade
→ Replay
→ Research
```

Each module has a distinct role.

```txt
Dashboard = real-time overview

Scanner = opportunity discovery

Markets = selected symbol verification

Trade = execution planning

Replay = historical market reconstruction

Research = deep market intelligence
```

---

# Modules

## Dashboard

The Dashboard should remain lightweight and fast.

Primary responsibilities:

* Market Brief
* Tactical Alerts
* Information Flow
* Prediction Market Highlights
* System Status

The Dashboard is intentionally focused on current market awareness.

Heavy historical analysis should not run inside Dashboard.

---

## Markets

Markets is the real-time verification workspace.

Its purpose is simple:

```txt
Is this selected opportunity actually confirmed by live market structure?
```

Features:

* Advanced Candlestick Chart
* Orderbook Depth
* Trade Flow
* Funding Context
* Open Interest Context
* Selected Symbol Liquidations
* Market Structure Analysis

Typical flows:

```txt
Dashboard Tactical Alert
→ Markets

Scanner Candidate
→ Markets

Trade Setup
→ Markets
```

---

## Scanner

Scanner is the discovery engine.

Its role is to surface what deserves attention now.

Examples:

```txt
Breakout Continuations
Liquidity Watch
Funding Reversals
Retest Opportunities
Sector Momentum
High Activity Symbols
```

Supported actions:

```txt
Inspect Market
→ Markets

Open Trade
→ Trade
```

---

## Trade

Trade is the execution planning workspace.

Features:

* Current Candidates
* Entry Planning
* Stop Levels
* Targets
* Risk / Reward
* Setup Tracking
* Outcome Monitoring

Trade converts market opportunities into structured execution plans.

---

## Replay

Replay is one of QuantTerminal's core differentiators.

Replay is user-driven.

The user selects:

```txt
Exchange
Symbol
Date
Hour
```

Then loads a historical market environment.

Replay should answer:

```txt
What did the market look like at that exact moment?
```

Replay combines:

* Price Action
* Liquidations
* Funding
* Open Interest
* Orderbook Snapshots
* Trade Activity
* News Context
* Market Expectations

### Replay Data Architecture

```txt
Replay Price Chart
→ Binance OHLCV / Klines

Replay Microstructure
→ CryptoHFTData
    - trades
    - orderbook
    - liquidations
    - open interest
    - funding / mark price
```

This separation allows reliable price reconstruction while preserving deep microstructure analysis.

---

## Research

Research is the heavy analytics layer.

The Dashboard stays lightweight.

Research handles historical analysis, market intelligence, and outcome exploration.

Planned modules:

* Historical Explorer
* Prediction Markets Research
* Market State Explorer
* Narrative Intelligence
* News Impact Explorer
* Outcome Analysis
* Event Database
* Replay Library

Research should help answer questions such as:

* How do prediction markets move before price?
* Which news categories historically moved BTC the most?
* What happens after similar funding and OI regimes?
* Which market states produce favorable outcomes?
* How do expectations, positioning, and narratives interact?

---

# Data Strategy

QuantTerminal separates data by purpose.

## Real-Time Market Data

Used by:

* Dashboard
* Markets
* Scanner
* Trade

Examples:

* Binance Futures WebSockets
* Trade Flow
* Orderbooks
* Funding
* Open Interest
* Liquidations

---

## Replay Price Data

Used by:

* Replay
* Historical Price Exploration

Sources:

* Binance OHLCV
* Binance Historical Klines
* Historical Parquet Archives

---

## Replay Microstructure Data

Used by:

* Liquidations
* Funding
* Open Interest
* Orderbook Snapshots
* Historical Trades

Source:

* CryptoHFTData

---

## Prediction Market Data

Used by:

* Research
* Replay Context
* Market Expectations

Sources:

* Polymarket Snapshots
* Prediction Market Archives

---

## News & Event Data

Used by:

* News Impact Explorer
* Narrative Intelligence
* Replay News Context
* Event Outcome Analysis

Potential datasets:

* Bitcoin News vs Price Action
* Event-Labeled Crypto News

---

## Quant Feature Data

Used by:

* Market State Explorer
* Regime Analysis
* Historical Similarity Search

Examples:

* Funding
* Open Interest
* Liquidations
* ETF Flow
* Prediction Market Probabilities
* Sentiment
* Volume Regimes
* Market Breadth

---

# Modern Market Regime Focus

QuantTerminal prioritizes modern crypto market structures.

Today's market is increasingly driven by:

* Perpetual Futures
* Funding Rates
* Open Interest
* Liquidations
* ETF Flows
* Prediction Markets
* Institutional Positioning
* Macro Liquidity

For this reason, modern datasets (2023+) generally provide more value than early spot-driven market cycles.

---

# Market State Explorer

Historical Analog is being reimagined as Market State Explorer.

Instead of asking:

```txt
When did the chart look similar?
```

The platform should ask:

```txt
When did market structure, positioning, expectations, and information flow look similar?
```

Potential state vector:

```txt
Price Structure
Funding
Open Interest
Liquidations
Volume
ETF Flow
Prediction Markets
News Sentiment
Narrative Activity
Market Breadth
```

This functionality belongs inside Research rather than Dashboard.

---

# Tactical Decision OS

QuantTerminal remains aligned with the Tactical Decision OS concept.

Examples:

```txt
GOOD FOR SCALP
WAIT FOR CONFIRMATION
AVOID CHASING
HIGH EXECUTION RISK
SELECTIVE LONGS ONLY
```

Execution guidance examples:

```txt
Selective longs favored.
Avoid weak continuation setups.
Wait for liquidity stabilization.
Do not chase late breakout entries.
```

QuantTerminal should explain market behavior without pretending to know more than the data supports.

---

# Realtime Runtime

Binance Futures endpoint mapping:

```txt
trade           → /ws
aggTrade        → /market/ws
kline           → /market/ws
ticker array    → /market/ws
forceOrder      → /market/ws
depth/orderbook → /public/ws
```

Long-term runtime architecture:

```txt
Shared WS Manager
→ Tactical Event Bus
→ Tactical Engine
→ Widgets
```

---

# Roadmap

## Sprint 0 — Stabilization

* Remove Historical Analog from Dashboard
* Keep Dashboard lightweight
* Stabilize Markets workflows
* Stabilize Trade candidates
* Replay manual loading
* Replay chart migration to Binance OHLCV

---

## Sprint 1 — Replay V2

* Binance OHLCV Replay Chart
* CryptoHFTData Replay
* Liquidation Timeline
* Funding / OI Context
* Orderbook Snapshots
* Event Timeline
* News Context
* Market Expectations

---

## Sprint 2 — Research V1

* Prediction Markets Research
* News Impact Explorer
* Event Outcome Analysis
* Replay Library Foundation

---

## Sprint 3 — Market State Explorer

* Multi-Factor Similarity Search
* Funding/OI Regimes
* Market State Vectors
* Outcome Statistics
* Forward Return Analysis

---

## Sprint 4 — Intelligence Layer

* Narrative Intelligence
* Expectation vs Reality
* News → Price Analysis
* Prediction Markets → Price Analysis
* Regime Detection
* AI-Assisted Research

---

# Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Zustand
* Binance Futures Streams
* CryptoHFTData
* Parquet Datasets
* DuckDB-style Analytics
* Shared Realtime Runtime

---

# Project Identity

```txt
Execution-Aware Crypto Market Intelligence Platform
```

The main goal is not to display more data.

The main goal is to help traders, researchers, and builders understand markets faster, verify opportunities more clearly, and learn from historical market environments with better context.

QuantTerminal is built around the belief that market intelligence should be accessible to everyone.
