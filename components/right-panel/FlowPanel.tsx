"use client"

import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react"

type Props = {
  trades: any[]
  flow: any
}

function FlowPulseLane({
  side,
  pressure,
  trades,
}: {
  side: "buy" | "sell"
  pressure: number
  trades: any[]
}) {
  const isBuy = side === "buy"
  const visiblePressure = Math.max(8, Math.min(100, pressure))
  const activeTrades = trades.filter((trade) => trade?.side === side).slice(0, 18)
  const pulseCount = Math.max(4, Math.min(12, Math.ceil(activeTrades.length / 2) || Math.round(visiblePressure / 10)))
  const speed = Math.max(1.15, 3.2 - visiblePressure / 45)
  const glow = Math.max(0.22, visiblePressure / 100)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black/80 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
        <span className={isBuy ? "text-green-300" : "text-red-300"}>{isBuy ? "Buy Flow" : "Sell Flow"}</span>
        <span className="text-zinc-500">{pressure.toFixed(0)}%</span>
      </div>

      <div className="relative h-12 overflow-hidden rounded-xl bg-zinc-950">
        <div
          className={`absolute inset-y-0 ${isBuy ? "left-0 bg-green-500/10" : "right-0 bg-red-500/10"}`}
          style={{ width: `${visiblePressure}%` }}
        />

        <div className="absolute inset-x-3 top-1/2 h-px bg-zinc-800" />

        {Array.from({ length: pulseCount }).map((_, index) => {
          const size = 4 + ((index % 3) * 2)
          const opacity = Math.max(0.25, Math.min(0.95, glow + (index % 4) * 0.06))

          return (
            <span
              key={`${side}-${index}`}
              className={`absolute top-1/2 rounded-full ${isBuy ? "qt-trade-flow-buy bg-green-400 shadow-[0_0_14px_rgba(74,222,128,.65)]" : "qt-trade-flow-sell bg-red-400 shadow-[0_0_14px_rgba(248,113,113,.65)]"}`}
              style={{
                width: size,
                height: size,
                opacity,
                animationDelay: `${index * 0.18}s`,
                animationDuration: `${speed + (index % 4) * 0.2}s`,
              }}
            />
          )
        })}

        <div className={`absolute inset-y-0 w-16 ${isBuy ? "left-0 bg-gradient-to-r from-black to-transparent" : "right-0 bg-gradient-to-l from-black to-transparent"}`} />
        <div className={`absolute inset-y-0 w-16 ${isBuy ? "right-0 bg-gradient-to-l from-black to-transparent" : "left-0 bg-gradient-to-r from-black to-transparent"}`} />
      </div>
    </div>
  )
}

