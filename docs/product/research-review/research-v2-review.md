# Research V2 Review

**Status:** Canonical product-design review  
**Sprint:** F3  
**Figma:** [QuantTerminal Research V2](https://www.figma.com/design/ZvTOzSSHrO6bskGdON7cU7)  
**Baseline:** `components/research/ResearchPage.tsx` and the existing Research design  
**Owner:** Product / Design

## Decision

Research V2 is approved as the canonical QuantTerminal evidence workspace. It
evolves the current Research page without changing its data sources, polling
rules, repository gate, historical manual-load boundary, or cross-product
context contracts.

Research V2 is not a news feed. It organizes a question, source-backed
evidence, cited reasoning, disagreement, related knowledge, and raw audit
records.

## Product Questions

Research V2 must answer:

1. What happened?
2. What evidence supports this?
3. What evidence contradicts it?
4. How reliable is the evidence?
5. What should the user investigate next?

When an answer is not source-backed, the design shows `UNAVAILABLE` and an
explicit reason. It does not create example evidence, inferred confidence, or
synthetic research conclusions.

## Existing Research Audit

| Existing section or behavior | Decision | Reason |
| --- | --- | --- |
| Research Summary | MODIFY | Becomes a five-second question-led summary with confidence, freshness, provenance, coverage, and counter-evidence status. |
| Inherited Scanner context | KEEP | Preserves candidate origin while keeping Research evidence independent. |
| Thesis | MODIFY | Integrated into the core research question instead of a separate competing panel. |
| Supporting Evidence | KEEP + MODIFY | Becomes the evidence overview and primary-source ledger before reasoning. |
| Conflicting Evidence | KEEP + ELEVATE | Becomes a mandatory peer to reasoning, not a later optional section. |
| Historical Analog | KEEP MANUAL | Remains an explicit manual-load research source; unavailable analogs are never generated. |
| Event Impact | MODIFY | Treated as an evidence relationship only when source-backed, not as an automatic causal explanation. |
| Market Memory | KEEP MANUAL | Preserves current manual-load behavior and does not auto-poll historical systems. |
| Narrative Timeline | MODIFY | Narrative items become governed evidence objects; Research does not become a scrolling content feed. |
| Prediction Markets | KEEP | Probability remains evidence with source, timestamp, liquidity context, and limitation; never a conclusion. |
| Macro | KEEP | Source envelope, timestamp, availability, and freshness remain mandatory. Missing macro never implies neutrality. |
| Repository Coverage | KEEP | Projection-only, manual coverage access remains the Repository audit boundary. |
| Source Intelligence | MODIFY | Consolidated into a primary-source ledger with a consistent metadata contract. |
| Related Markets | MODIFY | Becomes relationship-driven related research, not an uncited market suggestion list. |
| Decision Brief | MODIFY | Its support/conflict counts may orient the user, but no brief outranks or replaces primary evidence. |
| Navigation Actions | MODIFY | Becomes persistent cross-navigation with question, thesis, symbol, time window, evidence IDs, and conflict state preserved. |

## Information Hierarchy Validation

| Level | Research V2 treatment | Status |
| ---: | --- | --- |
| 1. Research Summary | Core question, current evidence state, reliability, next step, and quality metadata. | PASS |
| 2. Evidence Overview | Nine canonical evidence categories with explicit availability. | PASS |
| 3. Primary Sources | Auditable source ledger with timestamp, confidence, freshness, availability, and Repository link. | PASS |
| 4. Reasoning | Separate evidence-bound card with assumptions and evidence references. | PASS |
| 5. Counter Evidence | Mandatory equal-weight review of alternatives, conflicts, gaps, and quality concerns. | PASS |
| 6. Related Research | Manual historical systems and saved knowledge paths remain source-backed. | PASS |
| 7. Repository | Projection status, facts, watermark, and raw-record access. | PASS |

The canonical blueprint includes charts as a supporting layer. Research V2
does not place an empty decorative chart above evidence. Charts appear inside
an evidence or related-research drilldown only after a source-backed series is
available.

## Canonical Layout

```text
Global navigation + research search/context toolbar
  -> Research Summary
  -> Evidence Overview
  -> Primary Source Ledger
  -> Reasoning + mandatory Counter Evidence
  -> Research Relationship Graph
  -> Related Research + Repository Audit
  -> Context-preserving cross-navigation
```

## Research Summary Contract

The first viewport answers:

- the active research question;
- whether source-backed evidence exists;
- evidence reliability;
- the next safe action;
- confidence, freshness, provenance, and coverage;
- whether counter-evidence review is complete.

An absent question is shown as `NO RESEARCH QUESTION SELECTED`. An absent
source-backed answer remains `UNAVAILABLE`.

## Evidence Workspace

Research V2 exposes these categories:

| Category | Canonical rule |
| --- | --- |
| On-chain | Requires source-backed entity or chain evidence. |
| Exchange Data | Requires approved market or exchange evidence. |
| Macro | Requires governed source envelope and source timestamp. |
| ETF | Requires source-backed flow or filing evidence. |
| Prediction Markets | Probability is evidence, not QuantTerminal prediction. |
| Government | Requires an approved publication or disclosure. |
| Company Disclosure | Requires a filing or attributable company statement. |
| Research Papers | Curated/manual source with methodology visible. |
| News | Approved evidence objects only; never an engagement feed. |

Every evidence object exposes source, observed timestamp, confidence when
source-backed, freshness, availability, limitation, and Repository link when
available.

## Reasoning and Counter-Evidence Rules

- Evidence appears before reasoning.
- Every reasoning claim references evidence identities.
- Assumptions are explicit.
- Confidence and freshness remain unavailable when not source-backed.
- Counter-evidence is always visible beside reasoning.
- Absence of counter-evidence never means none exists.
- Missing information and quality concerns remain first-class evidence gaps.
- Research never suppresses disagreement to produce a cleaner conclusion.

## Research Graph

The graph establishes the future relationship model:

```text
Evidence -> Research Question -> Reasoning <-> Counter Evidence
                 |
                 +-> Replay <-> Research Trail <-> Repository
```

The F3 artifact specifies relationships only. It does not generate a graph
from fabricated entities or inferred links.

## Professional Workflow Validation

| Workflow | Research V2 path | Result |
| --- | --- | --- |
| Daily market research | Question -> evidence readiness -> primary sources -> next safe action | Supported |
| Event investigation | Inherited context -> evidence -> counter-evidence -> Replay | Supported |
| Long-form analysis | Question -> source ledger -> cited reasoning -> related research | Supported |
| Institutional due diligence | Source metadata -> disagreement -> Repository audit | Supported |
| Knowledge accumulation | Related research -> saved trail -> Repository lineage | Supported conceptually; saved trails remain future work. |

## Cross-Navigation Contract

Research accepts context from Dashboard, Replay, Markets, Scanner, Trade, and
search. Handoffs preserve research question, thesis, symbol, UTC window,
supporting evidence IDs, counter-evidence IDs, source state, and unavailable
limitations.

Primary exits are Dashboard, Markets, Replay, Repository, Scanner, and Trade.
Trade continues to own execution planning.

## Competitive Benchmark

| Product | Research workflow | Evidence quality | Knowledge organization | Decision support | Professional usability | Research V2 assessment |
| --- | --- | --- | --- | --- | --- | --- |
| Bloomberg | Mature event/source research | Excellent provenance | Deep terminal graph | Institutional | Excellent | Research V2 matches ownership discipline; keyboard, export, and workspace maturity remain gaps. |
| Glassnode | Strong chart-led research | Strong methodology | Metric and report based | Good historical context | Strong | Research V2 improves counter-evidence visibility; Glassnode remains stronger in mature chart narratives. |
| CryptoQuant | Metric-rich investigation | Strong exchange/on-chain evidence | Dataset oriented | Good for analyst workflows | Strong | Research V2 provides a clearer question-to-source path; dataset breadth remains a gap. |
| Nansen | Entity-led research | Strong label-based evidence | Wallet/entity graph | Strong discovery | Strong | Research V2 has a more explicit disagreement contract; Nansen remains stronger in entity intelligence. |
| Token Terminal | Comparable fundamental research | Strong methodology | Standardized metrics | Strong comparison | Strong | Research V2 adds broader evidence relationships; comparable metric maturity remains future work. |
| DefiLlama | Low-friction category research | Transparent raw metrics | Excellent category hierarchy | User-led inference | High | Research V2 is stronger in evidence/reasoning separation; DefiLlama remains a benchmark for simple navigation. |

## Visual and Interaction Review

- Dashboard V2 navigation, density, borders, typography, and state language
  are preserved.
- Replay V2's evidence-before-reasoning and context-preserving handoffs are
  reused.
- Green identifies evidence workflow and safe actions; cyan identifies source
  metadata; yellow identifies reasoning; red identifies unresolved conflict.
- Color is paired with labels and cannot carry state alone.
- No card nests another decorative card; panels represent real tools or
  repeated evidence objects.
- Primary-source metadata is scannable as a ledger rather than repeated prose.
- The screen remains dense but ordered into seven responsibility bands.

## Current Runtime Boundaries Preserved

- Narratives, Prediction Markets, and Macro remain the current enabled live
  Research inputs.
- Historical Analog and Market Memory remain manual-load only.
- Repository Research remains projection-gated and manual.
- No exact repository scan is introduced.
- No provider, API, polling, or historical runtime behavior changes in F3.

## Limitations

- The Figma artifact uses unavailable states because no production evidence
  payload was supplied to the design sprint.
- Relationship graph generation is not implemented.
- Saved research trails and collaborative review are future capabilities.
- Reasoning remains unavailable without approved, cited evidence.
- No interactive Figma prototype behavior is wired yet.

## Validation

| Check | Result |
| --- | --- |
| PDGM-103 alignment | PASS |
| Research Information Architecture alignment | PASS |
| Dashboard V2 visual-language alignment | PASS |
| Replay V2 interaction-language alignment | PASS |
| Evidence before reasoning | PASS |
| Counter-evidence permanently visible | PASS |
| Repository reachable | PASS |
| Cross-navigation preserved | PASS |
| Professional workflows represented | PASS |
| Duplicate information consolidated | PASS |
| No fabricated evidence, confidence, or research result | PASS |

