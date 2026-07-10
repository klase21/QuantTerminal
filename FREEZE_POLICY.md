# QuantTerminal Freeze Policy

**Status:** Documentation Freeze v1 policy  
**Scope:** Documentation, architecture, engineering, product, roadmap, diagrams, and post-freeze change governance  
**Applies to:** All future contributors, reviewers, ChatGPT sessions, Codex sessions, and AI agents  

## 1. Purpose

Freeze does not mean work stops.

Freeze means the foundation is stable enough that future work must build on it
instead of repeatedly redefining it.

The freeze policy protects:

- project mission;
- architecture boundaries;
- engineering governance;
- product principles;
- strategic roadmap;
- canonical diagrams;
- no-fabrication rules;
- repository-first and evidence-first principles.

## 2. Freeze Types

### Documentation Freeze

Documentation Freeze protects the canonical documentation hierarchy and master
document ownership.

Frozen scope:

- `MASTER_PLAN.md`;
- `MASTER_ARCHITECTURE.md`;
- `MASTER_ENGINEERING.md`;
- `MASTER_PRODUCT.md`;
- `MASTER_ROADMAP.md`;
- Canonical Mermaid Architecture Diagram Pack;
- documentation inventory and governance documents.

Allowed changes:

- typo corrections;
- broken-link corrections;
- clarification that does not change meaning;
- references to newly certified lower-level documents;
- controlled updates after review.

Requires review:

- new canonical document;
- new master reference;
- change to reading order;
- change to ownership;
- change to update or review policy;
- archive or file movement proposal.

Requires ADR:

- change to documentation hierarchy that affects architecture governance;
- change that reassigns ownership between master documents;
- change that alters the meaning of no-fabrication, evidence, repository, or
  reasoning boundaries.

Remains flexible:

- sprint reports;
- audit documents;
- implementation notes;
- future adjunct status documents;
- post-freeze backlog details.

### Architecture Freeze

Architecture Freeze protects the permanent system boundaries.

Frozen scope:

- Repository First;
- immutable historical facts;
- provider independence;
- coverage via projection;
- evidence before reasoning;
- separation of collection and interpretation;
- presentation does not own durable truth;
- Scheduler and Worker do not own business logic;
- Repository-only persistence for durable records.

Allowed changes:

- implementation inside existing boundaries;
- new providers through source governance;
- new consumers through bounded repository/evidence contracts;
- new diagrams that clarify existing architecture.

Requires review:

- new subsystem;
- new data path;
- new persistence behavior;
- new runtime ownership;
- new provider tier;
- new projection or evidence semantics;
- new API category.

Requires ADR:

- new architectural layer;
- ownership transfer between layers;
- direct bypass of Repository, Coverage, Projection, or Evidence;
- change to immutability or idempotency rules;
- change to reasoning boundary;
- change to provider-governance model.

Remains flexible:

- internal module organization;
- adapter implementation details;
- bounded query optimizations;
- validation tooling;
- future plugin contracts that preserve architecture.

### Engineering Freeze

Engineering Freeze protects how work is performed.

Frozen scope:

- architecture-first workflow;
- documentation-first workflow;
- validation before merge;
- no-build rule unless explicitly allowed by repository instructions;
- protected-system review;
- AI collaboration model;
- engineering risk classification;
- quality gates;
- release review flow.

Allowed changes:

- improved checklists;
- additional validation commands;
- clarified review criteria;
- better developer documentation.

Requires review:

- workflow changes;
- release process changes;
- validation policy changes;
- protected-system scope changes;
- git strategy changes;
- AI agent responsibility changes.

Requires ADR:

- change that affects architecture governance;
- change that weakens validation gates;
- change that permits bypassing protected-system review;
- change that permits AI to approve its own work.

Remains flexible:

- sprint execution details;
- local tooling;
- smoke-check implementation;
- developer experience improvements.

### Product Freeze

Product Freeze protects the user experience constitution.

Frozen scope:

- evidence-first UX;
- visual-first hierarchy;
- human decision authority;
- information hierarchy;
- evidence cards;
- product invariants;
- page ownership;
- progressive disclosure;
- trust over attention;
- explicit unavailable states.

Allowed changes:

- new screens that follow the constitution;
- visual refinements that preserve hierarchy;
- accessibility improvements;
- component improvements;
- new product diagrams.

Requires review:

- navigation change;
- page ownership change;
- new primary workflow;
- new evidence-card semantics;
- change to information hierarchy;
- change to visual language;
- change affecting beginner-to-professional experience.

Requires ADR:

- product change that implies architecture change;
- product change that adds reasoning semantics;
- product change that changes Repository or Evidence dependency;
- product change that permits generated confidence or unsupported claims.

Remains flexible:

- layout details;
- copy improvements;
- component polish;
- responsive behavior;
- future workspace personalization inside product invariants.

## 3. What May Change Without Freeze Review

The following may change without freeze-level review when they remain within
existing master-document boundaries:

- implementation details;
- bug fixes;
- typos and formatting;
- bounded documentation clarifications;
- internal refactors that preserve public behavior and architecture;
- tests and smoke checks;
- non-architectural performance improvements;
- local developer tooling.

These changes still require normal engineering validation.

## 4. What Requires Freeze Review

Freeze review is required when a change affects:

- master document meaning;
- system layering;
- ownership boundaries;
- no-fabrication rules;
- repository, coverage, projection, evidence, or reasoning semantics;
- page responsibility;
- product hierarchy;
- roadmap phase sequencing;
- diagram truth;
- AI agent authority.

## 5. What Requires ADR

An ADR is required for significant changes to:

- architecture layers;
- data flow;
- persistence;
- provider governance;
- runtime ownership;
- reasoning boundary;
- repository immutability;
- evidence semantics;
- projection strategy;
- diagram-backed system boundaries;
- product behavior that changes architecture.

ADR approval must precede implementation.

## 6. What Remains Flexible

The freeze preserves the constitution, not every detail.

Flexible areas include:

- feature implementation;
- UI layout refinement;
- provider-specific adapters inside source-governed boundaries;
- smoke checks;
- developer tooling;
- documentation references;
- future sprint planning;
- future adjunct status documents;
- diagram additions that do not contradict existing diagrams.

## 7. Review Order After Freeze

Post-freeze work should review in this order:

1. `AGENTS.md` and active skill rules.
2. Relevant MASTER document.
3. Relevant canonical diagram.
4. Relevant domain entry document.
5. Relevant ADR or investigation.
6. Current sprint prompt.
7. Validation output.

## 8. Freeze Change Decision

Every freeze-impacting proposal must end with one of:

- APPROVED;
- APPROVED WITH LIMITATIONS;
- NEEDS REVISION;
- REJECTED.

The default is rejection when evidence, ownership, or architecture impact is
unclear.

## 9. Freeze Declaration

**DOCUMENTATION FREEZE v1 DECLARED.**

**ARCHITECTURE FREEZE v1 DECLARED.**

**ENGINEERING FREEZE v1 DECLARED.**

**PRODUCT FREEZE v1 DECLARED.**

Future work may proceed into Product Construction Phase under this policy.
