export type SignalPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type SignalType = "EXECUTION" | "ROTATION" | "LIQUIDITY" | "NARRATIVE" | "RISK"

export interface InspectorSignal {
  id: string
  type: SignalType
  title: string
  priority: SignalPriority
  score: number
  confidence: number
  status: "ACTIVE" | "WATCH" | "INVALIDATING"
  reason: string
  action: string
}

const priorityRank: Record<SignalPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export function buildSignalPriorityQueue({
  sellPressure = 64,
  buyPressure = 36,
  rotationScore = 78,
  liquidityMagnet = 72,
  contradictionPenalty = 16,
}: {
  sellPressure?: number
  buyPressure?: number
  rotationScore?: number
  liquidityMagnet?: number
  contradictionPenalty?: number
} = {}): InspectorSignal[] {
  const signals: InspectorSignal[] = [
    {
      id: "execution-sell-pressure",
      type: "EXECUTION",
      title: sellPressure > buyPressure ? "Sell pressure active" : "Buy pressure recovering",
      priority: sellPressure > 68 ? "HIGH" : "MEDIUM",
      score: Math.round(Math.max(sellPressure, buyPressure)),
      confidence: sellPressure > buyPressure ? 74 : 66,
      status: sellPressure > 68 ? "ACTIVE" : "WATCH",
      reason:
        sellPressure > buyPressure
          ? "Market orders remain sell-heavy. Avoid chasing long entries until pressure fades."
          : "Buy pressure is improving. Watch for delta confirmation.",
      action: sellPressure > buyPressure ? "Wait for absorption or CVD recovery." : "Prepare pullback long trigger.",
    },
    {
      id: "rotation-rwa",
      type: "ROTATION",
      title: "AI → RWA rotation candidate",
      priority: rotationScore > 75 ? "HIGH" : "MEDIUM",
      score: rotationScore,
      confidence: 81,
      status: "ACTIVE",
      reason: "Rotation acceleration remains constructive while RWA validation improves.",
      action: "Track RWA continuation after execution confirmation.",
    },
    {
      id: "liquidity-magnet",
      type: "LIQUIDITY",
      title: "Liquidity magnet nearby",
      priority: liquidityMagnet > 70 ? "HIGH" : "MEDIUM",
      score: liquidityMagnet,
      confidence: 76,
      status: "WATCH",
      reason: "Price may be pulled toward nearby liquidity before clean continuation.",
      action: "Do not over-size before sweep/absorption behavior is visible.",
    },
    {
      id: "contradiction-penalty",
      type: "RISK",
      title: "Contradiction penalty elevated",
      priority: contradictionPenalty > 18 ? "CRITICAL" : contradictionPenalty > 10 ? "HIGH" : "LOW",
      score: contradictionPenalty,
      confidence: 72,
      status: contradictionPenalty > 10 ? "INVALIDATING" : "WATCH",
      reason: "Rotation and execution signals are not fully aligned yet.",
      action: "Reduce conviction until flow and rotation agree.",
    },
  ]

  return signals.sort((a, b) => {
    const byPriority = priorityRank[b.priority] - priorityRank[a.priority]
    if (byPriority !== 0) return byPriority
    return b.score - a.score
  })
}

export function buildOneGlanceDecision(signals: InspectorSignal[]) {
  const critical = signals.some((signal) => signal.priority === "CRITICAL")
  const invalidating = signals.filter((signal) => signal.status === "INVALIDATING").length
  const activeHigh = signals.filter((signal) => signal.priority === "HIGH" && signal.status === "ACTIVE").length
  const avgConfidence = Math.round(
    signals.reduce((sum, signal) => sum + signal.confidence, 0) / Math.max(1, signals.length)
  )

  if (critical || invalidating >= 2) {
    return {
      bias: "DEFENSIVE",
      action: "WAIT / REDUCE SIZE",
      confidence: Math.max(45, avgConfidence - 12),
      explanation: "Contradictions are too high for aggressive execution.",
    }
  }

  if (activeHigh >= 2 && avgConfidence > 72) {
    return {
      bias: "TACTICAL LONG WATCH",
      action: "WAIT FOR TRIGGER",
      confidence: avgConfidence,
      explanation: "Rotation is constructive, but execution confirmation is still required.",
    }
  }

  return {
    bias: "OBSERVE",
    action: "NO TRADE YET",
    confidence: avgConfidence,
    explanation: "Signals are mixed. Let the next flow impulse decide.",
  }
}
