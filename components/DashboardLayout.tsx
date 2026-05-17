// ======================================================
// components/DashboardLayout.tsx
// ======================================================

"use client"

import { useMemo } from "react"

import Orderbook from "@/components/Orderbook"

import Heatmap from "@/components/Heatmap"

import TradingChart from "@/components/TradingChart"

import MarketOverview from "@/components/MarketOverview"

import CVDPanel from "@/components/CVDPanel"

import BTCPriceCard from "@/components/BTCPriceCard"

import RightPanelTabs from "@/components/RightPanelTabs"

import useDepthHeatmap from "@/hooks/useDepthHeatmap"

import useHeatmapHistory from "@/hooks/useHeatmapHistory"

import useLiquidityEvents from "@/hooks/useLiquidityEvents"

import useLiquidationSocket from "@/hooks/useLiquidationSocket"

import { useMarketStore } from "@/stores/useMarketStore"

export default function DashboardLayout() {

  // ======================================================
  // STORE
  // ======================================================

  const symbol =
    useMarketStore(
      (s) => s.selectedSymbol
    )

  const orderbook =
    useMarketStore(
      (s) => s.orderbook
    )

  // ======================================================
  // HEATMAP
  // ======================================================

  const heatmapFrames =
    useDepthHeatmap(symbol)

  const heatmapHistory =
    useHeatmapHistory(
      orderbook?.bids || [],
      orderbook?.asks || []
    )

  // ======================================================
  // FLATTEN
  // ======================================================

  const flattenedHeatLevels =
    useMemo(() => {

      return (
        heatmapFrames || []
      ).flatMap((frame) => [

        ...frame.bids,

        ...frame.asks,

      ])

    }, [heatmapFrames])

  // ======================================================
  // EVENTS
  // ======================================================

  const liquidityEvents =
    useLiquidityEvents(
      flattenedHeatLevels
    )

  const {
    liquidations,
  } = useLiquidationSocket()

  // ======================================================
  // MOCK CHART DATA
  // ======================================================

  const candles = [

    {
      time:
        Math.floor(Date.now() / 1000) - 300,

      open: 65000,
      high: 65100,
      low: 64950,
      close: 65080,
    },

    {
      time:
        Math.floor(Date.now() / 1000) - 240,

      open: 65080,
      high: 65200,
      low: 65050,
      close: 65150,
    },

    {
      time:
        Math.floor(Date.now() / 1000) - 180,

      open: 65150,
      high: 65320,
      low: 65100,
      close: 65280,
    },

    {
      time:
        Math.floor(Date.now() / 1000) - 120,

      open: 65280,
      high: 65350,
      low: 65220,
      close: 65240,
    },

    {
      time:
        Math.floor(Date.now() / 1000) - 60,

      open: 65240,
      high: 65400,
      low: 65210,
      close: 65380,
    },

  ]

  return (

    <div
      className="
        w-full
        h-screen
        bg-black
        text-white
        overflow-hidden
      "
    >

      {/* ====================================================== */}
      {/* TOP */}
      {/* ====================================================== */}

      <div
        className="
          border-b
          border-zinc-800
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
          "
        >

          <BTCPriceCard />

          <div
            className="
              text-sm
              text-zinc-400
            "
          >

            Selected:
            {" "}
            {symbol.toUpperCase()}

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* BODY */}
      {/* ====================================================== */}

      <div
        className="
          grid
          grid-cols-12
          gap-4
          p-4
          h-[calc(100vh-90px)]
        "
      >

        {/* ====================================================== */}
        {/* LEFT */}
        {/* ====================================================== */}

        <div
          className="
            col-span-3
            space-y-4
            overflow-y-auto
          "
        >

          <div
            className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-4
            "
          >

            <div
              className="
                text-sm
                font-semibold
                mb-4
              "
            >

              Orderbook

            </div>

            <Orderbook

              bids={
                (
                  orderbook?.bids || []
                ).map((b) => ({

                  price: b.price,

                  qty: b.quantity,

                }))
              }

              asks={
                (
                  orderbook?.asks || []
                ).map((a) => ({

                  price: a.price,

                  qty: a.quantity,

                }))
              }

            />

          </div>

          <div
            className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-4
            "
          >

            <div
              className="
                text-sm
                font-semibold
                mb-4
              "
            >

              Liquidity Heatmap

            </div>

            <Heatmap
              levels={
                flattenedHeatLevels
              }
            />

          </div>

        </div>

        {/* ====================================================== */}
        {/* CENTER */}
        {/* ====================================================== */}

        <div
          className="
            col-span-6
            space-y-4
            overflow-y-auto
          "
        >

          <div
            className="
              bg-zinc-950
              border
              border-zinc-800
              rounded-2xl
              p-4
            "
          >

            <TradingChart
              data={candles}
            />

          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-4
            "
          >

            <div
              className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                p-4
              "
            >

              <MarketOverview />

            </div>

            <div
              className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                p-4
              "
            >

              <CVDPanel />

            </div>

          </div>

        </div>

        {/* ====================================================== */}
        {/* RIGHT */}
        {/* ====================================================== */}

        <div
          className="
            col-span-3
            overflow-y-auto
          "
        >

          <RightPanelTabs

            liquidityEvents={
              liquidityEvents
            }

            liquidations={
              liquidations
            }

            heatmapHistory={
              heatmapHistory
            }

          />

        </div>

      </div>

    </div>

  )

}