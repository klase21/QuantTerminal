"use client"

import type { TacticalDebatePoint } from "@/core/copilot/tacticalCopilotEngine"

export default function InternalDebateEngine({
  bullCase,
  bearCase,
}: {
  bullCase: TacticalDebatePoint[]
  bearCase: TacticalDebatePoint[]
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-950/10 p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
          Bull Case
        </div>

        <div className="space-y-2">
          {bullCase.map((point) => (
            <div
              key={point.label}
              className="rounded-2xl border border-emerald-400/10 bg-black/40 p-3"
            >
              <div className="text-sm font-black text-white">
                {point.label}
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-400">
                {point.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-red-400/20 bg-red-950/10 p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
          Bear Case
        </div>

        <div className="space-y-2">
          {bearCase.map((point) => (
            <div
              key={point.label}
              className="rounded-2xl border border-red-400/10 bg-black/40 p-3"
            >
              <div className="text-sm font-black text-white">
                {point.label}
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-400">
                {point.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
