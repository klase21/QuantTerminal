# QuantTerminal AI Agent Guide

IMPORTANT:

This repository contains AI agent instructions.

Failure to follow AGENTS.md is considered a bug.

---

# Before Making Any Changes

Required Reading:

* AGENTS.md
* .skills/quantterminal-rules.md
* Relevant files in .skills/
* docs/decisions/
* docs/investigations/

Before work:

1. Read AGENTS.md
2. Read relevant skill files
3. Review architecture decisions if changing behavior
4. Review investigations if touching Replay or historical systems

---

# Core Principles

## Real Data Only

* Never introduce mock data.
* Never fabricate metrics.
* If data is unavailable, show:

  * NO DATA
  * UNAVAILABLE
  * explicit reason

Correct:

```text
NO DATA
Historical coverage unavailable
```

Incorrect:

```text
Bullish Score: 78
```

when no real data exists.

---

## Responsiveness First

Prefer:

* responsiveness
* graceful degradation
* cached data

Over:

* blocking UI
* long page loads
* expensive synchronous processing

Rule:

Responsiveness > Completeness

---

## Build Rules

Never run:

```bash
npm run build
```

Allowed:

```bash
npx tsc --noEmit
```

TypeScript validation only unless explicitly requested.

---

## Minimal Changes

Prefer:

* targeted fixes
* minimal code changes

Avoid:

* unrelated refactors
* architecture rewrites
* broad cleanup work

unless explicitly requested.

---

# Product Context

QuantTerminal is a real-time crypto market intelligence platform.

Primary Navigation:

* Dashboard
* Markets
* Research
* Replay
* Scanner
* Trade

---

# Page Responsibilities

## Dashboard

Purpose:

Fast market summary.

Priority order:

1. Market Direction
2. Why
3. Prediction Markets
4. Tactical Alerts

Rules:

* Conclusion ¡æ Reasons ¡æ Evidence
* Keep lightweight
* Never block page load

Historical workflows do NOT belong here.

---

## Markets

Purpose:

Real-time trading intelligence.

Examples:

* Orderflow
* OI
* Funding
* Futures intelligence
* Market structure

Rules:

* Real-time first
* No historical-heavy processing

---

## Research

Purpose:

Deep research workflows.

Contains:

* Narrative Intelligence
* Information Flow
* Prediction Markets
* Historical systems

Rules:

* Historical systems are manual-load only
* Auto polling should remain disabled

Enabled:

* Narratives
* Prediction Markets
* Information Flow

Disabled:

* Auto Historical Analog polling
* Auto Market Memory polling

---

## Replay

Purpose:

Historical event replay.

Priority:

1. Chart
2. Liquidations
3. OI
4. Funding
5. Orderbook

Rules:

* Replay must remain responsive
* Heavy datasets are optional
* Failure must be graceful
* Orderbook must never block Replay

Allowed:

* Binance fallback for OI/Funding

---

## Scanner

Purpose:

Opportunity discovery.

Rules:

* Fast loading
* Lightweight analytics

---

## Trade

Purpose:

Execution planning.

Rules:

* Selected candidate drives execution plan
* Trade candidate selection should remain stable

---

# Architecture Decisions

## Dashboard Historical Analog

Status:

Removed intentionally.

Reason:

* Reduced load
* Faster startup
* Better user experience

Do NOT restore Historical Analog to Dashboard.

Historical workflows belong in:

* Replay
* Research

Reference:

docs/decisions/ADR-001-dashboard-historical-analog.md

---

## Replay Orderbook

Status:

Partially disabled.

Known facts:

* CryptoHFTData provider works
* Download works
* Decode works

CryptoHFTData uses:

CommonOrderbookEvent

Orderbook files contain:

* snapshot events
* update events

Example investigation:

~4.19M rows for one hour of BTCUSDT orderbook data.

Current issue:

Full snapshot/update replay exceeds request runtime budget.

Current behavior:

Orderbook may display:

```text
Orderbook reconstruction requires full snapshot/update replay and exceeded runtime budget.
```

This is expected behavior.

Do NOT re-enable expensive reconstruction inside request handlers.

Future solution:

* Background worker
* Cached snapshots
* Precomputed book state

Reference:

* docs/investigations/replay-orderbook-2026-06.md
* docs/decisions/ADR-002-orderbook-runtime-budget.md

---

# Protected Systems

Do not modify without explicit request.

Protected areas:

* websocket
* realtime market infrastructure
* replay ingestion
* information intelligence core

Extra caution:

* orderbook infrastructure
* historical replay pipeline
* data ingestion systems

---

# Failure Handling

Prefer:

* graceful unavailable state
* clear diagnostics
* fallback behavior

Avoid:

* crashes
* blocking UI
* infinite loading
* fake data

Correct:

```text
UNAVAILABLE
Reason: Historical data coverage missing
```

Incorrect:

```text
Loading forever...
```

---

# When Uncertain

Follow this order:

1. Preserve responsiveness
2. Preserve architecture decisions
3. Preserve existing behavior
4. Prefer unavailable state over incorrect data
5. Prefer minimal changes over refactors
6. Ask for clarification if uncertainty is high
