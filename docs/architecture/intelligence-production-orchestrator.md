# Intelligence Production Orchestrator

## Purpose

The Intelligence Production Orchestrator is the canonical manual entry point for producing the existing QuantTerminal intelligence suite.

It composes existing builders. It does not replace their algorithms, introduce scheduling, add persistence, retry failed work, or move historical computation into request paths.

## Execution Flow

```text
Historical Analog builder
  -> prepared Historical Analog artifact
Event Impact builder
  -> prepared Event Impact artifact
Market Memory builder
  -> prepared Market Memory artifacts
Artifact Publication
  -> existing Intelligence Artifact Registry
```

The explicit stage identifiers are:

1. `historical_analog`
2. `event_impact`
3. `market_memory`
4. `artifact_publication`

Run the default production chain manually:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts
```

Publish the resulting artifacts to the durable file-backed registry:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts --durable
```

Optional arguments include:

```text
--historical-file
--symbol
--interval
--as-of
--enrichment-file
--limit
--event-category
--event-symbol
--event-exchange
--durable
--artifact-root
--report-root
```

The default run uses the existing local canonical historical file, `BTCUSDT`, `1h`, the `macro` event category, and `binance_futures`.

## Stage Ownership

### Historical Analog

Owned by the existing Historical Analog V2 builder.

The stage generates its established caches and prepares a canonical Historical Analog artifact in memory. It does not publish during this stage.

### Event Impact

Owned by the existing Event Impact cache builder.

The stage generates category and event caches and prepares a canonical Event Impact artifact in memory. It does not publish during this stage.

### Market Memory

Owned by the existing deterministic Market Memory builder.

Market Memory consumes only the prepared intelligence artifacts from successful upstream stages. It does not read raw market data or producer caches. This preserves the artifact-only source boundary while allowing Market Memory to execute before the publication stage.

The stage prepares Market Memory artifacts using the existing `market_memory` artifact type.

### Artifact Publication

Owned by the existing Intelligence Artifact Registry.

The final stage publishes every prepared artifact and validates it through the existing reader. Publication does not regenerate caches or recalculate intelligence.

## Production Contracts

Production reports use schema version `1`.

Each stage result records:

- canonical stage identifier;
- status;
- start and completion timestamps;
- duration in milliseconds;
- generated outputs;
- warnings;
- errors.

Statuses are:

- `succeeded`
- `partial`
- `failed`
- `skipped`

Outputs identify caches, catalogs, memories, and artifacts without embedding full payloads.

The suite report records:

- all stage results in execution order;
- total duration;
- total generated outputs;
- warning count;
- failure count;
- overall status.

Every suite invocation also writes a durable production run report under:

```text
.data/intelligence/reports/
```

The report is created before the first stage, updated when each stage starts and completes, and finalized with the overall status.

## Failure Isolation

Each stage has an independent error boundary.

- Event Impact still executes if Historical Analog fails.
- Market Memory uses whichever upstream artifacts were successfully prepared.
- Artifact Publication publishes every available prepared artifact independently.
- One artifact publication failure does not roll back other published artifacts.
- Successful caches and catalog outputs remain valid if a later stage fails.

There are no retries, rollback, recovery, or hidden fallback calculations.

If no eligible upstream artifacts exist, Market Memory is skipped with an explicit warning. If no artifacts are prepared, publication is skipped with an explicit warning.

## Determinism Boundary

The intelligence calculations remain deterministic because the orchestrator delegates to existing builders and fixed artifact adapters.

Operational timestamps and measured durations naturally vary between runs. They describe execution, not intelligence conclusions.

The orchestrator does not fabricate data, confidence, outcomes, or memories.

## Current Storage Boundary

Historical Analog and Event Impact use the existing file cache.

The Market Memory catalog remains process-local and in-memory.

Artifact publication defaults to the existing in-memory registry. Manual runs may opt into the file-backed durable registry with `--durable`. Durable artifact publication survives process restarts; the process-local Market Memory catalog does not.

## Future Scheduler Compatibility

A future scheduler may invoke `buildIntelligenceSuite()` and persist its production report. The scheduler must remain outside the orchestrator and must not change stage ownership.

The current contracts already expose:

- ordered stages;
- stable stage identifiers;
- status;
- timing;
- outputs;
- warnings;
- errors.

These fields are sufficient for future scheduling and monitoring adapters without redesigning the production chain.

## Future Durable Store Compatibility

The file-backed durable artifact store implements the established registry interface and is available as an optional manual publication target.

The orchestrator publishes canonical artifacts and does not depend on registry implementation details. A future SQLite or other durable adapter can replace the file implementation without redesigning historical caches or memory generation.

## Future Consumers

The production report and canonical artifacts prepare the path for:

- scheduled production;
- durable artifact storage;
- production monitoring;
- Research Copilot consumption.

None of these systems are implemented by this orchestrator.

The scheduled production runner is a separate one-shot schedule and locking layer. It invokes this orchestrator directly and does not duplicate any production stage.
