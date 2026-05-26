"use client"

import TacticalFocusCard from "@/components/focus/TacticalFocusCard"
import { buildCompressedOpportunities } from "@/core/decision/opportunityCompressionEngine"

export default function OpportunityCompressionPanel() {
  const opportunities = buildCompressedOpportunities()

  return (
    <TacticalFocusCard
      eyebrow="Opportunity Compression"
      title="Top 3 actionable setups"
      summary="Only highest relevance opportunities shown"
      preview={
        <div className="space-y-3">
          {opportunities.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Rank {index + 1}</div>
                  <div className="mt-1 text-lg font-black text-white">{item.title}</div>
                  <div className="mt-2 text-sm text-zinc-400">{item.action}</div>
                </div>
                <div className="text-xl font-black text-cyan-300">{item.score}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-zinc-900 bg-black/50 p-3">
                  <div className="text-zinc-600">Timing</div>
                  <div className="font-black text-white">{item.timing}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/50 p-3">
                  <div className="text-zinc-600">Blocker</div>
                  <div className="font-black text-yellow-200">{item.blocker}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div className="min-w-0 space-y-2">
        {opportunities.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-600">#{index + 1}</div>
                <div className="truncate text-sm font-black text-white" title={item.title}>{item.title}</div>
              </div>
              <div className="shrink-0 text-sm font-black text-cyan-300">{item.score}</div>
            </div>
            <div className="mt-1 truncate text-xs text-zinc-500" title={item.action}>{item.action}</div>
          </div>
        ))}
      </div>
    </TacticalFocusCard>
  )
}
