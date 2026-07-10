# Research V2 Improvement Backlog

**Status:** Post-design implementation backlog  
**Sprint:** F3  
**Rule:** This backlog does not authorize provider, API, reasoning, historical,
or Repository changes by itself.

## Critical

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Align page hierarchy to Research V2 | Establish question -> evidence -> sources -> reasoning/conflict -> related work -> Repository. | PDGM-103, component extraction | Existing source and loading behavior remains functional. |
| Make counter-evidence permanently visible | Prevent one-sided analysis. | Counter Evidence Card | Conflict, missing information, and quality concerns are never hidden. |
| Bind reasoning to evidence IDs | Prevent unsupported interpretation. | Approved reasoning contract | Every claim cites supporting and counter-evidence or is `UNAVAILABLE`. |
| Standardize source metadata | Make source, timestamp, confidence, freshness, state, and raw link consistent. | Source Ledger Row | Retrieval time never substitutes for observed time. |
| Preserve manual historical boundaries | Keep Historical Analog and Market Memory user initiated. | Existing Research runtime | No automatic historical polling or request-time heavy processing. |
| Preserve no-fabrication states | Make missing source-backed evidence explicit. | State model, AGENTS.md | No synthetic evidence, confidence, relationship, or conclusion. |

## High

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Implement Research Summary | Provide five-second orientation around one question. | Question/context contract | Confidence, freshness, provenance, coverage, and conflict state visible. |
| Implement Evidence Category Matrix | Show breadth and gaps without becoming a feed. | Dataset/source registry | All nine categories have explicit availability. |
| Consolidate Primary Source Ledger | Remove repeated source metadata from disconnected sections. | Source metadata contract | Evidence objects retain direct drilldown. |
| Pair reasoning and disagreement | Keep support and conflict in the same review viewport. | Reasoning and Counter Evidence cards | Neither panel can suppress the other. |
| Preserve Replay handoff | Inspect historical windows without losing thesis context. | Shared product context | Question, evidence IDs, counter-evidence, symbol, and UTC window preserved. |
| Add question/search entry model | Start research from thesis, event, source, or symbol. | Search contract | Search suggestions do not generate conclusions. |

## Medium

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Add saved Research Trails | Support knowledge accumulation. | Workspace and identity model | Notes remain separate from immutable facts. |
| Add evidence comparison view | Compare source agreement and contradiction. | Normalized evidence contracts | Missing datasets remain visible. |
| Add source-methodology drawer | Improve due diligence without cluttering first read. | Source governance docs | Methodology and limitation are attributable. |
| Add bounded chart drilldowns | Visualize source-backed trends. | Available series and chart contract | No decorative or interpolated data. |
| Add institutional export brief | Share evidence and dissent. | Provenance and review status | Facts, reasoning, assumptions, and gaps remain separated. |
| Responsive research mode | Preserve hierarchy on laptop and tablet. | Responsive system | Counter-evidence remains visible and reachable. |

## Low

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Collaborative annotations | Enable team review. | Identity and collaboration model | Annotations never mutate evidence. |
| Research templates | Support repeatable due-diligence questions. | Saved trails | Templates contain structure, not predetermined conclusions. |
| Workspace pinning | Keep sources and questions visible across navigation. | Workspace model | Pinned state cannot alter canonical facts. |

## Future

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Research relationship graph | Visualize evidence, events, studies, and facts. | Typed relationship model | No inferred edge without source support. |
| AI-assisted research navigation | Recommend investigation paths. | AI and reasoning governance | AI cites evidence and cannot approve its own conclusion. |
| Multi-agent research review | Separate generation, counter-review, and validation. | Agent governance | Generation and validation remain separate. |
| Enterprise knowledge base | Accumulate reviewed organizational research. | Identity, permissions, lineage | Canonical facts and human notes remain distinguishable. |
| Cross-market plugin evidence | Expand to macro, equities, RWA, and additional chains. | Plugin architecture and source governance | New domains enter through existing evidence contracts. |

## Recommended Sequence

```text
Canonical states
  -> Research Summary
  -> Evidence Category Matrix
  -> Primary Source Ledger
  -> Counter Evidence
  -> Cited Reasoning
  -> Replay / Repository handoffs
  -> Saved Research Trails
  -> Relationship Graph
```

## Out of Scope

- New providers or APIs;
- automatic historical polling;
- AI-generated evidence or conclusions;
- generated confidence;
- fabricated relationships or analogs;
- signal generation;
- trade recommendations;
- exact Repository scans in request handlers;
- conversion of Research into a content or news feed.

