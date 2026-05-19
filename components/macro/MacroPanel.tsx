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
  // UI
  // ======================================================

  return (

    <div
      className="
        h-full
        flex
        flex-col
      "
    >

      {/* HEADER */}

      <div
        className="
          sticky
          top-0
          z-10

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

            MACRO INTEL

          </div>

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Yahoo Realtime Feed

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

      {/* BODY */}

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

      {/* FOOTER */}

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