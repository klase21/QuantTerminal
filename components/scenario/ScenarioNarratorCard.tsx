"use client"

export default function ScenarioNarratorCard({
  text,
  collapseRisk,
}: {
  text: string
  collapseRisk: number
}) {
  return (
    <div className="rounded-[2rem] border border-cyan-400/15 bg-black/55 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
            AI Probability Narrator
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-300">{text}</div>
        </div>

        <div className="shrink-0 rounded-2xl border border-yellow-300/20 bg-yellow-400/5 p-3 text-right">
          <div className="text-[10px] uppercase text-zinc-500">Collapse Risk</div>
          <div className="text-xl font-black text-yellow-200">{collapseRisk}%</div>
        </div>
      </div>
    </div>
  )
}
