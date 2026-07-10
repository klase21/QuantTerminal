# Pattern Priority

**Status:** Canonical pattern priority register  
**Owner:** Product / Design  
**Source:** `product-pattern-library.md`  

## Priority Model

| Priority | Meaning |
| --- | --- |
| P0 | Required before UI redesign. |
| P1 | Strongly recommended for first product construction wave. |
| P2 | Future enhancement. |
| Experimental | Requires prototype, evidence, or governance before adoption. |
| Long-term | Strategic future research. |
| Rejected | Must not guide product work. |

## P0 Required Before UI Redesign

| Pattern | Decision | Reason |
| --- | --- | --- |
| Search-First Navigation | ADOPT | Required for fast movement across symbols, evidence, replay, and research. |
| Professional Density With Progressive Disclosure | ADOPT | Enables serious workflows without overwhelming new users. |
| Evidence Card Structure | ADOPT | Core trust unit for the product. |
| Source Transparency | ADOPT | Required by Evidence First and Repository First. |
| Visual-First Chart Interaction | ADOPT | Required by Visual First. |
| Derivatives Evidence Cluster | ADOPT | Required for market direction and data-foundation value. |
| Institutional Data Trust | ADOPT | Required for professional credibility. |
| Decision-First Dashboard Summary | ADOPT | Required by the 5-Second Rule. |
| Bounded Heavy Data Access | ADOPT | Required by responsiveness and Replay protection. |
| Accessibility State Redundancy | ADOPT | Required for usable, trustworthy states. |

## P1 Strongly Recommended

| Pattern | Decision | Reason |
| --- | --- | --- |
| Research Chart Narrative | MODIFY | Valuable for Research but must respect reasoning boundaries. |
| Workspace Personalization | MODIFY | Strong productivity value after canonical IA stabilizes. |
| Category-First Domain Navigation | MODIFY | Needed for expansion without nav sprawl. |
| Query / Methodology Transparency | ADOPT | Strengthens trust and research depth. |
| Heatmap Market Scanning | MODIFY | Useful for Markets and Replay, with accessibility guardrails. |
| Direct Chart Manipulation | ADOPT | Strong interaction pattern for Replay and Markets. |
| Investigation Drilldown | ADOPT | Required for evidence-to-research handoff. |
| Comparable Metric Tables | MODIFY | Useful for Research and raw records when not first-read clutter. |
| Event Timeline | MODIFY | Important for Replay and future reasoning. |

## P2 Future Enhancement

| Pattern | Decision | Reason |
| --- | --- | --- |
| Probability Evidence Cards | MODIFY | Useful for prediction-market evidence after source governance. |
| Alert / Monitoring Workflow | MODIFY | Depends on automation governance and noise controls. |
| Mobile Companion Mode | MODIFY | Valuable after desktop workflow stabilizes. |

## Long-Term Research

| Pattern | Decision | Reason |
| --- | --- | --- |
| Entity / Wallet Intelligence | MODIFY | Depends on on-chain expansion, label confidence, and source governance. |
| AI-Assisted Navigation | MODIFY | Requires reasoning and AI governance before product adoption. |

## Rejected Pattern Families

| Pattern family | Decision | Reason |
| --- | --- | --- |
| AI conclusions without evidence | REJECT | Violates Evidence First and Human Authority. |
| Feature-first design | REJECT | Violates mission and information hierarchy. |
| Metric-first dashboards | REJECT | Violates decision-first product structure. |
| Source-ambiguous evidence | REJECT | Violates Repository and Evidence principles. |
| Unbounded heavy data loading | REJECT | Violates responsiveness and protected Replay rules. |

## Priority Decision

P0 and P1 patterns are safe inputs for Product Diagram Pack and first UI/UX
redesign planning. P2 and Long-term patterns should remain documented but must
not drive implementation until their dependencies are certified.
