# Intelligence Artifact Registry

## Purpose

QuantTerminal intelligence systems produce reusable conclusions, evidence, and historical context. Consumers should depend on those intelligence artifacts rather than on the implementation that generated them.

```text
Intelligence producer
  -> artifact creation
  -> validation
  -> registry publication
  -> discovery / read
  -> consumer
```

The registry is the boundary between producers and consumers.

Examples of producers:

- Historical Analog
- Replay Intelligence
- Dashboard Evidence
- future Event Impact
- future Market Memory

Examples of consumers:

- Dashboard
- Historical Intelligence Explorer
- Research
- future agents and workflows

This sprint defines the platform contract and a deterministic in-memory reference registry. Existing intelligence systems are not migrated automatically.

## Artifact Model

Schema version:

```text
1
```

Every artifact includes:

- id
- type
- title
- summary
- confidence
- source
- generated timestamp
- expiration timestamp
- supporting evidence
- metadata

Optional discovery fields:

- tags
- symbols
- exchanges
- event ids
- case ids

Built-in artifact types:

- `historical_analog`
- `replay_intelligence`
- `dashboard_evidence`
- `event_impact`
- `market_memory`

Future systems may use a namespaced custom type:

```text
custom:<name>
```

## Confidence

Artifact confidence is a number from 0 through 100.

Confidence describes producer confidence in the artifact conclusion. It is not recalculated by the registry.

Supporting evidence may provide its own confidence value. Consumers can display artifact-level confidence while retaining evidence-level provenance.

## Source Metadata

Each artifact source includes:

- source system
- producer version
- optional dataset
- optional cache identity
- optional references

This preserves provenance without coupling consumers to producer modules.

Replacing Historical Analog V2 with a later producer only requires the new producer to publish the same artifact contract. Consumers continue querying `historical_analog` artifacts.

## Supporting Evidence

Evidence is an explicit part of the artifact envelope.

Evidence kinds:

- market data
- historical case
- outcome
- event
- expectation
- narrative
- calculation
- source reference

Each evidence entry includes:

- id
- kind
- title
- optional summary
- optional observation timestamp
- source
- optional confidence
- optional references
- optional metadata

The registry stores evidence but does not reinterpret it.

## Registry Interface

The canonical registry interface supports:

- publish
- get by id
- search
- archive
- archived-state lookup

Publication validates the artifact before accepting it.

Publishing an existing id replaces the registered artifact and clears its archived state. Producers should use stable ids when updating the same logical intelligence artifact and new ids when publishing immutable historical records.

The reference implementation is in memory. It establishes behavior without selecting a permanent database or modifying the existing cache foundation.

Future adapters may implement the same interface using:

- file cache
- SQLite
- service API
- distributed registry

Consumers depend only on the interface and reader.

## Search and Discovery

Simple deterministic search supports:

- artifact ids
- artifact types
- source systems
- symbols
- exchanges
- tags
- generated time range
- minimum confidence
- text matching
- expired inclusion
- archived inclusion
- limit and offset

Text search checks:

- title
- summary
- type
- source system
- tags
- symbols
- evidence titles and summaries

No vector search, ranking engine, or AI search is implemented.

Results are ordered by:

1. generated timestamp descending
2. confidence descending
3. id ascending

Search returns summaries rather than exposing implementation-specific payload logic.

## Reader Interface

`IntelligenceArtifactReader` is the unified consumer interface.

Read flow:

```text
read artifact
  -> check existence
  -> check schema version
  -> check archived state
  -> check expiration
  -> return artifact or explicit unavailable state
```

Read states:

- ready
- not found
- expired
- archived
- version mismatch
- invalid

Expired and archived artifacts are rejected by default. A consumer must explicitly opt in to read them.

Consumers should not access producer caches or implementation modules after an artifact migration is complete.

## Lifecycle

### Creation

The producer creates a versioned artifact with:

- conclusion
- confidence
- provenance
- supporting evidence
- metadata
- generation and optional expiration timestamps

`createIntelligenceArtifact` normalizes timestamps and creates the canonical envelope.

### Publication

The registry validates:

- schema version
- required identifiers and text
- confidence range
- source information
- timestamps
- evidence shape
- metadata shape

Invalid artifacts are rejected.

### Consumption

Consumers:

1. Search for relevant artifacts or read a known id.
2. Receive summaries for discovery.
3. Read the selected artifact through the reader.
4. Render the artifact and supporting evidence.

Consumers do not invoke the producer.

### Expiration

An artifact is expired when `expiresAt` is at or before the reader clock.

Expiration does not delete the artifact. Default reads and searches exclude it. Historical workflows can explicitly request expired artifacts.

### Archival

Archival is a registry lifecycle action separate from expiration.

Archived artifacts remain discoverable only when explicitly requested. Archival supports superseded, withdrawn, or administratively hidden intelligence.

## Metadata Strategy

Artifact metadata is producer-owned structured data. The registry does not require every producer to share the same detailed payload.

Examples:

Historical Analog metadata:

- current market state
- analog cases
- outcome statistics
- similarity model version

Replay metadata:

- replay window
- market reconstruction summary
- observed events

Future Event Impact metadata:

- event classification
- outcome windows
- impact distribution

Consumers that need only generic intelligence use title, summary, confidence, source, evidence, tags, and subjects. Specialized consumers may understand a versioned metadata contract for a specific artifact type.

## Replacement and Expansion

Historical Analog replacement:

```text
New analog producer
  -> publishes historical_analog artifact
  -> existing consumers remain unchanged
```

Adding Event Impact:

```text
Event Impact producer
  -> publishes event_impact artifact
  -> registry search discovers it
```

Adding Market Memory:

```text
Market Memory producer
  -> publishes market_memory artifact
  -> no registry redesign
```

Adding future AI agents:

```text
Agent
  -> consumes artifacts through reader
  -> publishes new artifacts through registry
```

## Failure Handling

The registry never fabricates artifacts or evidence.

- Missing artifact: `not_found`
- Expired artifact: `expired`
- Archived artifact: `archived`
- Unsupported schema: `version_mismatch`
- Invalid publication: rejected with validation errors

Registry failures do not trigger producer computation.

## Non-Goals

This implementation does not add:

- Event Impact
- Market Memory
- producer migrations
- Dashboard or Research changes
- vector search
- database persistence
- scheduler or queues
- artifact API routes

These can be added later behind the established registry and reader interfaces.
