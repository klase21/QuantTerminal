# Research Coverage Audit

## Purpose

The Research coverage audit identifies prepared-intelligence gaps without downloading data, generating caches, changing scheduler state, or mutating artifact stores.

Run:

```powershell
npm run audit:research-coverage
```

The audit is read-only. Missing coverage is reported as an operational gap and does not produce a failing exit code. Invalid or unreadable audit infrastructure does fail explicitly.

## Target Workflow

The minimum target universe is:

| Symbol | Exchange | Timeframe |
| --- | --- | --- |
| BTCUSDT | binance_futures | 1h |
| ETHUSDT | binance_futures | 1h |
| SOLUSDT | binance_futures | 1h |

The workflow under audit is:

```text
Dashboard
  -> Research
  -> Historical Intelligence
  -> Event Impact
  -> Market Memory
  -> Replay
```

## Current Inventory

Audit date: 2026-06-22.

### Historical Analog

- BTCUSDT 1h: available, 25 cached analog cases.
- ETHUSDT 1h: missing.
- SOLUSDT 1h: missing.

The only canonical 1h OHLCV cache currently present is BTCUSDT on Binance Futures.

### Event Impact

- BTCUSDT macro: available, two verified event outcomes.
- ETHUSDT macro: supported by the Verified Event Catalog, but cache is missing.
- SOLUSDT: not currently supported by the Verified Event Catalog.

The current verified seed catalog contains two FOMC statement events scoped to BTCUSDT and ETHUSDT.

### Durable Artifacts

Current durable inventory:

- one Historical Analog artifact for BTCUSDT;
- one Event Impact artifact for BTCUSDT macro;
- two Market Memory artifacts for BTCUSDT;
- no Replay Evidence artifact;
- no Replay Learning artifact.

### Market Memory

Durable BTCUSDT Market Memory artifacts exist.

Research now reads:

```text
FileBackedIntelligenceArtifactRegistry
```

through the durable Market Memory reader. The process-local catalog remains a fallback only.

- BTCUSDT: available from two durable artifacts.
- ETHUSDT: unavailable because no durable memory artifact exists.
- SOLUSDT: unavailable because no durable memory artifact exists.

### Replay Orderbook

No Replay orderbook cache manifests are present under:

```text
.data/cache/replay/orderbook-snapshot/
```

The audit filters cached Historical Analog cases against the CryptoHFTData coverage start (`2025-07-01`), then checks up to the first three compatible cases and reports their exact date/hour cache coordinates.

No source download or orderbook reconstruction occurs.

BTCUSDT currently has six replay-compatible cases among its 25 cached analogs. The highest-ranked compatible case is 2026-02-22 12:00 UTC. None of the inspected compatible windows currently has an orderbook cache.

### Replay Learning

No durable `replay_learning` artifacts currently exist for BTCUSDT, ETHUSDT, or SOLUSDT.

The contract and publication adapter exist, but there is no manual CLI capture/publication command.

### Narrative Context

Research narratives are supplied by the live:

```text
GET /api/narratives?range=24h
```

No canonical local narrative snapshot or tagged-item cache exists. The audit therefore reports Narrative coverage as `not_locally_inspectable`.

It cannot distinguish:

- a genuinely quiet narrative window;
- all providers returning no items;
- narrative tagging producing no matches;
- a live fetch failure.

### Prediction Markets

Research Prediction Markets use live Polymarket Gamma requests.

No canonical local prediction-market snapshot exists. The audit reports Prediction Market coverage as `not_locally_inspectable`.

## Page Dependency Map

| Research section | Required cache or artifact | Current status | User impact |
| --- | --- | --- | --- |
| Narrative Context | Live narrative items with detected tags | Not locally inspectable | Empty state cannot be attributed to quiet markets, provider failure, or tagging failure from local evidence. |
| Prediction Markets | Live Polymarket attention markets | Not locally inspectable | No prepared fallback exists when live filtering returns zero markets. |
| Historical Analog Summary | Historical Analog V2 cache by symbol/1h | Partial: BTC only | ETH and SOL cannot enter the analog-case workflow. |
| Event Impact | Verified events, canonical OHLCV, Event Impact cache | Partial: BTC only | ETH has supported events but no prepared outcomes; SOL has no verified event scope. |
| Market Memory | Durable `market_memory` artifacts | Partial: BTC only | BTC survives process restarts; ETH and SOL require prepared durable artifacts. |
| Replay Access | Selected Historical Analog case | Partial: BTC only | ETH and SOL have no exact historical case handoff. |
| Orderbook | Replay orderbook snapshot cache for selected case window | Missing | Replay can load other sections, but orderbook evidence remains unavailable. |

