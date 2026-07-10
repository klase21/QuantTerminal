# DGM-002 Container Architecture

**Status:** Canonical Mermaid source  
**Owner:** Architecture  
**Purpose:** Show the major QuantTerminal containers and their ownership boundaries.  
**Responsibilities:** Keep repository, runtime, execution, evidence, product, and plugin concerns separated.  
**Inputs:** Canonical facts, operational plans, repository projections, evidence metadata, plugin contracts.  
**Outputs:** Bounded product reads, evidence packets, future reasoning inputs, and user-facing visualization.  
**Related ADRs:** ADR-001 Repository First, ADR-003 Coverage Via Projection, ADR-006 Provider Independence, ADR-007 Visualization First.  
**Related MASTER documents:** `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`.  

```mermaid
flowchart LR
  subgraph SourceLayer["Source And Extension Layer"]
    Providers["Providers"]
    Plugins["Plugins<br/>Future provider, evidence, and presentation extensions"]
  end

  subgraph DataLayer["Data Foundation"]
    Repository["Historical Repository"]
    Coverage["Coverage Engine"]
    Projection["Projection Engine"]
    Evidence["Evidence Engine"]
  end

  subgraph RuntimeLayer["Runtime And Execution"]
    Runtime["Runtime<br/>Facts and Knowledge models"]
    Scheduler["Scheduler"]
    Workers["Workers"]
  end

  subgraph ProductLayer["Product Containers"]
    Replay["Replay"]
    Research["Research"]
    Presentation["Presentation Layer"]
  end

  Providers --> Repository
  Plugins --> Providers
  Plugins --> Repository
  Repository --> Coverage
  Coverage --> Projection
  Projection --> Evidence
  Evidence --> Research
  Projection --> Replay
  Runtime --> Repository
  Scheduler --> Workers
  Workers --> Repository
  Replay --> Presentation
  Research --> Presentation
  Evidence --> Presentation

  Plugins -. "Must declare provider and ownership boundaries" .-> Evidence
```
