"use client";

import TickerBar from "@/components/TickerBar";
import MacroTickerStrip from "@/components/macro/MacroTickerStrip";
import LiveCommandSurface from "@/components/command/LiveCommandSurface";

export default function TerminalSurfaceDeck() {
  return (
    <div className="shrink-0 border-b border-zinc-900 bg-black">
      <div className="border-b border-zinc-900 bg-zinc-950 px-4 py-3">
        <TickerBar />
      </div>

      <div className="border-b border-zinc-900 bg-zinc-950/80">
        <MacroTickerStrip />
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">
              Live Intelligence Surface
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Real-time command layer focused on regime, sector heat, and priority events.
            </div>
          </div>
          <div className="hidden rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 md:block">
            Real-time mode
          </div>
        </div>

        <LiveCommandSurface />
      </div>
    </div>
  );
}
