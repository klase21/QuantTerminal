# Execution Intelligence Layer

Implemented on top of the dual-sided Trade Flow panel.

## Added

- Execution score derived from pressure gap, trade intensity, and delta magnitude.
- Tactical action state:
  - LONG SCALP SETUP
  - SHORT SCALP SETUP
  - ABSORPTION WATCH
  - WAIT / NO EDGE
  - WAIT FOR CONFIRM
- Trigger Stack with dynamic confirmation conditions.
- Universe Link readout connecting execution flow to narrative/rotation validation.
- Risk / Invalidation note for high-speed tape and absorption conditions.

## Main file changed

- `components/right-panel/FlowPanel.tsx`

## Build note

The package dependencies are not installed in this packaged source folder, so a local build should be run after `npm install`.
