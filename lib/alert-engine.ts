import { AlertRule } from "@/types/alert"

interface EngineData {

  symbol: string

  price: number

  volume?: number

  liquidation?: number

  oi?: number

}

export function evaluateRule(
  rule: AlertRule,
  data: EngineData
) {

  if (!rule.enabled) {

    return false

  }

  const now = Date.now()

  if (
    rule.lastTriggered &&
    now - rule.lastTriggered <
      rule.cooldown * 1000
  ) {

    return false

  }

  switch (rule.condition) {

    case "price_above":
      return data.price > rule.value

    case "price_below":
      return data.price < rule.value

    case "volume_spike":
      return (
        (data.volume || 0) > rule.value
      )

    case "liquidation_spike":
      return (
        (data.liquidation || 0) >
        rule.value
      )

    case "oi_spike":
      return (
        (data.oi || 0) > rule.value
      )

    default:
      return false

  }

}