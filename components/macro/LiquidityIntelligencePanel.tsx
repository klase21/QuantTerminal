// ======================================================
// components/macro/LiquidityIntelligencePanel.tsx
// Calculated Liquidity Intelligence
// ======================================================

"use client"

import {
  Droplets,
  Gauge,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import {
  calculateLiquidityIntelligence,
} from "@/lib/macro/calculateLiquidityIntelligence"

interface Props {
  items: any[]
}

function getRegimeClass(
  regime: string
) {
  if (regime === "RISK_ON") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (regime === "RISK_OFF") {
    return "border-red-500/30 bg-red-500/10 text-red-300"
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function getDriverClass(
  impact: string
) {
  if (impact === "positive") {
    return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
  }

  if (impact === "negative") {
    return "text-red-300 bg-red-500/10 border-red-500/20"
  }

  return "text-zinc-400 bg-zinc-900/70 border-zinc-800"
}

export default function LiquidityIntelligencePanel({
  items,
}: Props) {
  const liquidity =
    calculateLiquidityIntelligence(items)

  const positiveDrivers =
    liquidity.drivers.filter(
      (driver) =>
        driver.impact === "positive"
    ).length

  const negativeDrivers =
    liquidity.drivers.filter(
      (driver) =>
        driver.impact === "negative"
    ).length

  return (
    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950/80
        p-3
      "
    >
      <div
        className="
          mb-3
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-2
              text-sm
              font-bold
              text-white
            "
          >
            <Droplets
              size={14}
              className="text-sky-400"
            />
            Liquidity Intelligence
          </div>

          <div
            className="
              mt-1
              text-[11px]
              text-zinc-500
            "
          >
            Calculated from DXY / US10Y / NASDAQ / crypto confirmation
          </div>
        </div>

        <div
          className={`
            rounded-full
            border
            px-2.5
            py-1
            text-[10px]
            font-bold
            ${getRegimeClass(liquidity.regime)}
          `}
        >
          {liquidity.regime}
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-3
          gap-2
        "
      >
        <div
          className="
            rounded-lg
            border
            border-zinc-800
            bg-black/40
            p-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              text-zinc-500
            "
          >
            <Gauge size={11} />
            Score
          </div>

          <div
            className={`
              mt-1
              text-xl
              font-black
              ${
                liquidity.score >= 62
                  ? "text-emerald-400"
                  : liquidity.score <= 38
                    ? "text-red-400"
                    : "text-zinc-200"
              }
            `}
          >
            {liquidity.score}
          </div>
        </div>

        <div
          className="
            rounded-lg
            border
            border-zinc-800
            bg-black/40
            p-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              text-zinc-500
            "
          >
            <TrendingUp size={11} />
            Support
          </div>

          <div
            className="
              mt-1
              text-xl
              font-black
              text-emerald-400
            "
          >
            {positiveDrivers}
          </div>
        </div>

        <div
          className="
            rounded-lg
            border
            border-zinc-800
            bg-black/40
            p-2
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              text-[10px]
              text-zinc-500
            "
          >
            <TrendingDown size={11} />
            Pressure
          </div>

          <div
            className="
              mt-1
              text-xl
              font-black
              text-red-400
            "
          >
            {negativeDrivers}
          </div>
        </div>
      </div>

      <div
        className="
          mt-3
          h-1.5
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
              liquidity.regime === "RISK_ON"
                ? "bg-emerald-400"
                : liquidity.regime === "RISK_OFF"
                  ? "bg-red-400"
                  : "bg-zinc-400"
            }
          `}
          style={{
            width: `${liquidity.score}%`,
          }}
        />
      </div>

      <div
        className="
          mt-3
          grid
          grid-cols-1
          gap-1.5
        "
      >
        {liquidity.drivers.map(
          (driver) => (
            <div
              key={driver.label}
              className="
                flex
                items-center
                justify-between
                gap-2
                rounded-lg
                border
                border-zinc-800
                bg-black/30
                px-2
                py-1.5
              "
            >
              <div
                className="
                  min-w-0
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      text-[11px]
                      font-bold
                      text-zinc-200
                    "
                  >
                    {driver.label}
                  </span>

                  <span
                    className={`
                      rounded
                      border
                      px-1.5
                      py-0.5
                      text-[10px]
                      font-bold
                      ${getDriverClass(driver.impact)}
                    `}
                  >
                    {driver.value}
                  </span>
                </div>

                <div
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    text-zinc-500
                  "
                >
                  {driver.description}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
