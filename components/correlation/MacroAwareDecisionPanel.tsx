"use client"

import { buildCorrelationRegimeState } from "@/core/correlation/correlationRegimeEngine"
import { buildTacticalDecision } from "@/core/decision/tacticalDecisionEngine"

export default function MacroAwareDecisionPanel({ flow }: { flow?: any }) {
  const regime = buildCorrelationRegimeState()

  const decision = buildTacticalDecision({
    buyPressure: Number(flow?.buyPressure ?? 38),
    sellPressure: Number(flow?.sellPressure ?? 62),
    rotationConfidence: Math.round(81 * regime.narrativeWeight),
    entryQuality: Math.round(68 * regime.executionWeight),
    contradictionPenalty:
      regime.regime === "FRAGILE_RALLY" || regime.regime === "LIQUIDITY_SQUEEZE"
        ? 20
        : 12,
    liquidityRisk: regime.liquidityStress,
    marketRegime:
      regime.regime === "LIQUIDITY_SQUEEZE" || regime.regime === "DEFENSIVE_ROTATION"
        ? "RISK_OFF"
        : regime.regime === "FRAGILE_RALLY"
          ? "CHOPPY"
          : "TREND_EXPANSION",
  })

  return (
    <section className="rounded-3xl border border-purple-400/20 bg-purple-400/5 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
        Macro-aware Tactical Decision
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="text-xl font-black text-white">{decision.headline}</div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            Decision adjusted by correlation regime:{" "}
            <span className="font-black text-purple-200">
              {regime.regime.replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {decision.reason.slice(0, 4).map((reason) => (
              <div key={reason} className="rounded-2xl border border-zinc-900 bg-black/45 p-3 text-xs leading-5 text-zinc-300">
                {reason}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Box label="Action" value={decision.action.replaceAll("_", " ")} />
          <Box label="Readiness" value={`${decision.readiness}%`} />
          <Box label="Size" value={decision.suggestedSize} />
        </div>
      </div>
    </section>
  )
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/55 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}
