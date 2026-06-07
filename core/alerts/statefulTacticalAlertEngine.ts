export type TacticalAlertStatus =
  | "NEW"
  | "ACTIVE"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"

export interface StatefulTacticalAlert {
  id: string
  priority: "INFO" | "TACTICAL" | "HIGH" | "CRITICAL"
  status: TacticalAlertStatus
  title: string
  why: string[]
  action: string
  invalidation: string
  confidence: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildStatefulTacticalAlerts({
  symbol = "BTCUSDT",
  buyPressure = 38,
  sellPressure = 62,
  fakeBreakoutRisk = 0,
  realDemandConfirmation = 0,
  absorptionScore = 0,
  tacticalState = "MIXED",
}: {
  symbol?: string
  buyPressure?: number
  sellPressure?: number
  fakeBreakoutRisk?: number
  realDemandConfirmation?: number
  absorptionScore?: number
  tacticalState?: string
} = {}): StatefulTacticalAlert[] {
  const alerts: StatefulTacticalAlert[] = []

  if (fakeBreakoutRisk >= 62) {
    alerts.push({
      id: "fake-breakout-command",
      priority: fakeBreakoutRisk >= 75 ? "CRITICAL" : "HIGH",
      status: "ACTIVE",
      title: `${symbol} breakout quality warning`,
      why: [
        "Perp/spot divergence is elevated.",
        "Breakout may be futures-driven.",
        "Spot confirmation is not strong enough for full sizing.",
      ],
      action: "Avoid chasing. Wait for retest or spot confirmation.",
      invalidation: "Risk invalidates if real demand confirmation rises above 70.",
      confidence: clamp(fakeBreakoutRisk),
    })
  }

  if (realDemandConfirmation >= 68 && buyPressure >= sellPressure - 8) {
    alerts.push({
      id: "continuation-command",
      priority: "HIGH",
      status: "NEW",
      title: `${symbol} continuation permission improving`,
      why: [
        "Real demand confirmation is improving.",
        "Execution flow is no longer strongly against continuation.",
        "Tactical state supports conditional participation.",
      ],
      action: "Allow pullback long only after execution confirmation.",
      invalidation: "Invalidate if sell pressure expands or spot confirmation fades.",
      confidence: clamp(realDemandConfirmation),
    })
  }

  if (absorptionScore >= 60) {
    alerts.push({
      id: "absorption-command",
      priority: "TACTICAL",
      status: "ACTIVE",
      title: `${symbol} absorption behavior detected`,
      why: [
        "Spot appears to absorb futures sell pressure.",
        "Downside follow-through may weaken.",
      ],
      action: "Watch for CVD recovery and failed breakdown.",
      invalidation: "Invalidate if spot absorption disappears and sell pressure accelerates.",
      confidence: clamp(absorptionScore),
    })
  }

  if (!alerts.length) {
    alerts.push({
      id: "wait-command",
      priority: "INFO",
      status: "ACTIVE",
      title: `${symbol} no high-priority command`,
      why: [
        `Current tactical state is ${tacticalState.replaceAll("_", " ")}.`,
        "Live conditions are not strong enough for aggressive action.",
      ],
      action: "Wait and keep size reduced.",
      invalidation: "Reassess when spot/futures or execution pressure shifts.",
      confidence: 58,
    })
  }

  return alerts
}
