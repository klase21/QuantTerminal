# Liquidity summary cards fallback fix

Fixed:
- Top summary cards used raw sectors, so values stayed 0:
  - Dominance
  - Whale Rotation
  - Rotation Activity
- Added enrichedSectors fallback model.
- Summary cards and heatmap now share the same enriched sector values.
- Fixed operator precedence bug:
  whaleSector?.volume || 0 / 1000000
  -> (whaleSector?.volume || 0) / 1000000

Result:
- Dominance, Whale Rotation, and Rotation Activity no longer show 0 values when source sector data is empty.
