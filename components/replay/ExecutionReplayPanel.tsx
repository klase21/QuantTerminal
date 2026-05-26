"use client"

import { History } from "lucide-react"
import { buildReplayEvents } from "@/core/replay/executionReplayScaffold"

export default function ExecutionReplayPanel({ dualMarket }: { dualMarket?: any }) {
  const events = buildReplayEvents({
    fakeBreakoutRisk: Number(dualMarket?.fakeBreakoutRisk ?? 0),
    absorptionScore: Number(dualMarket?.absorptionScore ?? 0),
    realDemandConfirmation: Number(dualMarket?.realDemandConfirmation ?? 0),
  })

  return (
    <section className="rounded-3xl border border-zinc-700 bg-zinc-950/70 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">
        <History size={14} />
        Execution Replay Scaffold
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-zinc-900 bg-black/45 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white">{event.title}</div>
              <div className="text-xs text-zinc-500">{event.time}</div>
            </div>

            <div className="mt-2 text-sm leading-6 text-zinc-400">{event.explanation}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
