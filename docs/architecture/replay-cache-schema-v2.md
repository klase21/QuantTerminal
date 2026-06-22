# Replay Cache Schema V2

## Status

Design proposal only.

This document defines the next Replay orderbook cache contract. It does not
implement builders, generate caches, download provider data, modify Replay
loaders, or change Replay UI behavior.

## Problem

Replay orderbook cache schema V1 stores one reconstructed terminal book:

- top bids and asks;
- best bid and ask;
- spread;
- liquidity;
- imbalance;
- one terminal timestamp.

This is sufficient for a static evidence panel, but it does not prove that the
book was initialized from a complete state and it cannot advance through the
selected Replay window.

The current V1 quality audit found:

- readable payloads;
- plausible terminal spreads;
- millions of update rows;
- zero verified snapshot rows;
- no first-event timestamp;
- no timestamped progression.

Cache existence must therefore remain separate from Replay evidence quality.

## Design Goals

Schema V2 must support:

1. Verified orderbook initialization.
2. Deterministic bounded progression.
3. Seekable checkpoints.
4. Explicit quality classification.
5. Compact top-of-book consumption.
6. Future factual Replay Learning evidence.
7. Cache-first request paths with no reconstruction.

V2 must not store an unbounded copy of every raw provider row.

## Non-Goals

V2 does not:

- reconstruct orderbooks in request paths;
- replace raw source archives;
- guarantee tick-perfect exchange simulation;
- infer missing snapshots;
- fabricate initialization from update-only rows;
- add Replay Learning generation;
- add a scheduler or database;
- redesign Replay UI.

## Dataset Identity

V2 should use a distinct dataset identity rather than silently changing the V1
payload under the existing schema:

```text
namespace: replay
dataset: orderbook-replay
schemaVersion: 2
partition:
  exchange
  symbol
  date
  hour
```

Keeping V1 `orderbook-snapshot` and V2 `orderbook-replay` separate prevents
legacy consumers from interpreting V2 progression data as the existing final
snapshot contract.

## Top-Level Contract

Conceptual TypeScript contract:

```ts
type ReplayOrderbookQualityStatus =
  | "valid"
  | "degraded"
  | "invalid"
  | "unknown"

interface ReplayOrderbookCacheV2 {
  schemaVersion: 2
  metadata: ReplayOrderbookMetadataV2
  initialSnapshot: ReplayOrderbookSnapshotV2 | null
  checkpoints: ReplayOrderbookCheckpointV2[]
  updates: ReplayOrderbookUpdateBatchV2[]
  terminalSummary: ReplayOrderbookSummaryV2 | null
  quality: ReplayOrderbookQualityReportV2
}
```

All timestamps are UTC ISO-8601 strings. Prices and quantities are finite
numbers. Bid levels are sorted descending and ask levels ascending.

## Metadata Contract

```ts
interface ReplayOrderbookMetadataV2 {
  exchange: string
  symbol: string
  window: {
    date: string
    hour: number
    start: string
    end: string
  }
  source: {
    provider: string
    dataset: "orderbook"
    sourceFile: string
    sourceSchema: string
  }
  generatedAt: string
  firstEventTimestamp: string | null
  lastEventTimestamp: string | null
  totalRows: number
  rowsProcessed: number
  snapshotRows: number
  updateRows: number
  discardedRows: number
  checkpointIntervalMs: number
  checkpointCount: number
  updateBatchCount: number
  levelLimit: number
  initializationMethod:
    | "provider_snapshot"
    | "verified_prior_checkpoint"
    | "unverified_updates"
    | "unavailable"
  sourceContinuity: {
    checked: boolean
    continuous: boolean | null
    gapCount: number | null
    firstUpdateId: string | null
    lastUpdateId: string | null
  }
}
```

Metadata records what was observed and processed. It must not claim continuity
unless update identifiers were actually checked.

`sourceFile` identifies provenance but must not contain credentials or
temporary machine-specific secrets.

## Initial Snapshot Contract

```ts
type ReplayOrderbookLevelV2 = [price: number, quantity: number]

interface ReplayOrderbookSnapshotV2 {
  timestamp: string
  sequenceId: string | null
  provenance:
    | "provider_snapshot"
    | "prior_verified_checkpoint"
  bids: ReplayOrderbookLevelV2[]
  asks: ReplayOrderbookLevelV2[]
  bestBid: number
  bestAsk: number
  spread: number
  bidLiquidity: number
  askLiquidity: number
  imbalance: number
}
```

