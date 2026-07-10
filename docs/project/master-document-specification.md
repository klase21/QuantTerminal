# Master Documentation Specification

**Epic:** D0.3  
**Milestone:** v0.8-data-foundation  
**Inputs:** `docs/project/documentation-inventory.md`, `docs/project/canonical-documentation-structure.md`  
**Scope:** Specification only. This document does not create the master documents.

## Decision

The proposed permanent master set is sufficient with one refinement:

```text
MASTER_PLAN
MASTER_ARCHITECTURE
MASTER_PRODUCT
MASTER_ENGINEERING
MASTER_ROADMAP
```

These five documents should be the only master documents. They are enough to
separate strategy, architecture, product, engineering process, and roadmap.

Recommended adjuncts are allowed, but they are not master documents:

- `DATA_FOUNDATION_STATUS.md`
- `AUTOMATION_ENTRY_CRITERIA.md`
- `REASONING_ENTRY_CRITERIA.md`

Justification: the adjuncts are operational gate/status documents. They should
change more frequently than master docs and should not become broad orientation
documents.

## Ownership Matrix

| Document | Primary owner | Secondary reviewers | Owns | Does not own |
| --- | --- | --- | --- | --- |
| `MASTER_PLAN.md` | Product/strategy owner | Architecture, Engineering, Research | Mission, vision, core principles, product philosophy, long-term strategy, project constitution | Low-level implementation, sprint logs, dataset counts |
| `MASTER_ARCHITECTURE.md` | Architecture owner | Engineering, Data, Product | System architecture, repository, coverage, projection, evidence, reasoning boundary, presentation boundary, data flow, layer responsibilities | UX copy, sprint plans, git workflow |
| `MASTER_PRODUCT.md` | Product/design owner | Research, Engineering, Architecture | Product philosophy, UX principles, visual language, information hierarchy, evidence cards, density, beginner-to-professional experience, future UI direction | Storage contracts, worker contracts, git policy |
| `MASTER_ENGINEERING.md` | Engineering owner | Architecture, QA/review, Release | Development workflow, sprint workflow, epic workflow, git strategy, validation rules, documentation rules, architecture review, commit policy, release policy | Product vision, user journeys, market interpretation |
| `MASTER_ROADMAP.md` | Program/roadmap owner | Product, Architecture, Engineering | Completed milestones, current milestone, upcoming epics, future expansion, version roadmap, release milestones | Deep architecture details, implementation specs |
| `DATA_FOUNDATION_STATUS.md` | Data owner | Architecture, Engineering | Current dataset status, freshness, coverage, projections, recent-gap sync state | Strategy or architecture ownership |
| `AUTOMATION_ENTRY_CRITERIA.md` | Engineering/automation owner | Review, Release | Go/no-go gates for cron, workers, automation | Automation implementation details |
| `REASONING_ENTRY_CRITERIA.md` | Architecture/reasoning owner | Product, Research, Data | Go/no-go gates for AI/reasoning over Evidence | Reasoning implementation or generated conclusions |

## Master Document Specifications

### MASTER_PLAN

| Field | Specification |
| --- | --- |
| Purpose | Define the enduring project constitution and strategic intent. |
| Audience | Founders, product leads, architects, AI agents, senior engineers. |
| Responsibilities | Mission, vision, core principles, product philosophy, long-term strategy, project constitution, no-fabrication principles, milestone framing. |
| Ownership | Product/strategy owner. |
| Inputs | `phase5-final-certification.md`, `documentation-inventory.md`, `canonical-documentation-structure.md`, `DESIGN.md`, `ROADMAP.md`, strategy docs, automation roadmap. |
| Outputs | Project constitution, current strategic baseline, canonical links to other master docs. |
| Dependencies | `MASTER_ARCHITECTURE`, `MASTER_PRODUCT`, `MASTER_ROADMAP` for details. |
| Maximum recommended size | 4,000 words. |
| Update policy | Update only at milestone boundaries, major strategy changes, or accepted constitution changes. |
| Review policy | Requires product, architecture, and engineering review. |
| Referenced by | ChatGPT, Codex, new engineers, release managers, roadmap docs, sprint prompts. |

Required sections:

- Mission
- Vision
- Core Principles
- Product Philosophy
- Long-term Strategy
- Project Constitution
- Current Milestone
- Canonical Documentation Map

