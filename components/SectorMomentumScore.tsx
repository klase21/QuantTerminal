
"use client";
const sectors = [
  { sector: "AI", score: 92 },
  { sector: "MEME", score: 41 },
  { sector: "RWA", score: 78 },
  { sector: "L1", score: 64 },
];
export default function SectorMomentumScore() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-4 text-sm font-semibold text-white">
        Sector Momentum Scoring
      </div>
      <div className="space-y-3">
        {sectors.map((s)=>(
          <div key={s.sector}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{s.sector}</span>
              <span className="font-semibold text-white">{s.score}</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-emerald-400" style={{width:`${s.score}%`}} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
