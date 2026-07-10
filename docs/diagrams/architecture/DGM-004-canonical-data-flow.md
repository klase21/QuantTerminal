# DGM-004 Canonical Data Flow

**Status:** Canonical Mermaid source  
**Owner:** Architecture  
**Purpose:** Show the canonical lifecycle of data and where mutability stops.  
**Responsibilities:** Define the durable path from provider facts to user-facing presentation without hidden interpretation.  
**Inputs:** Provider observations, collector candidates, validation outcomes, repository facts, projection metadata, evidence packets.  
**Outputs:** Presentation state and future reasoning outputs bounded by evidence.  
**Related ADRs:** ADR-001 Repository First, ADR-002 Immutable Historical Facts, ADR-003 Coverage Via Projection, ADR-005 Separation Of Evidence And Reasoning.  
**Related MASTER documents:** `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`.  

```mermaid
flowchart TD
  Provider["Provider<br/>Source-native observations"]
  Collector["Collector<br/>Candidate record assembly"]
  Validation["Validation<br/>Shape, source, timestamp, identity, metadata"]
  Repository["Repository<br/>Immutable publication boundary"]
  Coverage["Coverage<br/>Completeness evaluation"]
  Projection["Projection<br/>Fast availability view"]
  Evidence["Evidence<br/>Readiness packet"]
  Reasoning["Reasoning<br/>Future versioned interpretation"]
  Presentation["Presentation<br/>Visualization and explicit states"]
  User["User"]

  Provider --> Collector
  Collector --> Validation
  Validation --> Repository
  Repository --> Coverage
  Coverage --> Projection
  Projection --> Evidence
  Evidence --> Reasoning
  Reasoning --> Presentation
  Presentation --> User

  subgraph MutableZone["Mutable Candidate Zone"]
    Provider
    Collector
    Validation
  end

  subgraph ImmutableZone["Immutable / Versioned Zone"]
    Repository
    Coverage
    Projection
    Evidence
    Reasoning
  end

  Validation -. "Invalid data is rejected, not repaired" .-> Collector
  Repository -. "Mutations stop here for facts" .-> Coverage
  Projection -. "No exact request-path scans" .-> Presentation
```
