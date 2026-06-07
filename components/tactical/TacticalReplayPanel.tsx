"use client"

import { replayTimeline } from "@/core/timeline/replayEngine"

export default function TacticalReplayPanel() {
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-black/60 p-4">
      <div className="mb-4 text-sm font-semibold text-cyan-400">
        Tactical Replay Timeline
      </div>

      <div className="space-y-3">
        {replayTimeline.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="text-xs text-zinc-500">{item.timestamp}</div>
            <div className="text-sm text-white">{item.event}</div>
          </div>
        ))}
      </div>
    </div>
  )
}