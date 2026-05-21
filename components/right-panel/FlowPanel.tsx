"use client"

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Waves,
} from "lucide-react"

type Props = {
  trades: any[]
  flow: any
}

export default function FlowPanel({
  trades,
  flow,
}: Props) {

  const safeTrades =
    trades || []

  const recentTrades =
    [...safeTrades]
      .reverse()
      .slice(0, 120)

  const buyVolume =
    Number(flow?.buyVolume || 0)

  const sellVolume =
    Number(flow?.sellVolume || 0)

  const totalVolume =
    buyVolume + sellVolume

  const buyPressure =
    totalVolume > 0
      ? (buyVolume / totalVolume) * 100
      : 50

  const sellPressure =
    100 - buyPressure

  const tradeIntensity =
    recentTrades.length > 120
      ? "EXTREME"
      : recentTrades.length > 80
      ? "HIGH"
      : recentTrades.length > 40
      ? "NORMAL"
      : "LOW"

  const intensityColor =
    tradeIntensity === "EXTREME"
      ? "text-yellow-400"
      : tradeIntensity === "HIGH"
      ? "text-orange-400"
      : tradeIntensity === "NORMAL"
      ? "text-cyan-400"
      : "text-zinc-500"

  return (

    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
      "
    >

      {/* HEADER */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div
          className="
            text-sm
            font-semibold
            text-white
          "
        >
          Trade Flow
        </div>

        <div
          className="
            mt-1
            text-xs
            text-zinc-500
          "
        >
          Execution pressure & delta analysis
        </div>

      </div>

      {/* PRESSURE */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-800
          p-4
        "
      >

        <div
          className="
            mb-3
            flex
            items-center
            justify-between
          "
        >

          <div>

            <div
              className="
                text-[11px]
                text-zinc-500
              "
            >
              Buy Pressure
            </div>

            <div
              className="
                mt-1
                text-2xl
                font-bold
                text-green-400
              "
            >
              {buyPressure.toFixed(0)}%
            </div>

          </div>

          <div className="text-right">

            <div
              className="
                text-[11px]
                text-zinc-500
              "
            >
              Sell Pressure
            </div>

            <div
              className="
                mt-1
                text-2xl
                font-bold
                text-red-400
              "
            >
              {sellPressure.toFixed(0)}%
            </div>

          </div>

        </div>

        <div
          className="
            h-2
            overflow-hidden
            rounded-full
            bg-zinc-900
          "
        >

          <div
            className="
              h-full
              bg-green-500
            "
            style={{
              width: `${buyPressure}%`,
            }}
          />

        </div>

      </div>

      {/* SUMMARY */}

      <div
        className="
          grid
          shrink-0
          grid-cols-3
          gap-2
          border-b
          border-zinc-800
          p-3
        "
      >

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Delta
            </div>

            <ArrowUpRight
              size={14}
              className="text-green-400"
            />

          </div>

          <div
            className={`
              mt-2
              text-lg
              font-bold
              ${
                (flow?.delta || 0) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            `}
          >
            Δ {Number(
              flow?.delta || 0
            ).toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              CVD
            </div>

            <Waves
              size={14}
              className="text-cyan-400"
            />

          </div>

          <div
            className={`
              mt-2
              text-lg
              font-bold
              ${
                (flow?.cvd || 0) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            `}
          >
            {Number(
              flow?.cvd || 0
            ).toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Intensity
            </div>

            <Activity
              size={14}
              className={intensityColor}
            />

          </div>

          <div
            className={`
              mt-2
              text-lg
              font-bold
              ${intensityColor}
            `}
          >
            {tradeIntensity}
          </div>

        </div>

      </div>

      {/* EXECUTION BIAS */}

      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          p-4
        "
      >

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-950/40
            p-4
          "
        >

          <div
            className="
              mb-3
              text-xs
              uppercase
              tracking-wide
              text-zinc-500
            "
          >
            Execution Bias
          </div>

          <div
            className={`
              text-3xl
              font-bold
              ${
                buyPressure >= 55
                  ? "text-green-400"
                  : sellPressure >= 55
                  ? "text-red-400"
                  : "text-yellow-400"
              }
            `}
          >
            {
              buyPressure >= 55
                ? "BUYERS ACTIVE"
                : sellPressure >= 55
                ? "SELLERS ACTIVE"
                : "BALANCED"
            }
          </div>

          <div
            className="
              mt-3
              text-sm
              text-zinc-500
            "
          >
            Aggressive execution pressure inferred from
            recent market orders and delta imbalance.
          </div>

        </div>

      </div>

    </div>

  )

}
