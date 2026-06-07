import type { FuturesIntelligenceResponse, SectorFuturesSnapshot } from "@/core/futuresTypes"
import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp, round } from "@/core/shared/metrics"
import type {
  CrossMarketDependency,
  CrossMarketNode,
  CrossMarketReflexivityRegime,
  CrossMarketReflexivitySurface,
  NarrativePropagationSurface,
  LiquidityStressSurface,
} from "./narrativeTypes"

function avg(values: number[]) {
  const filtered = values.filter(Number.isFinite)
  if (!filtered.length) return 0
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
}

function futuresMap(futures?: FuturesIntelligenceResponse | null) {
  return new Map((futures?.sectors ?? []).map((sector) => [sector.sector, sector]))
}

function nodeState(score: number, direction?: string, stress?: number): CrossMarketNode["state"] {
  if (stress && stress >= 78) return "STRESSED"
  if (score >= 76 || direction === "INFLOW") return "LEADING"
  if (score >= 58 || direction === "CHURN") return "EXPANDING"
  if (direction === "OUTFLOW" || score <= 28) return "WITHDRAWING"
  return "NEUTRAL"
}

function leverageScore(futures?: SectorFuturesSnapshot) {
  if (!futures) return 0
  return clamp(futures.crowdingScore * 0.42 + futures.leveragePressure * 0.34 + futures.convictionScore * 0.24)
}

function sectorNode(sector: SectorRotationSnapshot, futures?: SectorFuturesSnapshot, narrativeStress = 0): CrossMarketNode {
  const leverage = leverageScore(futures)
  const risk = clamp(
    sector.volatility * 0.2 +
      Math.max(0, 100 - sector.breadth) * 0.18 +
      leverage * 0.28 +
      narrativeStress * 0.18 +
      (sector.direction === "OUTFLOW" ? 16 : 0)
  )
  const score = clamp(
    sector.rotationScore * 0.34 +
      sector.confidence * 0.2 +
      sector.volumePressure * 0.14 +
      sector.breadth * 0.12 +
      leverage * 0.12 +
      sector.premiumBoost * 0.08
  )

  return {
    id: sector.sector,
    label: sector.sector,
    state: nodeState(score, sector.direction, risk),
    score: round(score),
    risk: round(risk),
    role: sector.rank <= 2 ? "Rotation Leader" : sector.direction === "OUTFLOW" ? "Risk Exit" : "Beta Sleeve",
    operatorRead: `${sector.sector} reflexivity is ${round(score, 0)} with ${round(risk, 0)} risk; ${sector.direction.toLowerCase()} flow is the active driver.`,
  }
}