export default function FlowPanel({
  trades,
  flow,
}: Props) {

  const safeTrades =
    flow?.trades?.length
      ? flow.trades
      : trades || []

  const recentTrades =
    [...safeTrades]
      .slice(0, 120)

  const rollingBuyVolume = recentTrades
    .filter((trade) => trade?.side === "buy")
    .reduce((sum, trade) => sum + Number(trade?.qty || 0), 0)

  const rollingSellVolume = recentTrades
    .filter((trade) => trade?.side === "sell")
    .reduce((sum, trade) => sum + Number(trade?.qty || 0), 0)

  const buyVolume =
    Number.isFinite(Number(flow?.buyVolume)) && Number(flow?.buyVolume) > 0
      ? Number(flow?.buyVolume)
      : rollingBuyVolume

  const sellVolume =
    Number.isFinite(Number(flow?.sellVolume)) && Number(flow?.sellVolume) > 0
      ? Number(flow?.sellVolume)
      : rollingSellVolume

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

  const delta = Number.isFinite(Number(flow?.delta))
    ? Number(flow?.delta)
    : buyVolume - sellVolume
  const cvd = Number(flow?.cvd || 0)
  const pressureGap = Math.abs(buyPressure - sellPressure)
  const dominantSide =
    buyPressure >= 55
      ? "buy"
      : sellPressure >= 55
      ? "sell"
      : "neutral"

  const isDeltaBullish = delta >= 0 && cvd >= 0
  const isDeltaBearish = delta < 0 && cvd < 0
  const hasAbsorption =
    pressureGap >= 18 &&
    ((dominantSide === "sell" && delta > -0.2) ||
      (dominantSide === "buy" && delta < 0.2))

  const executionScore = Math.max(0, Math.min(100, Math.round(
    pressureGap * 0.72 +
    (tradeIntensity === "EXTREME" ? 28 : tradeIntensity === "HIGH" ? 20 : tradeIntensity === "NORMAL" ? 12 : 5) +
    (Math.abs(delta) * 7)
  )))

  const executionAction =
    dominantSide === "buy" && isDeltaBullish && executionScore >= 55
      ? "LONG SCALP SETUP"
      : dominantSide === "sell" && isDeltaBearish && executionScore >= 55
      ? "SHORT SCALP SETUP"
      : hasAbsorption
      ? "ABSORPTION WATCH"
      : pressureGap < 12
      ? "WAIT / NO EDGE"
      : "WAIT FOR CONFIRM"

  const actionColor =
    executionAction.includes("LONG")
      ? "text-green-300"
      : executionAction.includes("SHORT")
      ? "text-red-300"
      : executionAction.includes("ABSORPTION")
      ? "text-yellow-300"
      : "text-zinc-300"

  const tacticalTriggers = [
    dominantSide === "sell"
      ? "Sell pressure fading below 60%"
      : dominantSide === "buy"
      ? "Buy pressure holding above 55%"
      : "Pressure expansion above 55%",
    hasAbsorption
      ? "Absorption already visible: watch reversal candle"
      : "Absorption trigger: pressure high but delta stops extending",
    cvd < 0
      ? "CVD recovery through zero"
      : "CVD continuation without divergence",
  ]

  const universeRead =
    dominantSide === "sell"
      ? "Universe rotation is under short-term execution pressure. Validate sector strength before chasing."
      : dominantSide === "buy"
      ? "Execution flow supports narrative continuation. Watch for rotation follow-through."
      : "Flow is balanced. Universe signal needs cleaner directional confirmation."

  const riskNote =
    tradeIntensity === "EXTREME"
      ? "High-speed tape: avoid late entries unless trigger is already confirmed."
      : hasAbsorption
      ? "Absorption risk: dominant side may be running into passive liquidity."
      : "Normal execution risk. Let trigger confirm before sizing."

  return (

    <div
      className="
        flex
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
            flex
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

          <div
            className="
              h-full
              bg-red-500
            "
            style={{
              width: `${sellPressure}%`,
            }}
          />

        </div>

        <div
          className="
            mt-3
            grid
            gap-2
            md:grid-cols-2
          "
        >
          <FlowPulseLane
            side="buy"
            pressure={buyPressure}
            trades={recentTrades}
          />

          <FlowPulseLane
            side="sell"
            pressure={sellPressure}
            trades={recentTrades}
          />
        </div>

      </div>

      {/* SUMMARY */}

      <div
        className="
          grid
          shrink-0
          grid-cols-4
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
            border-green-900/40
            bg-green-500/10
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Buy Volume
            </div>

            <ArrowUpRight
              size={14}
              className="text-green-400"
            />

          </div>

          <div
            className="
              mt-2
              text-lg
              font-bold
              text-green-400
            "
          >
            {buyVolume.toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-red-900/40
            bg-red-500/10
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Sell Volume
            </div>

            <ArrowDownRight
              size={14}
              className="text-red-400"
            />

          </div>

          <div
            className="
              mt-2
              text-lg
              font-bold
              text-red-400
            "
          >
            {sellVolume.toFixed(2)}
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
              Delta / CVD
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
                delta >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            `}
          >
            Δ {Number(
              delta
            ).toFixed(2)}
          </div>

          <div
            className={`
              mt-1
              text-xs
              ${
                cvd >= 0
                  ? "text-green-300"
                  : "text-red-300"
              }
            `}
          >
            CVD {Number(
              cvd
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

          <div
            className="
              mt-1
              text-xs
              text-zinc-500
            "
          >
            {recentTrades.length} trades
          </div>

        </div>

      </div>

      {/* EXECUTION BIAS */}

      <div
        className="
          shrink-0
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
              flex
              items-center
              justify-between
              text-xs
              uppercase
              tracking-wide
              text-zinc-500
            "
          >
            <span>Execution Intelligence</span>
            <span className="rounded-full border border-zinc-800 bg-black px-2 py-1 text-[10px] text-cyan-300">
              Score {executionScore}
            </span>
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

          <div className={`mt-2 text-xl font-bold ${actionColor}`}>
            {executionAction}
          </div>

          <div
            className="
              mt-3
              text-sm
              text-zinc-500
            "
          >
            Aggressive execution pressure inferred from
            recent market orders, CVD and delta imbalance.
          </div>

        </div>


        <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
            Risk / Invalidation
          </div>

          <div className="text-sm text-zinc-300">
            {riskNote}
          </div>
        </div>

      </div>

    </div>

  )

}
