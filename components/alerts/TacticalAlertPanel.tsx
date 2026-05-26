"use client"

import { BellRing } from "lucide-react"
import { buildTacticalAlerts } from "@/core/alerts/tacticalAlertEngine"

export default function TacticalAlertPanel() {
  const alerts = buildTacticalAlerts()

  return (
    <section className="rounded-3xl border border-yellow-300/20 bg-yellow-400/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
        <BellRing size={14} />
        Tactical Alert Intelligence
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-zinc-900 bg-black/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">{alert.title}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  {alert.reason}
                </div>
              </div>

              <div className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-100">
                {alert.confidence}%
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-yellow-300/10 bg-yellow-400/5 p-3 text-xs leading-5 text-yellow-100/80">
              {alert.action}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
