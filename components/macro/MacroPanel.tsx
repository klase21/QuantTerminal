// ======================================================
// components/macro/MacroPanel.tsx
// ======================================================

"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  detectRiskMode,
} from "@/lib/macro/detectRiskMode"

import {
  buildMacroSignals,
} from "@/lib/macro/buildMacroSignals"


import NarrativeHeatmap
  from "./NarrativeHeatmap"

import NarrativeDivergence
  from "./NarrativeDivergence"


import LiquidityIntelligencePanel
  from "./LiquidityIntelligencePanel"

import {
  MACRO_TICKER_FALLBACK,
} from "@/lib/macroTicker"

export default function MacroPanel() {

  const [items, setItems] =
    useState<any[]>([])

  const [updatedAt, setUpdatedAt] =
    useState<number | null>(null)

  // ======================================================
  // LOAD
  // ======================================================

  async function load() {

    try {

      const res =
        await fetch("/api/macro", {

          cache: "no-store",

        })

      const json =
        await res.json()

      const nextItems =
        Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
            ? json.items
            : []

      setItems(
        nextItems.length > 0
          ? nextItems
          : MACRO_TICKER_FALLBACK
      )

      setUpdatedAt(
        json?.updatedAt || Date.now()
      )

    } catch (err) {

      console.error(
        "MACRO LOAD ERROR:",
        err
      )
    }

  }

  // ======================================================
  // POLLING
  // ======================================================

  useEffect(() => {

    load()

    const interval =
      setInterval(
        load,
        10000
      )

    return () =>
      clearInterval(interval)

  }, [])

  // ======================================================
  // RISK MODE
  // ======================================================

  const risk =
    useMemo(() => {

      return detectRiskMode(
        items
      )

    }, [items])

  // ======================================================
  // SIGNALS
  // ======================================================

  const signals =
    useMemo(() => {

      return buildMacroSignals(
        items
      )

    }, [items])

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        h-full
        flex
        flex-col
        overflow-hidden
      "
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          flex
          items-center
          justify-between

          px-4
          py-3

          border-b
          border-zinc-800

          bg-black/80
          backdrop-blur
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

            SENTIMENT OVERVIEW

          </div>

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Cross-asset liquidity positioning

          </div>

        </div>

        <div
          className={`
            px-3
            py-1
            rounded-full
            text-xs
            font-bold

            ${
              risk.mode === "RISK_ON"

                ? "bg-green-500/20 text-green-400"

              : risk.mode === "RISK_OFF"

                ? "bg-red-500/20 text-red-400"

              : "bg-zinc-800 text-zinc-400"
            }
          `}
        >

          {risk.mode}

        </div>
</div>

      {/* ======================================================
          SENTIMENT SCORE
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-3
          gap-3

          p-4

          border-b
          border-zinc-800
        "
      >

        <div
          className="
            rounded-xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Sentiment Score

          </div>

          <div
            className={`
              mt-1
              text-2xl
              font-bold

              ${
                risk.score > 0

                  ? "text-green-400"

                  : risk.score < 0

                    ? "text-red-400"

                    : "text-zinc-300"
              }
            `}
          >

            {risk.score}

          </div>

        </div>

        <div
          className="
            rounded-xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Bullish Signals

          </div>

          <div
            className="
              mt-1
              text-2xl
              font-bold
              text-green-400
            "
          >

            {signals.bullish.length}

          </div>

        </div>

        <div
          className="
            rounded-xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Bearish Signals

          </div>

          <div
            className="
              mt-1
              text-2xl
              font-bold
              text-red-400
            "
          >

            {signals.bearish.length}

          </div>

        </div>
</div>

      {/* ======================================================
          LIQUIDITY INTELLIGENCE
      ====================================================== */}

      <div
        className="
          p-4
          border-b
          border-zinc-800
        "
      >

        <LiquidityIntelligencePanel
          items={items}
        />

      </div>

      {/* ======================================================
          NARRATIVE INTELLIGENCE
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-2
          gap-3

          p-4

          border-b
          border-zinc-800
        "
      >

        <NarrativeHeatmap />

        <NarrativeDivergence />

</div>

      {/* ======================================================
          SIGNAL BREAKDOWN
      ====================================================== */}

      <div
        className="
          p-4
          border-b
          border-zinc-800
        "
      >

        <div
          className="
            mb-3
            text-sm
            font-semibold
            text-white
          "
        >

          Signal Breakdown

        </div>

        <div
          className="
            space-y-2
          "
        >

          {signals.all.map(
            (
              signal: any,
              idx: number
            ) => (

              <div
                key={idx}
                className="
                  flex
                  items-center
                  justify-between

                  rounded-lg
                  border
                  border-zinc-800

                  bg-zinc-900/60

                  px-3
                  py-2
                "
              >

                <div
                  className="
                    text-xs
                    text-zinc-300
                  "
                >

                  {signal.label}

                </div>

                <div
                  className={`
                    text-xs
                    font-semibold

                    ${
                      signal.bias === "bullish"

                        ? "text-green-400"

                        : "text-red-400"
                    }
                  `}
                >

                  {signal.message}

                </div>

              </div>

            )
          )}

        </div>
</div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div
        className="
          px-4
          py-2

          border-t
          border-zinc-800

          text-[11px]
          text-zinc-500
        "
      >

        {
          updatedAt && (

            <div>

              Updated: {

                new Date(updatedAt)
                  .toLocaleTimeString()

              }

            </div>

          )
        }

      </div>

    </div>

  )

}