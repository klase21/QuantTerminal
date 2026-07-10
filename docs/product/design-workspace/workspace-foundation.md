# Design Workspace Foundation

**Status:** Canonical  
**Version:** v1.0  
**Owner:** Product Design  
**Scope:** Design-artifact organization and governance; no product redesign or implementation

## Purpose

The Design Workspace is the controlled environment where QuantTerminal's
MASTER documents, Information Architecture, Blueprints, and Design System are
translated into reviewable screen specifications and prototypes.

It is distinct from the product Workspace described by PDGM-109. The Design
Workspace organizes design work; the product Workspace preserves user context.

## Workspace Philosophy

- Architecture precedes layout.
- Blueprints precede screen frames.
- Components precede page-specific invention.
- Evidence and unavailable states are designed before ideal ready states are approved.
- Responsive and accessible behavior are part of the initial design.
- Every artifact has one owner, one status, and a traceable upstream contract.
- Experiments remain visibly separate from canonical work.

## Page Organization

The design file uses stable numbered pages:

1. Cover and navigation.
2. Foundations and semantic tokens.
3. Components and contracts.
4. Templates and layouts.
5. Product screens.
6. Prototypes and flows.
7. Review and validation.
8. Archive.
9. Experiments.

Detailed page ownership is defined in `figma-project-structure.md`.

## Frame Organization

Each canonical screen group contains:

- a specification frame with blueprint and dependency references;
- default desktop composition;
- required responsive compositions;
- canonical state frames;
- interaction and prototype frames;
- accessibility annotations;
- review history and approval state.

Frames progress left to right from context to specification, states,
responsive behavior, interaction, and approved handoff. Loose, unlabeled frames
are not canonical.

## Naming Conventions

Use `domain / object / variant / state / viewport / version`.

Examples describe structure only:

- `screen / replay / default / ready / desktop / v1`
- `component / evidence-card / canonical / partial / standard / v1`
- `flow / scanner-to-trade / primary / reviewed / desktop / v1`

Canonical machine states remain uppercase in content: `UNAVAILABLE`, `STALE`,
`PARTIAL`, `EXPERIMENTAL`, `ERROR`. Artifact status uses `Draft`, `In Review`,
`Approved`, `Deprecated`, or `Archived`.

## Variants

Variants express semantic differences already authorized by the Design System:

- role;
- emphasis;
- density;
- interaction state;
- data availability state;
- responsive context.

Variants must not encode page-specific forks, fabricated evidence, or raw
visual values. A new variant requires a contract and consumer rationale.

## Components

Components follow the canonical Atomic Design hierarchy. Component sets mirror
the contract in `docs/design-system/component-library.md`. Screens compose
approved components and do not detach them to bypass governance.

Every component specification references its owner, version, required states,
accessibility behavior, related blueprint, and frontend mapping.

## Libraries

The workspace separates:

- Foundations: semantic tokens and visual roles.
- Components: approved reusable contracts.
- Templates: blueprint-aligned composition patterns.
- Assets: approved icons and future brand assets.

Published libraries contain approved artifacts only. Draft and experimental
work stays local to its designated page until review is complete.

## Review Workflow

```text
Blueprint confirmed
  -> Contract mapped
  -> Design drafted
  -> State and responsive review
  -> Accessibility review
  -> Product and engineering review
  -> Approved for handoff
  -> QA verification
  -> Canonical or revised
```

No designer or AI system approves its own work. Approval and implementation
status remain separate.

## Workspace Invariants

- No fabricated market values, confidence, timestamps, or source metadata.
- No hidden unavailable or error state.
- No historical workflow restoration on Dashboard.
- No heavy Replay reconstruction implied in interactive request paths.
- No detached component becomes canonical.
- No approved frame lacks an upstream blueprint and downstream QA path.

