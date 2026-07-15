export const PRESENTATION_UNAVAILABLE = "UNAVAILABLE" as const

type FiniteNumber = number | null | undefined

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function normalized(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

function fixed(value: number, decimals: number): string {
  return normalized(value).toFixed(decimals)
}

function signedFixed(value: number, decimals: number): string {
  const normalizedValue = normalized(value)
  return `${normalizedValue > 0 ? "+" : normalizedValue < 0 ? "-" : ""}${fixed(Math.abs(normalizedValue), decimals)}`
}

function signedPercent(value: FiniteNumber, decimals: number): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  const normalizedValue = normalized(value)
  const minimum = 10 ** -decimals
  if (normalizedValue !== 0 && Math.abs(normalizedValue) < minimum) return `${normalizedValue > 0 ? "+" : "-"}<${fixed(minimum, decimals)}%`
  return `${signedFixed(normalizedValue, decimals)}%`
}

/** Formats a probability ratio (0..1) as a percentage. */
export function formatProbability(value: FiniteNumber): string {
  if (!finite(value) || value < 0 || value > 1) return PRESENTATION_UNAVAILABLE
  const percentage = normalized(value * 100)
  if (percentage !== 0 && percentage < 0.01) return "<0.01%"
  return `${fixed(percentage, 2)}%`
}

/** Formats a return already expressed in percentage points. */
export function formatSignedReturn(value: FiniteNumber): string {
  return signedPercent(value, 2)
}

/** Formats an open-interest change already expressed in percentage points. */
export function formatSignedOpenInterestChange(value: FiniteNumber): string {
  return signedPercent(value, 2)
}

/** Formats a funding rate ratio (for example, 0.0001 becomes +0.0100%). */
export function formatFundingRate(value: FiniteNumber): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  const percentage = normalized(value * 100)
  const minimum = 0.0001
  if (percentage !== 0 && Math.abs(percentage) < minimum) return `${percentage > 0 ? "+" : "-"}<${fixed(minimum, 4)}%`
  return `${signedFixed(percentage, 4)}%`
}

/** Formats an aggressive-flow imbalance ratio with an explicit buy/sell direction. */
export function formatDirectionalFlow(value: FiniteNumber): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  const percentage = normalized(value * 100)
  const direction = percentage > 0 ? "Buy-biased" : percentage < 0 ? "Sell-biased" : "Balanced"
  const minimum = 0.01
  if (percentage !== 0 && Math.abs(percentage) < minimum) return `${direction} <${fixed(minimum, 2)}%`
  return `${direction} ${fixed(Math.abs(percentage), 2)}%`
}

/** Formats a USD amount in millions, retaining the inflow/outflow sign. */
export function formatEtfUsdMillions(value: FiniteNumber): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  const millions = normalized(value / 1_000_000)
  const minimum = 0.1
  if (millions !== 0 && Math.abs(millions) < minimum) return `${millions > 0 ? "+" : "-"}<$${fixed(minimum, 1)}M`
  return `${millions > 0 ? "+" : millions < 0 ? "-" : ""}$${fixed(Math.abs(millions), 1)}M`
}

const COVERAGE_SEMANTICS = Object.freeze({
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  GAP: "Gap",
  MISSING: "Missing",
  UNAVAILABLE: "Unavailable",
  EXPERIMENTAL: "Experimental",
})

export type CoverageState = keyof typeof COVERAGE_SEMANTICS

export function formatCoverageSemantic(value: unknown): string {
  return typeof value === "string" && value in COVERAGE_SEMANTICS
    ? COVERAGE_SEMANTICS[value as CoverageState]
    : PRESENTATION_UNAVAILABLE
}

const CONFIDENCE_SEMANTICS = Object.freeze({
  HIGH: "Evidence strength: High",
  MEDIUM: "Evidence strength: Medium",
  LOW: "Evidence strength: Low",
  NOT_AVAILABLE: "Evidence strength: Unavailable",
})

export type ConfidenceClassification = keyof typeof CONFIDENCE_SEMANTICS

/** Primary confidence rendering: evidence strength, never a forecast probability. */
export function formatConfidencePrimary(value: unknown): string {
  return typeof value === "string" && value in CONFIDENCE_SEMANTICS
    ? CONFIDENCE_SEMANTICS[value as ConfidenceClassification]
    : "Evidence strength: Unavailable"
}

/** Technical confidence rendering for governed 0..1 strength values only. */
export function formatConfidenceTechnical(value: FiniteNumber): string {
  if (!finite(value) || value < 0 || value > 1) return PRESENTATION_UNAVAILABLE
  return `${fixed(normalized(value * 100), 2)}%`
}

export function formatCompactCount(value: FiniteNumber, unit?: string): string {
  if (!finite(value) || value < 0) return PRESENTATION_UNAVAILABLE
  const normalizedValue = normalized(value)
  const units: ReadonlyArray<readonly [number, string]> = [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]]
  for (const [divisor, suffix] of units) {
    if (normalizedValue >= divisor) {
      const compact = normalizedValue / divisor
      const formatted = `${compact >= 100 ? fixed(compact, 0) : fixed(compact, 1).replace(/\.0$/, "")}${suffix}`
      return unit ? `${formatted} ${unit}` : formatted
    }
  }
  const formatted = fixed(normalizedValue, 0)
  return unit ? `${formatted} ${unit}` : formatted
}

export function formatPrice(value: FiniteNumber): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  const absolute = Math.abs(value)
  const decimals = absolute >= 1_000 ? 2 : absolute >= 1 ? 4 : 8
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(normalized(value))
}

export function formatPlainNumber(value: FiniteNumber, maximumFractionDigits = 4): string {
  if (!finite(value)) return PRESENTATION_UNAVAILABLE
  return new Intl.NumberFormat("en-US", { maximumFractionDigits, useGrouping: true }).format(normalized(value))
}

export function formatCounterEvidenceStrength(value: FiniteNumber): string {
  if (!finite(value) || value < 0 || value > 1) return PRESENTATION_UNAVAILABLE
  if (value >= 0.67) return "High"
  if (value >= 0.34) return "Moderate"
  return "Low"
}
