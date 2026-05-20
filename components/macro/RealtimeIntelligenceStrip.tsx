// ======================================================
// components/macro/RealtimeIntelligenceStrip.tsx
// TOP ROLLING LIVE INTELLIGENCE FEED
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
    .slice(0, 6)
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
    .slice(0, 4)
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
    .slice(0, 12)
}

function typeLabel(type: StripEvent["type"]) {
  if (type === "spike") return "SPIKE"
  if (type === "divergence") return "DIV"
  return "LEAD"
}

function EventPill({ event }: { event: StripEvent }) {
  return (
    <div
      className="
        flex
        shrink-0
        items-center
        gap-2
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950
        px-3
        py-1.5
        text-xs
        shadow-[0_0_18px_rgba(0,0,0,0.18)]
      "
    >
      <span
        className={`
          rounded-md
          px-1.5
          py-0.5
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

      <span className="font-bold text-zinc-100">
        {event.label}
      </span>

      <span className="text-zinc-500">
        {event.message}
      </span>
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
      console.error("TOP INTELLIGENCE STRIP LOAD ERROR:", err)
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

  const rollingEvents = useMemo(() => {
    if (visibleEvents.length === 0) return []
    return [...visibleEvents, ...visibleEvents]
  }, [visibleEvents])

  const animationDuration = Math.max(
    18,
    visibleEvents.length * 3
  )

  return (
    <div
      className="
        flex
        min-h-[42px]
        items-center
        gap-3
        overflow-hidden
      "
    >
      <style jsx>{`
        @keyframes intelligence-roll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .intelligence-marquee {
          animation: intelligence-roll ${animationDuration}s linear infinite;
          will-change: transform;
        }

        .intelligence-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="
          flex
          shrink-0
          items-center
          gap-2
          border-r
          border-zinc-800
          pr-3
        "
      >
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
            rolling market pulse
          </div>
        </div>
      </div>

      <div
        className="
          relative
          min-w-0
          flex-1
          overflow-hidden
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            inset-y-0
            left-0
            z-10
            w-8
            bg-gradient-to-r
            from-black
            to-transparent
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-y-0
            right-0
            z-10
            w-8
            bg-gradient-to-l
            from-black
            to-transparent
          "
        />

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
              intelligence-marquee
              flex
              w-max
              items-center
              gap-2
              pr-2
            "
          >
            {rollingEvents.map((event, index) => (
              <EventPill
                key={`${event.id}-${index}`}
                event={event}
              />
            ))}
          </div>
        )}
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
  )
}
