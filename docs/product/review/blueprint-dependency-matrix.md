# Blueprint Dependency Matrix

**Status:** Product Architecture Gate artifact  
**Sprint:** P1.5R Product Architecture Review and Blueprint Certification  
**Owner:** Product / Architecture  

## Purpose

This matrix documents how blueprints depend on each other, on reusable
components, on information objects, and on MASTER principles.

## Dependency Matrix

| Blueprint | Dependent Blueprint | Dependent Component | Dependent Information Object | MASTER Principle |
| --- | --- | --- | --- | --- |
| PDGM-101 Dashboard | Evidence Card, Navigation, Information Density, Decision Flow | Evidence Card, Metric Card, Chart Card, Status Indicator, Repository Link | Market Direction, Evidence, Prediction Market, Macro, Historical Analog | 5-Second Rule, Evidence First, Visual First |
| PDGM-102 Replay | Evidence Card, Navigation, Information Density | Timeline, Chart Card, Bounded Loader, Status Indicator, Repository Link | Replay, Funding, OI, Liquidation, Historical Context | Responsiveness, Bounded Heavy Data, Evidence First |
| PDGM-103 Research | Evidence Card, Navigation, Decision Flow, Information Density | Research Panel, Counter Evidence Card, Chart Card, Source Metadata Panel | Research, Counter Evidence, Reasoning Boundary, Repository | Explain, Don't Predict, Human Authority |
| PDGM-104 Scanner | Evidence Card, Navigation, Decision Flow | Filter, Confidence Meter, Status Indicator, Evidence Card | Opportunity Candidate, Confidence, Risk, Evidence | No fabricated confidence, Opportunity discovery |
| PDGM-105 Markets | Evidence Card, Navigation, Information Density | Chart Card, Heatmap, Filter, Badge, Status Indicator | Live market structure, ETF Flow, Macro, Prediction Market, Derivatives | Real-time first, Visual First |
| PDGM-106 Trade | Evidence Card, Navigation, Decision Flow, Research | Trade Thesis panel, Risk panel, Counter Evidence Card, Scenario panel | Trade Thesis, Risk, Scenario, Historical Analog | Human Decision Authority, Decision Support |
| PDGM-107 Navigation | Workspace, Information Density | Primary Navigation, Search, Breadcrumb, Sidebar, Saved View Control | Workspace Context, Symbol, Time Window, Evidence | Composable Intelligence, Context Preservation |
| PDGM-108 Evidence Card | Navigation, Decision Flow, Information Density | Evidence Card, Badge, Source Metadata Panel, Repository Link | Evidence, Source Metadata, Availability State, Counter Evidence | Evidence First, Source Transparency |
| PDGM-109 Workspace | Navigation, Evidence Card, Information Density | Workspace Switcher, Saved View Control, Sidebar, Pinned Context | Workspace Context, Evidence, User Preferences | Professional Workflow, Human Authority |
| PDGM-110 Information Density | All screen blueprints | Density Control, Accordion, Tabs, Drawer | User Preference, Evidence, Repository | Progressive Disclosure, 5-Second Rule |
| PDGM-111 Decision Flow | Evidence Card, Research, Replay, Trade, Scanner | Evidence Card, Counter Evidence Card, Timeline, Repository Link | Question, Evidence, Reasoning, Historical Context, Action | Evidence Before Reasoning, Human Authority |
| PDGM-112 Design DNA | All blueprints | All product primitives | All product information objects | Visual First, Evidence First, Trust Before Attention |

## Dependency Validation

The dependency graph is one-way at the product architecture level:

```text
MASTER_PRODUCT
  -> Information Architecture
  -> Pattern Library / Design DNA
  -> Product Blueprints
  -> Component Inventory
  -> Design System
  -> Figma / Frontend
```

No blueprint requires implementation ownership from two masters.

## Certification Finding

The dependency matrix is internally consistent. Design System P1.6 should use
PDGM-108, PDGM-107, PDGM-110, and PDGM-112 as the first component governance
inputs.

