"use client"

export default function TacticalLaneLegend() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/55 p-3 backdrop-blur">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Lane Read
      </div>

      <div className="space-y-2 text-xs text-zinc-400">
        <div className="flex items-center justify-between rounded-xl bg-cyan-400/[0.04] px-3 py-2">
          <span>Top Lane</span>
          <span className="font-black text-cyan-200">Risk-on heat</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-emerald-400/[0.04] px-3 py-2">
          <span>Middle Lane</span>
          <span className="font-black text-emerald-200">Rotation target</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-purple-400/[0.04] px-3 py-2">
          <span>Bottom Lane</span>
          <span className="font-black text-purple-200">Defensive flow</span>
        </div>
      </div>
    </div>
  )
}
