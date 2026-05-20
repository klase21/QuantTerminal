
"use client";
export default function SmartMoneyScore() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
        <div className="text-xs text-zinc-400">Smart Money Confidence</div>
        <div className="mt-2 text-2xl font-bold text-yellow-400">84</div>
      </div>
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
        <div className="text-xs text-zinc-400">Whale Confidence</div>
        <div className="mt-2 text-2xl font-bold text-cyan-400">91</div>
      </div>
    </div>
  )
}
