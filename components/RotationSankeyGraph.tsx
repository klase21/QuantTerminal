"use client"

const flows = [
  { from: 'Meme', to: 'AI', strength: 88 },
  { from: 'L1', to: 'RWA', strength: 64 },
  { from: 'Gaming', to: 'AI', strength: 52 },
]

export default function RotationSankeyGraph() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
          Rotation Sankey
        </div>
        <div className="mt-1 text-lg font-bold text-white">
          Sector Capital Movement
        </div>
      </div>

      <div className="space-y-4">
        {flows.map((flow) => (
          <div
            key={`${flow.from}-${flow.to}`}
            className="rounded-xl border border-cyan-500/10 bg-black/40 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold text-zinc-300">
                {flow.from}
              </div>

              <div className="flex-1 px-4">
                <div className="relative h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-emerald-400 animate-pulse"
                    style={{ width: `${flow.strength}%` }}
                  />
                </div>
              </div>

              <div className="font-semibold text-cyan-400">
                {flow.to}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>Smart money rotation detected</span>
              <span>{flow.strength}% confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
