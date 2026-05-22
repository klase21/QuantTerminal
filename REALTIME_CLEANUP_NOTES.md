# Real-time Cleanup Pack

This pass is based on `QuantTerminal_english_intelligence_surface_v2`.

## What changed

- Removed the duplicate top-level `Command / Narrative` tab surface.
- Kept `LiveCommandSurface` as the single top command layer.
- Moved Narrative Intelligence into the Execution Workspace as a deep analysis tab.
- Optimized `/api/market/sector-rotation` so Binance 24h data is requested only for registry symbols via the `symbols` query instead of downloading all tickers.
- Kept all market fetches `cache: no-store` and dynamic to avoid Next.js data cache size errors.
- Increased the live command refresh cadence to 10 seconds.
- Added abortable, visibility-aware polling to avoid duplicate in-flight requests and unnecessary background work.
- Preserved equal-height behavior across the command cards so the event rail can grow naturally without clipping.

## Product direction

This pack intentionally reduces redundant surfaces rather than adding new panels. The main dashboard now prioritizes:

1. Live market state
2. Sector heat
3. Priority event rail
4. Deep narrative/signals/research in workspace tabs
