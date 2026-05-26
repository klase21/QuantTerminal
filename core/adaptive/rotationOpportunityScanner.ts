export interface RotationOpportunity {
  from: string
  to: string
  probability: number
  eta: string
  reason: string
}

export function scanRotationOpportunities(): RotationOpportunity[] {
  return [
    {
      from: "AI",
      to: "RWA",
      probability: 81,
      eta: "15~40m",
      reason: "AI saturation rising while RWA acceleration and validation improve.",
    },
    {
      from: "L1",
      to: "BTC",
      probability: 68,
      eta: "30~90m",
      reason: "Defensive migration possible if execution pressure persists.",
    },
  ]
}
