// ======================================================
// components/macro/RealtimeIntelligenceStrip.tsx
// VERTICAL LIVE INTELLIGENCE FEED
// ======================================================

"use client"

import { useEffect, useMemo, useState } from "react"
import { useTimelineStore } from "@/stores/useTimelineStore"

type Region = "kr" | "cn" | "en" | "cross"

type HeatmapRow = {
  narrative: string
  kr?: number
  cn?: number
  en?: number
  divergence?: number
}

type DivergenceRow = HeatmapRow

type NarrativePayload = {
  updatedAt?: number
  heatmap?: HeatmapRow[]
  topDivergence?: DivergenceRow[]
  regionalLeaders?: Partial<Record<"kr" | "cn" | "en", string>>
}

type StripEvent = {
  id: string
  label: string
  message: string
  region: Region
  score: number
  type: "spike" | "divergence" | "leader"
  timestamp: number
}

const REGION_LABEL: Record<Region, string> = {
  kr: "KR",
  cn: "CN",
  en: "EN",
  cross: "XREG",
}

function hotRegion(row: HeatmapRow): Region {
  const entries: [Region, number][] = [
    ["kr", row.kr || 0],
    ["cn", row.cn || 0],
    ["en", row.en || 0],
  ]

  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] || "en"
}

function hotScore(row: HeatmapRow) {
  return Math.max(row.kr || 0, row.cn || 0, row.en || 0)
}

function buildStripEvents(payload: NarrativePayload): StripEvent[] {
  const now = payload.updatedAt || Date.now()
  const events: StripEvent[] = []

  ;(payload.heatmap || [])
    .slice(0, 8)
    .forEach((row, index) => {
      const region = hotRegion(row)
      const score = hotScore(row)

      if (score <= 0) return

      events.push({
        id: `top-spike-${row.narrative}-${region}-${index}`,
        label: row.narrative,
        message: `${REGION_LABEL[region]} strength ${score} · div ${row.divergence || 0}`,
        region,
        score,
        type: "spike",
        timestamp: now - index * 60_000,
      })
    })

  ;(payload.topDivergence || [])
    .slice(0, 5)
    .forEach((row, index) => {
      events.push({
        id: `top-div-${row.narrative}-${index}`,
        label: row.narrative,
        message: `regional divergence ${row.divergence || 0}`,
        region: "cross",
        score: row.divergence || 0,
        type: "divergence",
        timestamp: now - 30_000 - index * 80_000,
      })
    })

  Object.entries(payload.regionalLeaders || {}).forEach(
    ([region, narrative], index) => {
      if (!narrative || narrative === "None") return

      events.push({
        id: `top-leader-${region}-${narrative}`,
        label: narrative,
        message: `${REGION_LABEL[region as Region]} leading narrative`,
        region: region as Region,
        score: 100 - index * 10,
        type: "leader",
        timestamp: now - 45_000 - index * 70_000,
      })
    }
  )

  return events
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
}

function typeLabel(type: StripEvent["type"]) {
  if (type === "spike") return "SPIKE"
  if (type === "divergence") return "DIV"
  return "LEAD"
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function EventRow({ event }: { event: StripEvent }) {
  return (
    <div
      className="
        grid
        grid-cols-[58px_52px_1fr_54px]
        items-center
        gap-3
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950
        px-3
        py-2
        text-xs
      "
    >
      <div className="font-mono text-[10px] text-zinc-500">
        {formatTime(event.timestamp)}
      </div>

      <span
        className={`
          rounded-md
          px-1.5
          py-0.5
          text-center
          text-[9px]
          font-black
          ${
            event.type === "divergence"
              ? "bg-amber-500/10 text-amber-300"
              : event.type === "leader"
                ? "bg-cyan-500/10 text-cyan-300"
                : "bg-emerald-500/10 text-emerald-300"
          }
        `}
      >
        {typeLabel(event.type)}
      </span>

      <div className="min-w-0">
        <div className="truncate font-bold text-zinc-100">
          {event.label}
        </div>

        <div className="mt-0.5 truncate text-[11px] text-zinc-500">
          {event.message}
        </div>
      </div>

      <div className="text-right font-mono text-[11px] text-zinc-400">
        {event.score}
      </div>
    </div>
  )
}

export default function RealtimeIntelligenceStrip() {
  const { replayMode, toggleReplay } = useTimelineStore()
  const [events, setEvents] = useState<StripEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  async function load() {
    try {
      const res = await fetch("/api/narratives?range=24h", {
        cache: "no-store",
      })

      const json = (await res.json()) as NarrativePayload
      setEvents(buildStripEvents(json))
    } catch (err) {
      console.error("REALTIME INTELLIGENCE LOAD ERROR:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!replayMode || events.length === 0) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % events.length)
    }, 1300)

    return () => clearInterval(interval)
  }, [replayMode, events.length])

  const visibleEvents = useMemo(() => {
    if (!replayMode) return events
    return events.slice(0, activeIndex + 1)
  }, [events, replayMode, activeIndex])

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-zinc-900
        bg-black
      "
    >
      <div
        className="
          flex
          shrink-0
          items-center
          justify-between
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >
        <div className="flex items-center gap-2">
          <span
            className="
              h-2
              w-2
              rounded-full
              bg-emerald-400
              shadow-[0_0_10px_rgba(52,211,153,0.75)]
            "
          />

          <div>
            <div className="text-[11px] font-black tracking-wide text-white">
              REALTIME INTELLIGENCE
            </div>

            <div className="text-[10px] text-zinc-500">
              live market pulse feed
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setActiveIndex(0)
            toggleReplay()
          }}
          className={`
            shrink-0
            rounded-lg
            border
            px-3
            py-1.5
            text-[10px]
            font-black
            transition
            ${
              replayMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
            }
          `}
        >
          {replayMode ? "PAUSE" : "REPLAY"}
        </button>
      </div>

      <div
        className="
          flex-1
          min-h-0
          overflow-hidden
          p-3
        "
      >
        {loading && (
          <div className="text-xs text-zinc-500">
            Loading intelligence events...
          </div>
        )}

        {!loading && visibleEvents.length === 0 && (
          <div className="text-xs text-zinc-500">
            Waiting for narrative signals...
          </div>
        )}

        {!loading && visibleEvents.length > 0 && (
          <div
            className="
              flex
              flex-col
              gap-2
            "
          >
            {visibleEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
