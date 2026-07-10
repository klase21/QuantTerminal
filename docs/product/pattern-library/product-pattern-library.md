# Product Pattern Library

**Status:** Canonical product pattern intelligence  
**Owner:** Product / Design  
**Source:** `docs/product/competitive-intelligence/`  
**Related documents:** `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_PLAN.md`  

## Purpose

The Product Pattern Library transforms competitive observations into reusable
QuantTerminal product intelligence.

Patterns are not copied features. They are reusable solutions to recurring
product problems, adapted through QuantTerminal's principles:

- Visual First;
- Evidence First;
- Explain, Don't Predict;
- Progressive Disclosure;
- Human Decision Authority;
- Trust Before Attention;
- source transparency;
- responsiveness.

## Decision Legend

| Decision | Meaning |
| --- | --- |
| ADOPT | Pattern fits QuantTerminal and should become a design-system or product-workflow foundation. |
| MODIFY | Pattern is valuable but must be adapted to evidence, architecture, responsiveness, or product ownership rules. |
| REJECT | Pattern conflicts with QuantTerminal principles and should not guide product work. |

## Priority Legend

| Priority | Meaning |
| --- | --- |
| P0 | Required before major UI redesign. |
| P1 | Strongly recommended for first product construction wave. |
| P2 | Future enhancement after core redesign. |
| Long-term | Strategic future research or expansion pattern. |

## Canonical Patterns

