import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp } from "@/core/shared/metrics"
import type { NarrativeHeatItem, NarrativeStoryStep, NarrativeSurface, NarrativeTone, OperatorCommentary } from "./narrativeTypes"
import { buildNewsFusionSurface, type NewsFusionInputItem } from "./newsFusion"
import { buildNarrativePropagationSurface } from "./propagationEngine"
import { buildLiquidityStressSurface } from "./stressLiquidityRegime"
import { buildCrossMarketReflexivitySurface } from "./reflexivityEngine"

function fmt(value: number | undefined, digits = 2) {
  if (!Number.isFinite(value)) return "--"
  return Number(value).toFixed(digits)
}

function sectorLabel(sector?: SectorRotationSnapshot) {
  if (!sector) return "market"
  return `${sector.sector} ${sector.direction}`
}

function inferRegime(sectors: SectorRotationSnapshot[]): string {
  const top = sectors[0]
  if (!top) return "MARKET_SCAN"
  if (top.direction === "INFLOW" && top.confidence >= 75) return "ALT_ROTATION"
  if (top.direction === "INFLOW" && top.rotationScore >= 82) return "SPECULATIVE_EXPANSION"
  if (top.direction === "CHURN") return "CHURN_PHASE"
  if (top.direction === "OUTFLOW" && top.confidence >= 70) return "RISK_OFF"
  if (top.volatility >= 78 && top.breadth < 45) return "VOLATILITY_STRESS"
  return "MARKET_SCAN"
}

function inferTone(regime: string, sectors: SectorRotationSnapshot[]): NarrativeTone {
  const top = sectors[0]
  const inflows = sectors.filter((sector) => sector.direction === "INFLOW").length
  const outflows = sectors.filter((sector) => sector.direction === "OUTFLOW").length
  const churns = sectors.filter((sector) => sector.direction === "CHURN").length

  if (regime.includes("RISK_OFF") || outflows >= 3) return "RISK_OFF"
  if (regime.includes("EXPANSION") || (top?.rotationScore ?? 0) >= 85) return "EUPHORIA"
  if (churns >= 3) return "COMPRESSION"
  if (inflows >= 2) return "RISK_ON"
  return "MIXED"
}

function buildHeatmap(sectors: SectorRotationSnapshot[]): NarrativeHeatItem[] {
  return sectors.slice(0, 8).map((sector) => {
    const heat = clamp(
      sector.rotationScore * 0.45 +
        sector.confidence * 0.25 +
        sector.volumePressure * 0.14 +
        sector.breadth * 0.08 +
        sector.premiumBoost * 0.08
    )

    const summary = sector.direction === "INFLOW"
      ? `${sector.sector} narrative is attracting liquidity with ${fmt(sector.breadth)}% breadth.`
      : sector.direction === "OUTFLOW"
        ? `${sector.sector} narrative shows risk exit pressure with ${fmt(sector.avgPriceChange)}% average move.`
        : sector.direction === "CHURN"
          ? `${sector.sector} narrative is in high-rotation handoff; direction is not fully confirmed.`
          : `${sector.sector} narrative remains quiet.`

    return {
      narrative: sector.sector,
      heat,
      direction: sector.direction,
      sectors: [sector.sector],
      summary,
    }
  })
}

function buildMarketSummary(regime: string, tone: NarrativeTone, sectors: SectorRotationSnapshot[]) {
  const top = sectors[0]
  const second = sectors[1]
  if (!top) return "Market narrative surface is waiting for live rotation data."

  const lead = `${regime.replaceAll("_", " ")} is the active narrative context.`
  const focus = `${sectorLabel(top)} leads the board with ${fmt(top.rotationScore)} rotation score and ${fmt(top.confidence)} confidence.`
  const support = second ? `Secondary pressure is visible in ${sectorLabel(second)}.` : "No secondary narrative is confirmed yet."
  const risk = tone === "EUPHORIA"
    ? "Risk of late-stage speculative crowding is elevated."
    : tone === "RISK_OFF"
      ? "Risk appetite is defensive and outflow-sensitive."
      : tone === "COMPRESSION"
        ? "Market is compressing into a potential directional break."
        : "Signal quality remains tactical rather than structural."

  return `${lead} ${focus} ${support} ${risk}`
}

function buildStoryTimeline(regime: string, sectors: SectorRotationSnapshot[]): NarrativeStoryStep[] {
  const top = sectors[0]
  const second = sectors[1]
  const third = sectors[2]
  const steps: NarrativeStoryStep[] = [
    {
      id: "regime-context",
      title: `Regime context: ${regime.replaceAll("_", " ")}`,
      detail: top ? `Market context is anchored by ${top.sector} ${top.direction}.` : "Waiting for sector rotation context.",
      category: "REGIME",
      intensity: top?.confidence ?? 0,
    },
  ]

  if (top) {
    steps.push({
      id: `top-${top.sector}`,
      title: `${top.sector} becomes the lead narrative`,
      detail: `${top.story} Evidence: ${top.evidence.slice(0, 3).join(" / ")}.`,
      category: "ROTATION",
      intensity: top.rotationScore,
    })
  }

  if (second) {
    steps.push({
      id: `secondary-${second.sector}`,
      title: `${second.sector} forms secondary pressure`,
      detail: `${second.direction} with ${fmt(second.confidence)} confidence and ${fmt(second.breadth)}% breadth.`,
      category: "WATCHLIST",
      intensity: second.confidence,
    })
  }

  if (third && third.direction !== top?.direction) {
    steps.push({
      id: `conflict-${third.sector}`,
      title: `${third.sector} creates a cross-current`,
      detail: `${third.sector} is ${third.direction}, which may dilute the lead narrative if it expands.`,
      category: "RISK",
      intensity: third.confidence,
    })
  }

  return steps
}

