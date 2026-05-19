// ======================================================
// lib/macroCorrelation.ts
// MACRO / NEWS CORRELATION ENGINE
// ======================================================

export interface MacroNewsEvent {
  id: string
  title: string
  category:
    | "FED"
    | "CPI"
    | "PPI"
    | "DXY"
    | "YIELD"
    | "WAR"
    | "ETF"
    | "LIQUIDITY"
    | "REGULATION"

  sentiment: number // -1 ~ +1
  impact: number // 0 ~ 100
  timestamp: number
}

export interface CorrelationResult {
  score: number
  confidence: number
  pressure: "BULLISH" | "BEARISH" | "NEUTRAL"
  dominantCategory: string
}

export function calculateMacroCorrelation(
  events: MacroNewsEvent[]
): CorrelationResult {
  if (!events.length) {
    return {
      score: 0,
      confidence: 0,
      pressure: "NEUTRAL",
      dominantCategory: "NONE",
    }
  }

  const weighted = events.map((e) => ({
    ...e,
    weightedImpact: e.sentiment * e.impact,
  }))

  const total = weighted.reduce(
    (acc, cur) => acc + cur.weightedImpact,
    0
  )

  const avg = total / weighted.length

  const confidence =
    Math.min(
      100,
      weighted.reduce(
        (acc, cur) => acc + cur.impact,
        0
      ) / weighted.length
    )

  let pressure: CorrelationResult["pressure"] = "NEUTRAL"

  if (avg > 15) pressure = "BULLISH"
  else if (avg < -15) pressure = "BEARISH"

  const categoryMap: Record<string, number> = {}

  weighted.forEach((e) => {
    categoryMap[e.category] =
      (categoryMap[e.category] || 0) +
      Math.abs(e.weightedImpact)
  })

  const dominantCategory =
    Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "NONE"

  return {
    score: Number(avg.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    pressure,
    dominantCategory,
  }
}