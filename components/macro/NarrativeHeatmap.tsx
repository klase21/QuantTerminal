// ======================================================
// components/macro/NarrativeHeatmap.tsx
// CROSS-REGION NARRATIVE HEATMAP
// ======================================================

"use client"

import { useEffect, useState } from "react"

interface HeatmapRow {
  narrative: string
  kr: number
  cn: number
  en: number
  total: number
  divergence: number
}

interface NarrativePayload {
  updatedAt: number
  counts: {
    kr: number
    cn: number
    en: number
    tagged: number
  }
  heatmap: HeatmapRow[]
  topNarratives: string[]
  regionalLeaders: {
    kr: string
    cn: string
    en: string
  }
  divergenceScore: number
  topDivergence: HeatmapRow[]
}

function intensityClass(score: number) {
  if (score >= 80) {
    return "bg-green-500/30 text-green-300 border-green-500/40"
  }

  if (score >= 50) {
    return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
  }

  if (score >= 25) {
    return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
  }

  if (score > 0) {
    return "bg-zinc-800 text-zinc-300 border-zinc-700"
  }

  return "bg-zinc-950 text-zinc-600 border-zinc-800"
}

function RegionCell({ score }: { score: number }) {
  return (
    <div
      className={`
        rounded-md
        border
        px-2
        py-1
        text-center
        text-[11px]
        font-bold
        ${intensityClass(score)}
      `}
    >
      {score}
    </div>
  )
}

export default function NarrativeHeatmap() {
  const [data, setData] =
    useState<NarrativePayload | null>(null)

  const [loading, setLoading] =
    useState(true)

  async function load() {
    try {
      const res = await fetch(
        "/api/narratives?range=24h",
        {
          cache: "no-store",
        }
      )

      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(
        "NARRATIVE HEATMAP LOAD ERROR:",
        err
      )
    } finally {
      setLoading(false)
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

  const rows = data?.heatmap?.slice(0, 8) || []

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
      <div
        className="
          mb-3
          flex
          items-start
          justify-between
          gap-3
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
            Narrative Heatmap
          </div>

          <div
            className="
              mt-1
              text-[11px]
              text-zinc-500
            "
          >
            KR / CN / EN narrative strength, 24h window
          </div>
        </div>

        <div
          className="
            rounded-full
            border
            border-zinc-800
            bg-black
            px-2
            py-1
            text-[11px]
            font-bold
            text-zinc-300
          "
        >
          DIV {data?.divergenceScore ?? 0}
        </div>
      </div>

      {loading && (
        <div className="text-xs text-zinc-500">
          Loading narrative heatmap...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-xs text-zinc-500">
          No tagged narratives detected yet
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          <div
            className="
              grid
              grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.8fr]
              gap-2
              text-[10px]
              uppercase
              tracking-wide
              text-zinc-500
            "
          >
            <div>Narrative</div>
            <div className="text-center">KR</div>
            <div className="text-center">CN</div>
            <div className="text-center">EN</div>
            <div className="text-right">Div</div>
          </div>

          {rows.map((row) => (
            <div
              key={row.narrative}
              className="
                grid
                grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_0.8fr]
                items-center
                gap-2
              "
            >
              <div
                className="
                  truncate
                  text-xs
                  font-semibold
                  text-zinc-200
                "
              >
                {row.narrative}
              </div>

              <RegionCell score={row.kr} />
              <RegionCell score={row.cn} />
              <RegionCell score={row.en} />

              <div
                className="
                  text-right
                  text-xs
                  font-bold
                  text-orange-300
                "
              >
                {row.divergence}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div
          className="
            mt-4
            grid
            grid-cols-3
            gap-2
            text-[11px]
          "
        >
          <div className="rounded-lg bg-zinc-900 p-2">
            <div className="text-zinc-500">KR Lead</div>
            <div className="mt-1 font-bold text-zinc-200">
              {data.regionalLeaders.kr}
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 p-2">
            <div className="text-zinc-500">CN Lead</div>
            <div className="mt-1 font-bold text-zinc-200">
              {data.regionalLeaders.cn}
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 p-2">
            <div className="text-zinc-500">EN Lead</div>
            <div className="mt-1 font-bold text-zinc-200">
              {data.regionalLeaders.en}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
