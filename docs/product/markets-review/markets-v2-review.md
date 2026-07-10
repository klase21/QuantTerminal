# Markets V2 Review

**Status:** Canonical product-design review  
**Sprint:** F4  
**Figma:** [QuantTerminal Markets V2](https://www.figma.com/design/ASFD05NgMGYhyvC8ZFjvgb)  
**Baseline:** `components/markets/MarketsPage.tsx` and the existing Markets design  
**Owner:** Product / Design

## Decision

Markets V2 is approved as the canonical global market intelligence workspace.
It evolves the existing live Markets implementation without changing sockets,
providers, APIs, bounded liquidation access, or product-context contracts.

Markets V2 is not a ticker board. It establishes global context, identifies
where investigation is needed, and hands that context to the owning screen.

## Product Questions

Markets V2 must answer:

1. What is happening across the market?
2. Where is capital flowing?
3. Which sectors are outperforming?
4. What macro forces are driving markets?
5. Which areas require investigation?

If the evidence required for an answer is absent, the design shows
`UNAVAILABLE` with a reason. It does not infer a direction, regime, flow, or
explanation.

## Existing Markets Audit

| Existing section or behavior | Decision | Reason |
| --- | --- | --- |
| Market Context | MODIFY | Becomes Global Market Summary with direction, risk regime, breadth, confidence, freshness, coverage, provenance, and availability. |
| Inherited Dashboard context | KEEP | Preserves entry context while Markets verifies live structure independently. |
| Market Movers | KEEP + CONSOLIDATE | The current page renders mover content in more than one region. V2 exposes one breadth/mover route and leaves prioritization to Scanner. |
| Market Breadth | KEEP + ELEVATE | Appears in the summary and a dedicated evidence ledger without duplicate metric cards. |
| Sector Rotation | KEEP + ELEVATE | Becomes the first major intelligence module after the global summary. |
| Exchange Comparison | KEEP | Remains selected-symbol derivatives verification with explicit venue availability. |
| ETF / Capital Flow | KEEP + EXPAND | Becomes a capital-flow band covering ETF, stablecoin, reserves, dominance, correlation, and volatility as separate evidence. |
| Reserve Intelligence | KEEP | Remains factual observed reserve evidence; missing observations remain unavailable. |
| Futures OI and Funding | KEEP | Consolidated into Derivatives Intelligence with source and freshness. |
| Selected Symbol Liquidations | KEEP BOUNDED | Historical liquidation access remains bounded and routes deeper reconstruction to Replay. |
| Live Market State | KEEP + MODIFY | Remains selected-symbol verification below global context, not the page headline. |
| Advanced Chart | KEEP | Retains chart-first selected-symbol inspection after market context. |
| Trade Flow | KEEP | Remains live evidence; it does not become a market-wide capital-flow conclusion. |
| Orderbook / Depth | KEEP | Remains real-time selected-symbol microstructure, not global context. |
| Market Structure Insights | MODIFY | Any structure label must expose its inputs and unavailable state; no silent fallback to neutral. |
| Scanner handoff | KEEP + ELEVATE | Markets routes attention to Scanner while preserving sector, symbol, timeframe, evidence, and freshness. |
| Macro | ADD AS EXPLICIT MODULE | Macro remains unavailable unless a governed source and source timestamp exist. |
| Prediction Markets | ADD AS EXPLICIT MODULE | External probability is evidence, never QuantTerminal prediction. |
| Repository audit | ADD | Makes historical coverage and raw fact records reachable without request-time scans. |

## Information Hierarchy Validation

| Level | Markets V2 treatment | Status |
| ---: | --- | --- |
| 1. Global Market Summary | Direction, risk regime, breadth, confidence, freshness, coverage, provenance, and availability. | PASS |
| 2. Sector Rotation | Accessible heatmap with leadership and participation states. | PASS |
| 3. Capital Flow | ETF, stablecoin, reserves, dominance, correlation, and volatility remain separate. | PASS |
| 4. Derivatives Intelligence | Chart, OI, funding, liquidations, venue comparison, support, and counter-evidence. | PASS |
| 5. Macro & ETF | Calendar and time-qualified external context. | PASS |
| 6. Prediction Markets | Probability, liquidity, observation time, and limitation. | PASS |
| 7. Market Breadth | Advancers/decliners, movers, participation, and concentration state. | PASS |
| 8. Research & Repository | Investigation routes, evidence ledger, source audit, and raw records. | PASS |

## Canonical Layout

```text
Global navigation + market search/filter toolbar
  -> Global Market Summary
  -> Sector Rotation
  -> Capital Flow
  -> Derivatives Intelligence
  -> Macro + ETF Context
  -> Prediction Markets + Market Breadth
  -> Investigation Routing + Repository Audit
```

## Global Market Summary Contract

The first viewport always exposes:

- overall market direction;
- risk regime;
- participation breadth;
- confidence;
- freshness;
- coverage;
- provenance;
- availability;
- counter-evidence review state.

A missing module cannot silently become `NEUTRAL`. The summary remains
`NO VERIFIED GLOBAL READ` until source-backed inputs support a market-wide
observation.

## Module Contracts

Every market module includes:

- observed evidence or explicit unavailable reason;
- confidence when source-backed;
- provider timestamp;
- freshness;
- coverage where relevant;
- Repository link when available.

| Module | Product rule |
| --- | --- |
| Sector Rotation | Heatmap color is disabled when relative performance is unavailable. |
| ETF Flows | Source date and observation time remain distinct. |
| Open Interest | Selected-symbol evidence, not global leverage inference by itself. |
| Funding | Missing funding never implies neutral positioning. |
| Liquidations | Live or bounded historical facts only; deeper history routes to Replay. |
| Stablecoin Flows | Requires governed source-backed movement. |
| Macro Calendar | Requires approved event source and event timestamp. |
| Prediction Markets | Probability is external evidence, not platform prediction. |
| Dominance | Requires a source-backed share series and comparison basis. |
| Correlation | Requires a bounded pair and window. |
| Volatility | Requires a measured series and method. |

## Evidence Rules

- Evidence precedes any market explanation.
- Supporting and counter-evidence remain visible in the audit band.
- Confidence and freshness remain unavailable when absent.
- Partial coverage is labeled and never presented as complete.
- Missing ETF, macro, prediction, funding, or breadth data never implies
  neutrality.
- Heatmap color never substitutes for a state label.
- Selected-symbol evidence does not automatically become a global market
  conclusion.

## Cross-Navigation Contract

Markets is the primary context provider for:

| Destination | Preserved purpose |
| --- | --- |
| Dashboard | Return to lightweight market orientation. |
| Scanner | Discover opportunities from a selected sector or market state. |
| Replay | Validate a bounded historical window. |
| Research | Investigate evidence, causes, and disagreement. |
| Trade | Plan a selected candidate; Markets does not create the plan. |
| Repository | Audit source-backed records and coverage. |

Handoffs preserve symbol, sector, exchange, timeframe, evidence category,
source state, freshness, and coverage.

## Professional Workflow Validation

| Workflow | Markets V2 path | Result |
| --- | --- | --- |
| Morning market review | Global summary -> sectors -> flow -> breadth | Supported |
| Macro monitoring | Summary -> Macro/ETF -> Prediction Markets -> Research | Supported |
| Sector monitoring | Rotation heatmap -> participation -> Scanner | Supported |
| Institutional overview | Evidence quality -> modules -> Repository audit | Supported |
| Risk management | Risk regime -> derivatives -> volatility/correlation -> counter-evidence | Supported |
| Opportunity discovery | Sector or breadth state -> Scanner -> Trade | Supported |

## Competitive Benchmark

| Product | Global overview | Density | Macro coverage | Evidence quality | Professional usability | Navigation | Markets V2 assessment |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bloomberg Terminal | Excellent | Very high | Excellent | Institutional | Excellent | Deep | Markets V2 matches ownership clarity; macro breadth, keyboard workflow, and workspace maturity remain gaps. |
| TradingView | Strong symbol overview | Configurable | Moderate | Chart-led | Excellent | Chart-centric | Markets V2 is stronger in cross-module evidence; TradingView remains stronger in chart tooling and customization. |
| CoinGlass | Strong derivatives overview | High | Limited | Good derivatives evidence | Strong | Dataset-centric | Markets V2 improves global hierarchy and source-state transparency; CoinGlass remains a heatmap benchmark. |
| SoSoValue | Strong ETF/macro orientation | Moderate | Strong crypto macro | Good | Strong | Editorial | Markets V2 provides broader live structure; SoSoValue remains stronger in curated ETF context. |
| DefiLlama | Excellent category overview | Efficient | Limited | Transparent raw metrics | High | Excellent | Markets V2 adds evidence and handoffs; DefiLlama remains a benchmark for category simplicity. |
| CryptoQuant | Strong on-chain/exchange metrics | High | Moderate | Strong methodology | Strong | Research-centric | Markets V2 improves market-wide routing; CryptoQuant remains stronger in mature metric depth. |

## Visual and Interaction Review

- Dashboard V2 navigation, density, typography, borders, and state language
  are preserved.
- Replay V2's bounded historical handoff is preserved.
- Research V2's supporting/counter-evidence model appears in the audit band.
- Cyan identifies global and source context, green identifies validated routes,
  amber identifies bounded/manual evidence, and red identifies risk or conflict.
- All colors are paired with text labels.
- Sector heatmap cells remain neutral when data is unavailable.
- Cross-market context appears before selected-symbol verification.
- Markets remains dense, but each band answers one durable question.

## Ownership Boundaries

- Markets owns real-time monitoring, sector/flow context, and live structure.
- Dashboard owns lightweight orientation.
- Scanner owns opportunity prioritization.
- Replay owns historical reconstruction.
- Research owns deep explanation and disagreement.
- Trade owns execution planning.
- Repository owns durable facts and coverage records.

## Runtime Boundaries Preserved

- Existing market, trade, kline, and orderbook sockets remain unchanged.
- Existing market movers, sector rotation, ETF, reserve, structure, and futures
  source paths remain unchanged.
- Liquidation history remains bounded by date and hour.
- No historical-heavy processing is added to Markets.
- No provider, API, runtime, polling, or Repository behavior changes in F4.

## Limitations

- The Figma artifact uses unavailable states because no live payload was
  supplied to this design sprint.
- Macro Calendar, Stablecoin Flow, and Prediction Market modules require
  source-backed contracts before implementation.
- No interactive Figma prototype behavior is wired yet.
- Saved market workspaces and multi-monitor layouts remain future work.

## Validation

| Check | Result |
| --- | --- |
| PDGM-105 alignment | PASS |
| Markets Information Architecture alignment | PASS |
| Dashboard V2 visual alignment | PASS |
| Replay V2 bounded-history alignment | PASS |
| Research V2 evidence-model alignment | PASS |
| Evidence before conclusions | PASS |
| Repository reachable | PASS |
| Cross-navigation preserved | PASS |
| Professional workflows represented | PASS |
| Duplicate Market Movers ownership consolidated | PASS |
| No fabricated market explanation, metric, or regime | PASS |

