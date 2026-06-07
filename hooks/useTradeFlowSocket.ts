"use client"

import useMarketTradeFlowSocket from "@/hooks/useMarketTradeFlowSocket"

export default function useTradeFlowSocket(symbol: string) {
  // Legacy compatibility hook. Use the consolidated market trade-flow runtime
  // so DashboardLayout does not create another independent websocket.
  return useMarketTradeFlowSocket(symbol, "SPOT")
}
