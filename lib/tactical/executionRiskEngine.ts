import type {
  DirectionalBias,
  ExecutionState,
  TacticalAlert,
  TacticalVerdictInput,
} from "./tacticalVerdictEngine"

export type ExecutionRiskLevel = "LOW" | "MODERATE" | "ELEVATED" | "HIGH"

export type ExecutionRiskSummary = {
  level: ExecutionRiskLevel
  score: number
  headline: string
  reasons: string[]
  action: string
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function n(value: number | undefined, fallback = 50) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

export function buildExecutionRiskSummary(
  input: TacticalVerdictInput,
  bias: DirectionalBias = "TWO-WAY",
  executionState: ExecutionState = "CHOPPY",
): ExecutionRiskSummary {
  const liquidity = n(input.liquidityScore)
  const execution = n(input.executionScore)
  const volatility = n(input.volatilityScore)
  const liquidation = n(input.liquidationPressure, 35)
  const funding = n(input.fundingPressure, 35)

  const riskScore = clamp(
    (100 - liquidity) * 0.28 +
      (100 - execution) * 0.26 +
      volatility * 0.18 +
      liquidation * 0.16 +
      funding * 0.12,
  )

  const reasons: string[] = []

  if (liquidity < 45) reasons.push("thin liquidity")
  if (execution < 45) reasons.push("weak execution quality")
  if (volatility > 72) reasons.push("volatility expansion")
  if (liquidation > 68) reasons.push("liquidation sweep pressure")
  if (funding > 68) reasons.push("crowded positioning")
  if (executionState === "WAIT FOR RESET") reasons.push("timeframe confirmation gap")
  if (executionState === "NO EDGE") reasons.push("no clean execution edge")

  let level: ExecutionRiskLevel = "LOW"
  if (riskScore >= 68) level = "HIGH"
  else if (riskScore >= 52) level = "ELEVATED"
  else if (riskScore >= 35) level = "MODERATE"

  const headline =
    level === "HIGH"
      ? "Execution risk is high"
      : level === "ELEVATED"
        ? "Execution risk is elevated"
        : level === "MODERATE"
          ? "Execution risk is moderate"
          : "Execution risk is contained"

  let action =
    level === "HIGH"
      ? "Avoid aggressive market entries. Wait for liquidity reset or clearer confirmation."
      : level === "ELEVATED"
        ? "Reduce size and avoid chasing. Prefer confirmation after pullback or sweep."
        : level === "MODERATE"
          ? "Stay selective. Use confirmation and avoid weak liquidity pockets."
          : "Execution conditions are acceptable if directional bias and flow confirm."

  if (bias === "NO EDGE") {
    action = "Do not force trades. Wait for a clean directional break or liquidity sweep."
  }

  if (bias === "LONG BIAS" && level !== "LOW") {
    action = "Long bias exists, but chase risk is elevated. Prefer pullback continuation only."
  }

  if (bias === "SHORT BIAS" && level !== "LOW") {
    action = "Short bias exists, but trap risk is elevated. Prefer failed bounce confirmation."
  }

  return {
    level,
    score: Math.round(riskScore),
    headline,
    reasons: reasons.length ? reasons : ["no major execution risk flagged"],
    action,
  }
}

export function buildActionableRiskAlerts(
  input: TacticalVerdictInput,
  bias: DirectionalBias,
  executionState: ExecutionState,
): TacticalAlert[] {
  const risk = buildExecutionRiskSummary(input, bias, executionState)
  const alerts: TacticalAlert[] = []

  if (risk.level === "HIGH" || risk.level === "ELEVATED") {
    alerts.push({
      title: risk.headline,
      detail: risk.action,
      severity: risk.level === "HIGH" ? "danger" : "warning",
    })
  }

  if (bias === "LONG BIAS" && risk.reasons.includes("volatility expansion")) {
    alerts.push({
      title: "Late chase risk",
      detail: "Long side is favored, but volatility expansion increases pullback risk.",
      severity: "warning",
    })
  }

  if (bias === "SHORT BIAS" && risk.reasons.includes("liquidation sweep pressure")) {
    alerts.push({
      title: "Breakdown trap risk",
      detail: "Short pressure is active, but liquidation zones can trigger sharp reversals.",
      severity: "warning",
    })
  }

  if (bias === "NO EDGE" || executionState === "NO EDGE") {
    alerts.push({
      title: "No edge condition",
      detail: "Avoid overtrading until liquidity, flow, and direction align.",
      severity: "danger",
    })
  }

  return alerts
}
