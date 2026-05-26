"use client"

export default function AttentionRoutingPanel({
  targets,
}: {
  targets: string[]
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
        Attention Routing
      </div>

      <div className="space-y-2">
        {targets.map((target, index) => (
          <div
            key={target}
            className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3"
          >
            <div className="text-sm font-black text-white">
              {target}
            </div>

            <div className="text-[10px] font-black text-purple-200">
              PRIORITY {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
