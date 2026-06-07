export interface LiquidityMapZone {
  label: string
  probability: number
  type: "MAGNET" | "SWEEP" | "VACUUM"
  direction: "UP" | "DOWN"
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildLiquidityMap({
  buyPressure = 38,
  sellPressure = 62,
  cvd = 0,
}: {
  buyPressure?: number
  sellPressure?: number
  cvd?: number
} = {}): LiquidityMapZone[] {
  const buy = Number.isFinite(buyPressure) ? buyPressure : 38
  const sell = Number.isFinite(sellPressure) ? sellPressure : 62
  const cvdValue = Number.isFinite(cvd) ? cvd : 0

  const upsideMagnet = clamp(42 + buy * 0.45 + Math.max(0, cvdValue) * 0.015)
  const downsideSweep = clamp(38 + sell * 0.48 + Math.max(0, -cvdValue) * 0.015)
  const vacuum = clamp(28 + Math.abs(buy - sell) * 0.7)

  return [
    {
      label: "Upper liquidity cluster",
      probability: upsideMagnet,
      type: "MAGNET",
      direction: "UP",
    },
    {
      label: "Local downside sweep",
      probability: downsideSweep,
      type: "SWEEP",
      direction: "DOWN",
    },
    {
      label: "Liquidity vacuum zone",
      probability: vacuum,
      type: "VACUUM",
      direction: buy >= sell ? "UP" : "DOWN",
    },
  ]
}
