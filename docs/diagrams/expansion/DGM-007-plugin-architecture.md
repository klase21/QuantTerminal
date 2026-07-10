# DGM-007 Plugin Architecture

**Status:** Canonical Mermaid source  
**Owner:** Architecture / Expansion  
**Purpose:** Show how future providers and domains plug into the existing architecture without bypassing source governance.  
**Responsibilities:** Define plugin entry boundaries for future market, macro, enterprise, and reasoning extensions.  
**Inputs:** Current architecture contracts, provider capability mappings, plugin manifests, source governance rules.  
**Outputs:** Repository-backed datasets, projected availability, evidence packets, presentation modules, future reasoning inputs.  
**Related ADRs:** ADR-001 Repository First, ADR-004 Evidence Never Bypasses Repository, ADR-006 Provider Independence, ADR-007 Visualization First.  
**Related MASTER documents:** `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`.  

```mermaid
flowchart TD
  Current["Current QuantTerminal<br/>Repository, Coverage, Projection, Evidence, Replay, Research"]
  PluginLayer["Plugin Layer<br/>Explicit contracts for providers, collectors, evidence, presentation"]
  Repository["Repository<br/>Canonical durable boundary"]
  Projection["Projection<br/>Availability and freshness"]
  Evidence["Evidence<br/>Readiness and limitations"]
  Presentation["Presentation<br/>User-facing surfaces"]

  subgraph FuturePlugins["Future Plugins"]
    Hyperliquid["Hyperliquid"]
    Ethereum["Ethereum"]
    Solana["Solana"]
    Macro["Macro"]
    PredictionMarkets["Prediction Markets"]
    GovernmentData["Government Data"]
    Equities["Equities"]
    RWA["RWA"]
    EnterpriseAPI["Enterprise API"]
  end

  Current --> PluginLayer
  FuturePlugins --> PluginLayer
  PluginLayer --> Repository
  Repository --> Projection
  Projection --> Evidence
  Evidence --> Presentation

  PluginLayer -. "No provider substitution without mapping" .-> Repository
  PluginLayer -. "No canonical claims without source governance" .-> Evidence
  EnterpriseAPI -. "Expose bounded source-transparent contracts" .-> Presentation
```
