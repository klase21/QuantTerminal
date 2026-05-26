"use client"

const lanes = [
  {
    label: "RISK-ON / HIGH BETA",
    hint: "AI · MEME · L2",
    top: "6%",
    height: "27%",
    tone: "border-cyan-400/15 bg-cyan-400/[0.035]",
  },
  {
    label: "ROTATION / SMART MONEY",
    hint: "RWA · INFRA · DePIN",
    top: "36%",
    height: "24%",
    tone: "border-emerald-400/15 bg-emerald-400/[0.035]",
  },
  {
    label: "DEFENSIVE / LIQUIDITY",
    hint: "BTC · STABLE",
    top: "66%",
    height: "25%",
    tone: "border-purple-400/15 bg-purple-400/[0.035]",
  },
]

export default function TacticalLaneBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      {lanes.map((lane) => (
        <div
          key={lane.label}
          className={`absolute left-4 right-4 rounded-[1.6rem] border ${lane.tone}`}
          style={{ top: lane.top, height: lane.height }}
        >
          <div className="absolute left-4 top-3">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
              {lane.label}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-600">{lane.hint}</div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      ))}

      <div className="absolute left-1/2 top-[32%] h-[4%] w-px -translate-x-1/2 bg-gradient-to-b from-cyan-300/35 to-emerald-300/35" />
      <div className="absolute left-1/2 top-[60%] h-[6%] w-px -translate-x-1/2 bg-gradient-to-b from-emerald-300/35 to-purple-300/35" />
    </div>
  )
}
