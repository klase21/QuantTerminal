import type {
  QuantCardType,
  QuantConfidenceBand,
  QuantDensityMode,
  QuantInformationLevel,
  QuantSeverity,
} from "./quantTerminalDesignSystem"

export type ReplayNofxStrategy = "adopt" | "adapt" | "reject" | "advanced-only"
export type ReplaySectionPriority = "primary" | "supporting" | "advanced"

export interface ReplayConfidencePresentation {
  value: number
  band: QuantConfidenceBand
  label: string
  shortLabel: string
  className: string
}

export interface ReplaySeverityPresentation {
  severity: QuantSeverity
  label: string
  className: string
}

export function getReplayConfidencePresentation(value: number): ReplayConfidencePresentation {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
  if (safeValue <= 30) {
    return {
      value: safeValue,
      band: "very_low",
      label: "Low confidence",
      shortLabel: `${safeValue}% low`,
      className: "border-zinc-700 bg-black/35 text-zinc-300",
    }
  }
  if (safeValue <= 60) {
    return {
      value: safeValue,
      band: "low",
      label: "Mixed confidence",
      shortLabel: `${safeValue}% mixed`,
      className: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    }
  }
  if (safeValue <= 80) {
    return {
      value: safeValue,
      band: "medium",
      label: "Moderate confidence",
      shortLabel: `${safeValue}% moderate`,
      className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    }
  }
  return {
    value: safeValue,
    band: "high",
    label: "High confidence",
    shortLabel: `${safeValue}% high`,
    className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  }
}

export function getReplaySeverityPresentation(severity: QuantSeverity): ReplaySeverityPresentation {
  if (severity === "critical") {
    return {
      severity,
      label: "Critical",
      className: "border-rose-300/25 bg-rose-400/10 text-rose-100",
    }
  }
  if (severity === "high") {
    return {
      severity,
      label: "High",
      className: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    }
  }
  if (severity === "medium") {
    return {
      severity,
      label: "Medium",
      className: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    }
  }
  return {
    severity,
    label: "Low",
    className: "border-zinc-700 bg-black/35 text-zinc-300",
  }
}

export function getReplayDensityModeLabel(mode: QuantDensityMode) {
  if (mode === "beginner") return "Beginner narrative mode"
  if (mode === "trader") return "Trader tactical mode"
  return "Research detail mode"
}

export function getReplaySectionPriority(level: QuantInformationLevel, cardType: QuantCardType): ReplaySectionPriority {
  if (level === "advanced") return "advanced"
  if (cardType === "primary" || level === "level_1") return "primary"
  return "supporting"
}

export const replayStandardCaveats = {
  mockReplay: "Mock-first replay context. Use as historical review, not a live signal.",
  expectation: "Expectation context is crowd/market context, not a trading signal.",
  advancedOps: "Advanced mock/in-memory operations. Keep outside normal replay investigation.",
} as const

