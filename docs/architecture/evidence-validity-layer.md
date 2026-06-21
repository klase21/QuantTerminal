# Evidence Validity Layer V1

## Purpose

QuantTerminal intelligence must distinguish when evidence was observed from when an intelligence object was generated.

```text
observedAt
  = when the underlying market state, event, or evidence existed

generatedAt
  = when QuantTerminal produced the cache, artifact, or synthesis
```

`generatedAt` is operational provenance. It is not evidence freshness.

Evidence Validity V1 adds a shared, versioned contract and deterministic propagation rules without changing Historical Analog algorithms, Event Impact calculations, Replay processing, confidence, or decision scoring.

## Architecture

```text
Prepared intelligence
  -> producer validity adapter
  -> EvidenceValidity V1
  -> cache/API/artifact propagation
  -> Research metadata
  -> Operations inventory metadata
```

The validity layer evaluates metadata only. It does not:

- download data;
- rebuild caches;
- scan history;
- calculate outcomes;
- score decisions;
- infer confidence;
- modify intelligence conclusions.

## Contract

The canonical contract lives under:

```text
core/evidence-validity/
```

Schema:

```ts
interface EvidenceValidity {
  schemaVersion: 1
  observedAt: string | null
  generatedAt: string
  freshnessStatus: "VALID" | "STALE" | "EXPIRED" | "UNKNOWN"
  coverageStatus: "FULL" | "PARTIAL" | "UNAVAILABLE" | "UNKNOWN"
  reason?: string
}
```

### Freshness States

`VALID`

- An accepted producer freshness policy exists.
- The observation is inside its validity window.

`STALE`

- An accepted producer freshness policy exists.
- The observation is older than its validity window.

`EXPIRED`

- The containing intelligence object has an explicit expiration timestamp at or before the evaluation clock.

`UNKNOWN`

- Observation time is absent or invalid.
- No accepted age-based freshness policy exists.
- Legacy intelligence did not provide explicit validity metadata.

V1 does not treat a recent `generatedAt` value as proof of freshness.

### Coverage States

`FULL`

- All required observations or outcome horizons represented by the producer contract are available.

`PARTIAL`

- Some usable evidence exists, but one or more required observations or horizons are missing.

`UNAVAILABLE`

- No usable evidence exists for the requested intelligence object.

`UNKNOWN`

- Legacy data or producer metadata cannot establish coverage.

Coverage is not confidence. A fully covered two-event sample can still be statistically weak. Confidence and sample adequacy remain separate concerns.

## Validation Utilities

`createEvidenceValidity()`

- normalizes timestamps to ISO-8601;
- applies an explicit freshness window when supplied;
- detects explicit expiration;
- preserves the producer coverage state;
- never infers missing observation timestamps.

`isEvidenceValidity()`

- validates schema version;
- validates timestamps;
- validates canonical status values;
- validates the optional reason.

`aggregateEvidenceValidity()`

- combines supporting validity objects;
- uses the most conservative freshness state;
- uses the most conservative coverage state;
- preserves the latest available observation timestamp;
- returns `UNKNOWN` when no supporting validity exists.

`legacyEvidenceValidity()`

- adapts a legacy object without fabricating validity;
- preserves known timestamps;
- assigns `UNKNOWN` freshness and coverage;
- includes an explicit compatibility reason.

## Producer Adapters

### Historical Analog

Observation time:

```text
payload.currentState.timestamp
```

Generation time:

```text
cache manifest generatedAt
```

Freshness windows:

- 1h state: 6 hours
- 4h state: 24 hours
- 1d state: 72 hours

These windows are validity policy, not decision scoring.

Coverage:

- `UNAVAILABLE` when no analog cases exist;
- `FULL` when every horizon has the complete case count;
- `PARTIAL` when cases exist but one or more horizons have incomplete coverage.

Historical Analog APIs now return validity metadata at the response and diagnostics boundaries.

### Event Impact

Observation time:

```text
latest verified event timestamp in the prepared result
```

Generation time:

```text
Event Impact cache manifest/result generatedAt
```

Event Impact V1 has no accepted age-based freshness policy. Its freshness is therefore `UNKNOWN`, rather than being inferred from a recent cache build.

Coverage:

- `UNAVAILABLE` when no outcome horizon is available;
- `FULL` when every prepared event has every horizon;
- `PARTIAL` otherwise.

The cache builder writes validity metadata for new results. The reader also attaches validity to legacy cached results without recalculating outcomes.

