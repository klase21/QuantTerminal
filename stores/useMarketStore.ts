// ======================================================
// stores/useMarketStore.ts
// ======================================================

"use client"

import {
  create,
} from "zustand"

// ======================================================
// TICKER
// ======================================================

export interface Ticker {

  symbol: string

  price: number

  change: number

  volume: number

  // USDT 기준 거래량
  quoteVolume: number

  latency?: number

}

// ======================================================
// ORDERBOOK
// ======================================================

export interface OrderbookLevel {

  price: number

  qty: number

}

// ======================================================
// TRADE
// ======================================================

interface Trade {

  price: number

  qty: number

  side:
    | "buy"
    | "sell"

  time: number

}

// ======================================================
// LIQUIDATION
// ======================================================

interface Liquidation {

  symbol: string

  side: string

  price: number

  qty: number

  time: number

}

// ======================================================
// STORE
// ======================================================

interface MarketStore {

  // ======================================================
  // TICKERS
  // ======================================================

  tickers:
    Record<
      string,
      Ticker
    >

  setTicker:
    (
      symbol: string,
      ticker: Ticker
    ) => void

  // ======================================================
  // ORDERBOOK
  // ======================================================

  orderbook: {

    bids:
      OrderbookLevel[]

    asks:
      OrderbookLevel[]

  }

  setOrderbook:
    (
      bids:
        OrderbookLevel[],
      asks:
        OrderbookLevel[]
    ) => void

  // ======================================================
  // SELECTED SYMBOL
  // ======================================================

  selectedSymbol:
    string

  setSelectedSymbol:
    (
      symbol: string
    ) => void

  // ======================================================
  // TRADES
  // ======================================================

  trades: Trade[]

  setTrades:
    (
      trades: Trade[]
    ) => void

  // ======================================================
  // LIQUIDATIONS
  // ======================================================

  liquidations:
    Liquidation[]

  setLiquidations:
    (
      data:
        Liquidation[]
    ) => void

}

// ======================================================
// STORE
// ======================================================

export const useMarketStore =
  create<MarketStore>(
    (set) => ({

      // ======================================================
      // TICKERS
      // ======================================================

      tickers: {},

      setTicker: (
        symbol,
        ticker
      ) =>

        set(
          (state) => ({

            tickers: {

              ...state.tickers,

              [symbol]:
                ticker,

            },

          })
        ),

      // ======================================================
      // ORDERBOOK
      // ======================================================

      orderbook: {

        bids: [],

        asks: [],

      },

      setOrderbook: (
        bids,
        asks
      ) =>

        set({

          orderbook: {

            bids,

            asks,

          },

        }),

      // ======================================================
      // SELECTED SYMBOL
      // ======================================================

      selectedSymbol:
        "btcusdt",

      setSelectedSymbol: (
        symbol
      ) =>

        set({

          selectedSymbol:

            typeof symbol ===
            "string"

              ? symbol.toLowerCase()

              : "btcusdt",

        }),

      // ======================================================
      // TRADES
      // ======================================================

      trades: [],

      setTrades: (
        trades
      ) =>

        set({

          trades,

        }),

      // ======================================================
      // LIQUIDATIONS
      // ======================================================

      liquidations: [],

      setLiquidations: (
        data
      ) =>

        set({

          liquidations:
            data,

        }),

    })
  )