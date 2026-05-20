// ======================================================
// components/macro/NarrativeDivergence.tsx
// TOP REGIONAL NARRATIVE DIVERGENCE
// ======================================================

"use client"

import { useEffect, useState } from "react"

interface DivergenceRow {
  narrative: string
  kr: number
  cn: number
  en: number
  divergence: number
}

interface Payload {
  topDivergence: DivergenceRow[]
  topNarratives: string[]
  counts: {
    tagged: number
  }
}

export default function NarrativeDivergence() {
  const [data, setData] =
    useState<Payload | null>(null)

  async function load() {
    try {
      const res = await fetch(
        "/api/narratives?range=24h",
        {
          cache: "no-store",
        }
      )

      setData(await res.json())
    } catch (err) {
      console.error(
        "NARRATIVE DIVERGENCE LOAD ERROR:",
        err
      )
    }
  }

  useEffect(() => {
    load()

    const interval = setInterval(
      load,
      30000
    )

    return () => clearInterval(interval)
  }, [])

  const rows = data?.topDivergence || []

  return (
    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950/80
        p-4
      "
    >
      <div className="mb-3">
        <div className="text-sm font-bold text-white">
          Regional Divergence
        </div>

        <div className="mt-1 text-[11px] text-zinc-500">
          Highest KR/CN/EN narrative gaps
        </div>
      </div>

      {rows.length === 0 && (
        <div className="text-xs text-zinc-500">
          Waiting for regional narrative signal
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.narrative}
            className="
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
                flex
                items-center
                justify-between
                text-xs
              "
            >
              <span className="font-semibold text-zinc-200">
                {row.narrative}
              </span>

              <span className="font-bold text-orange-300">
                {row.divergence}
              </span>
            </div>

            <div
              className="
                mt-2
                grid
                grid-cols-3
                gap-2
                text-[11px]
                text-zinc-400
              "
            >
              <div>KR {row.kr}</div>
              <div>CN {row.cn}</div>
              <div>EN {row.en}</div>
            </div>
          </div>
        ))}
      </div>

      {data && (
        <div className="mt-3 text-[11px] text-zinc-500">
          Tagged news: {data.counts.tagged}
        </div>
      )}
    </div>
  )
}
