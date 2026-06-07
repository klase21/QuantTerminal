"use client"

import { ShieldAlert } from "lucide-react"
import { buildStatefulTacticalAlerts } from "@/core/alerts/statefulTacticalAlertEngine"
import { useGlobalTacticalContextStore } from "@/stores/useGlobalTacticalContextStore"

export default function StatefulTacticalAlertPanel({
  flow,
  dualMarket,
}: {
  flow?: any
  dualMarket?: any
}) {
  const { primarySymbol, tacticalState } = useGlobalTacticalContextStore()

  const alerts = buildStatefulTacticalAlerts({
    symbol: primarySymbol,
    buyPressure: Number(flow?.buyPressure ?? 38),
    sellPressure: Number(flow?.sellPressure ?? 62),
    fakeBreakoutRisk: Number(dualMarket?.fakeBreakoutRisk ?? 0),
    realDemandConfirmation: Number(dualMarket?.realDemandConfirmation ?? 0),
    absorptionScore: Number(dualMarket?.absorptionScore ?? 0),
    tacticalState,
  })

  return (
    <section className="rounded-3xl border border-yellow-300/20 bg-yellow-400/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
        <ShieldAlert size={14} />
        Stateful Tactical Commands
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-2xl border border-zinc-900 bg-black/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2 py-0.5 text-[10px] font-black text-yellow-100">
                    {alert.priority}
                  </span>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
                    {alert.status}
                  </span>
                </div>
                <div className="mt-2 text-base font-black text-white">{alert.title}</div>
              </div>

              <div className="text-xl font-black text-yellow-200">{alert.confidence}%</div>
            </div>

            <div className="mt-3 grid gap-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3 xl:col-span-1">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                  Why
                </div>
                <div className="space-y-1">
                  {alert.why.map((item) => (
                    <div key={item} className="text-xs leading-5 text-zinc-400">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/5 p-3">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                  Action
                </div>
                <div className="text-xs leading-5 text-emerald-100/80">{alert.action}</div>
              </div>

              <div className="rounded-2xl border border-red-300/10 bg-red-400/5 p-3">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-red-300">
                  Invalidation
                </div>
                <div className="text-xs leading-5 text-red-100/80">{alert.invalidation}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
