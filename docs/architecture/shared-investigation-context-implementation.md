# Shared Investigation Context Implementation

## Purpose

The Shared Investigation Context provides a lightweight, portable identity for investigations moving between Dashboard, Research, Historical Intelligence, and Replay.

It does not store market data or intelligence results. It carries only the subject and selected evidence needed for continuity.

## Contract

The canonical contract is defined in:

```text
types/investigation.ts
```

Required fields:

- symbol
- exchange
- timeframe
- investigation timestamp

Optional fields:

- investigation type
- source
- selected historical case
- selected Replay window
- selected event

There is no persistence, database, server context, Redux store, or new Zustand store.

## Public Vocabulary

The public term is:

```text
timeframe
```

New cross-page links emit `timeframe`.

The parser accepts legacy `interval` during migration. Existing historical APIs continue receiving their current `interval` query parameter.

Historical Analog currently supports:

- 1h
- 4h
- 1d

Lower tactical timeframes map to 1h when calling historical APIs:

```text
1m / 3m / 5m / 15m -> 1h
1h -> 1h
4h -> 4h
1d -> 1d
```

This conversion is explicit in `toHistoricalTimeframe()`.

## Context Ownership

The URL is the portable cross-page handoff.

Each page still owns local interaction state such as:

- loading
- selected panel
- selected row
- chart controls
- manual-load state

Local state does not replace the public context.

Dashboard establishes the current symbol from the existing tactical route. Research and Historical Intelligence consume the public context. Historical Intelligence owns selected-case interaction. Replay owns subsequent user changes to Replay controls.

## Propagation Model

Shared helpers are defined in:

```text
lib/investigation/context.ts
```

They provide:

- symbol normalization
- timeframe normalization
- tactical-to-historical timeframe conversion
- context creation
- URL parsing
- URL serialization
- context-aware href construction

The global navigation shell preserves context for:

- Dashboard
- Research
- Historical Intelligence
- Replay

Markets, Scanner, and Trade retain their existing routing contracts.

## Dashboard Behavior

Dashboard derives context from the existing tactical route:

- active symbol
- tactical timeframe converted to a supported historical timeframe
- exchange derived from market venue
- current investigation timestamp

When the Dashboard symbol or relevant route context changes, the Dashboard URL is replaced without scrolling. No historical API is called to create context.

## Research Behavior

Research reads the shared context.

Its manual Historical Analog and existing manual Market Memory requests use:

- context symbol
- converted historical timeframe

Historical systems remain manual-load only. Live narratives, prediction markets, and information flow are unchanged.

Changing context clears prior manual historical results so stale evidence is not presented under a new symbol.

## Historical Intelligence Behavior

Historical Intelligence reads:

- symbol
- timeframe
- selected historical case when present

Direct navigation still falls back to BTCUSDT and 1h.

Selecting a case updates the public URL with:

- case id
- case timestamp
- case symbol
- case timeframe
- source

Historical data remains cache-only. The Historical Analog builder and cache foundation are unchanged.

## Replay Behavior

Replay reads the shared context and uses:

- context exchange
- context symbol
- selected Replay date/hour when present

If no selected Replay window exists, current safe Replay defaults remain.

The change only prepares and prefills Replay controls. It does not auto-load Replay and does not change dataset loading order or cache behavior.

## Fallback Behavior

Defaults apply only when fields are absent or invalid:

- symbol: BTCUSDT
- exchange: binance_futures
- timeframe: 1h
- Replay date/hour: existing safe completed window

Explicit valid URL fields always outrank defaults.

Unsupported historical timeframes use the documented conversion to 1h. The original tactical page remains responsible for its own lower timeframe.

## Future Event Impact Compatibility

The contract includes an optional selected event:

- event id
- timestamp
- category
- source

This is context preparation only. No Event Impact engine, event catalog, or event loading behavior is implemented.

## Future Market Memory Compatibility

The investigation type supports `market_memory`, and the context can later carry public memory selection through a compatible extension.

No Market Memory engine or production memory retrieval is implemented. Existing mock-backed memory systems are not promoted by this change.

## Non-Goals

- No global mutable context store
- No persistence
- No server session
- No database
- No Event Impact
- No Market Memory
- No cache changes
- No artifact registry changes
- No Replay auto-loading
- No UI redesign
