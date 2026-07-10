# QuantTerminal Design System

**Status:** Canonical design-system foundation  
**Version:** v1.0  
**Owner:** Product Design, with Engineering and Accessibility review  
**Scope:** Visual language, interaction language, component contracts, accessibility, and implementation conventions

## Mission

The QuantTerminal Design System turns the product constitution and certified
product architecture into a coherent, reusable interface language. It helps
every surface communicate evidence, uncertainty, hierarchy, and action with the
same meaning.

## Vision

Every QuantTerminal experience should feel like one trustworthy intelligence
workspace: fast to scan, honest about data quality, capable of professional
depth, and usable without requiring users to learn each screen again.

## Ownership

| Concern | Canonical owner |
| --- | --- |
| Mission and enduring principles | `MASTER_PLAN.md` |
| System boundaries and data ownership | `MASTER_ARCHITECTURE.md` |
| Engineering governance | `MASTER_ENGINEERING.md` |
| Product experience and hierarchy | `MASTER_PRODUCT.md` |
| Screen purpose and information placement | Information Architecture and Blueprints |
| Visual, interaction, state, and component language | Design System |
| Product facts and evidence provenance | Repository and Evidence layers |

The Design System may express upstream rules but may not redefine them.

## Dependencies

- The five MASTER documents.
- Product Pattern Intelligence Library and Design DNA.
- Master Information Architecture.
- Product Blueprint Pack and Product Architecture Certification.
- Canonical Architecture Diagram Pack.

## Scope

The system defines semantic tokens, typography roles, layout rules, motion,
icons, accessibility, responsive behavior, reusable components, interaction
patterns, component states, AI implementation contracts, and governance.

It does not define product facts, screen ownership, provider behavior, business
logic, runtime behavior, framework code, or brand asset production.

## Governance

Changes must preserve evidence before reasoning, explicit unavailability,
human decision authority, progressive disclosure, and responsiveness.

| Change | Minimum review |
| --- | --- |
| Editorial clarification | Design owner |
| New component variant | Design and component owner |
| Token category or state change | Design, accessibility, and engineering |
| New interaction pattern | Product, design, accessibility, and engineering |
| Architecture or ownership change | MASTER review, ADR, and diagram review |

## Review Process

1. Confirm the product problem and owning blueprint.
2. Check for an existing token, component, or pattern.
3. Review accessibility and all canonical states.
4. Review responsive and density behavior.
5. Validate terminology and ownership against MASTER documents.
6. Record the decision and version impact.

## Versioning

- Major: breaking semantic or component-contract change.
- Minor: additive token, component, state, or pattern.
- Patch: clarification with no contract change.

Deprecated contracts remain documented through a migration window. Canonical
names are never silently repurposed.

## Canonical Reading Order

`DESIGN_SYSTEM.md` -> `design-principles.md` -> `design-tokens.md` -> visual
foundations -> `component-library.md` -> `interaction-patterns.md` ->
`state-model.md` -> `ai-component-contract.md` ->
`implementation-guidelines.md`.