An initial snapshot is valid only when it comes from:

- a complete provider snapshot in the selected source stream; or
- a verified checkpoint produced from an earlier complete snapshot with
  continuous updates through the selected window start.

Update-only accumulation is not an equivalent initial snapshot.

The snapshot should retain a bounded depth. The initial recommended limit is
top 50 levels per side. The final implementation may choose another explicit
limit after measuring storage and Replay requirements.

## Checkpoint Contract

```ts
interface ReplayOrderbookCheckpointV2 {
  checkpointId: string
  timestamp: string
  sequenceId: string | null
  updateOffset: number
  bids: ReplayOrderbookLevelV2[]
  asks: ReplayOrderbookLevelV2[]
  summary: ReplayOrderbookSummaryV2
}
```

Checkpoints provide bounded seek positions.

Requirements:

- sorted chronologically;
- unique timestamps and checkpoint ids;
- first checkpoint at or after initialization;
- last checkpoint no later than the final event;
- each `updateOffset` identifies the first update batch to apply after the
  checkpoint;
- checkpoint state must be reproducible from initialization plus prior
  updates;
- checkpoint depth and summary rules must match the initial snapshot.

Recommended initial checkpoint interval:

```text
60 seconds
```

For a one-hour window this creates at most 61 checkpoint states, including
initial and terminal boundaries when available.

## Update Contract

V2 stores bounded normalized changes, not raw provider rows.

```ts
interface ReplayOrderbookUpdateV2 {
  timestamp: string
  sequenceId: string | null
  side: "bid" | "ask"
  price: number
  quantity: number
}

interface ReplayOrderbookUpdateBatchV2 {
  startTimestamp: string
  endTimestamp: string
  firstSequenceId: string | null
  lastSequenceId: string | null
  updates: ReplayOrderbookUpdateV2[]
}
```

Semantics:

- `quantity === 0` deletes a price level;
- `quantity > 0` sets the price-level quantity;
- batches are sorted chronologically;
- updates inside a batch preserve source order;
- duplicate source updates are not silently reordered;
- sequence gaps are recorded in metadata and quality, not repaired;
- only updates needed to reproduce the bounded stored book are retained.

The builder may compact repeated updates to the same level only within an
explicit time bucket and only when doing so preserves the state at every
published checkpoint. Compaction rules must be deterministic and versioned.

## Summary Contract

```ts
interface ReplayOrderbookSummaryV2 {
  bestBid: number
  bestAsk: number
  spread: number
  bidLiquidity: number
  askLiquidity: number
  imbalance: number
  bidLevelCount: number
  askLevelCount: number
}
```

`terminalSummary` preserves the lightweight V1 consumption use case. A
compatibility adapter can expose this summary and the terminal checkpoint in
the current Replay orderbook shape without making the UI understand V2
internals.

## Quality Report Contract

```ts
interface ReplayOrderbookQualityReportV2 {
  status: ReplayOrderbookQualityStatus
  evaluatedAt: string
  cacheReadable: boolean
  hasInitialSnapshot: boolean | null
  canInitializeBook: boolean
  canSeek: boolean
  canAdvanceReplay: boolean
  spreadValid: boolean
  timestampsOrdered: boolean | null
  sequenceContinuous: boolean | null
  checkpointCoveragePercent: number | null
  firstTimestamp: string | null
  lastTimestamp: string | null
  reasons: string[]
  warnings: string[]
}
```

The quality report is generated by the builder and independently verifiable by
the quality audit. Consumers must not trust only the stored status.

## Quality Status Rules

### Valid

All conditions must hold:

- cache and payload are readable;
- verified initial snapshot exists;
- both sides contain usable levels;
- best bid and ask are positive;
- best ask is greater than best bid;
- timestamps are ordered;
- checkpoints are seekable;
- updates can advance the book from initialization;
- no unresolved sequence gap invalidates progression;
- first and last timestamps are known;
- checkpoint coverage satisfies the configured window policy.

### Degraded

The payload is readable and can provide useful bounded evidence, but one or
more limitations prevent full Replay semantics. Examples:

- verified initial snapshot and static checkpoints exist, but updates are
  incomplete;
- progression covers only part of the hour;
- sequence continuity is unknown;
- checkpoint coverage is below policy;
- a terminal summary is usable but seeking is unavailable.

