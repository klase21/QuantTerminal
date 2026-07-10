# Responsive System

**Owner:** Product Design  
**Status:** Canonical

## Philosophy

Responsiveness preserves information priority and usable interaction across
contexts. It is not a uniform scale-down of desktop density.

## Contexts

| Context | Primary behavior |
| --- | --- |
| Mobile | Orientation, alerts, evidence review, light investigation, clear continuation paths |
| Tablet | Focused analysis, paired panels where space permits, touch-first control |
| Laptop | Full primary workflows with controlled density and collapsible secondary regions |
| Desktop | Professional comparison, persistent context, keyboard productivity |
| Wide Workspace | Multi-panel analysis with constrained reading widths and stable synchronization |
| Multi-Monitor | Deliberate detached contexts, explicit synchronization, visible active scope |

Breakpoints are semantic layout transitions, not device assumptions. Canonical
breakpoint tokens describe when content can no longer preserve hierarchy.

## Adaptive Panels

Panels may stack, collapse, become tabs, move into drawers, or defer loading.
Primary state, evidence quality, warnings, and navigation remain visible.
Secondary detail may move deeper but must stay discoverable.

## Priority Rules

1. Preserve the screen's primary question.
2. Preserve evidence state and source transparency.
3. Preserve critical actions and return paths.
4. Preserve readable charts and controls.
5. Defer optional density and heavy datasets.

## Content Fit

Text does not overlap or clip controls. Fixed-format tools use stable responsive
constraints. Long labels wrap or adapt without resizing neighboring controls.
Charts maintain a meaningful inspection area or switch to a suitable compact
representation.

## Workspace Continuity

Context such as symbol, time window, selected evidence, and filters survives
layout transitions. Multi-panel layouts become sequenced views rather than
discarding context on smaller screens.

