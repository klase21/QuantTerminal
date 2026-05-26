"use client"

export default function TacticalGuidancePanel({
  guidance,
}: {
  guidance: string[]
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Live Tactical Guidance
      </div>

      <div className="space-y-2">
        {guidance.map((item, index) => (
          <div
            key={item}
            className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3 text-sm text-zinc-300"
          >
            <span className="mr-2 font-black text-cyan-300">
              {index + 1}.
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
