import {
  buildTacticalIntelligenceBrain,
  type DirectionalBias,
  type AggressionLevel,
  type TacticalOpportunity,
  type TacticalVerdictInput,
} from "./tacticalVerdictEngine"

export type TacticalOpportunityCandidate = {
  symbol: string
  label?: string
  scores: TacticalVerdictInput
}

export type TacticalOpportunityRoute = {
  id: string
  symbol: string
  label: string
  category: TacticalOpportunity["category"]
  priority: "HIGH" | "MEDIUM" | "LOW"
  directionalBias: DirectionalBias
  aggression: AggressionLevel
  verdict: string
  confidence: number
  focus: string
  reason: string
  executionImpact: string
  avoidIf: string
}

export type TacticalOpportunityRouterState = {
  primaryRoute: TacticalOpportunityRoute
  routes: TacticalOpportunityRoute[]
  categories: TacticalOpportunity["category"][]
  marketMode: "OPPORTUNITY ACTIVE" | "SELECTIVE ONLY" | "NO CLEAN EDGE"
  summary: string
}

const defaultCandidates: TacticalOpportunityCandidate[] = [
  {
    symbol: "BTCUSDT",
    label: "BTC",
    scores: {
      trendScore: 58,
      momentumScore: 54,
      executionScore: 53,
      liquidityScore: 68,
      volatilityScore: 46,
      flowScore: 55,
      rotationScore: 48,
      liquidationPressure: 44,
      fundingPressure: 38,
      macroRiskScore: 48,
    },
  },
  {
    symbol: "ETHUSDT",
    label: "ETH",
    scores: {
      trendScore: 52,
      momentumScore: 48,
      executionScore: 46,
      liquidityScore: 54,
      volatilityScore: 52,
      flowScore: 47,
      rotationScore: 50,
      liquidationPressure: 58,
      fundingPressure: 44,
      macroRiskScore: 50,
    },
  },
  {
    symbol: "SOLUSDT",
    label: "SOL",
    scores: {
      trendScore: 66,
      momentumScore: 64,
      executionScore: 61,
      liquidityScore: 57,
      volatilityScore: 56,
      flowScore: 66,
      rotationScore: 63,
      liquidationPressure: 48,
      fundingPressure: 46,
      macroRiskScore: 42,
    },
  },
  {
    symbol: "RNDRUSDT",
    label: "AI Beta",
    scores: {
      trendScore: 61,
      momentumScore: 42,
      executionScore: 44,
      liquidityScore: 41,
      volatilityScore: 72,
      flowScore: 46,
      rotationScore: 54,
      liquidationPressure: 62,
      fundingPressure: 64,
      macroRiskScore: 52,
    },
  },
  {
    symbol: "ONDOUSDT",
    label: "RWA Leader",
    scores: {
      trendScore: 70,
      momentumScore: 67,
      executionScore: 63,
      liquidityScore: 58,
      volatilityScore: 51,
      flowScore: 69,
      rotationScore: 72,
      liquidationPressure: 39,
      fundingPressure: 42,
      macroRiskScore: 44,
    },
  },
]

function priorityWeight(priority: TacticalOpportunityRoute["priority"]) {
  if (priority === "HIGH") return 3
  if (priority === "MEDIUM") return 2
  return 1
}

function buildAvoidIf(route: ReturnType<typeof buildTacticalIntelligenceBrain>) {
  if (route.directionalBias === "LONG BIAS") {
    return "Avoid if pullback fails to reclaim bid support or flow turns negative."
  }

  if (route.directionalBias === "SHORT BIAS") {
    return "Avoid if breakdown fails and price reclaims the failed support zone."
  }

  if (route.directionalBias === "TWO-WAY") {
    return "Avoid mid-range entries; only react near range extremes or sweep zones."
  }

  return "Avoid until execution quality and directional structure improve."
}

function toRoute(candidate: TacticalOpportunityCandidate): TacticalOpportunityRoute {
  const read = buildTacticalIntelligenceBrain(candidate.scores)
  const id = `${candidate.symbol}-${read.opportunity.category.replace(/\s+/g, "-").toLowerCase()}`

  return {
    id,
    symbol: candidate.symbol,
    label: candidate.label ?? candidate.symbol,
    category: read.opportunity.category,
    priority: read.opportunity.priority,
    directionalBias: read.directionalBias,
    aggression: read.aggression,
    verdict: read.verdict,
    confidence: read.confidence,
    focus: read.opportunity.focus,
    reason: read.timeframeRead.summary,
    executionImpact: read.narrative.executionImpact,
    avoidIf: buildAvoidIf(read),
  }
}

export function buildTacticalOpportunityRouter(
  candidates: TacticalOpportunityCandidate[] = defaultCandidates,
): TacticalOpportunityRouterState {
  const routes = candidates
    .map(toRoute)
    .sort((a, b) => {
      const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority)
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })

  const primaryRoute = routes[0] ?? toRoute(defaultCandidates[0])
  const categories = Array.from(new Set(routes.map((route) => route.category)))

  const highCount = routes.filter((route) => route.priority === "HIGH").length
  const noEdgeCount = routes.filter((route) => route.category === "No Clean Setup").length

  const marketMode =
    highCount > 0
      ? "OPPORTUNITY ACTIVE"
      : noEdgeCount >= Math.max(1, Math.floor(routes.length * 0.5))
        ? "NO CLEAN EDGE"
        : "SELECTIVE ONLY"

  const summary =
    marketMode === "OPPORTUNITY ACTIVE"
      ? `${primaryRoute.label} is the current highest-priority tactical route. Focus on ${primaryRoute.category.toLowerCase()} setups.`
      : marketMode === "SELECTIVE ONLY"
        ? "There are selective opportunities, but execution confirmation matters more than chasing direction."
        : "No clean tactical edge across the current opportunity set."

  return {
    primaryRoute,
    routes,
    categories,
    marketMode,
    summary,
  }
}
