"use client"

import TacticalFocusCard from "@/components/focus/TacticalFocusCard"
import type { ScenarioBranch } from "@/core/scenario/probabilisticScenarioEngine"

const typeTone: Record<ScenarioBranch["type"], string> = {
  CONTINUATION: "text-emerald-300 border-emerald-400/20 bg-emerald-400/5",
  SWEEP_REVERSAL: "text-cyan-300 border-cyan-400/20 bg-cyan-400/5",
  RISK_OFF: "text-red-300 border-red-400/20 bg-red-400/5",
  FAKE_BREAKOUT: "text-yellow-300 border-yellow-400/20 bg-yellow-400/5",
}

export default function ScenarioTreePanel({ branches }: { branches: ScenarioBranch[] }) {
  return (
    <TacticalFocusCard
      eyebrow="Scenario Tree"
      title={branches[0]?.title ?? "Scenario Tree"}
      summary={`${branches[0]?.probability ?? 0}% top path · ${branches.length} branches`}
      preview={
        <div className="space-y-3">
          {branches.map((branch, index) => (
            <div key={branch.id} className={`rounded-2xl border p-4 ${typeTone[branch.type]}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">
                    Branch {index + 1} · {branch.type.replaceAll("_", " ")}
                  </div>
                  <div className="mt-1 text-lg font-black text-white">{branch.title}</div>
                  <div className="mt-2 text-sm leading-6 text-zinc-300">{branch.expectedBehavior}</div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black">{branch.probability}%</div>
                  <div className="text-[10px] text-zinc-500">{branch.horizon}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Path Projection</div>
                <div className="mt-1 text-sm font-black text-white">{branch.path.join(" → ")}</div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Trigger</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-300">{branch.trigger}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Invalidation</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-300">{branch.invalidation}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        {branches.slice(0, 4).map((branch, index) => (
          <div key={branch.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-zinc-600">#{index + 1} · {branch.horizon}</div>
                <div className="truncate text-sm font-black text-white">{branch.title}</div>
              </div>
              <div className="shrink-0 text-sm font-black text-cyan-300">{branch.probability}%</div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${branch.probability}%` }} />
            </div>
          </div>
        ))}
      </div>
    </TacticalFocusCard>
  )
}
