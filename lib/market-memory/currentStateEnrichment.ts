import type { DashboardMarketStateSnapshot, FlowState, LiquidityState, PredictionBias } from "@/types/historical"

type MarketMoverCandidate = {
  symbol?: string
  direction?: "LONG" | "SHORT" | "NEUTRAL"
  score?: number
  reason?: string
  trigger?: string
  setup?: string
  scoreBreakdown?: Array<{ label?: string; polarity?: "positive" | "negative" | "neutral" }>
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function isWeakDashboardSnapshot(snapshot: DashboardMarketStateSnapshot) {
  return (
    parseJsonArray(snapshot.driversJson).length === 0 &&
    parseJsonArray(snapshot.narrativesJson).length === 0 &&
    snapshot.liquidityState === "unknown" &&
    (snapshot.sectorRotationState ?? "unknown") === "unknown" &&
    snapshot.etfFlowState === "unknown" &&
    snapshot.predictionState === "unknown"
  )
}

async function fetchJson<T>(origin: string, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${origin}${path}`, { cache: "no-store" })
    if (!response.ok) return null
    return await response.json() as T
  } catch {
    return null
  }
}

function driverFromText(value?: string) {
  const text = value?.toLowerCase() ?? ""
  if (!text) return null
  if (text.includes("buy") || text.includes("flow+") || text.includes("bid")) return "buying_pressure"
  if (text.includes("sell") || text.includes("flow-") || text.includes("ask")) return "selling_pressure"
  if (text.includes("sector")) return "sector_rotation"
  if (text.includes("leverage") || text.includes("funding") || text.includes("crowd")) return "leverage_risk"
  if (text.includes("dxy") && (text.includes("up") || text.includes("+"))) return "dollar_strength"
  if (text.includes("dxy") && (text.includes("down") || text.includes("-"))) return "dollar_weakness"
  if (text.includes("risk-off") || text.includes("vix up")) return "risk_off"
  if (text.includes("risk-on") || text.includes("spx up") || text.includes("nasdaq up")) return "risk_on"
  if (text.includes("narrative") || text.includes("heat")) return "narrative_heat"
  if (text.includes("etf")) return "etf_narrative"
  return null
}

function narrativeKey(value: string) {
  const text = value.toLowerCase()
  if (text.includes("bitcoin") || text === "btc") return "bitcoin"
  if (text.includes("ethereum") || text === "eth") return "ethereum"
  if (text.includes("solana") || text === "sol") return "solana"
  if (text.includes("stablecoin")) return "stablecoin"
  if (text.includes("meme")) return "meme"
  if (text.includes("defi")) return "defi"
  if (text.includes("ai")) return "ai"
  if (text.includes("etf")) return "etf"
  if (text.includes("regulation")) return "regulation"
  return text.replace(/\s+/g, "_")
}

function directionFromMover(mover?: MarketMoverCandidate, fallback: DashboardMarketStateSnapshot["direction"] = "neutral") {
  if (mover?.direction === "LONG") return "bullish"
  if (mover?.direction === "SHORT") return "bearish"
  if (mover?.direction === "NEUTRAL") return "neutral"
  return fallback
}

function liquidityFromFutures(futures: any): LiquidityState {
  const sectors = Array.isArray(futures?.sectors) ? futures.sectors : []
  if (!sectors.length) return "unknown"
  const average = sectors.reduce((total: number, sector: any) => total + (Number(sector.leveragePressure) || 0), 0) / sectors.length
  if (sectors.some((sector: any) => sector.leverageState === "OVERHEATED" || sector.leverageState === "CROWDED") || average >= 70) return "weakening"
  if (average <= 35) return "improving"
  return "stable"
}

function sectorState(rotation: any): NonNullable<DashboardMarketStateSnapshot["sectorRotationState"]> {
  const sectors = Array.isArray(rotation?.sectors) ? rotation.sectors : []
  if (!sectors.length) return "unknown"
  const inflow = sectors.filter((sector: any) => sector.direction === "INFLOW").length
  const outflow = sectors.filter((sector: any) => sector.direction === "OUTFLOW").length
  if (inflow > outflow) return "improving"
  if (outflow > inflow) return "weakening"
  return "mixed"
}

function etfState(etf: any): FlowState {
  const flows = Array.isArray(etf?.flows) ? etf.flows : []
  if (!flows.length) return "unknown"
  const net = flows.reduce((total: number, flow: any) => total + (Number(flow.netFlow) || 0), 0)
  if (net > 0) return "positive"
  if (net < 0) return "negative"
  return "neutral"
}

function predictionState(prediction: any): PredictionBias {
  const events = Array.isArray(prediction?.marketEvents) ? prediction.marketEvents : []
  if (!events.length) return "unknown"
  const avg = events.reduce((total: number, event: any) => total + (Number(event.probability) || 0), 0) / events.length
  if (avg >= 55) return "bullish"
  if (avg <= 45) return "bearish"
  return "neutral"
}

export async function enrichWeakDashboardSnapshot(snapshot: DashboardMarketStateSnapshot, origin: string) {
  if (!isWeakDashboardSnapshot(snapshot)) return snapshot

  const [movers, macro, narratives, rotation, futures, etf, prediction] = await Promise.all([
    fetchJson<any>(origin, `/api/market/movers?focus=${encodeURIComponent(snapshot.symbol)}`),
    fetchJson<any>(origin, "/api/macro"),
    fetchJson<any>(origin, "/api/narratives?range=24h"),
    fetchJson<any>(origin, "/api/market/sector-rotation"),
    fetchJson<any>(origin, "/api/market/futures-intelligence"),
    fetchJson<any>(origin, "/api/etf-flow"),
    fetchJson<any>(origin, "/api/prediction-markets"),
  ])
  const mover = movers?.focusCandidate ?? movers?.candidates?.[0]
  const moverDrivers = [
    driverFromText(mover?.reason),
    driverFromText(mover?.trigger),
    driverFromText(mover?.setup),
    ...(Array.isArray(mover?.scoreBreakdown) ? mover.scoreBreakdown.map((item: any) => driverFromText(`${item.label ?? ""} ${item.polarity ?? ""}`)) : []),
  ]
  const macroDrivers = Array.isArray(macro?.items)
    ? macro.items.map((item: any) => driverFromText(`${item.symbol ?? ""} ${item.change ?? ""} ${item.signal ?? ""}`))
    : []
  const rotationState = sectorState(rotation)
  const futuresLiquidity = liquidityFromFutures(futures)
  const futuresDrivers = Array.isArray(futures?.sectors) && futures.sectors.some((sector: any) => Number(sector.leveragePressure) >= 70)
    ? ["leverage_risk"]
    : []
  const narrativeValues = [
    ...(Array.isArray(narratives?.topNarratives) ? narratives.topNarratives : []),
    ...(Array.isArray(narratives?.heatmap) ? narratives.heatmap.slice(0, 3).map((row: any) => row.narrative) : []),
  ].map(String).map(narrativeKey)
  const narrativeHeat = Array.isArray(narratives?.heatmap) && narratives.heatmap[0]?.total >= 200
    ? "very_hot"
    : Array.isArray(narratives?.heatmap) && narratives.heatmap[0]?.total >= 120
      ? "hot"
      : Array.isArray(narratives?.heatmap) && narratives.heatmap.length
        ? "neutral"
        : "unknown"

  return {
    ...snapshot,
    direction: directionFromMover(mover, snapshot.direction),
    confidence: typeof mover?.score === "number" ? Math.max(0, Math.min(95, Math.round(mover.score))) : snapshot.confidence,
    driversJson: JSON.stringify(unique([
      ...moverDrivers,
      ...macroDrivers,
      ...(rotationState === "improving" ? ["sector_rotation"] : []),
      ...futuresDrivers,
      ...(narrativeValues.length ? ["narrative_heat"] : []),
    ].filter((item): item is string => Boolean(item)))),
    narrativesJson: JSON.stringify(unique(narrativeValues).slice(0, 8)),
    narrativeHeat,
    dominantNarrative: narrativeValues[0] ?? snapshot.dominantNarrative ?? null,
    sectorRotationState: rotationState,
    liquidityState: futuresLiquidity,
    etfFlowState: etfState(etf),
    predictionState: predictionState(prediction),
  } satisfies DashboardMarketStateSnapshot
}
