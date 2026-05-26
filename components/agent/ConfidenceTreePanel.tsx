"use client"

import type { ConfidenceFactor } from "@/core/agent/tacticalAgentDecisionEngine"

export default function ConfidenceTreePanel({
  factors,
}: {
  factors: ConfidenceFactor[]
}) {
  const positives = factors.filter((item) => item.impact === "positive")
  const negatives = factors.filter((item) => item.impact === "negative")
  const neutrals = factors.filter((item) => item.impact === "neutral")

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <FactorColumn title="Positive Drivers" tone="green" factors={positives} />
      <FactorColumn title="Negative Drivers" tone="red" factors={negatives} />
      <FactorColumn title="Neutral / Watch" tone="zinc" factors={neutrals} />
    </div>
  )
}

function FactorColumn({
  title,
  tone,
  factors,
}: {
  title: string
  tone: "green" | "red" | "zinc"
  factors: ConfidenceFactor[]
}) {
  const titleTone =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : "text-zinc-300"

  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/50 p-4">
      <div className={`mb-3 text-[10px] font-black uppercase tracking-[0.24em] ${titleTone}`}>
        {title}
      </div>

      <div className="space-y-2">
        {factors.length ? (
          factors.map((factor) => (
            <div key={factor.label} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-white">{factor.label}</div>
                <div className={factor.weight >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {factor.weight > 0 ? "+" : ""}
                  {factor.weight}
                </div>
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{factor.detail}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3 text-xs text-zinc-500">
            No active factors.
          </div>
        )}
      </div>
    </div>
  )
}
