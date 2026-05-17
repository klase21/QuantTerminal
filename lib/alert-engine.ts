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

  const cooldown =
    rule.cooldown ?? 0

  if (

    rule.lastTriggered &&

    now - rule.lastTriggered <
      cooldown * 1000

  ) {

    return false

  }

  switch (rule.type) {

    case "PRICE_ABOVE":

      return (
        data.price >
        rule.condition
      )

    case "PRICE_BELOW":

      return (
        data.price <
        rule.condition
      )

    case "VOLUME_SPIKE":

      return (
        (data.volume || 0) >
        rule.condition
      )

    case "LIQUIDATION":

      return (
        (data.liquidation || 0) >
        rule.condition
      )

    default:

      return false

  }

}