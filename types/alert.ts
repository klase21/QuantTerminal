export type AlertCondition =
  | "price_above"
  | "price_below"
  | "volume_spike"
  | "liquidation_spike"
  | "oi_spike"

export type AlertSoundType =
  | "default"
  | "absorption"
  | "liquidation"

export interface AlertRule {

  id: string

  symbol: string

  condition: AlertCondition

  value: number

  enabled: boolean

  cooldown: number

  lastTriggered?: number

  sound: AlertSoundType

  message?: string

}

export interface AlertItem {

  id: string

  type: string

  message: string

  timestamp: number

}