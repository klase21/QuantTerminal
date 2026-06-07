"use client"

import { useState } from "react"

import MacroPanel from "@/components/macro/MacroPanel"
import MacroNewsCorrelation from "@/components/macro/MacroNewsCorrelation"
import NewsFeed from "@/components/news/NewsFeed"

type ArchiveTab = "macro" | "correlation" | "news"

const tabs: { id: ArchiveTab; label: string; hint: string }[] = [
  { id: "macro", label: "Macro Deep Dive", hint: "static context + evidence" },
  { id: "correlation", label: "Macro / News Correlation", hint: "cross-asset pressure" },
  { id: "news", label: "Full News Feed", hint: "raw narrative stream" },
]

export default function AdvancedIntelligenceArchive() {
  const [tab, setTab] = useState<ArchiveTab>("macro")
  return (
    <div className="flex h-full min-h-[720px] flex-col overflow-hidden rounded-3xl border border-zinc-900 bg-black">
      <div className="shrink-0 border-b border-zinc-900 bg-zinc-950/70 p-3">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Advanced Archive</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-2xl border px-3 py-2 text-left transition ${tab === item.id ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100" : "border-zinc-800 bg-black/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.16em]">{item.label}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] opacity-65">{item.hint}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "macro" ? <MacroPanel /> : null}
        {tab === "correlation" ? <MacroNewsCorrelation /> : null}
        {tab === "news" ? <NewsFeed /> : null}
      </div>
    </div>
  )
}
