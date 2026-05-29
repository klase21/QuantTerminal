"use client"

import { buildCompressedOpportunities, type OpportunityActionState } from "@/core/decision/opportunityCompressionEngine"

function actionClass(action: OpportunityActionState) {
  if (action === "ENTER") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (action === "WATCH") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  if (action === "AVOID") return "border-red-300/30 bg-red-400/10 text-red-100"
  return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
}

export default function OpportunityCompressionPanel() {
  const all = buildCompressedOpportunities()
  const opportunities = all.filter((item) => !item.hidden).slice(0, 3)
  const suppressedCount = all.filter((item) => item.hidden).length

  return (
    <section className="rounded-[1.25rem] border border-zinc-900 bg-black/55 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">Top 3</div>
          <div className="truncate text-sm font-black text-white">Actionable setups only</div>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-zinc-500">
          {suppressedCount} suppressed
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        {opportunities.map((item, index) => (
          <div key={item.id} className="min-w-0 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wide text-zinc-600">#{index + 1}</span>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black ${actionClass(item.action)}`}>{item.action}</span>
                  <span className="rounded-full border border-zinc-800 bg-black/40 px-1.5 py-0.5 text-[8px] font-black text-zinc-300">{item.grade}</span>
                </div>
                <div className="mt-1 truncate text-xs font-black text-white" title={item.title}>{item.title}</div>
              </div>
              <div className="shrink-0 text-xs font-black text-cyan-300">{item.score}</div>
            </div>
            <div className="mt-1 truncate text-[11px] text-zinc-500" title={item.trigger}>Trigger: {item.trigger}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
