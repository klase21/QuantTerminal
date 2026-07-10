# Design Tokens

**Owner:** Product Design  
**Status:** Canonical semantic model  
**Constraint:** This document defines structure and intent, not implementation values.

## Purpose

Tokens provide stable semantic names between design intent and implementation.
Components consume semantic tokens rather than raw visual values.

## Naming Convention

Use the structure `domain.role.variant.state`.

- `domain` identifies color, space, type, radius, elevation, motion, border,
  opacity, transition, or breakpoint.
- `role` identifies meaning, never a literal appearance.
- `variant` distinguishes emphasis or context.
- `state` is included only when behavior changes.

Names remain technology-neutral. Literal names such as a hue, pixel count, or
device brand are not canonical semantic tokens.

## Token Families

| Family | Canonical roles |
| --- | --- |
| Color | content, action, status, evidence, reasoning, counter-evidence, repository, surface, border |
| Spacing | inline, stack, inset, section, layout, control |
| Radius | control, card, panel, overlay |
| Typography | display, heading, title, subtitle, body, caption, label, code, numeric |
| Elevation | base, raised, overlay, modal, critical |
| Motion | immediate, quick, standard, deliberate, progress |
| Border | subtle, default, strong, focus, status |
| Opacity | disabled, muted, scrim, overlay |
| Transition | color, transform, visibility, layout, progress |
| Breakpoint | mobile, tablet, laptop, desktop, wide-workspace |

## Layers

1. Primitive layer: controlled implementation values, maintained outside this
   conceptual contract.
2. Semantic layer: meaning such as `color.status.warning`.
3. Component layer: scoped aliases such as `button.primary.background.ready`.

Product code should consume semantic or component tokens. Primitive values must
not become public component contracts.

## State and Theme Rules

- State meaning remains stable across themes and density modes.
- Color is never the only state carrier.
- Dark and light expressions may differ visually but not semantically.
- Density may change spacing and typography application, not information truth.
- Accessibility overrides take precedence over aesthetic variants.

## Governance

Add a token only when an existing semantic role cannot express the need.
Renaming requires migration guidance. Deleting requires proof that no canonical
component contract depends on it.

