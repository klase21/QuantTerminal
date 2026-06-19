# ADR-006 Intelligence Artifact Registry

## Status

Accepted

## Context

Historical Analog, Replay Intelligence, Dashboard Evidence, and future historical systems produce useful intelligence in different implementation-specific shapes. Direct consumer dependencies on those systems reduce reuse and make producer replacement expensive.

## Decision

QuantTerminal will use versioned intelligence artifacts as the canonical producer-consumer boundary.

Producers publish artifacts.

Consumers discover and read artifacts through the registry and reader interfaces.

Artifact envelopes include:

- type
- conclusion
- confidence
- provenance
- freshness
- supporting evidence
- producer metadata

The first implementation provides an in-memory reference registry and unified reader. It does not migrate existing producers or choose a persistent registry backend.

## Consequences

- Consumers can remain stable when producers change.
- New intelligence types can enter discovery without redesigning existing systems.
- Freshness, schema compatibility, evidence, and source handling become consistent.
- Future persistence adapters can replace the in-memory registry behind the same interface.
- Existing intelligence systems require explicit future migration to publish artifacts.
