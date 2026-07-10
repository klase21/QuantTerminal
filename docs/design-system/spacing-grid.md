# Spacing and Grid

**Owner:** Product Design  
**Status:** Canonical

## Spacing Scale

Spacing uses a finite, named scale for inline gaps, stacked content, control
insets, card insets, section separation, and page layout. Semantic spacing
tokens express purpose; components do not invent local scales.

## Grid Philosophy

The grid supports comparison, hierarchy, and stable scanning. It adapts the
number and width of tracks to content priority rather than shrinking every
panel equally.

## Containers

- Reading containers constrain prose and research narratives.
- Working containers maximize useful analysis space.
- Wide workspaces support comparison and multi-panel workflows.
- Full-width bands group page-level information without becoming floating cards.

## Panels and Cards

Panels organize working regions. Cards represent individual repeated objects or
genuinely framed tools. Cards are not nested inside cards, and page sections are
not styled as decorative floating cards.

## Alignment

Align related labels, numbers, axes, timestamps, and actions. Stable component
dimensions prevent content and state changes from shifting the surrounding
layout.

## Whitespace

Whitespace separates meaning. It is increased around major hierarchy changes
and reduced within related professional data clusters. Empty space must not be
used to hide a weak information hierarchy.

## Density Modes

| Mode | Purpose |
| --- | --- |
| Comfortable | Orientation, beginner workflows, touch use, and narrative reading |
| Standard | Default product balance |
| Compact | Professional scanning and comparison |

Density changes spacing and presentation, not content truth, required states,
touch accessibility, or evidence transparency.