| Pattern Name | Category | Problem | Solution | Benefits | Trade-offs | Used By | Confidence | QuantTerminal Decision | Priority | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Search-First Navigation | Navigation / Search | Users need fast access to symbols, entities, datasets, events, and workflows. | Provide global search that routes to symbols, evidence, replay windows, research, and future entities. | Fast orientation, expert speed, fewer clicks. | Requires ranking, disambiguation, and clear unavailable states. | Bloomberg, TradingView, Arkham, DefiLlama, Koyfin, Nansen, Dune, Hyperliquid, Polymarket | ★★★★★ | ADOPT | P0 | Highest-confidence navigation pattern across product types. |
| Professional Density With Progressive Disclosure | Information Density / Progressive Disclosure | Professional users need dense context, but beginners can be overwhelmed. | Start with a clear first-read layer, then reveal dense panels, tables, replay, and repository detail. | Supports beginner-to-professional ladder. | Poor hierarchy can become clutter. | Bloomberg, CoinGlass, Koyfin, TradingView, Hyperliquid, CoinAnk | ★★★★★ | ADOPT | P0 | Core QuantTerminal product promise depends on density without overload. |
| Evidence Card Structure | Evidence Cards / Dashboard | Users need evidence objects that are scannable, traceable, and reusable. | Standardize cards with fact, source, freshness, availability, warning, contradiction, and drilldown. | Trust, reuse, handoffs, consistency. | Cards can duplicate information if not governed. | Arkham, CoinGlass, SoSoValue, Nansen, Glassnode, Polymarket | ★★★★☆ | ADOPT | P0 | Evidence Cards are the primary product trust unit. |
| Source Transparency | Evidence / Trust | Users cannot trust unsupported metrics or hidden provenance. | Show source, timestamp, provider tier, freshness, availability, and limitations where trust depends on it. | Prevents fabricated certainty and builds auditability. | Adds visual complexity if overexposed. | Bloomberg, Token Terminal, Glassnode, Dune, Kaiko | ★★★★★ | ADOPT | P0 | Aligns directly with Repository and Evidence First. |
| Visual-First Chart Interaction | Charts / Visualization | Users need to understand market state before reading text. | Use charts and direct visual controls as primary evidence views. | Fast comprehension and exploration. | Chart-first can hide non-chart evidence. | TradingView, Koyfin, Glassnode, Hyperliquid | ★★★★☆ | ADOPT | P0 | Supports Visual First and Replay/Markets evolution. |
| Derivatives Evidence Cluster | Dashboard / Evidence / Charts | Funding, OI, liquidations, and price are scattered across many views. | Group derivatives evidence into a coherent cluster with source and freshness. | Better leverage context and market direction support. | Can become metric-first instead of decision-first. | CoinGlass, CoinAnk, CryptoQuant, Hyperliquid | ★★★★☆ | ADOPT | P0 | QuantTerminal already has derivatives data foundations. |
| Research Chart Narrative | Research / Storytelling | Charts without explanation force users to infer meaning. | Pair charts with concise evidence-grounded narrative and limitations. | Better research comprehension. | Narrative can become reasoning overreach. | Glassnode, Kaiko, Koyfin, Token Terminal, CryptoQuant | ★★★★☆ | MODIFY | P1 | Must wait for approved reasoning boundaries. |
| Workspace Personalization | Workspace / Customization | Users repeat workflows and need saved context. | Support saved layouts, watchlists, selected symbols, evidence groups, and preferred depth. | Productivity and continuity. | Personalization must not alter canonical facts. | Bloomberg, TradingView, Koyfin, Nansen, Dune | ★★★★☆ | MODIFY | P1 | Valuable after canonical IA stabilizes. |
| Institutional Data Trust | Evidence / Enterprise | Professional users need confidence in data quality and governance. | Make provider tier, methodology, validation, and limitations visible. | Trust, enterprise readiness, auditability. | Requires disciplined metadata and copy. | Bloomberg, Koyfin, Glassnode, Kaiko | ★★★★★ | ADOPT | P0 | A durable QuantTerminal moat. |
| Category-First Domain Navigation | Navigation / IA | Expanding domains can become scattered. | Organize domains by durable categories: derivatives, ETF, macro, on-chain, prediction, research. | Scales product breadth. | Categories can become rigid or duplicate. | DefiLlama, Token Terminal, SoSoValue, Dune | ★★★★☆ | MODIFY | P1 | Needed for expansion, but must preserve primary nav. |
| Entity / Wallet Intelligence | Research / Evidence | On-chain entities are hard to reason about from raw addresses. | Convert addresses/entities into evidence-backed objects with label confidence. | Strong investigation workflows. | Label certainty can be overclaimed. | Arkham, Nansen | ★★★☆☆ | MODIFY | Long-term | Relevant for future on-chain expansion. |
| Query / Methodology Transparency | Evidence / Research | Users need to know how metrics were produced. | Expose methodology, query, formula, or source route when feasible. | Auditability and learning. | Too much technical detail can overwhelm. | Dune, Kaiko, Glassnode, Token Terminal | ★★★★☆ | ADOPT | P1 | Strong fit for repository-backed trust. |
| Probability Evidence Cards | Evidence Cards / Prediction | Prediction-market probabilities are useful but easy to overinterpret. | Present probability as evidence with market, liquidity, timestamp, and limitation. | Clear event context. | Must not become QuantTerminal prediction. | Polymarket, SoSoValue | ★★★☆☆ | MODIFY | P2 | Useful for Prediction category with strict wording. |
| Heatmap Market Scanning | Heatmaps / Dashboard | Users need fast identification of intensity, clusters, and stress. | Use heatmaps for liquidations, sectors, flows, or market intensity. | Strong scanability. | Color overload and false urgency. | CoinGlass, CoinAnk, TradingView, Koyfin | ★★★☆☆ | MODIFY | P1 | Useful if paired with accessibility and evidence labels. |
| Alert / Monitoring Workflow | Alerts / Automation | Users need to know what changed without constant manual scanning. | Provide evidence-backed alerts with source, reason, and destination. | Attention routing and workflow continuity. | Can become noisy or manipulative. | Bloomberg, TradingView, Arkham, Nansen, CryptoQuant, Koyfin | ★★★★☆ | MODIFY | P2 | Depends on automation governance. |
| Direct Chart Manipulation | Charts / Interaction | Users need fast visual experimentation. | Enable zoom, pan, overlays, drawing, and timeframe switching. | Exploration speed. | Can distract from evidence hierarchy. | TradingView, Koyfin, Hyperliquid | ★★★★☆ | ADOPT | P1 | Strong for Replay and Markets. |
| Decision-First Dashboard Summary | Dashboard / Visual Hierarchy | Metric-first dashboards make users hunt for meaning. | Lead with primary market state, why, evidence, and next action. | 5-second clarity. | Requires strong editorial hierarchy. | Koyfin, SoSoValue, Bloomberg, CoinGlass | ★★★★☆ | ADOPT | P0 | Required by MASTER_PRODUCT. |
| Investigation Drilldown | Research / Navigation | Deep evidence workflows can feel disconnected. | Let users move from card to chart to replay to research to raw record. | Preserves context and trust. | Requires careful state handoff. | Arkham, Nansen, Dune, Glassnode | ★★★★☆ | ADOPT | P1 | Core to QuantTerminal Research and Replay. |
| Bounded Heavy Data Access | Replay / Responsiveness | Heavy datasets can block workflows. | Load large evidence manually, paginated, or bounded by time. | Responsiveness and safety. | More user steps for deep inspection. | Bloomberg, TradingView, Hyperliquid, Dune | ★★★★☆ | ADOPT | P0 | Reinforces protected Replay/orderbook rules. |
| Comparable Metric Tables | Tables / Research | Users need precise comparison across assets, protocols, or datasets. | Use sortable, filterable tables with definitions and source state. | Precision and auditability. | Tables can become first-read clutter. | DefiLlama, Token Terminal, Koyfin, CoinGlass | ★★★★☆ | MODIFY | P1 | Strong for Research and raw repository layers. |
| Event Timeline | Timeline / Replay | Market events need sequence, not just charts. | Show source-backed events, observations, and evidence changes along time. | Replay and research clarity. | Missing events must remain unavailable. | Bloomberg, Glassnode, Polymarket, Arkham | ★★★☆☆ | MODIFY | P1 | Important for Replay and future reasoning. |
| Mobile Companion Mode | Mobile Experience | Dense terminal workflows do not translate directly to mobile. | Use mobile for orientation, alerts, evidence review, and continuation. | Better cross-device continuity. | Heavy workflows remain desktop-first. | TradingView, Polymarket, SoSoValue | ★★★☆☆ | MODIFY | P2 | Supports product vision without shrinking desktop UI. |
| Accessibility State Redundancy | Accessibility / Visualization | Color-only states are inaccessible and ambiguous. | Pair color with labels, icons, text, and explicit availability states. | Trust and readability. | Requires visual discipline. | Koyfin, TradingView, Kaiko, Bloomberg | ★★★★☆ | ADOPT | P0 | Required for professional UX and no-fabrication states. |
| AI-Assisted Navigation | AI Interaction / Search | Users may need help finding the right evidence path. | AI suggests routes to evidence, replay, or research without generating unsupported conclusions. | Reduces navigation burden. | Risk of overclaiming and hidden reasoning. | Bloomberg-adjacent terminal workflows, emerging AI research products | ★★☆☆☆ | MODIFY | Long-term | Requires reasoning and AI governance first. |

## Tier 1 Contribution Coverage

| Tier 1 Product | Contributed patterns |
| --- | --- |
| Bloomberg Terminal | Search-first navigation, professional density, institutional data trust, workspace personalization, bounded heavy data access. |
| TradingView | Visual-first chart interaction, direct chart manipulation, workspace personalization, mobile companion mode. |
| Arkham | Evidence card structure, entity intelligence, investigation drilldown, search-first navigation. |
| CoinGlass | Derivatives evidence cluster, heatmap market scanning, professional density, metric comparison. |
| DefiLlama | Category-first navigation, comparable metric tables, protocol grouping. |
| SoSoValue | Evidence cards, probability/ETF context, decision-first dashboard summary, mobile-friendly monitoring. |
| Koyfin | Readable professional density, workspace personalization, research charts, comparable tables, accessibility discipline. |

## Library Decision

The first product construction wave should prioritize P0 and P1 patterns only.
P2 and Long-term patterns should remain documented but should not drive early UI
redesign until the required architecture, evidence, automation, or reasoning
gates are ready.
