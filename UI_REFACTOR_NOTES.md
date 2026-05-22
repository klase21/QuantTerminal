# UI Refactor Notes

## Goal

This pass turns the dashboard from a single large layout file into a clearer terminal shell:

- `TerminalSurfaceDeck` controls the top live surface.
- `ExecutionWorkspace` owns the main workspace tabs.
- `RightIntelligenceRail` owns the macro/right-side intelligence rail.
- `DashboardFrame` owns panel framing and collapse behavior.
- `DashboardLayout` now only wires data hooks, layout state, and shell components.

## UX changes

- The top intelligence area is now a tabbed surface deck:
  - `Command` for the live command surface.
  - `Narrative` for narrative/signal/productization surfaces.
- This prevents the top of the dashboard from becoming too tall.
- Regime Lab remains inside Execution Workspace as the experimental/deep research area.
- Main Dashboard remains minimally changed.

## Why this matters

Future UI work should go into these surfaces instead of bloating `DashboardLayout.tsx`:

- New top-level visual surface → `components/layout/TerminalSurfaceDeck.tsx`
- New workspace experiment → `components/layout/ExecutionWorkspace.tsx`
- New right-rail intelligence panel → existing right-panel system
- New core engine → `/core`

## Suggested commit

```bash
git add .
git commit -m "refactor: split dashboard into terminal UI surfaces"
```
