# Accessibility

**Owner:** Product Design and Accessibility Review  
**Status:** Canonical, non-optional

## Principles

Accessibility is part of product correctness. Professional density, visual
polish, and real-time behavior do not excuse inaccessible content.

## Contrast

Text, icons, controls, focus indicators, charts, and status boundaries must meet
the project's adopted accessibility standard. Muted content remains readable;
disabled content remains distinguishable.

## Keyboard Navigation

All core workflows support logical keyboard order. Users can reach navigation,
search, filters, tabs, cards, tables, charts with interactive detail, dialogs,
drawers, and primary actions without pointer dependence.

## Focus States

Focus is always visible, never removed for aesthetic reasons, and remains
obvious on every surface and status color. Opening an overlay moves focus into
it; closing returns focus to the invoking control.

## Screen Readers

- Landmarks and headings reflect visual hierarchy.
- Controls have stable accessible names.
- Data visualizations include meaningful summaries or structured alternatives.
- Live updates are announced selectively and do not create constant noise.
- Source, freshness, limitations, and state are available in reading order.

## Reduced Motion

Respect user motion preferences. Remove decorative transitions and replace
animated meaning with static indicators while preserving progress and focus.

## Color Independence

Every state uses at least one non-color cue: text, icon, pattern, position, or
shape. Positive and negative market movement remain distinguishable for common
color-vision differences.

## Touch Targets

Interactive targets are large enough for reliable touch and maintain separation
from destructive or conflicting actions. Compact density does not reduce targets
below accessible use.

## Content and Failure Accessibility

`NO DATA`, `UNAVAILABLE`, `STALE`, `PARTIAL`, `OFFLINE`, and `ERROR` are plain
language states with reasons and, when possible, a safe next action. Loading is
bounded and never traps users in an unexplained state.

## Review

Accessibility review covers keyboard flow, reading order, names, contrast,
zoom, responsive reflow, reduced motion, chart alternatives, and every state in
the canonical state model.

