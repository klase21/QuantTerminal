// ======================================================
// components/macro/MacroCard.tsx
// ======================================================

import {
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react"

interface Props {

  item: any

}

export default function MacroCard({
  item,
}: Props) {

  const change =
    item.changePercent || 0

  const positive =
    change >= 0

  // ======================================================
  // COLORS
  // ======================================================

  const changeColor =
    positive
      ? "text-emerald-400"
      : "text-red-400"

  const bgColor =
    positive
      ? "bg-emerald-500/10"
      : "bg-red-500/10"

  const borderColor =
    positive
      ? "border-emerald-500/20"
      : "border-red-500/20"

  // ======================================================
  // TREND
  // ======================================================

  function TrendIcon() {

    if (change > 0) {

      return (

        <ArrowUp
          size={14}
          className="
            text-emerald-400
          "
        />

      )

    }

    if (change < 0) {

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
  // MARKET INTERPRETATION
  // ======================================================

  function getMacroSignal() {

    const symbol =
      item.symbol

    // DXY

    if (
      symbol.includes("DX")
    ) {

      return positive

        ? {
            text:
              "BTC Pressure",
            color:
              "text-red-400",
          }

        : {
            text:
              "Risk Support",
            color:
              "text-emerald-400",
          }

    }

    // US10Y

    if (
      symbol.includes("^TNX")
    ) {

      return positive

        ? {
            text:
              "NASDAQ Pressure",
            color:
              "text-red-400",
          }

        : {
            text:
              "Tech Relief",
            color:
              "text-emerald-400",
          }

    }

    // GOLD

    if (
      symbol.includes("GC")
    ) {

      return positive

        ? {
            text:
              "Safe Haven Bid",
            color:
              "text-yellow-400",
          }

        : {
            text:
              "Risk Rotation",
            color:
              "text-zinc-400",
          }

    }

    // OIL

    if (
      symbol.includes("CL")
    ) {

      return positive

        ? {
            text:
              "Inflation Watch",
            color:
              "text-orange-400",
          }

        : {
            text:
              "Demand Weakness",
            color:
              "text-zinc-400",
          }

    }

    return {

      text:
        positive
          ? "Bullish"
          : "Bearish",

      color:
        positive
          ? "text-emerald-400"
          : "text-red-400",

    }

  }

  const signal =
    getMacroSignal()

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className={`
        rounded-2xl
        border

        ${borderColor}

        bg-zinc-900/80

        p-4

        transition-all
        hover:border-zinc-700
      `}
    >

      {/* TOP */}

      <div
        className="
          flex
          items-start
          justify-between
        "
      >

        <div>

          <div
            className="
              text-sm
              font-semibold
              text-white
            "
          >

            {item.label}

          </div>

          <div
            className="
              mt-1
              text-xs
              text-zinc-500
            "
          >

            {item.symbol}

          </div>

        </div>

        <div
          className={`
            flex
            items-center
            gap-1

            rounded-full
            px-2
            py-1

            ${bgColor}
          `}
        >

          <TrendIcon />

          <div
            className={`
              text-xs
              font-bold

              ${changeColor}
            `}
          >

            {positive ? "+" : ""}

            {change.toFixed(2)}%

          </div>

        </div>

      </div>

      {/* PRICE */}

      <div
        className="
          mt-4
          text-2xl
          font-bold
          text-white
        "
      >

        {
          item.price?.toLocaleString()
        }

      </div>

      {/* SIGNAL */}

      <div
        className="
          mt-3
          flex
          items-center
          justify-between
        "
      >

        <div
          className="
            text-xs
            text-zinc-500
          "
        >

          Market Signal

        </div>

        <div
          className={`
            text-xs
            font-medium

            ${signal.color}
          `}
        >

          {signal.text}

        </div>

      </div>

      {/* REALTIME BAR */}

      <div
        className="
          mt-3
          h-1
          overflow-hidden
          rounded-full
          bg-zinc-800
        "
      >

        <div
          className={`
            h-full
            rounded-full

            ${
              positive
                ? "bg-emerald-400"
                : "bg-red-400"
            }
          `}
          style={{
            width: `${Math.min(
              Math.abs(change) * 15,
              100
            )}%`,
          }}
        />

      </div>

    </div>

  )

}