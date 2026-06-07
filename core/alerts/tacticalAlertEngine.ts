export interface TacticalAlert {
  id: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  title: string
  reason: string
  action: string
  confidence: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildTacticalAlerts({
  buyPressure = 38,
  sellPressure = 62,
  fakeBreakoutRisk = 0,
  realDemandConfirmation = 0,
  divergenceScore = 0,
}: {
  buyPressure?: number
  sellPressure?: number
  fakeBreakoutRisk?: number
  realDemandConfirmation?: number
  divergenceScore?: number
} = {}): TacticalAlert[] {
  const alerts: TacticalAlert[] = []

  if (realDemandConfirmation >= 65 && buyPressure >= sellPressure - 8) {
    alerts.push({
      id: "real-demand-confirmation",
      severity: "HIGH",
      title: "Real demand confirmation improving",
      reason: "Spot/futures confirmation and execution pressure are becoming supportive.",
      action: "Allow conditional continuation only after flow confirms.",
      confidence: clamp(realDemandConfirmation),
    })
  }

  if (fakeBreakoutRisk >= 55 || divergenceScore >= 55) {
    alerts.push({
      id: "fake-breakout-risk",
      severity: fakeBreakoutRisk >= 70 ? "HIGH" : "MEDIUM",
      title: "Perp-led breakout risk elevated",
      reason: "Futures aggression is outpacing spot confirmation.",
      action: "Avoid chasing vertical moves without spot follow-through.",
      confidence: clamp(Math.max(fakeBreakoutRisk, divergenceScore)),
    })
  }

  if (sellPressure > buyPressure + 18) {
    alerts.push({
      id: "sell-pressure-dominance",
      severity: "MEDIUM",
      title: "Sell pressure dominates execution flow",
      reason: "Live taker flow remains sell-heavy.",
      action: "Wait for absorption or CVD recovery before long exposure.",
      confidence: clamp(sellPressure),
    })
  }

  if (!alerts.length) {
    alerts.push({
      id: "mixed-state",
      severity: "LOW",
      title: "No high-conviction tactical alert",
      reason: "Live inputs are mixed and do not justify aggressive action.",
      action: "Keep size reduced and wait for cleaner confirmation.",
      confidence: 58,
    })
  }

  return alerts
}
