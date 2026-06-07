// ======================================================
// components/macro/NarrativeTimeline.tsx
// REALTIME NARRATIVE TIMELINE + REPLAY CONTROLS
// ======================================================

"use client"

import { useEffect, useMemo, useState } from "react"

import { useTimelineStore } from "@/stores/useTimelineStore"

type NarrativeRegion = "kr" | "cn" | "en"

type ApiHeatmapRow = {
  narrative: string
  kr?: number
  cn?: number
  en?: number
  divergence?: number
}

type ApiDivergenceRow = {
  narrative: string
  kr?: number
  cn?: number
  en?: number
  divergence?: number
}

type ApiPayload = {
  updatedAt?: number
  heatmap?: ApiHeatmapRow[]
  topDivergence?: ApiDivergenceRow[]
  regionalLeaders?: Partial<Record<NarrativeRegion, string>>
}

type TimelineEvent = {
  id: string
  timestamp: number
  narrative: string
  region: NarrativeRegion | "cross"
  type:
    | "narrative_spike"
    | "regional_leader"
    | "divergence"
    | "replay"
  score: number
  description: string
}

const REGION_LABEL: Record<NarrativeRegion | "cross", string> = {
  kr: "KR",
  cn: "CN",
  en: "EN",
  cross: "XREG",
}

function formatTime(value: number) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(value)
  } catch {
    return "--:--"
  }
}

function getHotRegion(row: ApiHeatmapRow): NarrativeRegion {
  const entries: [NarrativeRegion, number][] = [
    ["kr", row.kr || 0],
    ["cn", row.cn || 0],
    ["en", row.en || 0],
  ]

  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] || "en"
}

function getHotScore(row: ApiHeatmapRow) {
  return Math.max(row.kr || 0, row.cn || 0, row.en || 0)
}

function buildEvents(payload: ApiPayload): TimelineEvent[] {
  const now = payload.updatedAt || Date.now()
  const events: TimelineEvent[] = []

  ;(payload.heatmap || [])
    .slice(0, 8)
    .forEach((row, index) => {
      const region = getHotRegion(row)
      const score = getHotScore(row)

      if (score <= 0) return

      events.push({
        id: `spike-${row.narrative}-${region}-${now}-${index}`,
        timestamp: now - index * 90_000,
        narrative: row.narrative,
        region,
        type: "narrative_spike",
        score,
        description: `${REGION_LABEL[region]} narrative strength ${score} · divergence ${row.divergence || 0}`,
      })
    })

  ;(payload.topDivergence || [])
    .slice(0, 5)
    .forEach((row, index) => {
      events.push({
        id: `div-${row.narrative}-${now}-${index}`,
        timestamp: now - 45_000 - index * 120_000,
        narrative: row.narrative,
        region: "cross",
        type: "divergence",
        score: row.divergence || 0,
        description: `Cross-region narrative divergence detected · KR ${row.kr || 0} / CN ${row.cn || 0} / EN ${row.en || 0}`,
      })
    })

  Object.entries(payload.regionalLeaders || {}).forEach(
    ([region, narrative], index) => {
      if (!narrative || narrative === "None") return

      events.push({
        id: `leader-${region}-${narrative}-${now}`,
        timestamp: now - 20_000 - index * 60_000,
        narrative,
        region: region as NarrativeRegion,
        type: "regional_leader",
        score: 100 - index * 8,
        description: `${REGION_LABEL[region as NarrativeRegion]} leading narrative: ${narrative}`,
      })
    }
  )

  return events.sort((a, b) => b.timestamp - a.timestamp)
}

function getTypeLabel(type: TimelineEvent["type"]) {
  if (type === "narrative_spike") return "SPIKE"
  if (type === "regional_leader") return "LEADER"
  if (type === "divergence") return "DIVERGENCE"
  return "REPLAY"
}

