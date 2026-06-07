"use client"

import { useMemo, useState } from "react"
import { Compass, Target, ShieldAlert } from "lucide-react"

import {
  buildTacticalOpportunityRouter,
  type TacticalOpportunityCandidate,
  type TacticalOpportunityRoute,
} from "@/lib/tactical/tacticalOpportunityRouter"

function priorityClass(priority: TacticalOpportunityRoute["priority"]) {
  if (priority === "HIGH") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (priority === "MEDIUM") return "border-amber-300/30 bg-amber-400/10 text-amber-100"
  return "border-zinc-700 bg-zinc-950 text-zinc-400"
}

function biasClass(bias: TacticalOpportunityRoute["directionalBias"]) {
  if (bias === "LONG BIAS") return "text-emerald-300"
  if (bias === "SHORT BIAS") return "text-rose-300"
  if (bias === "TWO-WAY") return "text-amber-300"
  return "text-zinc-500"
}

export default function TacticalOpportunityRouterCard({
  candidates,
}: {
  candidates?: TacticalOpportunityCandidate[]
}) {
  const router = useMemo(() => buildTacticalOpportunityRouter(candidates), [candidates])
  const [selectedId, setSelectedId] = useState(router.primaryRoute.id)

  const selected = router.routes.find((route) => route.id === selectedId) ?? router.primaryRoute

  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,.12),transparent_30%),rgba(0,0,0,.46)] p-4 shadow-[0_0_40px_rgba(34,211,238,.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
            <Compass className="h-3.5 w-3.5" />
            Tactical Opportunity Router
          </div>
          <div className="mt-2 text-2xl font-black text-white">{router.marketMode}</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{router.summary}</p>
        </div>

        <div className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${priorityClass(router.primaryRoute.priority)}`}>
          Primary: {router.primaryRoute.label}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {router.routes.slice(0, 6).map((route) => {
            const active = route.id === selected.id
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedId(route.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-cyan-300/50 bg-cyan-400/15 shadow-[0_0_26px_rgba(34,211,238,.12)]"
                    : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25 hover:bg-cyan-400/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-white">{route.label}</div>
                  <div className={`text-[10px] font-black ${biasClass(route.directionalBias)}`}>
                    {route.directionalBias}
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {route.category}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${priorityClass(route.priority)}`}>
                    {route.priority}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{route.confidence}%</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/45 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
            <Target className="h-3.5 w-3.5" />
            Selected Route
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-white">{selected.label}</div>
              <div className={`mt-1 text-sm font-black ${biasClass(selected.directionalBias)}`}>
                {selected.directionalBias} · {selected.verdict}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${priorityClass(selected.priority)}`}>
              {selected.aggression}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Focus</div>
              <div className="mt-1 text-sm font-bold leading-5 text-emerald-50">{selected.focus}</div>
            </div>

            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Reason</div>
              <div className="mt-1 text-xs font-bold leading-5 text-cyan-50">{selected.reason}</div>
            </div>

            <div className="rounded-2xl border border-rose-300/15 bg-rose-400/10 p-3">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-200/70">
                <ShieldAlert className="h-3 w-3" />
                Avoid If
              </div>
              <div className="mt-1 text-xs font-bold leading-5 text-rose-50">{selected.avoidIf}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
