"use client"

const sectors = [
  { id: "L1", label: "L1", x: 50, y: 46, size: 118, score: 76.47, tone: "cyan", meta: "Core rotation" },
  { id: "RWA", label: "RWA", x: 70, y: 31, size: 78, score: 55.59, tone: "emerald", meta: "Strengthening" },
  { id: "AI", label: "AI", x: 28, y: 34, size: 70, score: 49.74, tone: "violet", meta: "Weak participation" },
  { id: "PAYFI", label: "PAYFI", x: 72, y: 67, size: 66, score: 48.65, tone: "amber", meta: "Churn" },
  { id: "INFRA", label: "INFRA", x: 31, y: 70, size: 58, score: 43.69, tone: "sky", meta: "Lagging" },
]

const flows = [
  { from: "AI", to: "L1", strength: 2.4, label: "AI → L1" },
  { from: "L1", to: "RWA", strength: 3.2, label: "L1 → RWA" },
  { from: "L1", to: "PAYFI", strength: 1.7, label: "L1 → PAYFI" },
  { from: "INFRA", to: "L1", strength: 1.2, label: "INFRA → L1" },
]

const toneClass: Record<string, string> = {
  cyan: "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_52px_rgba(34,211,238,.22)]",
  emerald: "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_42px_rgba(16,185,129,.18)]",
  violet: "border-violet-300/50 bg-violet-400/15 text-violet-100 shadow-[0_0_40px_rgba(139,92,246,.18)]",
  amber: "border-amber-300/50 bg-amber-400/15 text-amber-100 shadow-[0_0_40px_rgba(245,158,11,.18)]",
  sky: "border-sky-300/50 bg-sky-400/15 text-sky-100 shadow-[0_0_36px_rgba(14,165,233,.16)]",
}

function getSector(id: string) {
  return sectors.find((sector) => sector.id === id) || sectors[0]
}

function TacticalMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{hint}</div>
    </div>
  )
}

