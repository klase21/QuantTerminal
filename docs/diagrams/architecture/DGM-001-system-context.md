# DGM-001 System Context

**Status:** Canonical Mermaid source  
**Owner:** Architecture  
**Purpose:** Show the highest-level QuantTerminal flow from source providers to the user.  
**Responsibilities:** Establish the permanent layer order and prevent downstream layers from bypassing upstream evidence boundaries.  
**Inputs:** Provider-backed facts, source metadata, validation results, repository records, projections, evidence packets.  
**Outputs:** User-facing understanding through presentation surfaces.  
**Related ADRs:** ADR-001 Repository First, ADR-004 Evidence Never Bypasses Repository, ADR-005 Separation Of Evidence And Reasoning, ADR-007 Visualization First.  
**Related MASTER documents:** `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`.  

```mermaid
flowchart TD
  Providers["External Providers<br/>Source-backed market, context, and research data"]
  Collectors["Collectors<br/>Bounded source collection and normalization"]
  Repository["Repository<br/>Durable immutable facts and versioned records"]
  Coverage["Coverage<br/>Completeness by dataset, symbol, and UTC boundary"]
  Projection["Projection<br/>Fast availability and freshness views"]
  Evidence["Evidence<br/>Readiness packets, limitations, and warnings"]
  Reasoning["Reasoning<br/>Future versioned interpretation over evidence"]
  Presentation["Presentation<br/>Responsive pages and explicit states"]
  User["User<br/>Human judgment and decision control"]

  Providers --> Collectors
  Collectors --> Repository
  Repository --> Coverage
  Coverage --> Projection
  Projection --> Evidence
  Evidence --> Reasoning
  Reasoning --> Presentation
  Presentation --> User

  Repository -. "Facts become immutable here" .-> Coverage
  Evidence -. "Evidence is not reasoning" .-> Reasoning
  Presentation -. "Visualizes; does not own truth" .-> User
```
