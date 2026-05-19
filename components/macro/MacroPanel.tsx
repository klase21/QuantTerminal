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

import MacroTickerStrip
  from "./MacroTickerStrip"

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
  // MARKET STATS
  // ======================================================

  const gainers =
    items.filter(
      (i) =>
        i.changePercent > 0
    ).length

  const losers =
    items.filter(
      (i) =>
        i.changePercent < 0
    ).length

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
          sticky
          top-0
          z-20

          border-b
          border-zinc-800

          bg-black/90
          backdrop-blur
        "
      >

        {/* TOP */}

        <div
          className="
            flex
            items-center
            justify-between

            px-4
            py-3
          "
        >

          <div>

            <div
              className="
                text-sm
                font-bold
                tracking-wide
                text-white
              "
            >

              MACRO INTEL

            </div>

            <div
              className="
                mt-1
                text-[11px]
                text-zinc-500
              "
            >

              Yahoo Finance Realtime Feed

            </div>

          </div>

          {/* RISK BADGE */}

          <div
            className={`
              px-3
              py-1.5
              rounded-full

              text-xs
              font-bold
              tracking-wide

              border

              ${
                risk.mode === "RISK_ON"

                  ? `
                    border-emerald-500/30
                    bg-emerald-500/15
                    text-emerald-400
                  `

                  : risk.mode === "RISK_OFF"

                  ? `
                    border-red-500/30
                    bg-red-500/15
                    text-red-400
                  `

                  : `
                    border-zinc-700
                    bg-zinc-800
                    text-zinc-400
                  `
              }
            `}
          >

            {risk.mode}

          </div>

        </div>

        {/* ======================================================
            RISK SCORE BAR
        ====================================================== */}

        <div
          className="
            px-4
            pb-3
          "
        >

          <div
            className="
              flex
              items-center
              justify-between

              mb-1

              text-[11px]
              text-zinc-500
            "
          >

            <span>
              Macro Risk Score
            </span>

            <span>

              {risk.score}

            </span>

          </div>

          <div
            className="
              h-2
              rounded-full
              overflow-hidden
              bg-zinc-800
            "
          >

            <div
              className={`
                h-full
                transition-all
                duration-500

                ${
                  risk.mode === "RISK_ON"

                    ? "bg-emerald-400"

                    : risk.mode === "RISK_OFF"

                    ? "bg-red-400"

                    : "bg-zinc-500"
                }
              `}
              style={{

                width: `${Math.min(
                  100,
                  Math.abs(risk.score) * 10
                )}%`,

              }}
            />

          </div>

        </div>

        {/* ======================================================
            TICKER STRIP
        ====================================================== */}

        <MacroTickerStrip
          items={items}
        />

      </div>

      {/* ======================================================
          BODY
      ====================================================== */}

      <div
        className="
          flex-1
          overflow-y-auto

          p-4

          grid
          grid-cols-1
          gap-3
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
          !loading &&
          items.length === 0 && (

            <div
              className="
                text-sm
                text-red-400
              "
            >

              Failed to load macro data

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
          border-t
          border-zinc-800

          px-4
          py-3

          bg-zinc-950
        "
      >

        <div
          className="
            flex
            items-center
            justify-between

            text-[11px]
            text-zinc-500
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <span>

              ↑ {gainers}

            </span>

            <span>

              ↓ {losers}

            </span>

          </div>

          {
            updatedAt && (

              <div>

                Updated {

                  new Date(updatedAt)
                    .toLocaleTimeString()

                }

              </div>

            )
          }

        </div>

      </div>

    </div>

  )

}