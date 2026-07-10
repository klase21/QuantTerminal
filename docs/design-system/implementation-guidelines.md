# Implementation Guidelines

**Owner:** Frontend Engineering with Design System Governance  
**Status:** Canonical, technology-neutral

## Purpose

These guidelines translate Design System contracts into maintainable product
implementation without prescribing a framework, styling system, or package.

## Naming

- Use product language from MASTER_PRODUCT and Information Architecture.
- Component names represent stable product concepts, not page accidents.
- Variants describe semantic role or behavior, not literal appearance.
- Events describe completed user intent or state change.
- State names match the canonical state model exactly.

## Folder Structure

Organize reusable implementation by ownership: foundations, atoms, molecules,
organisms, templates, and screen composition. Tests, examples, and contracts
remain discoverable beside or through the component's canonical entry point.
Page-local code does not masquerade as a reusable system component.

## Component Ownership

Every component has one owner responsible for contract, accessibility,
versioning, and migration. Screen teams own composition and content priority,
not shared component semantics.

## Reuse Rules

1. Reuse an existing canonical component when the product object and behavior
   match.
2. Add a documented variant when semantics are shared but presentation needs a
   bounded difference.
3. Compose existing components when the need is structural.
4. Propose a new component only after the admission test passes.
5. Never fork a component to bypass review.

## Composition Rules

- Data enters through explicit inputs.
- User actions leave through explicit events.
- Rendering does not perform hidden persistence, provider calls, reasoning, or
  business interpretation.
- Facts, evidence, reasoning, and preferences remain distinct.
- Optional heavy content loads independently and fails locally.
- Cards are not nested inside cards.
- Page ownership follows certified blueprints.

## Implementation Conventions

- Consume semantic or component tokens rather than raw visual values.
- Preserve stable layout during loading and updates.
- Provide deterministic keys for stable information objects.
- Keep controls feature-complete across keyboard, touch, and pointer input.
- Use the approved icon system and accessible names.
- Preserve source, freshness, availability, and experimental status.
- Prefer graceful unavailability over blocking or fabricated fallback.

## Review Checklist

- [ ] Purpose and owner match a canonical blueprint.
- [ ] Existing components and variants were considered.
- [ ] Semantic tokens are used consistently.
- [ ] All canonical states are implemented.
- [ ] No missing value is replaced by a fabricated or neutral value.
- [ ] Keyboard, focus, screen-reader, contrast, motion, and touch behavior are reviewed.
- [ ] Mobile, tablet, laptop, desktop, and wide-workspace behavior are reviewed.
- [ ] Density changes preserve hierarchy and accessibility.
- [ ] Context and return paths are preserved.
- [ ] Optional or heavy content degrades locally.
- [ ] No hidden side effects or ownership expansion exists.
- [ ] Documentation and contract version are current.
- [ ] Independent validation has occurred.

## Migration Strategy

1. Inventory existing components and map them to canonical contracts.
2. Identify compatible, adaptable, and incompatible implementations.
3. Migrate high-reuse foundations and state behavior first.
4. Move screens incrementally, preserving existing behavior.
5. Deprecate superseded variants with an explicit replacement and window.
6. Remove deprecated contracts only after consumers are verified.

Migration must not become a visual rewrite that changes product behavior or
restores intentionally removed workflows.

## Versioning

Component contracts follow Design System versioning. Breaking changes require
migration guidance and consumer review. Additive variants require documented
states and accessibility. Clarifications must not silently change semantics.

## Validation

Validation is proportional to risk and covers contract conformance, visual
hierarchy, interaction, accessibility, responsive behavior, state behavior,
performance, and regression. Protected systems and architecture boundaries use
the stronger review requirements in MASTER_ENGINEERING.

