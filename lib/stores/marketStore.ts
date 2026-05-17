import { create } from "zustand"

interface MarketTicker {
  symbol: string
  price: number
  change24h?: number
  volume?: number
  exchange: string
  timestamp: number
}

interface MarketState {
  tickers: Record<string, MarketTicker>

  updateTicker: (ticker: MarketTicker) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  tickers: {},

  updateTicker: (ticker) =>
    set((state) => ({
      tickers: {
        ...state.tickers,
        [`${ticker.exchange}_${ticker.symbol}`]: ticker,
      },
    })),
}))