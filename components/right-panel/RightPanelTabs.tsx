"use client"

import { ArrowLeftRight, Crosshair, Newspaper } from "lucide-react"

export default function RightPanelTabs(_props: any) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4">
      <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
          <Crosshair className="h-3.5 w-3.5" /> Intelligence Relocated
        </div>
        <div className="mt-2 text-lg font-black text-white">Use Execution Workspace first</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Long macro and news reads no longer live as a separate default rail. They are compressed into execution catalysts and macro pulse inside Execution.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
            <ArrowLeftRight className="h-3.5 w-3.5" /> More Tools
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            Full Macro Deep Dive, Macro / News Correlation, and Full News Feed now live only in Execution Workspace → More Tools → Macro / News Archive.
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
            <Newspaper className="h-3.5 w-3.5" /> Default Mode
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            Execution Advanced stays focused on live analysis. Static macro/news research stays in More Tools so it does not compete with trade decisions.
          </div>
        </div>
      </div>
    </div>
  )
}
