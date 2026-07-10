# Pattern Dependency Map

**Status:** Canonical pattern dependency map  
**Owner:** Product / Design  
**Scope:** Pattern relationships only. No implementation.  

## Purpose

This map documents how product patterns depend on one another, which screens
they affect, which MASTER_PRODUCT principles they support, and which
MASTER_ENGINEERING constraints govern their use.

## Dependency Map

| Pattern | Dependent Patterns | Affected Screens | MASTER_PRODUCT Principles | MASTER_ENGINEERING Constraints | Implementation Notes |
| --- | --- | --- | --- | --- | --- |
| Search-First Navigation | Category-First Domain Navigation; Workspace Personalization; Investigation Drilldown | Dashboard, Markets, Scanner, Trade, Replay, Research | Consistency; Composable Intelligence; 5-Second Rule | Validation; accessibility; no hidden actions | Future implementation must preserve context and unavailable states. |
| Professional Density With Progressive Disclosure | Decision-First Dashboard Summary; Evidence Card Structure; Comparable Metric Tables | Dashboard, Markets, Research, Replay | Progressive Disclosure; 5-Second Rule; Professional Workflow | Product review; performance review; accessibility | Density must not ship without hierarchy. |
| Evidence Card Structure | Source Transparency; Institutional Data Trust; Accessibility State Redundancy | Dashboard, Research, Replay, Trade, Markets | Evidence First; Trust Over Attention | No-fabrication; protected evidence semantics | Cards require source, freshness, availability, and warning semantics. |
| Source Transparency | Institutional Data Trust; Query / Methodology Transparency | All evidence surfaces | Evidence First; Information Transparency | Repository invariants; no fabricated evidence | Must reflect actual source state only. |
| Visual-First Chart Interaction | Direct Chart Manipulation; Event Timeline; Heatmap Market Scanning | Markets, Replay, Research, Dashboard | Visual First; Fast scanning | Performance; responsiveness; accessibility | Charts cannot imply unsupported conclusions. |
| Derivatives Evidence Cluster | Evidence Card Structure; Comparable Metric Tables; Heatmap Market Scanning | Dashboard, Markets, Replay, Research | Evidence First; Decision Support | Repository-backed data; no direct provider assumptions | Funding, OI, liquidation, and price must preserve availability states. |
| Institutional Data Trust | Source Transparency; Query / Methodology Transparency | Evidence Cards, Research, Enterprise, Dashboard | Trust Over Attention; Evidence First | Validation; documentation; no-fabrication | Trust must be visible, not brand-assumed. |
| Decision-First Dashboard Summary | Evidence Card Structure; Visual Hierarchy; Derivatives Evidence Cluster | Dashboard | 5-Second Rule; Evidence before conclusions | Responsiveness; product review | Dashboard must stay lightweight. |
| Bounded Heavy Data Access | Event Timeline; Direct Chart Manipulation | Replay, Research | Responsiveness; Progressive Disclosure | Protected Replay; performance review | No request-path full scans or heavy auto-load. |
| Accessibility State Redundancy | Evidence Card Structure; Heatmap Market Scanning | All visual surfaces | Accessibility; Consistency | Accessibility validation | Color must be paired with text/icon/state label. |
| Research Chart Narrative | Source Transparency; Event Timeline; Query / Methodology Transparency | Research, Replay | Explain, Don't Predict; Evidence First | Reasoning boundary review | Narrative must remain evidence-grounded. |
| Workspace Personalization | Search-First Navigation; Context Preservation; Alert Workflow | Dashboard, Markets, Replay, Research | Composable Intelligence; Professional Workflow | State validation; no hidden side effects | Personalization must not alter canonical facts. |
| Category-First Domain Navigation | Search-First Navigation; Protocol Grouping | Research, Markets, future expansion | Timeless Information Architecture | Architecture review for new domains | Categories must not duplicate primary page ownership. |
| Query / Methodology Transparency | Source Transparency; Institutional Data Trust | Research, Raw Repository, Evidence | Evidence First; Information Transparency | Documentation and validation | Detail should be available without overwhelming first read. |
| Heatmap Market Scanning | Accessibility State Redundancy; Derivatives Evidence Cluster | Dashboard, Markets, Replay | Visual First; Fast scanning | Accessibility and no-hype review | Heatmaps must not become urgency theater. |
| Direct Chart Manipulation | Visual-First Chart Interaction; Bounded Heavy Data Access | Markets, Replay | Visual First; Professional Workflow | Performance validation | Interactions should not trigger unbounded data loads. |
| Investigation Drilldown | Evidence Card Structure; Search-First Navigation; Event Timeline | Research, Replay, Evidence Cards | Composable Intelligence; Context Preservation | Navigation/state validation | Handoffs must preserve symbol/time/evidence context. |
| Comparable Metric Tables | Source Transparency; Filtering; Category Navigation | Research, Scanner, Raw Repository | Supporting Data; Evidence First | Performance and accessibility | Tables belong below first-read layer unless page purpose requires precision. |
| Event Timeline | Bounded Heavy Data Access; Research Chart Narrative | Replay, Research | Historical Context; Explain, Don't Predict | Repository-only facts; no fabricated events | Missing events remain unavailable. |
| Probability Evidence Cards | Source Transparency; Evidence Card Structure | Dashboard, Research, Evidence Cards | Explain, Don't Predict; Evidence First | No prediction overclaim; source validation | Prediction market probability is evidence, not QuantTerminal forecast. |
| Alert / Monitoring Workflow | Source Transparency; Search Navigation; Workspace Personalization | Markets, Scanner, Dashboard, future automation | Attention Routing; Trust Over Attention | Automation governance; no noisy hidden jobs | Alerts must route to evidence and explain why they fired. |
| Mobile Companion Mode | Evidence Card Structure; Search Navigation | Mobile surfaces | Progressive Disclosure; Accessibility | Responsive validation | Mobile supports orientation and continuation, not full dense workflows. |
| Entity / Wallet Intelligence | Source Transparency; Label Confidence; Investigation Drilldown | Future on-chain Research, Evidence | Evidence First; Information Transparency | Source governance; no fabricated labels | Long-term only until on-chain source governance exists. |
| AI-Assisted Navigation | Search-First Navigation; Evidence Card Structure; Reasoning Boundary | Future AI surfaces | Human Decision Authority; Composable Intelligence | AI collaboration rules; reasoning gate | AI may suggest paths, not unsupported conclusions. |

## Dependency Principles

1. Evidence patterns depend on source transparency.
2. Dense layout patterns depend on progressive disclosure.
3. Chart patterns depend on accessibility and no-overclaim rules.
4. Replay patterns depend on bounded heavy-data access.
5. Research patterns depend on evidence-grounded narrative.
6. AI patterns depend on reasoning and AI governance.
7. Expansion patterns depend on source governance and architecture review.

## Product Construction Guidance

Implementation should begin only after affected patterns are selected,
dependencies are reviewed, and screen ownership is confirmed. This document
does not authorize implementation by itself.
