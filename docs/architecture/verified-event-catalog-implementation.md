# Verified Event Catalog Implementation

## Purpose

The Verified Event Catalog is the canonical source of explicit, source-backed market events for future Event Impact and Market Memory systems.

The catalog records events. It does not infer events, classify narratives, calculate market impact, or generate intelligence.

## Event Schema

The versioned contract lives in:

```text
core/event-catalog/verifiedEventTypes.ts
```

Every event requires:

- schema version;
- stable public event id;
- title;
- canonical category;
- verified UTC timestamp;
- primary source;
- one or more evidence records;
- affected symbols;
- affected exchanges.

Optional fields:

- tags;
- structured metadata.

Sources include a stable id, display name, and reference URL. Evidence records have their own id, kind, source, and observed timestamp. This preserves provenance without making an event-impact claim.

## Category Definitions

### `macro`

Scheduled or unscheduled monetary, fiscal, economic, or broad risk events from an authoritative source.

### `etf`

Verified ETF filings, approvals, launches, flows, or official issuer and regulator actions.

### `regulation`

Official legal, regulatory, enforcement, or policy actions affecting crypto markets.

### `exchange`

Verified exchange listings, delistings, outages, solvency events, or official operational changes.

### `stablecoin`

Verified issuance, redemption, reserve, depeg, or regulatory events involving stablecoins.

### `liquidation_cascade`

A deterministic market-derived event based on a future versioned threshold and canonical liquidation data. It must not be inferred from narrative text.

### `funding_extreme`

A deterministic market-derived event based on future versioned funding thresholds and canonical funding data.

### `oi_expansion`

A deterministic market-derived event based on future versioned open-interest change thresholds and canonical OI data.

### `narrative_shift`

A manually verified or future deterministically validated change in market narrative. Narrative heat alone is not sufficient verification.

## Catalog Storage Contract

`VerifiedEventCatalog` is storage-neutral and contains:

- catalog version;
- event schema version;
- generation timestamp;
- event records.

The initial implementation is in-memory and file-defined. It adds no database, cache, external service, builder, scheduler, or ingestion job.

The catalog and event schema versions are separate constants so storage-envelope changes do not require redefining event records.

## Reader Behavior

`InMemoryVerifiedEventCatalog` implements deterministic:

- lookup by event id;
- lookup by category;
- lookup by normalized symbol;
- lookup by inclusive UTC date range.

Reader construction:

- validates catalog and event schema versions;
- validates timestamps;
- rejects missing evidence;
- rejects incomplete sources;
- rejects duplicate event ids;
- normalizes symbols and exchanges;
- deduplicates and sorts list fields;
- sorts events by timestamp descending, then event id ascending.

The same catalog always produces the same query ordering.

Date ranges are inclusive. An invalid range throws rather than silently returning misleading results.

## Seed Dataset

The seed catalog contains two official Federal Reserve FOMC statement events:

- January 31, 2024;
- March 20, 2024.

Each record uses the official Federal Reserve statement as evidence and records the official UTC publication time. The records identify broad crypto market symbols and Binance venues as investigation scope.

The seed makes no claim about price direction, causality, return, confidence, or market impact.

No market-derived event is seeded yet. `liquidation_cascade`, `funding_extreme`, and `oi_expansion` require canonical market data plus accepted versioned thresholds before any record can be considered verified.

## Future Event Impact Integration

Future Event Impact should consume catalog records by stable event id:

```text
Verified Event Catalog
  -> prepared market state
  -> prepared outcomes
  -> comparable verified events
  -> Event Impact intelligence
```

Event Impact may add outcomes and confidence in its own versioned output. It must not mutate the source event or treat catalog inclusion as proof of impact.

## Future Market Memory Integration

Future Market Memory may reference:

- verified event ids;
- Event Impact outputs;
- recurring event and regime relationships;
- supporting and contradicting evidence.

The catalog remains the source of event identity and provenance. Market Memory remains responsible for synthesis and must not add unsupported facts to catalog records.

## Limitations

- Seed coverage is intentionally narrow and is not production event coverage.
- The catalog has no persistence adapter or API.
- There is no duplicate detection beyond stable event id.
- Broad market scope is represented through explicit affected symbols and exchanges; a future contract may add first-class market-scope fields.
- There is no automatic verification, classification, ingestion, impact calculation, or confidence model.
