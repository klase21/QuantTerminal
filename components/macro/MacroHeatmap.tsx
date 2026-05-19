// ======================================================
// components/macro/MacroHeatmap.tsx
// TradingView Style Macro Heatmap
// ======================================================

"use client"

import {
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react"

interface MacroItem {

  symbol: string

  label: string

  price: number

  changePercent: number

}

interface Props {

  items?: MacroItem[]

}

export default function MacroHeatmap({
  items = [],
}: Props) {

  // ======================================================
  // SAFETY
  // ======================================================

  if (!Array.isArray(items)) {

    return null

  }

  // ======================================================
  // SIGNAL
  // ======================================================

  function getSignal(
    item: MacroItem
  ) {

    const symbol =
      item.symbol || ""

    const positive =
      item.changePercent >= 0

    // DXY

    if (
      symbol.includes("DX")
    ) {

      return positive

        ? {
            sentiment:
              "BTC Pressure",

            impact:
              "Risk-Off",
          }

        : {
            sentiment:
              "Liquidity Support",

            impact:
              "Risk-On",
          }

    }

    // US10Y

    if (
      symbol.includes("^TNX")
    ) {

      return positive

        ? {
            sentiment:
              "Yield Spike",

            impact:
              "Tech Pressure",
          }

        : {
            sentiment:
              "Yield Relief",

            impact:
              "Tech Support",
          }

    }

    // GOLD

    if (
      symbol.includes("GC")
    ) {

      return positive

        ? {
            sentiment:
              "Safe Haven Flow",

            impact:
              "Fear Bid",
          }

        : {
            sentiment:
              "Risk Rotation",

            impact:
              "Growth Assets",
          }

    }

    // OIL

    if (
      symbol.includes("CL")
    ) {

      return positive

        ? {
            sentiment:
              "Inflation Risk",

            impact:
              "Cost Pressure",
          }

        : {
            sentiment:
              "Demand Weakness",

            impact:
              "Disinflation",
          }

    }

    return {

      sentiment:
        positive
          ? "Bullish"
          : "Bearish",

      impact:
        positive
          ? "Positive"
          : "Negative",

    }

  }

  // ======================================================
  // COLOR SYSTEM
  // ======================================================

  function getHeatColor(
    change: number
  ) {

    if (change >= 2) {

      return `
        bg-emerald-500/30
        border-emerald-500/40
        hover:bg-emerald-500/40
      `

    }

    if (change > 0) {

      return `
        bg-emerald-500/15
        border-emerald-500/20
        hover:bg-emerald-500/25
      `

    }

    if (change <= -2) {

      return `
        bg-red-500/30
        border-red-500/40
        hover:bg-red-500/40
      `

    }

    if (change < 0) {

      return `
        bg-red-500/15
        border-red-500/20
        hover:bg-red-500/25
      `

    }

    return `
      bg-zinc-900
      border-zinc-800
      hover:bg-zinc-800
    `

  }

  // ======================================================
  // ICON
  // ======================================================

  function TrendIcon({
    value,
  }: {
    value: number
  }) {

    if (value > 0) {

      return (

        <ArrowUp
          size={14}
          className="
            text-emerald-400
          "
        />

      )

    }

    if (value < 0) {

      return (

        <ArrowDown
          size={14}
          className="
            text-red-400
          "
        />

      )

    }

    return (

      <Minus
        size={14}
        className="
          text-zinc-500
        "
      />

    )

  }

  // ======================================================
  // EMPTY
  // ======================================================

  if (items.length === 0) {

    return (

      <div
        className="
          rounded-2xl
          border
          border-zinc-800
          bg-zinc-950
          p-6
          text-zinc-500
          text-sm
        "
      >

        No macro heatmap data

      </div>

    )

  }

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
        p-4
      "
    >

      <div
        className="
          mb-4
          flex
          items-center
          justify-between
        "
      >

        <div>

          <div
            className="
              text-sm
              font-bold
              text-white
            "
          >

            MACRO HEATMAP

          </div>

          <div
            className="
              mt-1
              text-xs
              text-zinc-500
            "
          >

            TradingView-style cross-market heatmap

          </div>

        </div>

      </div>

      <div
        className="
          grid
          grid-cols-2
          gap-3
        "
      >

        {items.map((item) => {

          const signal =
            getSignal(item)

          const positive =
            item.changePercent >= 0

          return (

            <div
              key={item.symbol}
              className={`
                rounded-2xl
                border
                p-4
                transition-all
                duration-200
                ${getHeatColor(
                  item.changePercent
                )}
              `}
            >

              {/* content */}

            </div>

          )

        })}

      </div>

    </div>

  )

}