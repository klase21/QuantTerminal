import type { SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp } from "@/core/shared/metrics"
import type { NewsNarrativeSignal, NarrativeValidationItem } from "./narrativeTypes"
import type { NarrativeLifecycleItem, NarrativeLifecyclePhase } from "./lifecycleTypes"

function metric(value: number | undefined, digits = 0) {
  if (!Number.isFinite(value)) return "--"
  return Number(value).toFixed(digits)
}

function newsBuzzFor(sector: SectorRotationSnapshot, signals: NewsNarrativeSignal[]) {
  const exact = signals.find((item) => item.narrative.toUpperCase() === sector.sector.toUpperCase())
  if (exact) return exact.buzz
  const partial = signals.find((item) =>
    item.narrative.toUpperCase().includes(sector.sector.toUpperCase()) ||
    sector.sector.toUpperCase().includes(item.narrative.toUpperCase())
  )
  return partial?.buzz ?? 0
}

function validationFor(sector: SectorRotationSnapshot, validation: NarrativeValidationItem[]) {
  const item = validation.find((row) => row.narrative.toUpperCase() === sector.sector.toUpperCase())
  if (!item) return 0
  if (item.status === "VALIDATED") return item.validationScore
  if (item.status === "FLOW_ONLY") return item.validationScore * 0.72
  if (item.status === "NEWS_ONLY") return item.validationScore * 0.55
  return item.validationScore * 0.35
}

function inferPhase(args: {
  sector: SectorRotationSnapshot
  participation: number
  confirmation: number
  crowding: number
}): NarrativeLifecyclePhase {
  const { sector, participation, confirmation, crowding } = args

  if (sector.direction === "OUTFLOW" || (sector.rotationScore < 45 && sector.confidence < 45)) return "EXITING"
  if (crowding >= 78 && participation >= 68) return "OVERCROWDED"
  if (participation >= 78 && confirmation >= 58) return "VIRAL"
  if (sector.direction === "INFLOW" && participation >= 55 && confirmation >= 45) return "EXPANDING"
  if (sector.direction === "INFLOW" && (participation >= 42 || sector.rotationScore >= 58)) return "EARLY"
  if (sector.direction === "CHURN" && participation >= 52) return "EARLY"
  return "QUIET"
}

function headlineFor(sector: SectorRotationSnapshot, phase: NarrativeLifecyclePhase) {
  switch (phase) {
    case "EARLY":
      return `${sector.sector} is forming early participation`
    case "EXPANDING":
      return `${sector.sector} is expanding with market participation`
    case "VIRAL":
      return `${sector.sector} is entering a viral participation phase`
    case "OVERCROWDED":
      return `${sector.sector} looks crowded; watch for late liquidity risk`
    case "EXITING":
      return `${sector.sector} is losing narrative support`
    default:
      return `${sector.sector} remains quiet`
  }
}

function detailFor(sector: SectorRotationSnapshot, phase: NarrativeLifecyclePhase, participation: number, confirmation: number, crowding: number) {
  if (phase === "OVERCROWDED") {
    return `Participation is high, but crowding risk is elevated. Treat follow-through as fragile until liquidity and breadth stay confirmed.`
  }
  if (phase === "VIRAL") {
    return `Participation is spreading quickly with ${metric(confirmation)} confirmation. Monitor for a transition into overcrowding.`
  }
  if (phase === "EXPANDING") {
    return `Liquidity and breadth are improving together. This is the cleanest operator phase if confirmation persists.`
  }
  if (phase === "EARLY") {
    return `Initial flow is visible, but participation is not broad enough yet. Watch for another confirming tick.`
  }
  if (phase === "EXITING") {
    return `Flow support is fading or outflow pressure is active. Avoid promoting weak continuation signals.`
  }
  return `No meaningful lifecycle signal yet. Keep it compressed unless participation accelerates.`
}

function driversFor(sector: SectorRotationSnapshot, newsBuzz: number, validation: number, crowding: number) {
  const drivers: string[] = []
  if (sector.volumePressure >= 65) drivers.push("Liquidity pressure")
  if (sector.breadth >= 60) drivers.push("Breadth participation")
  if (sector.premiumBoost >= 60) drivers.push("Korea overlay")
  if (newsBuzz >= 45) drivers.push("News heat")
  if (validation >= 55) drivers.push("Narrative confirmation")
  if (crowding >= 70) drivers.push("Crowding risk")
  if (!drivers.length) drivers.push("Low signal density")
  return drivers.slice(0, 4)
}

export function deriveNarrativeLifecycle(
  sectors: SectorRotationSnapshot[],
  options: {
    newsSignals?: NewsNarrativeSignal[]
    validation?: NarrativeValidationItem[]
  } = {}
): NarrativeLifecycleItem[] {
  const newsSignals = options.newsSignals ?? []
  const validation = options.validation ?? []

  return sectors.slice(0, 8).map((sector) => {
    const newsBuzz = newsBuzzFor(sector, newsSignals)
    const validationScore = validationFor(sector, validation)
    const participation = clamp(
      sector.volumePressure * 0.34 +
        sector.breadth * 0.28 +
        sector.rotationScore * 0.18 +
        newsBuzz * 0.12 +
        sector.premiumBoost * 0.08
    )
    const confirmation = clamp(
      sector.confidence * 0.28 +
        sector.breadth * 0.22 +
        validationScore * 0.22 +
        sector.regimeFit * 0.16 +
        sector.volumePressure * 0.12
    )
    const crowding = clamp(
      sector.volatility * 0.30 +
        sector.premiumBoost * 0.22 +
        newsBuzz * 0.20 +
        Math.max(0, sector.rotationScore - sector.breadth) * 0.18 +
        Math.max(0, sector.confidence - 70) * 0.10
    )
    const phase = inferPhase({ sector, participation, confirmation, crowding })

    return {
      narrative: sector.sector,
      phase,
      participation,
      confirmation,
      crowding,
      confidence: clamp(confirmation * 0.55 + participation * 0.30 + (100 - crowding) * 0.15),
      headline: headlineFor(sector, phase),
      detail: detailFor(sector, phase, participation, confirmation, crowding),
      drivers: driversFor(sector, newsBuzz, validationScore, crowding),
    }
  })
}

export function lifecyclePhaseLabel(phase: NarrativeLifecyclePhase) {
  switch (phase) {
    case "EARLY":
      return "Early"
    case "EXPANDING":
      return "Expanding"
    case "VIRAL":
      return "Viral"
    case "OVERCROWDED":
      return "Overcrowded"
    case "EXITING":
      return "Exiting"
    default:
      return "Quiet"
  }
}
