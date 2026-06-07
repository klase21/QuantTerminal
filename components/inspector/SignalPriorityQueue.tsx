"use client"

import { AlertTriangle, CheckCircle2, Clock, Radio } from "lucide-react"
import TacticalFocusCard from "@/components/focus/TacticalFocusCard"
import type { InspectorSignal, SignalPriority, SignalType } from "@/core/inspector/signalPriorityEngine"

const priorityTone: Record<SignalPriority, string> = {
  CRITICAL: "border-red-300/40 bg-red-400/10 text-red-200",
  HIGH: "border-orange-300/40 bg-orange-400/10 text-orange-200",
  MEDIUM: "border-yellow-300/35 bg-yellow-400/10 text-yellow-200",
  LOW: "border-zinc-700 bg-zinc-900 text-zinc-300",
}

const typeTone: Record<SignalType, string> = {
  EXECUTION: "text-cyan-300",
  ROTATION: "text-emerald-300",
  LIQUIDITY: "text-blue-300",
  NARRATIVE: "text-purple-300",
  RISK: "text-red-300",
}

function StatusIcon({ status }: { status: InspectorSignal["status"] }) {
  if (status === "ACTIVE") return <Radio size={14} className="text-cyan-300" />
  if (status === "INVALIDATING") return <AlertTriangle size={14} className="text-red-300" />
  return <Clock size={14} className="text-yellow-300" />
}

export default function SignalPriorityQueue({ signals }: { signals: InspectorSignal[] }) {
  return (
    <TacticalFocusCard
      eyebrow="Signal Inspector"
      title="Priority Queue"
      summary={`${signals.length} tactical signals ranked by urgency`}
      preview={
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${typeTone[signal.type]}`}>
                    {signal.type}
                  </div>
                  <div className="mt-1 text-base font-black text-white">{signal.title}</div>
                </div>
                <div className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${priorityTone[signal.priority]}`}>
                  {signal.priority}
                </div>
              </div>

              <p className="text-sm leading-6 text-zinc-400">{signal.reason}</p>

              <div className="mt-3 rounded-xl border border-zinc-800 bg-black/50 p-3 text-sm font-bold text-zinc-200">
                {signal.action}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-900 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-zinc-600">Score</div>
                  <div className="text-sm font-black text-white">{signal.score}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 px-3 py-2">
                  <div className="text-[10px] uppercase text-zinc-600">Confidence</div>
                  <div className="text-sm font-black text-cyan-300">{signal.confidence}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        {signals.slice(0, 4).map((signal) => (
          <div key={signal.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusIcon status={signal.status} />
                  <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${typeTone[signal.type]}`}>
                    {signal.type}
                  </div>
                </div>
                <div className="mt-1 truncate text-sm font-black text-white">{signal.title}</div>
              </div>
              <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${priorityTone[signal.priority]}`}>
                {signal.priority}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">{signal.action}</span>
              <span className="font-black text-cyan-300">{signal.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </TacticalFocusCard>
  )
}
