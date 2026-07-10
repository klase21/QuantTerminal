# Trade V2 Review

**Status:** Canonical product-design review  
**Sprint:** F6  
**Figma:** [QuantTerminal Trade V2 - Decision Workspace](https://www.figma.com/design/eKQoLz9L6wNaxtUq2x2EbT)  
**Baseline:** `components/trade/TradePage.tsx`, PDGM-106, Trade Information Hierarchy, and the F5.5 Trade Readiness Review  
**Owner:** Product / Design

## Decision

Trade V2 is approved as the canonical Decision Workspace. It organizes a user-selected candidate into evidence, reasoning, scenarios, risk, planning conditions, and review. It does not create candidates, recommend autonomous execution, place orders, or convert unavailable inputs into certainty.

## Product Questions

Trade V2 answers:

1. What decision am I evaluating?
2. What evidence supports it?
3. What evidence contradicts it?
4. What scenarios exist?
5. What risks remain?
6. What preparation and monitoring plan is reasonable?

## Existing Trade Audit

| Existing concept | Decision | Reason |
| --- | --- | --- |
| Stable selected candidate | KEEP | Decision work must remain anchored to one explicit candidate. |
| Candidate list and retained state | KEEP + MODIFY | Preserve selection stability, but present investigation context rather than a trade feed. |
| Inherited Replay context | KEEP + ELEVATE | Historical validation is a primary lineage input, not a secondary metadata block. |
| Explicit `NO DATA` / `UNAVAILABLE` states | KEEP | Missing inputs must remain visible and non-blocking. |
| Research and Replay navigation | KEEP + EXPAND | Add Markets, Dashboard, Scanner, and Repository while preserving origin context. |
| Execution readiness | MODIFY | Becomes Decision Readiness: candidate, evidence, validation, and user constraints. |
| Execution setup | MODIFY | Becomes Decision Summary and user-owned evaluation question. |
| Entry and exit plan | MODIFY | Convert to confirmation and invalidation conditions; remove order-entry framing. |
| Risk management | MODIFY | Separate known risks, unknown risks, data gaps, macro, liquidity, and execution risk. |
| Execution checklist | KEEP + EXPAND | Add preparation, monitoring, and post-decision review; never imply an order was placed. |
| Trade metadata | MODIFY | Retain provenance, freshness, coverage, and context lineage only. |
| Derived setup/direction/action labels | REMOVE | Local interpretation must not manufacture a decision or recommendation. |
| Plan quality and derived risk grade | REMOVE | Unsupported aggregate grades hide evidence and uncertainty. |
| Position sizing | REMOVE | Account and risk inputs are not owned by the current source path. |
| Demo trade, local win rate, and P&L history | REMOVE | Simulation performance is not evidence for the current decision and conflicts with Decision Workspace ownership. |
| Orderbook/trade socket as decision authority | REMOVE AS AUTHORITY | Live data may support evidence only when governed; it cannot generate a plan. |
| Counter Evidence | ADD | Mandatory before scenarios or planning. |
| Scenario Analysis | ADD | Bull, base, and bear cases remain conditional and non-probabilistic by default. |
| Risk Ledger | ADD | Makes unresolved risk and confidence-reduction factors visible. |
| Repository audit | ADD | Preserves fact, evidence, Replay, Research, and plan lineage. |

## Information Hierarchy Validation

| Level | Trade V2 treatment | Status |
| ---: | --- | --- |
| 1. Decision Summary | Selected decision, confidence, freshness, coverage, and outstanding unknowns. | PASS |
| 2. Evidence Summary | Supporting evidence, Counter Evidence, missing information, and Repository state. | PASS |
| 3. Supporting Reasoning | Interpretation remains unavailable without explicit evidence references. | PASS |
| 4. Counter Evidence | Mandatory and visible before scenarios. | PASS |
| 5. Scenario Analysis | Bull, base, and bear cases expose conditions and invalidation without fabricated probabilities. | PASS |
| 6. Risk Assessment | Known, unknown, macro, liquidity, execution, and data-gap risks. | PASS |
| 7. Execution Plan | Preparation, confirmation, invalidation, monitoring, and review checklists only. | PASS |
| 8. Replay / Research / Repository | Source context and audit paths remain reachable. | PASS |

## Canonical Layout

```text
Global Navigation + Context Toolbar
  -> Decision Summary + Decision Readiness
  -> Evidence Workspace
  -> Supporting Reasoning + Reasoning Boundary
  -> Scenario Analysis
  -> Risk Assessment + Risk Ledger
  -> Preparation / Monitoring / Review Plan
  -> Replay / Research / Repository Handoffs
```

## Decision Summary Contract

The first viewport exposes:

- decision under evaluation;
- stable candidate identity;
- evidence confidence when source-backed;
- freshness and coverage;
- outstanding unknowns;
- Decision Readiness state.

No candidate produces `NO SELECTED DECISION`. Missing confidence, freshness, or coverage remains `UNAVAILABLE`; it never becomes neutral or low by inference.

## Evidence Workspace Contract

Every statement references evidence or remains unavailable. The workspace keeps separate:

- supporting evidence;
- Counter Evidence;
- coverage and freshness;
- missing information;
- source and Repository references;
- limitations.

Evidence state cannot be altered by reasoning, scenarios, or user planning.

## Reasoning and Scenario Rules

- Evidence precedes reasoning.
- Reasoning cites evidence and identifies assumptions and limitations.
- Counter Evidence remains visible beside supporting evidence.
- Bull, base, and bear cases are conditional frames, not predictions.
- Probabilities are omitted unless an approved source and method supply them.
- Invalidation conditions are explicit and never inferred from a missing price.
- Alternative interpretations remain available to Research.

## Risk Assessment Contract

Trade V2 always exposes:

- known risks;
- unknown risks;
- data gaps;
- macro risks;
- liquidity risks;
- execution risks;
- confidence-reduction factors.

Risk categories do not collapse into an unsupported aggregate score. Missing risk inputs reduce readiness rather than creating a favorable state.

## Planning Boundary

The Execution Plan includes:

- preparation checklist;
- confirmation conditions;
- invalidation conditions;
- user-authored risk limits;
- monitoring checklist;
- post-decision review checklist.

It explicitly excludes order tickets, exchange routing, account balances, leverage controls, autonomous sizing, and execute actions. QuantTerminal structures the decision; the user retains authority.

## Cross-Navigation Contract

| Destination | Purpose | Preserved context |
| --- | --- | --- |
| Markets | Verify live structure | symbol, exchange, timeframe, evidence state |
| Dashboard | Return to orientation | selected market and decision status |
| Replay | Inspect historical validation | bounded window, validation, evidence IDs |
| Research | Review thesis and contradiction | question, assumptions, support, conflict |
| Scanner | Return to candidate priority | candidate identity, source reason, freshness |
| Repository | Audit facts and lineage | record and evidence references |

Direct Trade entry remains usable but displays `NO SELECTED DECISION`. It never creates a candidate.

## Professional Workflow Validation

| Workflow | Trade V2 path | Result |
| --- | --- | --- |
| Investment Committee Review | Decision -> evidence -> contradiction -> scenarios -> risk -> audit | Supported |
| Portfolio Review | Candidate context -> market risk -> scenarios -> monitoring | Supported |
| Research Meeting | Research handoff -> evidence references -> alternative interpretations | Supported |
| Trade Preparation | Readiness -> confirmation -> invalidation -> risk limits -> checklist | Supported without order entry |
| Post-Mortem Analysis | Replay -> outcome context -> review checklist -> Repository | Supported as future data integration |
| Institutional Decision Making | Provenance -> evidence quality -> explicit unknowns -> human decision | Supported |

## Competitive Benchmark

| Product | Decision support | Transparency | Evidence quality | Professional workflow | Trade V2 assessment |
| --- | --- | --- | --- | --- | --- |
| Bloomberg Terminal | Exceptional data and workflow depth | Strong source context | Institutional breadth | Exceptional | Trade V2 is clearer about evidence/reasoning boundaries; Bloomberg remains the benchmark for workspace breadth and keyboard productivity. |
| Koyfin | Strong portfolio and macro comparison | Good | Data-led | Strong | Trade V2 adds mandatory contradiction and lineage; Koyfin remains stronger in portfolio analytics. |
| TradingView | Excellent chart-led planning | Indicator and script dependent | Chart/market-data led | Exceptional for active analysis | Trade V2 is stronger in explicit evidence and risk traceability; TradingView remains stronger in chart tooling. |
| Nansen | Strong entity and smart-money context | Strong label provenance | High for on-chain workflows | Strong | Trade V2 provides a broader decision contract; Nansen remains stronger in entity intelligence. |
| Token Terminal | Strong fundamental comparison | Strong metric methodology | High for protocol fundamentals | Strong research workflow | Trade V2 adds scenarios and decision planning; Token Terminal remains stronger in fundamental standardization. |

QuantTerminal differs by preserving the complete chain from Repository facts to evidence, contradiction, reasoning, scenarios, risk, and a user-owned plan. It does not optimize for execution speed or signal conversion.

## Visual and Component Review

- Dashboard V2 navigation, dark terminal palette, typography, and availability language are preserved.
- Replay V2's bounded validation and Research V2's evidence/counter-evidence model are first-class inputs.
- Markets V2 supplies live context without owning the decision.
- Scanner V2 supplies candidate identity without recommending execution.
- Reusable local components include Status Badge, Navigation Item, Decision Card, Evidence Card, Reasoning Card, Risk Card, Scenario Card, and Checklist Row.
- Cyan identifies evidence and navigation context, amber identifies uncertainty and planning boundaries, red identifies risk, and green identifies validated state only.
- Every color state includes text.

## Limitations

- The Figma artifact intentionally uses unavailable states because no source-backed candidate payload was supplied to this design sprint.
- Interactive prototype routing, responsive variants, and keyboard behavior remain implementation work.
- User notes, saved decision packets, collaboration, and exports remain future capabilities.
- Current React Trade concepts require contract cleanup before matching V2.
- No production component library or Storybook implementation was created in F6.

## Validation

| Check | Result |
| --- | --- |
| PDGM-106 alignment | PASS |
| Trade Information Architecture alignment | PASS |
| Dashboard/Markets visual alignment | PASS |
| Replay investigation alignment | PASS |
| Research evidence model alignment | PASS |
| Scanner prioritization boundary | PASS |
| Evidence before reasoning | PASS |
| Reasoning before scenarios | PASS |
| Scenarios before planning | PASS |
| Counter Evidence mandatory | PASS |
| Repository reachable | PASS |
| No duplicated ownership | PASS |
| No order-entry affordance | PASS |
| No autonomous recommendation | PASS |
| No fabricated candidate, evidence, confidence, probability, or risk | PASS |