export default function NarrativeTimeline() {
  const { replayMode, toggleReplay } = useTimelineStore()

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  async function load() {
    try {
      const res = await fetch("/api/narratives?range=24h", {
        cache: "no-store",
      })

      const json = (await res.json()) as ApiPayload
      const nextEvents = buildEvents(json)

      setEvents(nextEvents)
      setUpdatedAt(json.updatedAt || Date.now())
    } catch (err) {
      console.error("NARRATIVE TIMELINE LOAD ERROR:", err)
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
    }, 1400)

    return () => clearInterval(interval)
  }, [replayMode, events.length])

  const visibleEvents = useMemo(() => {
    if (!replayMode) return events.slice(0, 10)

    return events.slice(0, activeIndex + 1).slice(-10).reverse()
  }, [events, replayMode, activeIndex])

  const activeEvent = replayMode ? events[activeIndex] : events[0]

  return (
    <div
      className="
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950/70
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
              text-sm
              font-bold
              text-white
            "
          >
            Narrative Timeline
          </div>

          <div
            className="
              text-[11px]
              text-zinc-500
            "
          >
            Realtime narrative event stream & replay
          </div>
        </div>

        <button
          onClick={() => {
            setActiveIndex(0)
            toggleReplay()
          }}
          className={`
            rounded-lg
            border
            px-3
            py-1.5
            text-[11px]
            font-bold
            transition
            ${
              replayMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
            }
          `}
        >
          {replayMode ? "PAUSE" : "REPLAY"}
        </button>
      </div>

      {activeEvent && (
        <div
          className="
            mb-3
            rounded-lg
            border
            border-emerald-500/20
            bg-emerald-500/5
            p-3
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-2
            "
          >
            <div
              className="
                text-xs
                font-bold
                text-emerald-300
              "
            >
              {activeEvent.narrative}
            </div>

            <div
              className="
                rounded-full
                bg-zinc-900
                px-2
                py-0.5
                text-[10px]
                font-bold
                text-zinc-300
              "
            >
              {REGION_LABEL[activeEvent.region]}
            </div>
          </div>

          <div
            className="
              mt-1
              text-[11px]
              leading-relaxed
              text-zinc-400
            "
          >
            {activeEvent.description}
          </div>
        </div>
      )}

      <div
        className="
          space-y-2
          overflow-y-auto
          pr-1
          max-h-[320px]
        "
      >
        {loading && (
          <div className="text-xs text-zinc-500">
            Loading narrative events...
          </div>
        )}

        {!loading && visibleEvents.length === 0 && (
          <div className="text-xs text-zinc-500">
            No narrative events detected yet.
          </div>
        )}

        {visibleEvents.map((event) => (
          <div
            key={event.id}
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
                gap-2
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  truncate
                "
              >
                <span
                  className="
                    h-2
                    w-2
                    shrink-0
                    rounded-full
                    bg-emerald-400
                  "
                />

                <span
                  className="
                    truncate
                    text-xs
                    font-bold
                    text-zinc-200
                  "
                >
                  {event.narrative}
                </span>
              </div>

              <div
                className="
                  shrink-0
                  text-[10px]
                  text-zinc-500
                "
              >
                {formatTime(event.timestamp)}
              </div>
            </div>

            <div
              className="
                mt-1
                flex
                items-center
                justify-between
                gap-2
              "
            >
              <div
                className="
                  truncate
                  text-[11px]
                  text-zinc-400
                "
              >
                {event.description}
              </div>

              <div
                className="
                  shrink-0
                  rounded
                  bg-zinc-950
                  px-1.5
                  py-0.5
                  text-[9px]
                  font-bold
                  text-zinc-500
                "
              >
                {getTypeLabel(event.type)} · {event.score}
              </div>
            </div>
          </div>
        ))}
      </div>

      {updatedAt && (
        <div
          className="
            mt-3
            border-t
            border-zinc-800
            pt-2
            text-[10px]
            text-zinc-600
          "
        >
          Updated: {formatTime(updatedAt)}
        </div>
      )}
    </div>
  )
}
