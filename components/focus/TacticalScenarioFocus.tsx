"use client"

import TacticalFocusCard from "@/components/focus/TacticalFocusCard"

interface Scenario {
  label: string
  probability: number
  impact: string
  reaction: string
}

const scenarios: Scenario[] = [
  {
    label: "BTC breaks key liquidity",
    probability: 72,
    impact: "Risk-on sectors likely accelerate.",
    reaction: "Watch AI/RWA continuation after pullback confirmation.",
  },
  {
    label: "ETH/BTC weakens",
    probability: 64,
    impact: "Capital may rotate into BTC or RWA defensively.",
    reaction: "Avoid weak ETH beta until CVD stabilizes.",
  },
  {
    label: "Sell pressure fades",
    probability: 69,
    impact: "Absorption can flip execution bias quickly.",
    reaction: "Look for buy imbalance and delta recovery.",
  },
]

export default function TacticalScenarioFocus() {
  return (
    <TacticalFocusCard
      eyebrow="Scenario Simulator"
      title="Tactical Scenarios"
      summary="Hover for expanded scenario map"
      preview={
        <div className="space-y-3">
          {scenarios.map((item) => (
            <div key={item.label} className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">
              <div className="flex items-center justify-between">
                <div className="font-black text-white">{item.label}</div>
                <div className="text-cyan-300">{item.probability}%</div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">{item.impact}</div>
              <div className="mt-2 rounded-xl border border-zinc-800 bg-black/50 p-3 text-xs text-zinc-300">{item.reaction}</div>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        {scenarios.slice(0, 2).map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/70 px-3 py-2">
            <div className="text-xs font-bold text-zinc-300">{item.label}</div>
            <div className="text-xs font-black text-cyan-300">{item.probability}%</div>
          </div>
        ))}
      </div>
    </TacticalFocusCard>
  )
}
