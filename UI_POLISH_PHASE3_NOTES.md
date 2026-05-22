# UI Polish Phase 3

This pass focuses on reducing visual redundancy and improving the live terminal surface without changing the underlying data architecture.

## Changes

- Removed the duplicated heading wrapper around `LiveCommandSurface` in `TerminalSurfaceDeck`.
- Consolidated the top surface into three equal-height cards:
  - Market State
  - Sector Heat Radar
  - Live Event Rail
- Preserved Top 4 event density while avoiding fixed-height clipping and internal scrollbars.
- Added compact health/status badges for live, degraded, stale, and fallback states.
- Improved responsive behavior with a single-column mobile layout and three-column desktop layout.
- Kept detailed Narrative, Signals, Research, and Diagnostics views inside `ExecutionWorkspace` tabs.

## Principle

The main dashboard should surface only the current market state, top rotation, feed health, and priority events. Deep analysis stays in workspace tabs.
