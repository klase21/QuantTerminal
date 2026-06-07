"use client"

import { AlertTriangle, CheckCircle2, Crosshair, Eye, PauseCircle, Shield } from "lucide-react"

import type { ExecutionIntelligenceV3 } from "@/lib/tactical/executionIntelligenceV3"

function actionTone(action: ExecutionIntelligenceV3["action"]) {
  if (action === "ENTER") return "border-emerald-300/35 bg-emerald-400/12 text-emerald-100"
  if (action === "WATCH") return "border-cyan-300/35 bg-cyan-400/12 text-cyan-100"
  if (action === "AVOID") return "border-rose-300/35 bg-rose-400/12 text-rose-100"
  return "border-amber-300/35 bg-amber-400/12 text-amber-100"
}

function ActionIcon({ action }: { action: ExecutionIntelligenceV3["action"] }) {
  if (action === "ENTER") return <CheckCircle2 className="h-5 w-5" />
  if (action === "WATCH") return <Eye className="h-5 w-5" />
  if (action === "AVOID") return <Shield className="h-5 w-5" />
  return <PauseCircle className="h-5 w-5" />
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</div>
        <div className="text-xs font-black text-white">{value}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export default function FinalDecisionStrip({ intelligence }: { intelligence: ExecutionIntelligenceV3 }) {
  return (
    <div className={`overflow-hidden rounded-3xl border ${actionTone(intelligence.action)} shadow-[0_0_50px_rgba(34,211,238,.08)]`}>
      <div className="grid gap-4 p-4 xl:grid-cols-[1fr_1.15fr]">
        <section className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-current/25 bg-black/35">
            <ActionIcon action={intelligence.action} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] opacity-75">
              <Crosshair className="h-3.5 w-3.5" /> Final Decision Strip
            </div>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">{intelligence.label}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
              <span className="rounded-full border border-current/25 bg-black/30 px-3 py-1">{intelligence.decisionStrip.left}</span>
              <span className="rounded-full border border-current/25 bg-black/30 px-3 py-1">{intelligence.decisionStrip.center}</span>
              <span className="rounded-full border border-current/25 bg-black/30 px-3 py-1">{intelligence.decisionStrip.right}</span>
            </div>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-4">
          <Meter label="Readiness" value={intelligence.readiness} />
          <Meter label="Confidence" value={intelligence.confidence} />
          <Meter label="Friction" value={intelligence.friction} />
          <Meter label="Chase Risk" value={intelligence.chaseRisk} />
        </section>
      </div>

      <div className="grid gap-3 border-t border-current/15 bg-black/20 p-4 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-2">
          {intelligence.reasons.map((reason) => (
            <div key={reason} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold leading-5 text-zinc-200">
              {reason}
            </div>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-200/80">Next Trigger</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-zinc-200">{intelligence.nextTrigger}</div>
          </div>
          <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-rose-200/80">
              <AlertTriangle className="h-3.5 w-3.5" /> Avoid If
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-zinc-200">{intelligence.avoidCondition}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
