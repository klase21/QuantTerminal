"use client"

import type { ScenarioBranch } from "@/core/scenario/probabilisticScenarioEngine"

export default function ScenarioGhostMap({ branches }: { branches: ScenarioBranch[] }) {
  const top = branches[0]

  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-cyan-400/20 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(34,211,238,.14),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,.12),transparent_32%)]" />
      <div className="absolute inset-0 opacity-[0.12]">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d="M 18 68 C 31 28, 52 24, 74 38"
          fill="none"
          stroke="rgba(34,211,238,.85)"
          strokeWidth="1.8"
          strokeDasharray="8 8"
          className="animate-[routeDash_2.5s_linear_infinite]"
        />
        <path
          d="M 20 75 C 36 88, 55 82, 82 70"
          fill="none"
          stroke="rgba(248,113,113,.45)"
          strokeWidth="1.2"
          strokeDasharray="4 7"
          className="animate-[routeDash_3.6s_linear_infinite]"
        />
      </svg>

      {["AI", "RWA", "BTC"].map((label, index) => (
        <div
          key={label}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100"
          style={{
            left: `${20 + index * 28}%`,
            top: `${68 - index * 15}%`,
          }}
        >
          {label}
        </div>
      ))}

      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-zinc-800 bg-black/70 p-3 backdrop-blur">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
          Ghost Simulation
        </div>
        <div className="mt-1 text-sm text-zinc-300">
          {top?.title ?? "Scenario route"} · {top?.probability ?? 0}% projected path
        </div>
      </div>
    </div>
  )
}
