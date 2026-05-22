# Regime Lab Decommission Notes

Regime Lab is no longer exposed as a primary workspace tab.

## What changed

- Removed `Regime Lab` from `ExecutionWorkspace` tab list.
- Promoted product-ready surfaces into dedicated tabs:
  - `Signals`: Signal Inbox, Signal Quality, Saved Views, Watchlists.
  - `Research`: Replay controls, case-study generator, rotation replay view.
  - `Diagnostics`: Connector health, Upbit DataLab status, coverage audit.
- Kept `components/experimental/RegimeLab.tsx` in the repository as an archive/dev-only reference.
- Reduced redundancy by moving Phase 13/14 productization out of the Narrative surface.

## Current workspace model

```txt
Main Surface
- Command
- Narrative

Execution Workspace
- Charts
- Order Flow
- Realtime Intel
- Signals
- Research
- Diagnostics
- Liquidity

Dev Archive
- components/experimental/RegimeLab.tsx
```

## Next cleanup candidates

- Move remaining helper logic out of large UI files.
- Add a dev-only feature flag if Regime Lab needs to be mounted again.
- Consolidate duplicate polling of `/api/market/sector-rotation` into a shared client hook.
