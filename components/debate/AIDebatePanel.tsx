"use client"

import { MessagesSquare } from "lucide-react"
import { buildAIDebate } from "@/core/debate/aiDebateEngine"

export default function AIDebatePanel() {
  const debate = buildAIDebate()

  return (
    <section className="rounded-3xl border border-purple-300/20 bg-purple-400/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-200">
        <MessagesSquare size={14} />
        AI Debate System
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {debate.map((agent) => (
          <div key={agent.name} className="rounded-2xl border border-zinc-900 bg-black/45 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-black text-white">{agent.name}</div>
              <div className="text-xs font-black text-purple-200">{agent.confidence}%</div>
            </div>

            <div className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">
              {agent.stance}
            </div>

            <div className="mt-3 text-sm leading-6 text-zinc-400">
              {agent.argument}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
