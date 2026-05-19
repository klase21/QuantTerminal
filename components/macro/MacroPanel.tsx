// ======================================================
// components/macro/MacroPanel.tsx
// ======================================================

"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import MacroCard
  from "./MacroCard"

import {
  detectRiskMode,
} from "@/lib/macro/detectRiskMode"

import {
  buildMacroSignals,
} from "@/lib/macro/buildMacroSignals"

import {
  detectMacroPressureAlerts,
} from "@/lib/macro/detectMacroPressureAlerts"

export default function MacroPanel() {

  const [items, setItems] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(true)

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

      setItems(json)

      setUpdatedAt(Date.now())

    } catch (err) {

      console.error(
        "MACRO LOAD ERROR:",
        err
      )

    } finally {

      setLoading(false)

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
  // ALERTS
  // ======================================================

  const alerts =
    useMemo(() => {

      return detectMacroPressureAlerts(
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
          ALERTS
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

          Macro Pressure Alerts

        </div>

        <div
          className="
            space-y-2
          "
        >

          {alerts.length === 0 && (

            <div
              className="
                text-xs
                text-zinc-500
              "
            >

              No active pressure alerts

            </div>

          )}

          {alerts.map(
            (
              alert: any,
              idx: number
            ) => (

              <div
                key={idx}
                className={`
                  rounded-lg
                  border

                  px-3
                  py-2

                  text-xs
                  font-medium

                  ${
                    alert.type === "bearish"

                      ? `
                        border-red-500/30
                        bg-red-500/10
                        text-red-300
                      `

                      : `
                        border-green-500/30
                        bg-green-500/10
                        text-green-300
                      `
                  }
                `}
              >

                {alert.message}

              </div>

            )
          )}

        </div>

      </div>

      {/* ======================================================
          BODY
      ====================================================== */}

      <div
        className="
          flex-1
          overflow-y-auto

          grid
          grid-cols-1
          gap-3

          p-4
        "
      >

        {
          loading && (

            <div
              className="
                text-sm
                text-zinc-500
              "
            >

              Loading macro data...

            </div>

          )
        }

        {
          items.map((item) => (

            <MacroCard
              key={item.symbol}
              item={item}
            />

          ))
        }

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