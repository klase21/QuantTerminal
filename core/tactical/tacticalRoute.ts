import type { ExecutionStyle, TacticalState } from "@/stores/useGlobalTacticalContextStore"
import type { MarketMode } from "@/stores/useMarketModeStore"

export type TacticalVenue = "BINANCE_FUTURES" | "BINANCE_SPOT" | "HYBRID"
export type TacticalTimeframe = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1d"

export type TacticalRoute = {
  symbol: string
  timeframe: TacticalTimeframe
  marketMode: MarketMode
  venue: TacticalVenue
  executionStyle: ExecutionStyle
  tacticalState: TacticalState
  attentionMode: boolean
  routeKey: string
}

export function normalizeTacticalSymbol(symbol?: string | null) {
  return (symbol || "BTCUSDT").replace("/", "").trim().toUpperCase()
}

export function venueFromMarketMode(marketMode: MarketMode): TacticalVenue {
  if (marketMode === "SPOT") return "BINANCE_SPOT"
  if (marketMode === "HYBRID") return "HYBRID"
  return "BINANCE_FUTURES"
}

export function buildTacticalRoute(input: Omit<TacticalRoute, "routeKey" | "venue"> & { venue?: TacticalVenue }): TacticalRoute {
  const symbol = normalizeTacticalSymbol(input.symbol)
  const venue = input.venue ?? venueFromMarketMode(input.marketMode)

  return {
    ...input,
    symbol,
    venue,
    routeKey: [symbol, input.timeframe, input.marketMode, venue, input.executionStyle].join(":"),
  }
}
