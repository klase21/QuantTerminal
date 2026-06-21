# Research Durable Market Memory

## Purpose

Research now consumes prepared Market Memory from the existing durable Intelligence Artifact Store.

No memory is generated, republished, recalculated, or inferred during a Research request.

## Previous Behavior

The Research Market Memory endpoint read only:

```text
productionMarketMemoryCatalog
```

That catalog is process-local and in-memory. A production run could persist valid `market_memory` artifacts while a later Next.js process still returned:

```text
Market Memory catalog not generated in this process.
```

The unavailable state described implementation lifecycle rather than actual prepared-intelligence coverage.

## Durable Consumption

`DurableMarketMemoryReader` reads only `market_memory` artifacts from the existing file-backed artifact registry.

Supported filters:

- memory id;
- symbol;
- exchange, when the artifact carries exchange scope;
- Market Memory type;
- recent-result limit.

The reader:

1. Searches only the `market_memory` artifact type.
2. Reads and validates matching artifact payloads through the existing durable registry.
3. Adapts the artifact envelope back to the existing `MarketMemory` response contract.
4. Sorts results by generation time and memory id.
5. Returns at most 50 results.

It does not call Market Memory builders or producer caches.

## Contract Adaptation

Durable Market Memory artifacts preserve:

- memory id;
- memory type;
- title;
- deterministic summary;
- generated time;
- Evidence Validity;
- Investigation Thesis;
- Contradiction metadata;
- Decision Brief;
- tags;
- symbol and exchange subjects;
- supporting artifact ids.

The original supporting artifact producer version is not retained in the Market Memory artifact envelope. The compatibility adapter therefore marks that nested reference version as `unknown` instead of inventing one.

## Research API Flow

```text
Research manual load
  -> durable Market Memory reader
  -> ready memories when durable artifacts exist
  -> process-local catalog fallback only when durable results are absent
  -> explicit unavailable reason
```

The process-local catalog remains as a backward-compatible fallback. It is no longer the primary source.

## Unavailable States

Research responses use product-facing reasons:

- `No durable Market Memory exists for this investigation.`
- `Market Memory artifacts are unavailable for the selected symbol.`
- `Market Memory store is unavailable.`

Implementation-language reasons about process-local catalog generation are no longer returned.

## Failure Handling

- Missing durable artifacts return an unavailable response.
- Invalid durable Market Memory artifacts are skipped by the existing registry validation path.
- Store read failures return `Market Memory store is unavailable.`
- Missing durable results may use the process-local catalog fallback.
- No failure triggers memory generation or artifact publication.

## Backward Compatibility

- The existing `MarketMemory` contract is preserved.
- Research remains manual-load only.
- The endpoint path and primary response fields are unchanged.
- Process-local consumers remain supported.
- Market Memory generation rules are unchanged.
- Scheduler and orchestrator behavior are unchanged.

## Limitations

- Exchange filtering excludes memories without explicit exchange subjects when an exchange filter is supplied.
- Supporting artifact producer versions cannot be reconstructed from the current artifact envelope.
- The durable reader does not resolve and embed full supporting artifact payloads.
- No pagination cursor exists; V1 returns a bounded recent result set.
- ETHUSDT and SOLUSDT remain unavailable until durable Market Memory artifacts are produced.
