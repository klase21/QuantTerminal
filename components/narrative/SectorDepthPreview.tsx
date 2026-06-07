"use client"

export default function SectorDepthPreview() {
  const sectors = [
    {
      name: "AI",
      leaders: ["RNDR", "TAO", "FET", "WLD"],
      state: "Dominating",
    },
    {
      name: "Gaming",
      leaders: ["IMX", "BEAM", "PRIME"],
      state: "Rotating",
    },
    {
      name: "RWA",
      leaders: ["ONDO", "CFG", "MPL"],
      state: "Emerging",
    },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="mb-3 text-sm font-semibold text-white">
        Sector Depth Preview
      </div>

      <div className="space-y-3">
        {sectors.map((sector) => (
          <div
            key={sector.name}
            className="rounded-xl border border-white/5 bg-white/5 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-white font-medium">{sector.name}</div>
              <div className="text-xs text-cyan-300">{sector.state}</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {sector.leaders.map((coin) => (
                <div
                  key={coin}
                  className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200"
                >
                  {coin}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}