# Replay V2 Review

**Status:** Canonical product-design review  
**Sprint:** F2  
**Figma:** [QuantTerminal Replay V2](https://www.figma.com/design/f4KfiCv9c2TnrpwO0gKKvW)  
**Baseline:** `components/replay/ReplayV1Page.tsx` and the existing Figma Make Replay screen  
**Owner:** Product / Design

## Decision

Replay V2 is approved as the canonical investigation-workspace design. It
evolves the current Replay rather than replacing its bounded loading,
repository gate, provider path, manual AggTrade access, or protected
orderbook behavior.

## Product Question

Replay V2 is organized around five questions:

1. What happened?
2. Why did it happen?
3. What evidence supports that explanation?
4. Has this happened before?
5. What should the user investigate next?

When facts are not loaded, Replay answers with `UNAVAILABLE` and a reason. It
does not use example market events, synthetic confidence, inferred causality,
or decorative chart data.

## Existing Replay Audit

| Existing section or behavior | Decision | Reason |
| --- | --- | --- |
| Bounded symbol, date, and hour controls | KEEP | Preserves responsiveness and the canonical historical boundary. |
| Provider and Repository modes | KEEP | Existing behavior provides a safe optional repository path without replacing provider loading. |
| Repository coverage gate | KEEP | `AVAILABLE`, `STALE`, and missing states fail closed and prevent exact request-time scans. |
| Price replay chart | MODIFY | Remains the largest evidence surface, but moves below a five-second Replay Summary and beside dataset availability. |
| Validation Status | MODIFY | Becomes persistent provenance and evidence availability, closer to the chart and timeline. |
| OI, funding, and liquidation panels | MODIFY | Consolidated into Market Structure after the primary evidence and chronology layers. |
| Event Timeline | MODIFY | Promoted to the core chronological workflow and expanded to carry source, confidence, freshness, and repository state. |
| Manual AggTrade loading | KEEP | Large event streams remain paginated and user initiated. |
| Manual orderbook loading | KEEP | Full snapshot/update reconstruction remains prohibited in the request path by ADR-002. |
| Inherited Research context | KEEP | Supports validation workflows while preventing Replay from inventing a thesis. |
| Comparable Historical Cases | MODIFY | Historical context becomes an outward handoff to source-backed studies, saved Replay sessions, Research, and Repository. |
| Outcome Analysis | REMOVE AS LABEL | The label implies evaluation ownership. Replay owns factual reconstruction and investigation, not outcome judgment. |
| What Happened generated lines | MODIFY | Summary may describe loaded facts, but every sentence must retain evidence references and unavailable behavior. |
| If You Traded It | REMOVE FROM PRIMARY FLOW | It shifts Replay toward simulated execution. Trade owns execution planning. |
| Failure Patterns | REMOVE FROM PRIMARY FLOW | Pattern discovery is not Replay ownership and remains unavailable until a source-backed pattern runtime exists. |
| Evidence Quality | KEEP | Integrated into the availability rail and Repository audit trail to reduce duplication. |
| Replay Metadata | KEEP | Consolidated into the top context bar and Repository panel. |
| Navigation Actions | MODIFY | Becomes persistent cross-navigation with symbol, exchange, UTC window, and dataset state preserved. |

## Information Hierarchy Validation

| Level | Replay V2 treatment | Status |
| ---: | --- | --- |
| 1. Replay Summary | Five-second answer, bounded window, confidence, freshness, and provenance. | PASS |
| 2. Primary Evidence | Chart-first workspace with source availability rail. | PASS |
| 3. Reasoning Timeline | Chronological evidence before interpretation; unsupported reasoning is unavailable. | PASS |
| 4. Historical Context | Links to source-backed studies, saved sessions, Research, and Repository. | PASS |
| 5. Market Structure | Price, OI/funding, liquidations, and bounded orderbook access. | PASS |
| 6. Research | Open-question handoff with supporting and counter-evidence preserved. | PASS |
| 7. Repository | Coverage, provider tier, raw record, and unavailable-state audit trail. | PASS |

The hierarchy intentionally folds the blueprint's detailed funding, OI,
liquidation, and orderbook levels into a single Market Structure band. Their
dataset ownership and manual-access rules remain visible.

## Canonical Layout

```text
Global navigation + bounded window toolbar
  -> Replay Summary
  -> Price and evidence chart + availability rail
  -> Chronological evidence timeline + cited reasoning
  -> Historical context handoffs
  -> Market structure datasets
  -> Research handoff + Repository audit trail
  -> Context-preserving cross-navigation
```

## Evidence and Reasoning Rules

- Evidence appears before reasoning.
- Every reasoning block exposes supporting evidence, counter-evidence,
  confidence, freshness, and unavailable state.
- Funding missing never implies neutrality.
- Liquidation evidence retains provider tier and experimental state.
- No historical analog appears without a source-backed comparable record.
- AggTrade and orderbook remain manual, bounded, and non-blocking.
- Full orderbook reconstruction never runs synchronously.
- Repository remains reachable from evidence, historical context, and the
  final audit panel.

## Professional Workflow Validation

| Workflow | Replay V2 path | Result |
| --- | --- | --- |
| Incident investigation | Summary -> chart -> timeline -> market structure -> Repository | Supported |
| Trade review | Preserved window -> evidence -> counter-evidence -> Trade handoff | Supported |
| Market education | Summary -> chronology -> dataset explanations -> Research | Supported |
| Research | Evidence gaps -> open questions -> Research with preserved context | Supported |
| Post-event analysis | Bounded window -> source-backed sequence -> historical context | Supported |
| Institutional workflow | Provenance -> confidence/freshness -> raw audit trail | Supported |

## Cross-Navigation Contract

Replay accepts context from Dashboard, Markets, Scanner, Trade, Research, and
search. It preserves symbol, exchange, UTC day, hour, source mode, selected
event, and dataset availability when handing off to Dashboard, Markets,
Research, Repository, or Trade.

## Competitive Benchmark

| Product | Professional workflow | Evidence clarity | Investigation speed | Navigation | Decision support | Replay V2 assessment |
| --- | --- | --- | --- | --- | --- | --- |
| TradingView Replay | Excellent chart manipulation | Limited causal provenance | Fast for price review | Strong chart continuity | User-led inference | Replay V2 is better for evidence sequence; TradingView remains better for chart tooling. |
| CoinGlass | Strong derivatives density | Strong liquidation/OI visuals | Fast derivatives scan | Dataset oriented | Metric-led | Replay V2 improves chronology and provenance; CoinGlass remains a benchmark for derivatives visualization. |
| CryptoQuant | Strong metric context | Good source-backed analytics | Moderate learning curve | Research oriented | Metric interpretation | Replay V2 offers a clearer investigation path; dataset depth remains a maturity gap. |
| Arkham | Strong entity and flow investigation | Excellent traceability | Fast entity drilldown | Context-rich | Evidence-led | Replay V2 matches the evidence-first model but lacks mature entity graphs. |
| Bloomberg | Mature professional workflow | Strong provenance and event context | Excellent with expertise | Deep keyboard/workspace model | Institutional | Replay V2 has comparable ownership clarity; keyboard, workspace, and export maturity remain future work. |

## Visual Review

- **Information density:** Dense but ordered into seven numbered bands.
- **Whitespace:** Compact internal spacing with clear separation between
  ownership layers.
- **Typography:** Dashboard V2 hierarchy and mono metadata language are
  preserved.
- **Grouping:** Chart and availability remain together; reasoning and evidence
  remain together; Research and Repository are paired but retain ownership.
- **Scanning speed:** The primary state, load action, and evidence gaps are
  visible before scrolling into deeper analysis.
- **Noise control:** Repeated metadata panels from V1 are consolidated.

## Deviations and Limitations

- The Figma artifact uses explicit unavailable states because no production
  Replay payload was supplied to the design sprint.
- No interactive prototype behaviors are wired yet.
- Current orderbook reconstruction remains intentionally unavailable when a
  safe cached snapshot is absent.
- Historical analogs remain handoffs, not embedded generated analysis.
- Replay V2 does not change current provider or repository loading behavior.

## Validation

| Check | Result |
| --- | --- |
| PDGM-102 alignment | PASS |
| Replay Information Architecture alignment | PASS |
| Dashboard V2 visual-language alignment | PASS |
| Evidence before reasoning | PASS |
| Repository reachable | PASS |
| Research handoff preserved | PASS |
| Professional workflows represented | PASS |
| Duplicate primary information removed | PASS |
| No fabricated events or metrics | PASS |
| Protected orderbook behavior preserved | PASS |

