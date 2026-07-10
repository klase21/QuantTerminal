# Dashboard V2 Review

**Status:** Canonical design review  
**Sprint:** F1 Dashboard V2  
**Owner:** Product Design  
**Design source:** Existing Figma Make Version 1 and its attached QuantTerminal screen set  
**Canonical artifact:** [QuantTerminal Dashboard V2](https://www.figma.com/make/jFOfLzZ0Hgqzd0w1ZLnxv3/QuantTerminal-Dashboard-V2?p=f&t=SiXPFNWu2R7PEbeS-0), Version 5  
**Decision:** APPROVED. V1 evolves into Dashboard V2; it is not replaced by an unrelated concept.

## Review Basis

Dashboard V2 is reviewed against `MASTER_PRODUCT.md`, PDGM-101, Dashboard
Information Hierarchy, the Design System, Product Pattern Library, Design DNA,
Competitive Intelligence Repository, and ADR-001.

The V1 reference was inspected in Figma Make and compared with the current
`DashboardV1.tsx` composition. V1 establishes a distinctive terminal identity:
dark green-black canvas, restrained amber rails, monospace data, sharp panels,
compact tables, and high information density.

## Phase 1: Existing Dashboard Audit

| Visible V1 section | Decision | V2 treatment | Why |
| --- | --- | --- | --- |
| Global top navigation | MODIFY | Move to a persistent product rail plus compact context toolbar | V1 destinations are compressed and weakly hierarchical; PDGM-107 requires stable ownership and context preservation |
| Market Direction | KEEP + MODIFY | Retain as dominant first-read observed state with source, freshness, availability, and limitation | It satisfies the five-second question but currently risks appearing as unsupported certainty |
| Confidence display | MODIFY | Use only source-backed evidence confidence; otherwise `UNAVAILABLE` | Design System forbids synthetic confidence and requires an explicit basis |
| Key Drivers | MODIFY | Convert ranked rows into reusable Evidence Cards with source state and drilldown | Drivers need evidence identity before they support reasoning |
| Market Overview | MODIFY | Move below primary evidence as compact Supporting Intelligence | Totals support orientation but must not compete with the primary state |
| Market Map | MODIFY | Reframe as Opportunity and Attention map with clear scope | Treemap scanning is useful, but area and color meaning must be explicit and color-independent |
| Performance table | MODIFY | Keep as bounded supporting comparison with visible basis and filters | Dense comparison is valuable; duplicate headline metrics are removed |
| News Flow | REMOVE from primary hierarchy | Replace with source-governed Research Preview / Information Flow handoff | Dashboard is not a news feed; unsupported narrative must not compete with evidence |
| Panel status footer | KEEP + MODIFY | Standardize as Repository Provenance bar with provider, freshness, availability, and inspect action | Source transparency is a permanent product invariant |
| Free-form mosaic grid | MODIFY | Replace with a stable hierarchy-led grid and full-width information bands | V1 is fast for experts but lacks scan order and degrades below desktop widths |
| Green/red directional color | KEEP + MODIFY | Retain semantic market language with arrows, labels, and patterns | Color remains useful but cannot be the only state cue |
| Sharp terminal aesthetic | KEEP | Preserve low-radius panels, fine borders, and quiet surfaces | This is the strongest differentiated visual DNA in V1 |
| Sub-10px metadata | REMOVE | Use the Design System typography hierarchy and accessible minimums | V1 audit identifies legibility and WCAG risk |
| Implicit live state | REMOVE | Use explicit Ready, Refreshing, Stale, Offline, Partial, and Unavailable states | Trust requires visible freshness and failure meaning |

## Additions

| Added V2 section | Purpose | Canonical basis |
| --- | --- | --- |
| Evidence Readiness | Summarize whether the displayed state has sufficient current evidence | Evidence Packet philosophy, Status Panel |
| Key Evidence band | Put source-backed facts before interpretation | MASTER_PRODUCT, PDGM-108 |
| Reasoning Summary | Explain relationships while citing evidence IDs and limitations | Evidence-before-reasoning architecture |
| Historical Context handoff | Route to Replay and Research without loading historical workflows on Dashboard | ADR-001, PDGM-101 |
| Opportunity and Risk | Pair Tactical Alerts with Trend Change Risk and visible evidence state | Dashboard workflow and human authority |
| Supporting Intelligence | Hold prediction, ETF, liquidity, and narrative context below decision-critical content | Progressive Disclosure |
| Research Preview | Offer source-backed investigation paths without turning Dashboard into Research | Page ownership rules |
| Repository Provenance | Make raw facts and provider health reachable | Repository-first architecture |
| Density / focus control | Support beginner and professional depth without duplicating layouts | PDGM-110, Product Pattern Library |

## Phase 2: Information Hierarchy Validation

| Level | Required hierarchy | V2 placement | Decision |
| ---: | --- | --- | --- |
| 1 | Market Direction | Dominant observed-state panel in first viewport | PASS |
| 2 | Key Evidence | Evidence Cards immediately after or adjacent to state | PASS |
| 3 | Reasoning | Distinct Reasoning Card after evidence, with evidence references | PASS |
| 4 | Historical Analog | Replaced by Historical Context handoff to Replay / Research | APPROVED DEVIATION |
| 5 | Opportunity and Risk | Tactical Alerts and Trend Change Risk | PASS |
| 6 | Supporting Intelligence | Prediction, ETF, liquidity, narrative, market comparison | PASS |
| 7 | Research Preview | Compact source-backed cards and deep links | PASS |
| 8 | Repository Links | Provenance bar and inspect-record actions | PASS |

### Level 4 Deviation

ADR-001 intentionally removed Dashboard Historical Analog to protect startup
speed and page ownership. Dashboard V2 must not restore an embedded analog,
automatic historical polling, or heavy historical processing. It provides a
lightweight context handoff instead. Replay owns reconstruction; Research owns
deep historical interpretation.

## Phase 3: Component Alignment

| V2 region | Design System component | Contract rule |
| --- | --- | --- |
| Product navigation | Primary Navigation / Navigation Item | Stable destination ownership and visible active state |
| Context controls | Toolbar, Search Box, Filter Bar, Density Control | Preserve symbol and filter context |
| Market Direction | Dashboard Panel + Status Panel | Observed state, not unsupported advice |
| Evidence Readiness | Status Panel + Badge | State uses text and icon, not color alone |
| Key Evidence | Evidence Card | Fact, source, timestamp, availability, limitation, drilldown |
| Reasoning | Reasoning Card | Evidence references required; no local inference |
| Market metrics | Metric Card | One factual metric with unit and comparison basis |
| Research | Research Card composition | Source-backed preview and handoff only |
| Repository | Repository Link / Source Metadata Panel | Preserve provenance and raw-fact access |

No Dashboard-only primitive is introduced. Screen regions are compositions or
variants of canonical components.

## Phase 4: Professional Workflow Review

| Workflow | Entry and path | V2 support | Decision |
| --- | --- | --- | --- |
| Morning Market Review | Direction -> Evidence Readiness -> Key Evidence -> Supporting Intelligence | One first-viewport summary and ordered expansion | PASS |
| Intraday Monitoring | Toolbar context -> direction/state changes -> alerts -> market comparison | Explicit freshness and local refresh states | PASS |
| Incident Investigation | Alert or contradictory evidence -> Replay -> Research -> Repository | Context-preserving deep links and return path | PASS |
| Macro Monitoring | Supporting Intelligence -> prediction/ETF/macro evidence -> Research | Source-state labels and no inferred macro regime | PASS |
| Trade Preparation | Opportunity/Risk -> evidence -> Scanner/Trade handoff | Candidate context preserved; user remains decision owner | PASS |

## Phase 5: Visual Review

| Dimension | V1 finding | V2 resolution |
| --- | --- | --- |
| Information density | High but uniformly weighted | Density remains professional; priority controls scale and placement |
| Whitespace | Minimal gutters make sections merge | Full-width hierarchy bands and semantic spacing separate decisions |
| Hierarchy | Mosaic requires expert scanning | One dominant state, evidence second, interpretation third |
| Typography | Monospace identity but ad-hoc and too small | Preserve numeric monospace; apply canonical text roles and readable floor |
| Grouping | Panels are independent but lack workflow grouping | Group by orientation, evidence, reasoning, risk, intelligence, provenance |
| Scanning speed | Fast for experts, opaque for new users | Five-second state plus progressive professional depth |
| Noise | Repeated metrics and equal panel borders | Remove duplication and lower secondary contrast |

Important information is not removed. It is moved to the correct depth or
owning screen.

## Phase 6: Evidence Validation

- Market Direction is presented as an observed state with source health.
- Evidence Cards precede Reasoning in reading and interaction order.
- Reasoning references evidence identities and limitations.
- Missing data remains `NO DATA` or `UNAVAILABLE` with an explicit reason.
- Experimental and stale evidence remain visibly qualified.
- Historical context links support investigation without implying an analog.
- Repository provenance remains reachable from evidence and the page footer.
- No AI conclusion is presented without approved evidence-bound reasoning.

**Decision:** PASS WITH ADR-001 DEVIATION.

## Phase 7: Competitive Benchmark

| Product | Dashboard V2 standing | Why |
| --- | --- | --- |
| Bloomberg Terminal | EQUAL in professional density; NEEDS IMPROVEMENT in mature keyboard/workspace depth | V2 matches calm density and scan hierarchy but not Bloomberg's decades of workflow tooling |
| TradingView | BETTER in evidence provenance; NEEDS IMPROVEMENT in chart interaction/customization | QuantTerminal makes sources and limitations explicit; TradingView remains stronger as a chart workspace |
| CoinGlass | EQUAL in derivatives scanning; BETTER in reasoning boundary; NEEDS IMPROVEMENT in specialized heatmaps | V2 organizes OI/funding/liquidation as evidence rather than urgency |
| DefiLlama | BETTER in decision hierarchy; EQUAL in low-friction data access | DefiLlama remains exemplary for simple category navigation; V2 adds evidence-to-reasoning flow |
| SoSoValue | EQUAL in investment context; BETTER in evidence/reasoning separation | V2 retains ETF/prediction context without blending narrative into fact |
| Arkham | BETTER in cross-market orientation; NEEDS IMPROVEMENT in entity/flow investigation | Arkham remains stronger for graph-based on-chain investigation |

## Design Decision Traceability

| V2 decision | Source documents |
| --- | --- |
| Dominant five-second market state | MASTER_PRODUCT, PDGM-101, Dashboard IA |
| Evidence before reasoning | MASTER_ARCHITECTURE, MASTER_PRODUCT, PDGM-108 |
| Stable professional terminal aesthetic | V1 audit, Design DNA, Bloomberg patterns |
| Explicit freshness and unavailable states | Design System State Model, AGENTS.md |
| Historical handoff instead of embedded analog | ADR-001, MASTER_PRODUCT page ownership |
| Bounded progressive density | PDGM-110, Product Pattern Library |
| Persistent navigation and context | PDGM-107, Navigation Map |
| Repository provenance | MASTER_ARCHITECTURE, Evidence Card contract |

## Final Validation

| Validation | Decision |
| --- | --- |
| Blueprint alignment | PASS WITH DOCUMENTED ADR DEVIATION |
| Information Architecture alignment | PASS |
| Design System compliance | PASS |
| Pattern Library compliance | PASS |
| Duplicate information removed | PASS |
| Evidence before reasoning | PASS |
| Professional workflows preserved | PASS |
| No-fabrication policy | PASS |
| Desktop first-viewport hierarchy | PASS |
| Mobile single-column hierarchy | PASS |
| Mobile horizontal overflow | PASS: none observed at 393px |
| Unsupported live/provider claims | PASS: removed or explicitly `UNAVAILABLE` |

Dashboard V2 Version 5 is approved as the parent visual and interaction
language for the remaining product screens. The final Figma review covered the
desktop composition, 393px mobile composition, canonical states, evidence
integrity, navigation, responsive stacking, and the ADR-001 historical handoff.

No local React implementation was changed in this sprint. Dashboard V2 is the
approved design baseline for subsequent screen design and implementation
planning.
