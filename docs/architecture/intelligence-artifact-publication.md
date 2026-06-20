# Intelligence Artifact Publication

## Purpose

QuantTerminal intelligence producers now have a canonical publication path into the existing Intelligence Artifact Registry.

The initial publishers cover:

- Historical Analog V2;
- Event Impact cache results;
- Replay orderbook evidence summaries.

No registry contract, artifact type, cache, database, API, vector search, or UI was added.

## Publication Flow

```text
Prepared intelligence cache
  -> producer-specific artifact adapter
  -> canonical artifact validation
  -> existing registry publication
  -> existing reader lookup and search
```

Publication never triggers intelligence generation.

A missing, invalid, expired, partial, failed, or incompatible source cache prevents publication with an explicit error.

## Registry Instance

The production-adoption boundary exports:

```text
productionIntelligenceArtifactRegistry
productionIntelligenceArtifactReader
```

Both use the existing in-memory registry and reader implementations.

This is the first production-shaped integration, not durable storage. Artifacts exist for the lifetime of the server or worker process that published them. Durable registry storage remains future work and must implement the existing registry interface.

## Artifact Ownership

### Historical Analog

Owner:

```text
historical-analog-v2
```

Artifact type:

```text
historical_analog
```

Published fields include:

- stable artifact id;
- symbol;
- timeframe;
- current-state timestamp;
- case count;
- dominant outcome;
- multi-horizon statistics;
- supporting historical cases;
- cache source and generation time.

The publisher reads the existing Historical Analog cache. It does not run state generation, similarity search, or outcome calculation.

### Event Impact

Owner:

```text
event-impact-v1
```

Artifact type:

```text
event_impact
```

Published fields include:

- category;
- symbol;
- exchange;
- verified event ids;
- sample count;
- prepared outcome statistics;
- event source references;
- Event Impact cache identity and generation time.

The publisher reads the prepared Event Impact category cache. It performs no OHLCV read, horizon calculation, or aggregation.

### Replay Evidence

Owner:

```text
replay-orderbook-cache
```

Artifact type:

```text
replay_intelligence
```

Published evidence is intentionally compact:

- replay window;
- snapshot timestamp;
- best bid and ask;
- spread;
- imbalance;
- bid and ask liquidity.

Raw orderbook levels, trades, liquidations, candles, funding arrays, and open-interest arrays are not published.

## Confidence Boundary

The current producers do not expose a calibrated artifact confidence model.

The registry requires a numeric confidence field, so publishers use:

```text
confidence: 0
metadata.confidenceStatus: not_calibrated
```

This does not mean the underlying outcome was negative or invalid. It means artifact-level confidence has not been defined. No confidence is inferred from case count, win rate, similarity, or data availability.

## Publication Service

Publication functions:

```text
publishHistoricalAnalogArtifact()
publishEventImpactArtifact()
publishReplayEvidenceArtifact()
```

Each function:

1. Reads one prepared cache.
2. Validates the cache through the existing cache-first reader.
3. Creates a canonical artifact.
4. Publishes through the existing registry.
5. Returns the standard publication result.

The protected intelligence builders are unchanged.

## Manual Validation

The manual publication worker supports any combination of prepared sources:

```powershell
npx.cmd tsx workers/intelligence-artifacts/publishPreparedIntelligence.ts `
  --historical-symbol BTCUSDT `
  --historical-interval 1h `
  --event-category macro `
  --event-symbol BTCUSDT `
  --event-exchange binance_futures
```

Optional Replay coordinates:

```powershell
--replay-exchange binance_futures `
--replay-symbol BTCUSDT `
--replay-date 2026-06-16 `
--replay-hour 20
```

The worker:

- publishes requested artifacts;
- reads each artifact by id through `IntelligenceArtifactReader`;
- searches for the published ids through the same reader;
- reports publication, retrieval, and discovery states.

## Publication Boundaries

Publishers may:

- format an existing prepared conclusion;
- preserve producer metadata;
- select compact supporting evidence;
- expose source and cache identity;
- publish stable subjects and tags.

Publishers may not:

- recalculate historical outcomes;
- scan canonical market data;
- reconstruct Replay data;
- infer events;
- create confidence;
- trigger builders;
- substitute symbols or exchanges;
- publish raw Replay datasets.

## Future Consumer Migration

Consumers can migrate incrementally:

1. Use artifact search for generic discovery.
2. Read canonical summaries and evidence from artifacts.
3. Keep specialist cache APIs only for deep case or Replay detail.
4. Remove producer-specific dependencies only after durable artifact publication exists.

The current in-memory registry is not sufficient for cross-process durable product consumption. Research should not be migrated until a durable adapter is introduced behind the same registry interface.

## Future Market Memory Compatibility

Future Market Memory can publish the existing `market_memory` artifact type.

It may reference:

- Historical Analog artifact ids;
- Event Impact artifact ids;
- Replay evidence artifact ids;
- supporting and contradicting evidence.

No registry redesign is required. Market Memory must not mutate or reinterpret source artifacts, and it must preserve provenance.
