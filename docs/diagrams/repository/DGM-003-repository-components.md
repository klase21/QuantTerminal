# DGM-003 Repository Components

**Status:** Canonical Mermaid source  
**Owner:** Architecture / Data  
**Purpose:** Show the internal responsibilities of the Historical Repository.  
**Responsibilities:** Preserve durable source-backed facts, deterministic identity, provider metadata, and dataset contracts.  
**Inputs:** Validated facts, runtime records, historical market records, operational records, provider metadata.  
**Outputs:** Repository records, bounded reads, parent lineage, coverage inputs, projection inputs.  
**Related ADRs:** ADR-001 Repository First, ADR-002 Immutable Historical Facts, ADR-006 Provider Independence.  
**Related MASTER documents:** `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`.  

```mermaid
flowchart TD
  Incoming["Validated Records<br/>Facts, runtime records, historical datasets, operational records"]

  subgraph Repository["Historical Repository"]
    Identity["Identity<br/>Deterministic record IDs and idempotency keys"]
    Persistence["Persistence<br/>Repository-only writes and duplicate rejection"]
    Storage["Storage<br/>Provider-neutral adapter boundary"]
    Registry["Dataset Registry<br/>Resolution, coverage mode, expected cadence"]
    Metadata["Metadata<br/>Provider tier, canonical, verified, confidence, timestamps"]
    Facts["Historical Facts<br/>Immutable source-backed records"]
  end

  Coverage["Coverage Engine"]
  Projection["Projection Engine"]
  Consumers["Bounded Consumers<br/>Replay, Research, Evidence"]

  Incoming --> Identity
  Identity --> Persistence
  Registry --> Persistence
  Metadata --> Persistence
  Persistence --> Storage
  Persistence --> Facts
  Facts --> Coverage
  Coverage --> Projection
  Projection --> Consumers

  Facts -. "No overwrite after publication" .-> Coverage
  Metadata -. "Provider truth travels with records" .-> Consumers
```
