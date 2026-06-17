# ADR-004 Event Impact Layer

## Status

Proposed

## Context

QuantTerminal should not only show news or narratives. It should measure how events actually affected market behavior.

Important event types:

- News
- ETF flows
- Listings
- Hacks
- Unlocks
- Macro events
- Prediction market shifts
- Narrative breakouts

## Decision

QuantTerminal will track event outcomes after each event.

Tracked windows:

- 15m
- 1h
- 4h
- 24h
- 7d

Tracked outcomes:

- price return
- max move
- drawdown
- volume change
- open interest change
- funding change
- liquidation activity

## Goal

Answer:

"Historically, what happened after this kind of event?"

## Future Use

- Historical Analog V2
- Market Memory V3
- Research
- Dashboard evidence layer