### MASTER_ARCHITECTURE

| Field | Specification |
| --- | --- |
| Purpose | Define the current system architecture and layer ownership. |
| Audience | Architects, engineers, Codex, reviewers, release managers. |
| Responsibilities | System architecture, Repository, Coverage, Projection, Evidence, Reasoning, Presentation, data flow, layer responsibilities, no-circular-dependency rules. |
| Ownership | Architecture owner. |
| Inputs | Phase 4 certification, Phase 5 final certification, persistence/execution certifications, context architecture, historical backfill architecture, coverage/projection/API docs, Replay/Research/Evidence docs, ADRs. |
| Outputs | Architecture dependency graph, ownership boundaries, entry document index, future reasoning boundary. |
| Dependencies | `MASTER_PLAN` for principles, `MASTER_ENGINEERING` for workflow, ADRs for decisions. |
| Maximum recommended size | 6,000 words. |
| Update policy | Update when a layer is added, removed, certified, or when ownership boundaries change. |
| Review policy | Requires architecture and engineering review; product review for presentation boundary changes. |
| Referenced by | Codex, engineers, reviewers, automation agents, future reasoning specs. |

Required sections:

- System Architecture
- Repository
- Coverage
- Projection
- Evidence
- Reasoning
- Presentation
- Data Flow
- Layer Responsibilities
- Facts vs Knowledge Boundary
- No-Fabrication Boundary
- Canonical Entry Documents

### MASTER_PRODUCT

| Field | Specification |
| --- | --- |
| Purpose | Define user-facing product direction and experience principles. |
| Audience | Product, design, frontend engineers, reviewers, new engineers, ChatGPT. |
| Responsibilities | Product philosophy, information hierarchy, UX principles, visual language, evidence cards, information density, beginner-to-professional experience, future UI direction. |
| Ownership | Product/design owner. |
| Inputs | `DESIGN.md`, `PAGE_RESPONSIBILITY_MATRIX.md`, page state docs, design-token registry, Dashboard design system, whole-product audits, product language audit, principal usability audit. |
| Outputs | Product principles, page responsibility summary, UI/UX guardrails, evidence-card rules. |
| Dependencies | `MASTER_PLAN` for mission, `MASTER_ARCHITECTURE` for data and evidence boundaries. |
| Maximum recommended size | 5,000 words. |
| Update policy | Update when navigation, page ownership, visual language, or core product philosophy changes. |
| Review policy | Requires product/design review; engineering review for implementation-sensitive guidance. |
| Referenced by | Frontend work, product reviews, design audits, ChatGPT, new engineers. |

Required sections:

- Product Philosophy
- Information Hierarchy
- UX Principles
- Visual Language
- Evidence Cards
- Information Density
- Beginner to Professional Experience
- Future UI Direction
- Page Responsibilities

### MASTER_ENGINEERING

| Field | Specification |
| --- | --- |
| Purpose | Define how work is executed, validated, reviewed, documented, and released. |
| Audience | Engineers, Codex, reviewers, release managers, automation agents. |
| Responsibilities | Development workflow, sprint workflow, epic workflow, git strategy, validation rules, documentation rules, architecture review, commit policy, release policy. |
| Ownership | Engineering owner. |
| Inputs | `AGENTS.md`, `.skills/quantterminal-rules.md`, automation docs, review protocol, task schema, message contract, release/run docs, ADRs, current sprint conventions. |
| Outputs | Work protocol, validation protocol, doc-change protocol, review gates, release process. |
| Dependencies | `MASTER_PLAN` for principles, `MASTER_ARCHITECTURE` for architecture boundaries, automation docs for future agent workflow. |
| Maximum recommended size | 5,000 words. |
| Update policy | Update when workflow, validation, git policy, review policy, or release policy changes. |
| Review policy | Requires engineering and review-owner approval; release-owner approval for release changes. |
| Referenced by | Codex, engineers, reviewers, release managers, automation agents. |

Required sections:

- Development Workflow
- Sprint Workflow
- Epic Workflow
- Git Strategy
- Validation Rules
- Documentation Rules
- Architecture Review
- Commit Policy
- Release Policy
- Prohibited Behaviors

### MASTER_ROADMAP