export default function NarrativeIntelligenceSurface() {
  return (
    <div className="grid min-h-[720px] grid-cols-[190px_minmax(0,1fr)_240px] gap-4 2xl:grid-cols-[210px_minmax(0,1fr)_280px]">
      <aside className="space-y-3">
        <div className="rounded-3xl border border-cyan-400/15 bg-cyan-950/[0.08] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">AI Read</div>
          <div className="mt-3 text-lg font-black text-white">L1 remains rotation center.</div>
          <p className="mt-3 text-xs leading-5 text-zinc-400">RWA is improving, AI is fading, and confirmation still depends on broader participation.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">Decision</div>
          <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm font-bold text-amber-100">Observe. Wait for cleaner directional confirmation.</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">Trigger Stack</div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span className="text-zinc-400">Breakout</span><span className="text-cyan-200">L1 &gt; 78</span></div>
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span className="text-zinc-400">Confirm</span><span className="text-emerald-200">RWA lead</span></div>
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span className="text-zinc-400">Invalid</span><span className="text-rose-200">AI bleed</span></div>
          </div>
        </div>
      </aside>

      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-black p-4 shadow-[0_0_70px_rgba(8,145,178,.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_68%_62%,rgba(245,158,11,.10),transparent_30%)]" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.38em] text-cyan-300">Narrative Universe</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-white">Universe Tactical Map</div>
            <div className="mt-1 text-xs text-zinc-500">Sector gravity · capital rotation · narrative threat</div>
          </div>
          <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Primary Focus</div>
        </div>

        <div className="relative z-10 mt-4 grid grid-cols-3 gap-3">
          <TacticalMetric label="Primary Rotation" value="L1 → RWA" hint="capital bias" />
          <TacticalMetric label="Confidence" value="76.47%" hint="signal quality" />
          <TacticalMetric label="Tactical Bias" value="Risk-On" hint="liquidity support" />
        </div>

        <div className="qt-motion-scanline relative z-10 mt-4 h-[510px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#020617]">
          <div className="absolute inset-8 rounded-full border border-cyan-300/10" />
          <div className="qt-motion-orbit absolute left-1/2 top-1/2 h-[390px] w-[390px] rounded-full border border-dashed border-cyan-300/20" />
          <div className="qt-motion-orbit qt-motion-orbit-reverse absolute left-1/2 top-1/2 h-[270px] w-[270px] rounded-full border border-dashed border-violet-300/15" />
          <div className="qt-motion-universe-sweep absolute left-1/2 top-1/2 h-[620px] w-[620px] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,.15)_24deg,transparent_52deg)] opacity-70" />

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="flowGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,.05)" />
                <stop offset="50%" stopColor="rgba(34,211,238,.55)" />
                <stop offset="100%" stopColor="rgba(16,185,129,.08)" />
              </linearGradient>
            </defs>
            {flows.map((flow) => {
              const from = getSector(flow.from)
              const to = getSector(flow.to)
              const midX = (from.x + to.x) / 2
              const midY = Math.min(from.y, to.y) - 13
              return (
                <path
                  key={flow.label}
                  d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                  fill="none"
                  stroke="url(#flowGradient)"
                  strokeWidth={flow.strength}
                  strokeLinecap="round"
                  strokeDasharray="4 5"
                  className="qt-motion-bar"
                />
              )
            })}
          </svg>

          {flows.map((flow, index) => {
            const from = getSector(flow.from)
            const to = getSector(flow.to)
            return (
              <div
                key={`${flow.label}-beam`}
                className="qt-motion-beam-light absolute h-px rounded-full bg-cyan-200/60 shadow-[0_0_18px_rgba(34,211,238,.9)]"
                style={{
                  left: `${Math.min(from.x, to.x)}%`,
                  top: `${(from.y + to.y) / 2}%`,
                  width: `${Math.abs(from.x - to.x) + 16}%`,
                  animationDelay: `${index * 0.55}s`,
                  transform: `rotate(${to.y - from.y}deg)`,
                }}
              />
            )
          })}

          {sectors.map((sector, index) => (
            <div
              key={sector.id}
              className="qt-motion-node-float absolute"
              style={{ left: `${sector.x}%`, top: `${sector.y}%`, animationDelay: `${index * 0.35}s` }}
            >
              <div className={`qt-motion-node-ring absolute left-1/2 top-1/2 rounded-full border ${toneClass[sector.tone]}`} style={{ height: sector.size + 42, width: sector.size + 42 }} />
              <div className={`qt-motion-node-halo relative flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border backdrop-blur-md ${toneClass[sector.tone]}`} style={{ height: sector.size, width: sector.size }}>
                <div className="text-lg font-black">{sector.label}</div>
                <div className="mt-1 text-[10px] font-black opacity-80">{sector.score}</div>
                <div className="mt-1 max-w-[80px] text-center text-[9px] uppercase tracking-[0.14em] opacity-60">{sector.meta}</div>
              </div>
            </div>
          ))}

          <div className="absolute bottom-4 left-4 right-4 grid grid-cols-4 gap-2">
            {flows.map((flow) => (
              <div key={flow.label} className="rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{flow.label}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="qt-motion-bar h-full rounded-full bg-cyan-300" style={{ width: `${flow.strength * 24}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">Threat</div>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-black text-emerald-200">STABLE</div>
          </div>
          <div className="mt-3 space-y-2 text-sm text-white">
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span>Liquidity</span><span className="text-cyan-300">Stable</span></div>
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span>Contagion</span><span className="text-yellow-300">Watch</span></div>
            <div className="flex justify-between rounded-xl bg-white/[0.04] p-2"><span>ETH/BTC</span><span className="text-rose-300">Weak</span></div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">Top Signals</div>
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm font-bold text-white">RWA rotation strengthening</div>
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm font-bold text-white">AI participation weakening</div>
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3 text-sm font-bold text-white">L1 remains gravity core</div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">Rotation Timeline</div>
          <div className="mt-3 space-y-3 text-xs">
            <div className="border-l border-cyan-300/30 pl-3"><div className="font-black text-white">Now</div><div className="text-zinc-500">L1 → RWA impulse forming</div></div>
            <div className="border-l border-amber-300/30 pl-3"><div className="font-black text-white">45m ago</div><div className="text-zinc-500">PAYFI churn appeared</div></div>
            <div className="border-l border-violet-300/30 pl-3"><div className="font-black text-white">2h ago</div><div className="text-zinc-500">AI momentum softened</div></div>
          </div>
        </div>
      </aside>
    </div>
  )
}
