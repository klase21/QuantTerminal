# Market Memory V1 Implementation

## Purpose

Market Memory V1 creates deterministic, reusable memory entries from prepared intelligence artifacts.

Its source boundary is strict:

```text
Historical Analog artifacts
Event Impact artifacts
Replay Evidence artifacts
  -> deterministic memory builder
  -> Market Memory catalog
  -> Research
```

Market Memory does not read raw datasets, canonical market-data caches, Historical Analog caches, Event Impact caches, or Replay caches.

## Contracts

Versioned contracts live in:

```text
core/market-memory/marketMemoryTypes.ts
```

Every memory requires:

- schema version;
- memory id;
- title;
- canonical memory type;
- deterministic summary;
- supporting artifact references;
- generation timestamp.

Optional discovery fields:

- tags;
- symbols;
- exchanges.

Supporting references retain:

- artifact id;
- artifact type;
- artifact title;
- artifact source;
- artifact generation time.

## Memory Categories

Canonical categories:

- `regime`
- `event`
- `narrative`
- `structural`
- `setup`
- `expectation`
- `failure`

V1 only generates a category when a deterministic evidence rule exists.

### Regime Memory

Input:

```text
historical_analog artifact
```

Minimum evidence:

- at least two total analog cases;
- at least two usable 24h cases.

The summary reports only:

- case count;
- 24h average return;
- 24h win rate;
- dominant outcome.

### Event Memory

Input:

```text
event_impact artifact
```

Minimum evidence:

- at least two event observations;
- at least two usable 24h observations.

The summary reports only:

- event sample count;
- 24h average return;
- 24h median return;
- 24h win rate.

### Structural Memory

Input:

```text
replay_intelligence artifacts
```

Minimum evidence:

- at least two prepared Replay evidence artifacts for the same symbol and exchange.

The summary reports only:

- snapshot count;
- average orderbook imbalance;
- average spread.

Raw Replay data is never consumed or stored.

### Categories Not Generated Yet

`narrative`, `setup`, `expectation`, and `failure` are canonical contracts but have no accepted V1 artifact rule.

They remain absent rather than being generated from prose, tags, or inferred conditions.

## Deterministic Generation

`buildMarketMemories()`:

1. Accepts canonical `IntelligenceArtifact` objects only.
2. Filters to Historical Analog, Event Impact, and Replay Intelligence types.
3. Applies fixed minimum-evidence rules.
4. Reads only versioned artifact metadata.
5. Uses fixed summary templates.
6. Sorts memories by generation time and memory id.

It does not:

- call an LLM;
- classify narratives;
- infer events;
- recompute outcomes;
- read producer caches;
- calculate confidence;
- create trade advice.

## Manual Builder

The manual worker is:

```text
workers/market-memory/buildMarketMemoryCatalog.ts
```

Example:

```powershell
npx.cmd tsx workers/market-memory/buildMarketMemoryCatalog.ts `
  --historical-symbol BTCUSDT `
  --historical-interval 1h `
  --event-category macro `
  --event-symbol BTCUSDT `
  --event-exchange binance_futures
```

The worker:

1. Publishes requested prepared intelligence into the existing registry.
2. Reads those artifacts through `IntelligenceArtifactReader`.
3. Passes only artifacts into the Market Memory builder.
4. Replaces the process-local Market Memory catalog.
5. Validates lookup by id, category, and symbol.

The Market Memory builder itself has no cache or producer dependency.

## Catalog

`InMemoryMarketMemoryCatalog` supports:

- lookup by memory id;
- lookup by category;
- lookup by normalized symbol.

Catalog replacement validates:

- catalog version;
- memory schema version;
- generation timestamps;
- required summaries;
- supporting artifact presence;
- duplicate memory ids.

Ordering is deterministic.

## Research Integration

Research exposes a compact manual-load Market Memory section after Event Impact.

When memories exist it displays:

- title;
- memory type;
- deterministic summary;
- supporting artifact count;
- supporting artifact ids;
- generation time.

When unavailable it displays the exact catalog reason. It does not block narratives, Historical Analog, Event Impact, Replay, or Information Flow.

No automatic polling is enabled.

## Process-Local Limitation

The current Intelligence Artifact Registry is process-local and in-memory. Market Memory follows that established boundary and does not introduce durable storage.

Consequences:

- a CLI worker can validate publication and memory generation in one process;
- a separate Next.js server process does not inherit that catalog;
- Research reports `Market Memory catalog not generated in this process` until artifacts and memories are populated in that process;
- no hidden cache or raw-data fallback is used.

Durable production consumption requires a future registry adapter implementing the existing registry interface. This sprint intentionally does not add that infrastructure.

## Evidence and Confidence

Every memory exposes supporting artifacts and generation time.

Market Memory V1 does not publish confidence. Source artifacts currently declare artifact confidence as uncalibrated, and memory generation does not reinterpret that field.

## Future Evolution

Future work may:

- add durable registry persistence behind the existing interface;
- define accepted rules for narrative, setup, expectation, and failure memories;
- publish Market Memory through the existing `market_memory` artifact type;
- add lifecycle states and supersession;
- expose supporting and contradicting artifact roles;
- add deterministic context compatibility ranking.

These changes must preserve artifact-only inputs and must not move synthesis into request paths.