function marketNodes(args: {
  rotation?: RealMarketRotationResponse | null
  futures?: FuturesIntelligenceResponse | null
  propagation?: NarrativePropagationSurface
  stress?: LiquidityStressSurface
}): CrossMarketNode[] {
  const sectors = args.rotation?.sectors ?? []
  const fmap = futuresMap(args.futures)
  const stressMap = new Map((args.stress?.sectors ?? []).map((sector) => [sector.sector, sector.stressScore]))

  const sectorNodes = sectors.slice(0, 7).map((sector) => sectorNode(sector, fmap.get(sector.sector), stressMap.get(sector.sector) ?? 0))
  const btcSector = sectors.find((sector) => sector.sector === "L1")
  const meme = sectors.find((sector) => sector.sector === "MEME")
  const ai = sectors.find((sector) => sector.sector === "AI")
  const avgFunding = avg((args.futures?.sectors ?? []).map((sector) => Math.abs(sector.avgFundingRate) * 100000))
  const futuresCrowding = avg((args.futures?.sectors ?? []).map((sector) => sector.crowdingScore))
  const stressScore = args.stress?.stressScore ?? 0
  const velocity = args.propagation?.velocityScore ?? 0

  const synthetic: CrossMarketNode[] = [
    {
      id: "BTC_BETA",
      label: "BTC Beta",
      state: nodeState(btcSector?.rotationScore ?? 44, btcSector?.direction, stressScore),
      score: round(btcSector?.rotationScore ?? 44),
      risk: round(stressScore * 0.42 + futuresCrowding * 0.24),
      role: "Market Anchor",
      operatorRead: "BTC beta anchors the risk regime and controls how fast capital can move into alt sleeves.",
    },
    {
      id: "LEVERAGE",
      label: "Leverage",
      state: futuresCrowding >= 72 || avgFunding >= 65 ? "STRESSED" : futuresCrowding >= 55 ? "EXPANDING" : "NEUTRAL",
      score: round(futuresCrowding),
      risk: round(clamp(futuresCrowding * 0.68 + avgFunding * 0.32)),
      role: "Derivatives Pressure",
      operatorRead: "Leverage node tracks OI crowding and funding pressure across mapped futures sectors.",
    },
    {
      id: "NARRATIVE",
      label: "Narrative",
      state: velocity >= 72 ? "LEADING" : velocity >= 55 ? "EXPANDING" : "NEUTRAL",
      score: round(velocity),
      risk: round(args.propagation?.stressScore ?? 0),
      role: "Attention Layer",
      operatorRead: "Narrative node measures propagation velocity and crowd synchronization.",
    },
  ]

  if (meme && ai) {
    synthetic.push({
      id: "BETA_ROTATION",
      label: "Beta Rotation",
      state: meme.rotationScore > ai.rotationScore + 8 ? "LEADING" : ai.rotationScore > meme.rotationScore + 8 ? "EXPANDING" : "NEUTRAL",
      score: round(clamp(Math.abs(meme.rotationScore - ai.rotationScore) + Math.max(meme.rotationScore, ai.rotationScore) * 0.58)),
      risk: round(clamp(meme.volatility * 0.28 + meme.confidence * 0.2 + futuresCrowding * 0.2)),
      role: "Alt Beta Flow",
      operatorRead: "Beta rotation compares speculative sleeves against persistent narrative sectors.",
    })
  }

  return [...synthetic, ...sectorNodes]
}

function dependencies(nodes: CrossMarketNode[]): CrossMarketDependency[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const deps: CrossMarketDependency[] = []
  const leverage = byId.get("LEVERAGE")
  const narrative = byId.get("NARRATIVE")
  const btc = byId.get("BTC_BETA")
  const beta = byId.get("BETA_ROTATION")

  const sectorNodes = nodes.filter((node) => !["LEVERAGE", "NARRATIVE", "BTC_BETA", "BETA_ROTATION"].includes(node.id)).slice(0, 5)

  for (const sector of sectorNodes) {
    if (narrative) {
      deps.push({
        from: "NARRATIVE",
        to: sector.id,
        strength: round(clamp(narrative.score * 0.38 + sector.score * 0.32 + Math.max(0, 100 - Math.abs(narrative.risk - sector.risk)) * 0.1)),
        type: sector.score >= 68 ? "REINFORCING" : "LAGGING",
        read: `${sector.label} is being pulled by narrative velocity with ${round(sector.score, 0)} reflexivity.`,
      })
    }
    if (leverage && leverage.risk >= 45) {
      deps.push({
        from: "LEVERAGE",
        to: sector.id,
        strength: round(clamp(leverage.risk * 0.42 + sector.risk * 0.38)),
        type: leverage.risk >= 72 || sector.risk >= 72 ? "STRESS" : "REINFORCING",
        read: `Derivatives pressure is amplifying ${sector.label} risk.`,
      })
    }
  }

  if (btc && beta) {
    deps.push({
      from: "BTC_BETA",
      to: "BETA_ROTATION",
      strength: round(clamp(btc.score * 0.32 + beta.score * 0.44)),
      type: beta.state === "LEADING" ? "REINFORCING" : "LAGGING",
      read: "BTC beta is shaping whether capital can migrate into high-beta alt sleeves.",
    })
  }

  return deps.sort((a, b) => b.strength - a.strength).slice(0, 10)
}

function betaRotationPath(sectors: SectorRotationSnapshot[]) {
  const leaders = sectors
    .filter((sector) => sector.direction !== "QUIET")
    .slice(0, 4)
    .map((sector) => sector.sector)
  return ["BTC", "ETH", ...leaders].filter((value, index, array) => array.indexOf(value) === index).slice(0, 6)
}

