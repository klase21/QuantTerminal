"use client"

import { Radio } from "lucide-react"

export default function TacticalNarratorCard({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-black/65 p-4 shadow-[0_0_34px_rgba(34,211,238,.08)] backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        <Radio size={13} />
        AI Tactical Narrator
      </div>
      <p className="text-sm leading-6 text-zinc-300">{text}</p>
    </div>
  )
}
