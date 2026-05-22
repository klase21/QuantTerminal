import { clamp } from "../shared/metrics"
import type { AlertPayload } from "./alertTypes"

export interface AlertPromotionInput {
  sector?: string
  direction?: "INFLOW" | "OUTFLOW" | "CHURN" | "QUIET"
  confidence: number
  triggerCount: number
  regime: string
  reasons: string[]
}

export function evaluateAlertPromotion(input: AlertPromotionInput): AlertPayload {
  const confidence = clamp(input.confidence)
  const isCritical = confidence >= 88 && input.triggerCount >= 4
  const isHigh = confidence >= 72 && input.triggerCount >= 3
  const isMedium = confidence >= 55 && input.triggerCount >= 2

  const severity = isCritical ? "CRITICAL" : isHigh ? "HIGH" : isMedium ? "MEDIUM" : "LOW"
  const status = input.direction === "QUIET" ? "WATCH" : isHigh ? "FIRED" : isMedium ? "QUEUED" : "WATCH"
  const sector = input.sector ?? "Market"

  return {
    id: `${sector}-${input.direction ?? "STATE"}-${Date.now()}`,
    type: "ROTATION",
    title: `${sector} ${input.direction ?? "SIGNAL"}`,
    severity,
    status,
    confidence,
    cooldownKey: `${sector}:${input.direction ?? "STATE"}:${input.regime}`,
    cooldownMs: severity === "CRITICAL" ? 15 * 60_000 : severity === "HIGH" ? 10 * 60_000 : 5 * 60_000,
    reasons: input.reasons,
    createdAt: Date.now(),
    promotedAt: status === "FIRED" ? Date.now() : undefined,
  }
}
