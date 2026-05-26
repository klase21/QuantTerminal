export interface TacticalAlert {
  id: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  title: string
  reason: string
  action: string
  confidence: number
}

export function buildTacticalAlerts() : TacticalAlert[] {
  return [
    {
      id: "alert-1",
      severity: "HIGH",
      title: "ETH breakout quality improving",
      reason:
        "Spot confirmation strengthened while perp divergence compressed and liquidity stress eased.",
      action: "Allow conditional continuation longs after execution confirmation.",
      confidence: 78,
    },
    {
      id: "alert-2",
      severity: "MEDIUM",
      title: "Perp enthusiasm rising",
      reason:
        "Futures aggression increased faster than spot demand.",
      action: "Avoid chasing vertical moves without spot follow-through.",
      confidence: 71,
    },
    {
      id: "alert-3",
      severity: "LOW",
      title: "Macro pressure stabilizing",
      reason:
        "DXY and liquidity stress are no longer expanding aggressively.",
      action: "Risk conditions improving, but not fully risk-on yet.",
      confidence: 63,
    },
  ]
}
