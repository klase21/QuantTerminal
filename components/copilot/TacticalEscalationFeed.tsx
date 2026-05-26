"use client"

import type { TacticalEscalation } from "@/core/copilot/tacticalCopilotEngine"

const tone = {
  INFO: "border-cyan-300/20 bg-cyan-400/5 text-cyan-100",
  WARNING: "border-yellow-300/20 bg-yellow-400/5 text-yellow-100",
  CRITICAL: "border-red-300/20 bg-red-400/5 text-red-100",
}

export default function TacticalEscalationFeed({
  escalation,
}: {
  escalation: TacticalEscalation[]
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
        Tactical Escalation Feed
      </div>

      <div className="space-y-2">
        {escalation.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border p-3 ${tone[item.level]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-white">
                {item.title}
              </div>

              <div className="text-[10px] font-black">
                {item.level}
              </div>
            </div>

            <div className="mt-1 text-xs leading-5 opacity-80">
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