function buildRegionalDivergence(sectors: SectorRotationSnapshot[]) {
  const koreaStrong = sectors.filter((sector) => sector.premiumBoost >= 68 && sector.volumePressure >= 55)
  const globalStrong = sectors.filter((sector) => sector.volumePressure >= 70 && sector.premiumBoost < 58)

  if (koreaStrong.length && globalStrong.length) {
    return {
      status: "MIXED" as const,
      summary: `Regional signals are mixed: Korea is active in ${koreaStrong.slice(0, 2).map((s) => s.sector).join("/")}, while global volume leads ${globalStrong.slice(0, 2).map((s) => s.sector).join("/")}.`,
      sectors: [...new Set([...koreaStrong, ...globalStrong].slice(0, 4).map((s) => s.sector))],
    }
  }

  if (koreaStrong.length) {
    return {
      status: "KOREA_STRONG" as const,
      summary: `Korean retail overlay is supportive in ${koreaStrong.slice(0, 3).map((s) => s.sector).join("/")}.`,
      sectors: koreaStrong.slice(0, 3).map((s) => s.sector),
    }
  }

  if (globalStrong.length) {
    return {
      status: "GLOBAL_STRONG" as const,
      summary: `Global liquidity leads while Korea premium is not confirming yet: ${globalStrong.slice(0, 3).map((s) => s.sector).join("/")}.`,
      sectors: globalStrong.slice(0, 3).map((s) => s.sector),
    }
  }

  return {
    status: "NONE" as const,
    summary: "No strong regional divergence detected.",
    sectors: [],
  }
}

function buildOperatorCommentary(tone: NarrativeTone, sectors: SectorRotationSnapshot[]): OperatorCommentary[] {
  const top = sectors[0]
  const commentary: OperatorCommentary[] = []

  if (top) {
    commentary.push({
      title: `${top.sector} is the operator focus`,
      body: `Track ${top.topSymbols.slice(0, 4).join(", ") || top.sector}. Promotion quality depends on sustained breadth and volume pressure.`,
      severity: top.confidence >= 80 ? "HIGH" : top.confidence >= 65 ? "MEDIUM" : "LOW",
    })
  }

  const weakBreadth = sectors.find((sector) => sector.rotationScore >= 70 && sector.breadth < 45)
  if (weakBreadth) {
    commentary.push({
      title: "Potential false expansion risk",
      body: `${weakBreadth.sector} has strong score but weak breadth (${fmt(weakBreadth.breadth)}%). Watch for leader-only moves.`,
      severity: "MEDIUM",
    })
  }

  if (tone === "EUPHORIA") {
    commentary.push({
      title: "Crowding risk rising",
      body: "High heat and high confidence can mean late-stage participation. Use cooldown before promoting duplicate alerts.",
      severity: "HIGH",
    })
  }

  if (!commentary.length) {
    commentary.push({
      title: "Market scan active",
      body: "No dominant narrative has cleared the promotion threshold yet.",
      severity: "LOW",
    })
  }

  return commentary
}

function buildCompression(sectors: SectorRotationSnapshot[]) {
  const inflowCount = sectors.filter((sector) => sector.direction === "INFLOW").length
  const churnCount = sectors.filter((sector) => sector.direction === "CHURN").length
  const outflowCount = sectors.filter((sector) => sector.direction === "OUTFLOW").length
  const hotCount = sectors.filter((sector) => sector.rotationScore >= 70).length

  return [
    {
      label: "Sector rotation events",
      rawEvents: sectors.length,
      compressedInto: `${hotCount} high-heat narratives`,
    },
    {
      label: "Liquidity direction events",
      rawEvents: inflowCount + churnCount + outflowCount,
      compressedInto: `${inflowCount} INFLOW / ${churnCount} CHURN / ${outflowCount} OUTFLOW`,
    },
    {
      label: "Evidence stack",
      rawEvents: sectors.reduce((sum, sector) => sum + sector.evidence.length, 0),
      compressedInto: "operator commentary + story timeline",
    },
  ]
}

export function generateNarrativeSurface(data: RealMarketRotationResponse | null | undefined, news: NewsFusionInputItem[] = []): NarrativeSurface {
  const sectors = data?.sectors ?? []
  const regime = inferRegime(sectors)
  const tone = inferTone(regime, sectors)
  const heatmap = buildHeatmap(sectors)
  const regionalDivergence = buildRegionalDivergence(sectors)
  const newsFusion = buildNewsFusionSurface(news, heatmap)
  const propagation = buildNarrativePropagationSurface({ heatmap, sectors, newsFusion, futures: null })
  const liquidityStress = buildLiquidityStressSurface({ rotation: data, futures: null, propagation })
  const crossMarketReflexivity = buildCrossMarketReflexivitySurface({ rotation: data, futures: null, propagation, liquidityStress })

  return {
    ok: Boolean(data?.ok && sectors.length),
    generatedAt: new Date().toISOString(),
    regime,
    tone,
    marketSummary: buildMarketSummary(regime, tone, sectors),
    operatorCommentary: buildOperatorCommentary(tone, sectors),
    heatmap,
    storyTimeline: buildStoryTimeline(regime, sectors),
    compression: buildCompression(sectors),
    regionalDivergence,
    sourceSectors: sectors,
    propagation,
    liquidityStress,
    crossMarketReflexivity,
    newsFusion,
    notes: data?.notes ?? [],
  }
}
