"use client"

import { useEffect, useMemo, useState } from "react"

type Props = {
  trades?: any[]
}

const baseFlows = [
  { from: "Meme", to: "AI", base: 68 },
  { from: "L1", to: "RWA", base: 54 },
  { from: "Gaming", to: "AI", base: 44 },
]

function tradeNotional(
  trade: any
) {
  const price =
    Number(
      trade.price ||
      trade.p ||
      0
    )

  const qty =
    Number(
      trade.qty ||
      trade.q ||
      trade.size ||
      0
    )

  return price * qty
}

export default function RotationSankeyGraph({
  trades = [],
}: Props) {
  const [pulse, setPulse] =
    useState(0)

  useEffect(() => {
    const interval =
      window.setInterval(
        () => setPulse((v) => v + 1),
        2500
      )

    return () =>
      window.clearInterval(interval)
  }, [])

  const flows =
    useMemo(() => {
      const recent =
        trades.slice(-160)

      const totalNotional =
        recent.reduce(
          (acc, trade) =>
            acc + tradeNotional(trade),
          0
        )

      const tradeCount =
        recent.length

      const seed =
        totalNotional / 1_000_000 +
        tradeCount +
        pulse

      return baseFlows.map(
        (flow, index) => {
          const wave =
            Math.sin(seed * 0.17 + index)

          const strength =
            Math.max(
              12,
              Math.min(
                96,
                flow.base +
                  wave * 18 +
                  Math.min(18, tradeCount / 10)
              )
            )

          return {
            from: flow.from,
            to: flow.to,
            strength:
              Number(
                strength.toFixed(0)
              ),
          }
        }
      )
    }, [trades, pulse])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
            Rotation Sankey
          </div>
          <div className="mt-1 text-lg font-bold text-white">
            Sector Capital Movement
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
          LIVE
        </div>
      </div>

      <div className="space-y-4">
        {flows.map((flow) => (
          <div
            key={`${flow.from}-${flow.to}`}
            className="rounded-xl border border-cyan-500/10 bg-black/40 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold text-zinc-300">
                {flow.from}
              </div>

              <div className="flex-1 px-4">
                <div className="relative h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-emerald-400 transition-all duration-700"
                    style={{ width: `${flow.strength}%` }}
                  />
                </div>
              </div>

              <div className="font-semibold text-cyan-400">
                {flow.to}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>Smart money rotation detected</span>
              <span>{flow.strength}% confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
