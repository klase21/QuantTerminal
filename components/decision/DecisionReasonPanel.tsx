"use client"

import { buildTacticalDecision } from "@/core/decision/tacticalDecisionEngine"

export default function DecisionReasonPanel({ flow }: { flow?: any }) {
  const decision = buildTacticalDecision({
    buyPressure: Number(flow?.buyPressure ?? flow?.buyRatio ?? 38),
    sellPressure: Number(flow?.sellPressure ?? flow?.sellRatio ?? 62),
  })

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      <div className="min-w-0 rounded-3xl border border-zinc-800 bg-black/50 p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
          Why this action?
        </div>
        <div className="space-y-2">
          {decision.reason.map((reason, index) => (
            <div key={reason} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3 text-sm leading-5 text-zinc-300">
              <span className="mr-2 font-black text-cyan-300">{index + 1}.</span>
              {reason}
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-3xl border border-zinc-800 bg-black/50 p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
          Noise Suppression
        </div>
        <div className="space-y-2">
          {decision.suppress.length ? (
            decision.suppress.map((item) => (
              <div key={item} className="rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3 text-sm leading-5 text-zinc-300">
                {item}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3 text-sm text-zinc-500">
              No major low-priority signals suppressed.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
