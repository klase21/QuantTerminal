export interface SignalContradiction {
  label: string
  severity: number
  penalty: number
  explanation: string
}

export interface ContradictionResult {
  contradictionScore: number
  penalty: number
  contradictions: SignalContradiction[]
}

export function detectSignalContradictions({
  rotationScore,
  cvd,
  sellPressure,
  whaleConfidence,
  funding,
}: {
  rotationScore: number
  cvd: number
  sellPressure: number
  whaleConfidence: number
  funding: number
}): ContradictionResult {
  const contradictions: SignalContradiction[] = []

  if (rotationScore > 70 && cvd < -1) {
    contradictions.push({
      label: "Bullish rotation vs negative CVD",
      severity: 78,
      penalty: 9,
      explanation: "Rotation strength exists, but execution tape is not confirming yet.",
    })
  }

  if (whaleConfidence > 70 && sellPressure > 65) {
    contradictions.push({
      label: "Whale validation vs active selling",
      severity: 72,
      penalty: 7,
      explanation: "Smart money signal is constructive, but market orders remain sell-heavy.",
    })
  }

  if (funding > 0.04 && rotationScore > 75) {
    contradictions.push({
      label: "Positive rotation with crowded funding",
      severity: 64,
      penalty: 5,
      explanation: "Momentum can continue, but crowded perp positioning increases pullback risk.",
    })
  }

  const contradictionScore = Math.min(100, contradictions.reduce((sum, item) => sum + item.severity, 0) / Math.max(1, contradictions.length))
  const penalty = contradictions.reduce((sum, item) => sum + item.penalty, 0)

  return {
    contradictionScore: Math.round(contradictionScore),
    penalty,
    contradictions,
  }
}