| Field | Specification |
| --- | --- |
| Purpose | Define completed, current, next, and future work at milestone level. |
| Audience | Product, engineering, architecture, release managers, AI agents. |
| Responsibilities | Completed milestones, current milestone, upcoming epics, future expansion, version roadmap, release milestones, dependency order. |
| Ownership | Program/roadmap owner. |
| Inputs | Phase certifications, B-series docs, recent-gap sync docs, Evidence Packet docs, automation roadmap, existing roadmap/strategy docs. |
| Outputs | Milestone map, next-epic sequence, release boundaries, dependency gates. |
| Dependencies | `MASTER_PLAN` for strategic direction, `MASTER_ARCHITECTURE` for dependency constraints, `MASTER_ENGINEERING` for workflow gates. |
| Maximum recommended size | 3,500 words. |
| Update policy | Update at sprint series completion, milestone changes, or release planning changes. |
| Review policy | Requires product, architecture, and engineering review. |
| Referenced by | Sprint planning, release planning, ChatGPT, Codex, reviewers. |

Required sections:

- Completed Milestones
- Current Milestone
- Upcoming Epics
- Future Expansion
- Version Roadmap
- Release Milestones
- Dependency Gates

## Document Dependency Graph

```text
MASTER_PLAN
  -> MASTER_PRODUCT
  -> MASTER_ARCHITECTURE
  -> MASTER_ENGINEERING
  -> MASTER_ROADMAP

MASTER_ARCHITECTURE
  -> Repository
  -> Coverage
  -> Projection
  -> Evidence
  -> Replay
  -> Research
  -> Runtime
  -> Context
  -> Reasoning Boundary

MASTER_PRODUCT
  -> Page State Docs
  -> Design System
  -> Product Audits

MASTER_ENGINEERING
  -> AGENTS.md
  -> QuantTerminal Rules
  -> Automation Contracts
  -> Review Protocol
  -> Release Policy

MASTER_ROADMAP
  -> MASTER_PLAN
  -> MASTER_ARCHITECTURE
  -> DATA_FOUNDATION_STATUS
  -> AUTOMATION_ENTRY_CRITERIA
  -> REASONING_ENTRY_CRITERIA
```

## Reading Order

General:

```text
MASTER_PLAN
-> MASTER_ARCHITECTURE
-> MASTER_PRODUCT
-> MASTER_ENGINEERING
-> MASTER_ROADMAP
-> domain entry document
-> sprint/audit/reference document
```

Implementation:

```text
AGENTS.md
-> .skills/quantterminal-rules.md
-> MASTER_ENGINEERING
-> MASTER_ARCHITECTURE
-> domain entry document
-> relevant README/source files
-> current sprint prompt
```

Product:

```text
MASTER_PLAN
-> MASTER_PRODUCT
-> page state document
-> page constitution
-> design-token registry
-> current sprint prompt
```

Release:

```text
MASTER_PLAN
-> MASTER_ROADMAP
-> MASTER_ENGINEERING
-> phase certification
-> current validation report
```

## Update Order

When documentation changes are required, update in this order:

1. Sprint or audit document.
2. Domain entry document.
3. Adjunct status/gate document, if affected.
4. Relevant master document.
5. `MASTER_ROADMAP`, if milestone sequencing changed.
6. Documentation inventory, only during a documentation audit sprint.

Never update a master document first when a lower-level sprint or domain record
is the actual source of evidence.

## Review Order

Review in this order:

1. Scope check against sprint prompt.
2. No-implementation-change check.
3. Source-document traceability check.
4. Ownership check.
5. No-fabrication and no-overclaim check.
6. Cross-master consistency check.
7. Final canonical status decision.

## AI Reading Contract

### ChatGPT

Reads:

1. `MASTER_PLAN`
2. `MASTER_PRODUCT`
3. `MASTER_ARCHITECTURE`
4. Domain entry document
5. Current prompt

Uses:

- Strategic reasoning
- Product interpretation
- Documentation planning
- Architecture conversation

Must not infer implementation state beyond canonical docs.

### Codex

Reads:

1. `AGENTS.md`
2. `.skills/quantterminal-rules.md`
3. `MASTER_ENGINEERING`
4. Relevant `docs/decisions/*`
5. Relevant `docs/investigations/*`
6. `MASTER_ARCHITECTURE`
7. Domain entry document
8. Local README/source files
9. Current prompt

Uses:

- Implementation planning
- Validation
- Documentation updates
- Safe local execution

