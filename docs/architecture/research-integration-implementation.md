# Research Integration Implementation

## Purpose

Research is the primary investigation workspace for connecting current context, live explanatory evidence, cached historical analogs, observed outcomes, and exact Replay windows.

This implementation uses existing systems. It introduces no intelligence engine, cache, registry, builder, database, scheduler, or background job.

## Workflow

Research follows one ordered investigation:

```text
Current State
  -> Narrative Context
  -> Historical Analog Summary
  -> Selected Analog Cases
  -> Outcome Summary
  -> Replay Access
  -> Evidence
```

Live narratives, prediction markets, and information flow remain independently available. Historical intelligence remains a deliberate manual cache read.

## Context Propagation

Research consumes the Shared Investigation Context from the URL:

- symbol
- exchange
- timeframe
- investigation timestamp
- selected historical case when present

The public vocabulary remains `timeframe`. Historical Analog V2 supports `1h`, `4h`, and `1d`, so lower tactical timeframes use the documented `toHistoricalTimeframe()` conversion.

When symbol or historical timeframe changes, Research:

- aborts an active historical cache request;
- clears the previous cached response;
- clears the selected case;
- returns to the manual-load state.

This prevents evidence from one subject from appearing under another investigation.

## Historical Analog Usage

Research reads the existing cache-only endpoint:

```text
GET /api/historical-analog?symbol=<SYMBOL>&interval=<TIMEFRAME>
```

It does not use the older Research summary adapter and does not perform a second cache read for outcome details.

One response supplies:

- prepared current market state;
- ranked similar cases;
- similarity scores;
- comparable feature counts;
- 1h, 4h, 24h, and 7d outcomes;
- aggregate case count;
- average return;
- win rate;
- best case;
- worst case;
- dominant outcome;
- source, generation time, cache status, and schema version.

No outcome is recalculated in the browser.

## Replay Integration

Selecting a cached analog produces a Replay link containing:

- exchange from the active investigation;
- exact historical-case symbol;
- analytical timeframe;
- selected case id and timestamp;
- UTC date and hour derived from the cached case timestamp;
- source provenance.

Replay receives these values as initial context. Replay remains user-driven and does not auto-load datasets.

If no cached case is selected, Research does not construct a fallback Replay window. It shows `Replay Coordinates Required`.

## Evidence Presentation

Research exposes historical evidence provenance:

- cache source;
- generated time;
- cache status;
- schema version.

Narrative and prediction-market evidence retain their existing independent loading behavior. Their values are not converted into fabricated confidence scores.

## Failure Handling

Historical states are explicit:

- not requested: manual load required;
- loading: reading cached intelligence;
- unavailable: cache-provided or request failure reason;
- available: summary, cases, outcomes, Replay access, and provenance.

The historical request is bounded and abortable. A missing, expired, incompatible, partial, failed, or empty cache does not block the rest of Research.

## Known Limitations

- Historical Analog V2 cache coverage remains dependent on manual generation.
- Replay coordinates use the selected case timestamp and active investigation exchange; cases do not yet carry independently verified venue coordinates.
- Similarity transparency remains deeper in the full Historical Intelligence Explorer.
- Prediction Markets and narrative evidence are contextual evidence; they are not historically aligned to each analog case.
- Event Impact and Market Memory are intentionally not implemented.
