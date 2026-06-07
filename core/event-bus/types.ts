export type TerminalEventType =
  | "REGIME_SHIFT"
  | "ROTATION_SIGNAL"
  | "LIQUIDITY_SIGNAL"
  | "VOLATILITY_SIGNAL"
  | "ALERT_PROMOTED"
  | "REPLAY_FRAME"
  | "DATALAB_REFRESH"

export type TerminalEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface TerminalEvent<TPayload = Record<string, unknown>> {
  id: string
  type: TerminalEventType
  severity: TerminalEventSeverity
  title: string
  description: string
  payload: TPayload
  timestamp: number
  source: "regime" | "rotation" | "alerts" | "replay" | "datalab" | "operator"
}