Update-only initialization must remain degraded or invalid depending on
whether a usable book can be produced. It must never be marked valid.

### Invalid

Any of these conditions is sufficient:

- unreadable or schema-incompatible cache;
- empty payload;
- no usable bid or ask side;
- non-positive or crossed best prices;
- malformed level values;
- timestamps out of order;
- checkpoint/update offsets are inconsistent;
- the book cannot initialize;
- a known sequence gap makes reconstruction incorrect;
- stored quality claims conflict with independently calculated quality.

### Unknown

Use only when metadata is insufficient to determine quality, such as:

- missing continuity metadata;
- missing first or last timestamps;
- legacy or partial payload with no deterministic validation path.

Unknown is not valid and should not be used as Replay progression evidence.

## Builder Requirements

A future V2 builder must:

1. Run outside user request paths.
2. Read source rows in original order.
3. Validate required CommonOrderbookEvent columns.
4. Record first and last observed timestamps.
5. Locate a complete provider snapshot or verified prior checkpoint.
6. Refuse to claim verified initialization from update-only rows.
7. Apply snapshot and update semantics deterministically.
8. Check update identifiers where the source supplies them.
9. Record gaps, discarded rows, and malformed values.
10. Emit bounded checkpoints at a configured interval.
11. Emit normalized update batches needed between checkpoints.
12. Generate a terminal summary.
13. Independently replay the produced V2 payload before publication.
14. Compare reconstructed checkpoint hashes or summaries.
15. Publish only after quality evaluation.
16. Write failed or partial manifests with explicit reasons.
17. Avoid retaining raw provider rows in the V2 cache.

If no verified initialization is available, the builder may publish a
degraded diagnostic payload only when policy explicitly permits it. It must
not publish that payload as valid Replay evidence.

## Deterministic Validation

Before publication, the builder should perform a self-replay:

```text
initialSnapshot
  -> updates until checkpoint 1
  -> compare checkpoint 1
  -> updates until checkpoint 2
  -> compare checkpoint 2
  -> ...
  -> compare terminal summary
```

Checkpoint comparisons should use a deterministic digest over:

- timestamp;
- ordered bid levels;
- ordered ask levels;
- sequence id when available.

Digest algorithms and canonical serialization must be declared in metadata.

## Storage Layout

Recommended layout:

```text
.data/cache/replay/orderbook-replay/
  date=<YYYY-MM-DD>/
  exchange=<exchange>/
  hour=<HH>/
  symbol=<SYMBOL>/
    manifest.json
    metadata.json
    initial-snapshot.json
    checkpoints.json
    updates-0000.json
    updates-0001.json
    quality.json
```

The existing generic cache foundation currently assumes one JSON payload
descriptor. Implementation may initially package V2 as one payload object, but
the contract should preserve logical sections so updates can later be chunked
without redesign.

If chunking is implemented, the manifest must atomically reference the full
immutable file set. Partial publication is unavailable, never silently ready.

## Performance Considerations

### Bounded Depth

Store only the configured top-N levels required for Replay evidence. The
builder must define how updates outside the retained depth are handled so that
future top-N membership remains correct. A naive top-N-only live map is not
sufficient because an outside level may later enter the retained range.

The builder may therefore maintain full in-memory state during offline
generation while persisting bounded state.

### Checkpoint Frequency

One-minute checkpoints balance seek latency and file size for one-hour Replay.
The interval must remain metadata, not an implicit constant.

### Update Batching

Updates should be chunked by bounded time or size. Suggested initial limits:

- maximum 60 seconds per batch;
- maximum 25,000 normalized updates per batch.

The first reached limit closes the batch.

### Request-Path Budget

Consumers should:

- read metadata and quality first;
- read the nearest checkpoint for a requested cursor;
- read only subsequent update batches needed to reach the cursor;
- never decode the original parquet;
- never replay the full hour when seeking near the end.

### Integrity

Manifest publication must be atomic. Payload chunks should include byte size
and digest metadata. Missing or corrupt chunks make the affected cache
unavailable or degraded according to explicit policy.

## Migration From V1

V1 caches remain readable as static terminal snapshots.

Migration rules:

1. Do not relabel a V1 cache as schema V2.
2. Do not synthesize an initial snapshot from the V1 terminal book.
3. Do not synthesize checkpoints or updates from V1.
4. Keep V1 under `orderbook-snapshot`.
5. Generate V2 only by reprocessing verified source data or a verified prior
   checkpoint plus continuous updates.
