export interface CompressedOpportunity {
  id: string
  title: string
  action: string
  score: number
  timing: string
  blocker: string
}

export function buildCompressedOpportunities(): CompressedOpportunity[] {
  return [
    {
      id: "rwa-pullback",
      title: "RWA pullback long",
      action: "Wait for absorption + buy imbalance",
      score: 82,
      timing: "10~25m",
      blocker: "Sell pressure still active",
    },
    {
      id: "ai-to-rwa",
      title: "AI → RWA rotation",
      action: "Track continuation route",
      score: 78,
      timing: "15~40m",
      blocker: "AI narrative saturation",
    },
    {
      id: "btc-defense",
      title: "BTC defensive migration",
      action: "Watch if ETH beta weakens",
      score: 66,
      timing: "30~90m",
      blocker: "Needs stronger risk-off confirmation",
    },
  ].sort((a, b) => b.score - a.score)
}