Must preserve real-data, no-build, no-fabrication, and minimal-change rules.

### New Engineers

Reads:

1. `MASTER_PLAN`
2. `MASTER_PRODUCT`
3. `MASTER_ARCHITECTURE`
4. `MASTER_ENGINEERING`
5. `MASTER_ROADMAP`
6. Domain entry documents for assigned area
7. Relevant ADRs

Uses:

- Onboarding
- Ownership discovery
- Safe contribution planning

### Reviewers

Reads:

1. `MASTER_ENGINEERING`
2. `MASTER_ARCHITECTURE`
3. Domain entry document
4. Changed sprint/audit document
5. Relevant ADRs
6. Current validation output

Uses:

- Scope enforcement
- Boundary checks
- Validation checks
- Documentation accuracy review

### Release Managers

Reads:

1. `MASTER_PLAN`
2. `MASTER_ROADMAP`
3. `MASTER_ENGINEERING`
4. Current phase certification
5. Current adjunct status documents
6. Release notes

Uses:

- Milestone readiness
- Release boundary decisions
- Known limitation tracking

## Documentation Lifecycle

```text
Draft
  -> Review
  -> Canonical
  -> Deprecated
  -> Archive
```

| State | Meaning | Allowed changes | Exit criteria |
| --- | --- | --- | --- |
| Draft | New or proposed documentation. | Free edits within sprint scope. | Review requested. |
| Review | Document is ready for validation. | Corrections only. | Reviewer approves or requests changes. |
| Canonical | Current source of truth. | Controlled updates with owner review. | Superseded by newer canonical document. |
| Deprecated | No longer first source of truth but still useful. | Only correction notes or pointers to successor. | Archive migration approved. |
| Archive | Historical reference only. | No content edits except archival metadata. | Never deleted except separate explicit cleanup decision. |

## Cross-Document Rules

1. Every future document must have exactly one owner.
2. Every master document must link to domain entry docs, not every sprint doc.
3. Sprint docs remain evidence records and should not be rewritten into masters.
4. A master doc may summarize facts only when the source document exists.
5. Architecture claims must point to `MASTER_ARCHITECTURE` or ADRs.
6. Product claims must point to `MASTER_PRODUCT`.
7. Engineering process claims must point to `MASTER_ENGINEERING`.
8. Roadmap claims must point to `MASTER_ROADMAP`.
9. No document may fabricate data availability, validation status, provider support, or implementation completion.
10. Archive candidates are never deleted by default.

## Sufficiency Evaluation

The five-document master set is sufficient.

| Candidate | Decision | Rationale |
| --- | --- | --- |
| `MASTER_PLAN` | Include | Owns constitution and long-term strategy. |
| `MASTER_ARCHITECTURE` | Include | Owns system structure and layer boundaries. |
| `MASTER_PRODUCT` | Include | Owns user-facing product and UX direction. |
| `MASTER_ENGINEERING` | Include | Needed because process, validation, git, documentation, and release policy do not belong in architecture or product docs. |
| `MASTER_ROADMAP` | Include | Needed because sequence and version milestones change more often than constitution or architecture. |
| `DATA_FOUNDATION_STATUS` | Adjunct only | Operational status changes frequently; not a master doc. |
| `AUTOMATION_ENTRY_CRITERIA` | Adjunct only | Gate checklist; not broad orientation. |
| `REASONING_ENTRY_CRITERIA` | Adjunct only | Gate checklist; not broad orientation. |

## Definition Of Ownership

Every future document should be assigned to exactly one owner category:

| Owner category | Owns document types |
| --- | --- |
| Product/strategy | Mission, vision, product philosophy, user-facing principles. |
| Architecture | System diagrams, ownership boundaries, dependency graphs, ADRs. |
| Engineering | Workflow, validation, release, git, implementation protocols. |
| Data | Dataset contracts, source governance, freshness, coverage, projections. |
| Research/Evidence | Evidence packet rules, research consumption boundaries, reasoning entry gates. |
| Automation | Agent protocols, task schemas, automation gates. |
| Release | Release notes, milestone readiness, certification summaries. |

## Readiness Decision

**MASTER DOCUMENTATION SYSTEM SPECIFIED.**

Master documentation ownership is completely specified. Every future document
has exactly one owner category. The project is ready to generate permanent
master documents.
