"use client"

import type React from "react"
import { AlertTriangle, CheckCircle2, Crosshair, Gauge, Shield, Timer, XCircle } from "lucide-react"
import { buildTacticalDecision, type TacticalAction } from "@/core/decision/tacticalDecisionEngine"

function actionStyle(action: TacticalAction) {
  if (action === "ENTER") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (action === "WATCH") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  if (action === "AVOID") return "border-red-300/30 bg-red-400/10 text-red-100"
  if (action === "REDUCE") return "border-orange-300/30 bg-orange-400/10 text-orange-100"
  return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
}

function ActionIcon({ action }: { action: TacticalAction }) {
  if (action === "ENTER") return <CheckCircle2 size={18} />
  if (action === "AVOID") return <XCircle size={18} />
  if (action === "REDUCE") return <AlertTriangle size={18} />
  return <Crosshair size={18} />
}

export default function TacticalDecisionStrip({ flow }: { flow?: any }) {
  const buyPressure = Number(flow?.buyPressure ?? flow?.buyRatio ?? 48)
  const sellPressure = Number(flow?.sellPressure ?? flow?.sellRatio ?? 52)
  const flowScore = Math.max(buyPressure, sellPressure)
  const decision = buildTacticalDecision({
    buyPressure,
    sellPressure,
    flowScore,
    rotationConfidence: 76,
    entryQuality: buyPressure > sellPressure ? 73 : 62,
    contradictionPenalty: sellPressure > buyPressure + 18 ? 18 : 11,
    liquidityRisk: sellPressure > buyPressure ? 66 : 54,
    momentumScore: 64,
    trendScore: 61,
    volatilityScore: 56,
    macroRiskScore: 46,
  })

  return (
    <section className={`min-w-0 overflow-hidden rounded-[1.25rem] border px-3 py-3 ${actionStyle(decision.action)}`}>
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-current/30 bg-black/30">
            <ActionIcon action={decision.action} />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] opacity-70">Decision</div>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase">{decision.action}</span>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase">{decision.entryGrade}</span>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase">{decision.setupLifetime}</span>
            </div>
            <div className="mt-1 truncate text-base font-black text-white" title={decision.headline}>{decision.headline}</div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-3 gap-1.5">
          <Metric icon={<Gauge size={11} />} label="Ready" value={`${decision.readiness}%`} />
          <Metric icon={<Crosshair size={11} />} label="Conf" value={`${decision.confidence}%`} />
          <Metric icon={<Shield size={11} />} label="Size" value={decision.suggestedSize} />
        </div>
      </div>

      <div className="mt-2 grid gap-1.5 text-xs lg:grid-cols-2">
        <CompactNote icon={<Timer size={11} />} label="Trigger" value={decision.trigger} />
        <CompactNote icon={<AlertTriangle size={11} />} label="Invalidation" value={decision.invalidation} danger />
      </div>
    </section>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-500">{icon}{label}</div>
      <div className="truncate text-xs font-black text-white" title={value}>{value}</div>
    </div>
  )
}

function CompactNote({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
      <div className={danger ? "text-red-200" : "text-cyan-200"}>{icon}</div>
      <div className="min-w-0">
        <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</span>
        <span className={`text-xs font-semibold ${danger ? "text-red-100" : "text-white"}`}>{value}</span>
      </div>
    </div>
  )
}
