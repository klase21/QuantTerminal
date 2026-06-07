// ======================================================
// components/MacroCorrelationPanel.tsx
// ======================================================

"use client"

import MacroSentimentGauge from "./MacroSentimentGauge"
import MacroSignalBreakdown from "./MacroSignalBreakdown"
import MacroPressureAlert from "./MacroPressureAlert"

import {
  calculateMacroCorrelation,
  MacroNewsEvent,
} from "@/lib/macroCorrelation"

interface Props {
  events: MacroNewsEvent[]
}

export default function MacroCorrelationPanel({
  events,
}: Props) {
  const result =
    calculateMacroCorrelation(events)

  const signals = [
    {
      label: "FED",
      value:
        events
          .filter((e) => e.category === "FED")
          .reduce(
            (acc, cur) =>
              acc + cur.sentiment * cur.impact,
            0
          ) / 10,
    },
    {
      label: "DXY",
      value:
        events
          .filter((e) => e.category === "DXY")
          .reduce(
            (acc, cur) =>
              acc + cur.sentiment * cur.impact,
            0
          ) / 10,
    },
    {
      label: "YIELD",
      value:
        events
          .filter((e) => e.category === "YIELD")
          .reduce(
            (acc, cur) =>
              acc + cur.sentiment * cur.impact,
            0
          ) / 10,
    },
    {
      label: "ETF",
      value:
        events
          .filter((e) => e.category === "ETF")
          .reduce(
            (acc, cur) =>
              acc + cur.sentiment * cur.impact,
            0
          ) / 10,
    },
  ]

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">
            Macro Correlation Engine
          </div>

          <div className="text-xs text-zinc-500">
            AI-driven macro pressure analysis
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-500">
            Dominant Driver
          </div>

          <div className="text-sm font-bold">
            {result.dominantCategory}
          </div>
        </div>
      </div>

      <MacroSentimentGauge
        score={result.score}
      />

      <div className="mt-5">
        <MacroSignalBreakdown
          signals={signals}
        />
      </div>

      <MacroPressureAlert
        score={result.score}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Confidence: {result.confidence}%
        </span>

        <span>
          Pressure: {result.pressure}
        </span>
      </div>
    </div>
  )
}