### Market Memory

Market Memory consumes artifact validity only.

It does not read source caches or raw datasets.

Memory validity:

- aggregates supporting artifact validity;
- takes the most conservative freshness state;
- takes the most conservative coverage state;
- records the latest known supporting observation timestamp.

Market Memory artifacts preserve this aggregated validity. Supporting evidence uses the source artifact observation timestamp rather than its generation timestamp.

### Published Artifacts

Canonical `IntelligenceArtifact` now contains:

```text
generatedAt
expiresAt
validity
```

Historical Analog, Event Impact, Replay Evidence, and Market Memory publishers provide producer-specific validity.

Replay processing was not changed. The Replay publication adapter marks a prepared snapshot as full coverage for that one snapshot and leaves age-based freshness unknown because Replay evidence is historical by definition.

## Research Consumption

Research continues to use the existing manual-load workflow.

No requests, calculations, or page structure were added.

Research can now display:

- observed time;
- generated time;
- freshness status;
- coverage status.

Historical Analog, Event Impact, and Market Memory responses carry validity independently. A slow or unavailable intelligence source does not block the other sections.

## Operations Metadata

The durable artifact index records validity for newly published artifacts.

The operations snapshot exposes aggregate artifact counts by:

- freshness status;
- coverage status.

Legacy index entries without validity are counted as:

```text
freshness: UNKNOWN
coverage: UNKNOWN
```

No operations UI redesign was introduced.

## Lifecycle

### 1. Observation

The producer identifies the timestamp of the market state, event, or prepared evidence.

### 2. Generation

The builder or publisher records when the intelligence object was produced.

### 3. Validity Assignment

The producer adapter applies:

- an accepted freshness policy, if one exists;
- a deterministic coverage assessment;
- explicit unavailable or unknown states.

### 4. Publication

Validity travels with the intelligence artifact and durable index metadata.

### 5. Consumption

Consumers display or inspect validity. They do not recalculate historical intelligence.

### 6. Expiration

Explicit artifact/cache expiration produces `EXPIRED`. Expiration remains separate from archival and producer confidence.

## Compatibility

Artifact schema version remains unchanged in V1.

This avoids invalidating existing durable artifacts solely because validity metadata was introduced.

Compatibility behavior:

- new artifacts always receive validity through `createIntelligenceArtifact`;
- producer-specific publishers provide explicit validity;
- legacy durable payloads are normalized on read;
- legacy durable index entries may omit validity;
- legacy entries are surfaced as `UNKNOWN`, never assumed valid;
- existing cache schema versions remain unchanged;
- Historical Analog and Event Impact readers enrich legacy payloads at consumption boundaries.

The compatibility adapter is intentionally conservative. It does not infer freshness from `generatedAt`.

## Migration Strategy

### Phase 1: Dual Read

- Read explicit validity when present.
- Adapt legacy records to `UNKNOWN`.
- Continue accepting current artifact and cache schema versions.

### Phase 2: Producer Refresh

- Regenerate Historical Analog caches through existing builders.
- Regenerate Event Impact caches through existing builders.
- Republish durable artifacts.
- Rebuild Market Memory from validity-aware artifacts.

No request path triggers this work.

### Phase 3: Enforcement

After production inventory confirms that legacy artifacts have been replaced:

- consider a future artifact schema version that requires persisted validity;
- remove legacy adaptation only through a deliberate migration;
- retain explicit unknown states for producers without accepted policies.

This phase is not implemented in V1.

## Failure Handling

Invalid or missing validity never crashes a consumer.

Behavior:

- missing legacy validity -> `UNKNOWN`;
- invalid observation timestamp -> `observedAt: null`, `UNKNOWN`;
- missing coverage evidence -> `UNKNOWN`;
- no usable prepared data -> `UNAVAILABLE`;
- explicit expiration -> `EXPIRED`.

The validity layer never fabricates timestamps, coverage, confidence, or outcomes.

## Known Limitations

- Historical Analog freshness windows are policy constants and are not configurable at runtime.
- Event Impact has no age-based freshness policy in V1, so freshness remains `UNKNOWN`.
- Coverage describes data completeness, not statistical adequacy.
- Market Memory inherits the most conservative source validity but does not evaluate whether supporting artifacts are semantically compatible.
- Existing durable artifact files remain legacy until republished.
- Operations exposes validity inventory metadata but no new visualization.
- Replay runtime and cache behavior are unchanged.