6. A compatibility reader may return:
   - V2 terminal summary when V2 is available;
   - V1 static snapshot otherwise, labeled degraded/static.
7. V2 quality takes precedence over V1 cache presence.
8. V1 can be archived only after the corresponding V2 cache is independently
   validated.

There is no lossless V1-to-V2 conversion because V1 discarded progression
data and initialization provenance.

## Replay UI Compatibility

No UI redesign is required for initial adoption.

An adapter can expose:

- current best bid and ask;
- depth levels;
- spread;
- liquidity;
- imbalance;
- current checkpoint timestamp.

Existing static UI can consume the initial or terminal V2 snapshot. Future
playback controls may request seek results without changing the V2 contract.

The UI should receive quality metadata but decide presentation separately. A
degraded cache must not be silently shown as verified progression.

## Replay API Compatibility

The existing cache-only API principle remains:

```text
read cache
  -> validate schema and quality
  -> return prepared state
```

The API must never:

- download source data;
- rebuild V2;
- repair gaps;
- migrate V1 in a request.

A future V2 endpoint or version parameter should support:

- metadata/quality read;
- nearest checkpoint lookup;
- bounded updates between checkpoint and cursor;
- terminal-summary compatibility response.

## Orderbook Quality Audit Compatibility

Quality Audit V2 should independently verify:

- manifest and chunk readability;
- initial snapshot provenance;
- ordered timestamps;
- checkpoint offsets;
- checkpoint reproducibility;
- sequence continuity;
- spread and level validity;
- full or partial window coverage;
- stored quality report consistency.

The existing V1 audit remains valid for V1 entries. Mixed stores should report
schema version and quality separately.

## Replay Learning Compatibility

V2 does not generate Replay Learning.

It can provide factual evidence references for future manual learning:

- cache identity and schema version;
- quality status;
- checkpoint timestamp;
- measured spread, imbalance, and liquidity;
- source provenance;
- observed window.

Only `valid` evidence should support claims requiring progression. Degraded
static evidence may support a factual point-in-time observation when clearly
labeled.

## Market Memory Compatibility

Market Memory continues consuming artifacts, not Replay caches directly.

A future Replay evidence publisher may create compact artifacts from validated
V2 observations. Market Memory must receive:

- evidence artifact ids;
- observed timestamps;
- source and schema version;
- quality and coverage metadata.

V2 cache records themselves must not bypass the artifact boundary.

## Failure Handling

- Missing V2 cache: unavailable; optional degraded V1 static fallback.
- Corrupt manifest or chunk: unavailable.
- Missing initialization: degraded or invalid, never valid.
- Sequence gap: degraded only if unaffected bounded evidence remains
  deterministic; otherwise invalid.
- Partial checkpoint coverage: degraded with exact coverage.
- Version mismatch: unavailable.
- Builder failure: failed manifest with no ready payload.

Consumers should remain responsive in every state.

## Risks

### Source Snapshot Absence

Some provider files may contain only updates. V2 cannot solve this by schema
design alone. Generation may require a preceding verified snapshot file or
cross-window checkpoint continuity.

### Sequence Semantics

Exchange update identifiers differ by venue. Incorrect continuity rules can
produce plausible but wrong books.

### Storage Growth

Timestamped checkpoints and updates are materially larger than V1. Depth,
checkpoint interval, compaction, and chunk limits need measurement.

### Validation Cost

Self-replay and checkpoint verification increase offline builder duration.
This cost is appropriate outside request paths but must be observable.

### False Precision

Bounded levels and compacted updates may look exact. Metadata must expose depth
limits, continuity, coverage, and quality.

### Mixed V1/V2 Consumption

Consumers may accidentally treat static V1 and replayable V2 as equivalent.
Dataset identity, schema version, and quality status must remain explicit.

## Recommended Next Sprint

Implement a V2 builder proof of concept for one known BTCUSDT hour.

Scope:

1. Inspect whether a complete provider snapshot exists in the selected hour or
   immediately preceding source window.
2. Implement type contracts and validation functions.
3. Generate one-minute checkpoints and bounded update batches.
4. Perform deterministic self-replay verification.
5. Extend the quality audit to validate V2.
6. Do not connect Replay UI or API until one cache reaches `valid`.

Success criterion:

```text
One cache with verified initialization,
ordered progression,
seekable checkpoints,
and independently reproduced terminal state.
```
