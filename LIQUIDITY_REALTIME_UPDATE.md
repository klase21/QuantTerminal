# Liquidity realtime update

Applied without changing current Liquidity layout:
- Sector Capital Movement keeps same visual structure
- Smart Money Sector Flow keeps same visual structure
- Values now update from recent trades plus live pulse
- Dashboard passes trades into RotationSankeyGraph
- LiquidityRotationPanel now uses real trade notional fields:
  - price / p
  - qty / q / size
  - side / S / maker flag
- Progress bars and confidence numbers update every 2.5s
