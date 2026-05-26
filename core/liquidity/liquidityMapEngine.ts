export interface LiquidityMapZone {
  label: string
  probability: number
  type: "MAGNET" | "SWEEP" | "VACUUM"
  direction: "UP" | "DOWN"
}

export function buildLiquidityMap() : LiquidityMapZone[] {
  return [
    {
      label: "Upper liquidity cluster",
      probability: 74,
      type: "MAGNET",
      direction: "UP",
    },
    {
      label: "Local downside sweep",
      probability: 61,
      type: "SWEEP",
      direction: "DOWN",
    },
    {
      label: "Liquidity vacuum zone",
      probability: 58,
      type: "VACUUM",
      direction: "UP",
    },
  ]
}
