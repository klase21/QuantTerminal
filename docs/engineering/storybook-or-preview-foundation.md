# Isolated Component Preview Foundation

## Decision

R0 uses an internal component preview instead of Storybook. Storybook would require package and lockfile changes that are unnecessary for the audited P0 scope.

## Route

- Development URL: `/component-preview`
- Production behavior: `notFound()`
- Navigation: no production navigation entry
- Data: deterministic synthetic fixtures only
- Network: no external requests
- Persistence: no writes

## Gallery Organization

The gallery covers tokens, primitives, lifecycle states, availability states, evidence components, data display, and Repository handoff. It includes compact and expanded cards, long text, stale, partial, missing, unavailable, experimental, and error examples.

Responsive grids collapse to a single column at narrow widths. Foundation focus and reduced-motion rules are scoped by `data-qt-foundation`, so they do not alter existing pages.

## Limitation

This is a development harness, not Storybook and not production functionality. Hosted visual regression, accessibility certification, and cross-browser matrices remain future work.

