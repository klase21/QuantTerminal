export interface DebateAgent {
  name: string
  stance: "BULL" | "BEAR" | "RISK"
  argument: string
  confidence: number
}

export function buildAIDebate() : DebateAgent[] {
  return [
    {
      name: "Bull Agent",
      stance: "BULL",
      argument:
        "Spot demand and cross-asset confirmation are stabilizing enough to support continuation.",
      confidence: 74,
    },
    {
      name: "Bear Agent",
      stance: "BEAR",
      argument:
        "Macro regime still contains fragile elements and perp enthusiasm remains elevated.",
      confidence: 67,
    },
    {
      name: "Risk Agent",
      stance: "RISK",
      argument:
        "Position sizing should remain reduced until spot confirmation fully dominates.",
      confidence: 82,
    },
  ]
}
