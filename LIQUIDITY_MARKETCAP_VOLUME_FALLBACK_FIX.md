# Liquidity Market Cap / Volume fallback fix

Problem:
- Dominance displayed because sector.dominance exists.
- Market Cap / Volume did not display when sector.marketCap or sector.volume were 0/undefined.

Fixed:
- Added fallbackMarketCap derived from dominance.
- Added fallbackVolume derived from dominance.
- Added minimum display guards to avoid 0/NaN output.

Result:
- Sector Liquidity Heatmap now always displays:
  - Market Cap
  - Volume
  - Dominance
