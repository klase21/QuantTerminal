// ======================================================
// types/alert.ts
// ======================================================

export type AlertSeverity =
  | "INFO"
  | "WARNING"
  | "CRITICAL"

export type AlertType =
  | "PRICE_ABOVE"
  | "PRICE_BELOW"
  | "VOLUME_SPIKE"
  | "LIQUIDATION"
  | "ABSORPTION"
  | "LIQUIDITY_SWEEP"

export type AlertSound =
  | "default"
  | "absorption"
  | "liquidation"

export interface AlertRule {

  // ======================================================
  // CORE
  // ======================================================

  id: string

  enabled: boolean

  type: AlertType

  symbol: string
  
  threshold?: number

  // ======================================================
  // CONDITIONS
  // ======================================================

  condition: number

  cooldown?: number

  // ======================================================
  // UI
  // ======================================================

  message?: string

  severity?: AlertSeverity

  sound?: AlertSound

  // ======================================================
  // META
  // ======================================================

  createdAt: number

  lastTriggered?: number

}

export interface AlertItem {

  id: string

  type: AlertType

  message: string

  severity?: AlertSeverity

  timestamp: number

}