function classifyRegime(args: {
  reflexivityScore: number
  instabilityScore: number
  crowding: number
  liquidityStress?: LiquidityStressSurface
  top?: SectorRotationSnapshot
}): CrossMarketReflexivityRegime {
  const { reflexivityScore, instabilityScore, crowding, liquidityStress, top } = args
  if ((liquidityStress?.withdrawalRisk ?? 0) >= 70 || top?.direction === "OUTFLOW") return "DEFENSIVE_FEEDBACK"
  if (instabilityScore >= 76) return "REFLEXIVE_OVERHEAT"
  if (reflexivityScore >= 70 && crowding < 65) return "SELF_REINFORCING_EXPANSION"
  if (top?.direction === "CHURN" || liquidityStress?.regime === "COMPRESSION") return "BETA_ROTATION"
  if (reflexivityScore >= 52 && instabilityScore >= 52) return "FRAGILE_FEEDBACK"
  return "NEUTRAL_PROPAGATION"
}

function operatorRead(regime: CrossMarketReflexivityRegime, path: string[], instability: number, crowding: number) {
  const route = path.length ? path.join(" → ") : "BTC → Alt sleeves"
  switch (regime) {
    case "SELF_REINFORCING_EXPANSION":
      return `${route} is forming a self-reinforcing expansion. Liquidity and narrative are aligned, while crowding remains manageable.`
    case "REFLEXIVE_OVERHEAT":
      return `${route} is entering reflexive overheat. Price, leverage, and narrative are reinforcing each other faster than liquidity quality can absorb.`
    case "DEFENSIVE_FEEDBACK":
      return `${route} is blocked by defensive feedback. Withdrawal pressure dominates and beta rotation should be treated as tactical only.`
    case "BETA_ROTATION":
      return `${route} is rotating through beta sleeves, but confirmation is still path-dependent. Watch breadth and OI acceleration.`
    case "FRAGILE_FEEDBACK":
      return `${route} is a fragile feedback loop. Instability ${round(instability, 0)} and crowding ${round(crowding, 0)} require lower alert confidence.`
    default:
      return `${route} remains in neutral propagation. No dominant cross-market feedback loop is confirmed yet.`
  }
}

export function buildCrossMarketReflexivitySurface(args: {
  rotation?: RealMarketRotationResponse | null
  futures?: FuturesIntelligenceResponse | null
  propagation?: NarrativePropagationSurface
  liquidityStress?: LiquidityStressSurface
}): CrossMarketReflexivitySurface {
  const sectors = args.rotation?.sectors ?? []
  const nodes = marketNodes({ rotation: args.rotation, futures: args.futures, propagation: args.propagation, stress: args.liquidityStress })
  const deps = dependencies(nodes)
  const top = sectors[0]
  const path = betaRotationPath(sectors)
  const avgNodeScore = avg(nodes.map((node) => node.score))
  const avgNodeRisk = avg(nodes.map((node) => node.risk))
  const depStrength = avg(deps.map((dep) => dep.strength))
  const crowding = avg((args.futures?.sectors ?? []).map((sector) => sector.crowdingScore))
  const propagationVelocity = args.propagation?.velocityScore ?? 0
  const stress = args.liquidityStress?.stressScore ?? 0
  const reflexivityScore = clamp(avgNodeScore * 0.32 + depStrength * 0.28 + propagationVelocity * 0.2 + (top?.confidence ?? 0) * 0.2)
  const instabilityScore = clamp(avgNodeRisk * 0.34 + stress * 0.26 + crowding * 0.24 + (args.propagation?.stressScore ?? 0) * 0.16)
  const regime = classifyRegime({ reflexivityScore, instabilityScore, crowding, liquidityStress: args.liquidityStress, top })

  return {
    ok: sectors.length > 0 || nodes.length > 0,
    regime,
    reflexivityScore: round(reflexivityScore),
    instabilityScore: round(instabilityScore),
    betaRotationPath: path,
    nodes: nodes.sort((a, b) => b.score - a.score).slice(0, 10),
    dependencies: deps,
    operatorRead: operatorRead(regime, path, instabilityScore, crowding),
  }
}
