// ======================================================
// services/mockFeed.ts
// ======================================================

"use client"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

export function startMockFeed() {

  setInterval(() => {

    const current =
      useMarketStore
        .getState()
        .tickers

    const btc =
      current["BTCUSDT"] || {

        symbol: "BTCUSDT",

        price: 105000,

        change24h: 2.4,

        volume: 120000,

        exchange: "BINANCE",

        timestamp: Date.now(),

      }

    const eth =
      current["ETHUSDT"] || {

        symbol: "ETHUSDT",

        price: 2500,

        change24h: 1.2,

        volume: 90000,

        exchange: "BINANCE",

        timestamp: Date.now(),

      }

    const btcMove =
      (Math.random() - 0.5)
      * 400

    const ethMove =
      (Math.random() - 0.5)
      * 30

    useMarketStore
      .getState()
      .updateBatch([

        {

          symbol: "BTCUSDT",

          price:
            btc.price +
            btcMove,

          change24h:
            btc.change24h +
            (
              Math.random() - 0.5
            ),

          volume:
            btc.volume +
            Math.random() * 1000,

          exchange: "BINANCE",

          timestamp:
            Date.now(),

        },

        {

          symbol: "ETHUSDT",

          price:
            eth.price +
            ethMove,

          change24h:
            eth.change24h +
            (
              Math.random() - 0.5
            ),

          volume:
            eth.volume +
            Math.random() * 500,

          exchange: "BINANCE",

          timestamp:
            Date.now(),

        },

      ])

  }, 1500)

}