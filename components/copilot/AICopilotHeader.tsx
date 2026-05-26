"use client"

import { Bot, Radio } from "lucide-react"

export default function AICopilotHeader({
  conviction,
  regime,
}: {
  conviction: number
  regime: string
}) {
  return (
    <div className="rounded-[2rem] border border-cyan-400/20 bg-black/60 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <Bot size={22} />
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
              Tactical AI Co-Pilot
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              Market reasoning companion
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              AI-guided tactical interpretation layer
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[380px]">
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
              <Radio size={12} />
              AI Conviction
            </div>
            <div className="text-2xl font-black text-cyan-300">
              {conviction}%
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
            <div className="mb-1 text-[10px] uppercase text-zinc-500">
              Regime
            </div>
            <div className="text-lg font-black text-white">
              {regime.replaceAll("_", " ")}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
