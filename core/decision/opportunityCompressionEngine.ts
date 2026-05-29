export type OpportunityActionState = "ENTER" | "WATCH" | "WAIT" | "AVOID"
export type OpportunityGrade = "A+" | "A" | "B" | "C"
export type OpportunityLifetime = "FRESH" | "DEVELOPING" | "LATE" | "EXHAUSTED"

export interface CompressedOpportunity {
  id: string
  title: string
  action: OpportunityActionState
  execution: string
  score: number
  grade: OpportunityGrade
  lifetime: OpportunityLifetime
  timing: string
  trigger: string
  invalidation: string
  blocker: string
  catalyst: string
  hidden?: boolean
}

function grade(score: number): OpportunityGrade {
  if (score >= 86) return "A+"
  if (score >= 74) return "A"
  if (score >= 58) return "B"
  return "C"
}

export function buildCompressedOpportunities(): CompressedOpportunity[] {
  const opportunities: Omit<CompressedOpportunity, "grade" | "hidden">[] = [
    {
      id: "rotation-leader-pullback",
      title: "Rotation leader pullback",
      action: "WATCH",
      execution: "Wait for pullback hold, then enter only if flow confirms.",
      score: 82,
      lifetime: "DEVELOPING",
      timing: "10~30m",
      trigger: "Leader holds higher-low + buy pressure flips positive",
      invalidation: "Sector leader loses relative strength",
      blocker: "Pullback confirmation not complete",
      catalyst: "Rotation heat remains active but entry is not clean yet",
    },
    {
      id: "squeeze-breakout",
      title: "Compression breakout trigger",
      action: "WAIT",
      execution: "No front-run. React only after expansion confirms.",
      score: 74,
      lifetime: "FRESH",
      timing: "Next expansion break",
      trigger: "Range break + volume expansion + no immediate rejection",
      invalidation: "Breakout wick rejects back into range",
      blocker: "Direction not confirmed",
      catalyst: "Volatility compression can create clean asymmetric move",
    },
    {
      id: "btc-defensive-migration",
      title: "BTC defensive migration",
      action: "WAIT",
      execution: "Use as risk filter, not a standalone trade.",
      score: 61,
      lifetime: "LATE",
      timing: "30~90m",
      trigger: "Alt beta weakens while BTC dominance strengthens",
      invalidation: "Alts recover breadth with spot support",
      blocker: "Needs stronger risk-off confirmation",
      catalyst: "Defensive flow may suppress alt continuation",
    },
    {
      id: "late-momentum-chase",
      title: "Late momentum chase",
      action: "AVOID",
      execution: "Hidden from default unless user opens details.",
      score: 43,
      lifetime: "EXHAUSTED",
      timing: "No clean timing",
      trigger: "None",
      invalidation: "Already invalid due to chase risk",
      blocker: "Expansion looks late and liquidity risk is high",
      catalyst: "Headline heat without clean execution quality",
    },
  ]

  return opportunities
    .map((item) => ({ ...item, grade: grade(item.score), hidden: item.score < 55 || item.action === "AVOID" }))
    .sort((a, b) => b.score - a.score)
}