## Minimum Viable Backfill

### P0: Historical Analog

Required:

- ETHUSDT / binance_futures / 1h
- SOLUSDT / binance_futures / 1h

BTCUSDT is already available.

Existing command:

```powershell
npx.cmd tsx workers/historical-intelligence/buildHistoricalAnalogCache.ts `
  --file C:\QuantTerminal\.data\historical\market_ohlcv.json `
  --symbol ETHUSDT `
  --interval 1h `
  --limit 25
```

Repeat for SOLUSDT.

Precondition: the input file must contain valid rows for the requested symbol. The audit intentionally does not parse the 162 MB source file to prove source coverage.

### P0: Event Impact

ETHUSDT is supported by the current verified macro catalog.

First generate canonical OHLCV if a valid ETH source file is available:

```powershell
npx.cmd tsx workers/market-data/buildCanonicalOhlcvCache.ts `
  --file C:\QuantTerminal\.data\historical\market_ohlcv.json `
  --exchange binance_futures `
  --symbol ETHUSDT `
  --interval 1h
```

Then:

```powershell
npx.cmd tsx workers/event-impact/buildEventImpactCache.ts `
  --category macro `
  --symbol ETHUSDT `
  --exchange binance_futures
```

SOLUSDT has no applicable verified event in the current catalog. Do not fabricate event coverage. A verified SOL event catalog entry is required before Event Impact backfill.

### P0: Market Memory Coverage

The production orchestrator can create and durably publish Market Memory artifacts:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts `
  --durable `
  --symbol ETHUSDT `
  --interval 1h `
  --event-symbol ETHUSDT `
  --event-category macro `
  --event-exchange binance_futures
```

Research can consume durable artifacts after the command completes. No process-local catalog initialization is required.

### P1: Replay Orderbook

Existing manual builder:

```powershell
npx.cmd tsx workers/replay/buildReplayOrderbookCache.ts `
  --file <local CryptoHFTData orderbook parquet.zst> `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --date <selected analog UTC date> `
  --hour <selected analog UTC hour>
```

Only build selected cases dated on or after 2025-07-01 with a verified local source file. Older analog cases predate CryptoHFTData coverage and must remain unavailable.

### P1: Replay Learning

The Replay Learning contract and artifact publisher exist, but no manual CLI entrypoint exists.

Command gap:

```text
No supported Replay Learning backfill command.
```

The next implementation should add a manual, evidence-referenced publication command. It must not infer observations from Replay or generate lessons.

### P2: Narrative and Prediction Markets

These are live-source operational surfaces, not prepared local intelligence datasets.

Before backfill is possible, each needs a canonical snapshot/coverage contract. This is not required for the minimum Historical Intelligence workflow and should follow P0/P1 work.

## Recommended Backfill Order

1. Verify ETHUSDT and SOLUSDT source OHLCV coverage without changing algorithms.
2. Generate Historical Analog 1h caches for ETHUSDT and SOLUSDT.
3. Generate canonical ETHUSDT OHLCV and ETHUSDT macro Event Impact.
4. Run durable production for ETHUSDT after upstream caches are valid.
5. Preserve BTCUSDT durable Market Memory and verify it remains readable after restart.
6. Select actual analog cases and generate Replay orderbook caches only where source files exist.
7. Add a manual Replay Learning publication command, then capture evidence-backed learning artifacts.
8. Add local Narrative and Prediction Market coverage metadata only after the core historical workflow is healthy.

## Missing Builder or Command Gaps

- No Replay Learning CLI publication command exists.
- No canonical Narrative snapshot builder exists.
- No canonical Prediction Market snapshot builder exists.
- No verified SOLUSDT event currently supports Event Impact.
- No command can manufacture missing source OHLCV or CryptoHFTData files; source acquisition remains an explicit prerequisite.

## Recommended Next Sprint

Implement **ETH/SOL Historical Coverage Backfill Preparation**.

Scope:

- verify ETHUSDT and SOLUSDT source OHLCV rows;
- generate no data automatically;
- prepare exact manual builder inputs;
- identify verified Event Catalog gaps for SOLUSDT;
- preserve current algorithms and cache contracts.
