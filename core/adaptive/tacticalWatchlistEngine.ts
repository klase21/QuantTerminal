export interface TacticalWatchItem {
  symbol: string
  status: "WATCH" | "ACTIVE" | "RISK"
  score: number
  reason: string
}

export function buildTacticalWatchlist(): TacticalWatchItem[] {
  return [
    {
      symbol: "RWA",
      status: "ACTIVE",
      score: 82,
      reason: "Rotation acceleration and regional narrative confirmation improving.",
    },
    {
      symbol: "AI",
      status: "WATCH",
      score: 74,
      reason: "Momentum remains strong but narrative saturation is rising.",
    },
    {
      symbol: "ETH",
      status: "RISK",
      score: 61,
      reason: "Execution pressure and ETH/BTC weakness remain tactical threats.",
    },
  ]
}
