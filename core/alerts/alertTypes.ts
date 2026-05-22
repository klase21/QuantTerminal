import type { TerminalEventSeverity } from "../event-bus/types"

export type AlertStatus = "WATCH" | "QUEUED" | "FIRED" | "SUPPRESSED"

export interface AlertPayload {
  id: string
  type: "ROTATION" | "REGIME" | "LIQUIDITY" | "VOLATILITY" | "DATALAB"
  title: string
  severity: TerminalEventSeverity
  status: AlertStatus
  confidence: number
  cooldownKey: string
  cooldownMs: number
  reasons: string[]
  createdAt: number
  promotedAt?: number
}
