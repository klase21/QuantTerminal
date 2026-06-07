"use client"

import { buildTacticalMemoryScaffold } from "@/core/agent/tacticalMemoryScaffold"

export default function TacticalMemoryPanel() {
  const events = buildTacticalMemoryScaffold()

  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
        Tactical Memory Scaffold
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                  {event.type.replaceAll("_", " ")} · {event.age}
                </div>
                <div className="mt-1 text-sm font-black text-white">{event.title}</div>
              </div>
              <div className="text-sm font-black text-purple-300">{event.severity}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
